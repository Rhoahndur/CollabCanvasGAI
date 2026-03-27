/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useShapeTransform } from '../../hooks/useShapeTransform';

vi.mock('../../utils/canvasUtils', () => ({
  screenToCanvas: vi.fn((screenX, screenY) => ({ x: screenX, y: screenY })),
}));

function createProps(overrides = {}) {
  return {
    svgRef: {
      current: {
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
      },
    },
    shapes: [
      {
        id: 's1',
        type: 'rectangle',
        x: 100,
        y: 100,
        width: 50,
        height: 50,
        lockedBy: null,
        rotation: 0,
      },
      {
        id: 's2',
        type: 'rectangle',
        x: 200,
        y: 200,
        width: 80,
        height: 60,
        lockedBy: null,
        rotation: 45,
      },
      {
        id: 'cp1',
        type: 'customPolygon',
        x: 0,
        y: 0,
        vertices: [
          { x: 10, y: 10 },
          { x: 50, y: 10 },
          { x: 30, y: 50 },
        ],
        lockedBy: null,
      },
    ],
    user: { uid: 'user1' },
    selectedShapeId: null,
    selectedShapeIds: [],
    selectShape: vi.fn(),
    viewport: { offsetX: 0, offsetY: 0, zoom: 1 },
    setIsDraggingLocal: vi.fn(),
    userRole: 'editor',
    trackActivity: vi.fn(),
    ...overrides,
  };
}

function mockEvent(x = 0, y = 0) {
  return {
    clientX: x,
    clientY: y,
    stopPropagation: vi.fn(),
    preventDefault: vi.fn(),
  };
}

describe('useShapeTransform', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useShapeTransform(createProps()));
    expect(result.current.isDragging).toBe(false);
    expect(result.current.isResizing).toBe(false);
    expect(result.current.isRotating).toBe(false);
    expect(result.current.draggedShapeIds).toEqual([]);
    expect(result.current.resizeHandle).toBeNull();
    expect(result.current.resizeInitial).toBeNull();
    expect(result.current.rotateInitial).toBe(0);
  });

  describe('handleShapeMouseDown', () => {
    it('starts drag for a single shape', () => {
      const props = createProps();
      const { result } = renderHook(() => useShapeTransform(props));
      act(() => result.current.handleShapeMouseDown('s1', mockEvent(110, 110)));
      expect(result.current.isDragging).toBe(true);
      expect(result.current.draggedShapeIds).toEqual(['s1']);
      expect(props.trackActivity).toHaveBeenCalled();
      expect(props.setIsDraggingLocal).toHaveBeenCalledWith(true);
    });

    it('selects shape if not already selected', () => {
      const props = createProps({ selectedShapeId: 's2' });
      const { result } = renderHook(() => useShapeTransform(props));
      act(() => result.current.handleShapeMouseDown('s1', mockEvent(110, 110)));
      expect(props.selectShape).toHaveBeenCalledWith('s1');
    });

    it('does not re-select if already selected', () => {
      const props = createProps({ selectedShapeId: 's1' });
      const { result } = renderHook(() => useShapeTransform(props));
      act(() => result.current.handleShapeMouseDown('s1', mockEvent(110, 110)));
      expect(props.selectShape).not.toHaveBeenCalled();
    });

    it('drags all shapes in multi-selection', () => {
      const props = createProps({ selectedShapeIds: ['s1', 's2'] });
      const { result } = renderHook(() => useShapeTransform(props));
      act(() => result.current.handleShapeMouseDown('s1', mockEvent(110, 110)));
      expect(result.current.draggedShapeIds).toEqual(['s1', 's2']);
    });

    it('stores vertex positions for custom polygons', () => {
      const props = createProps({ selectedShapeIds: ['cp1'] });
      const { result } = renderHook(() => useShapeTransform(props));
      act(() => result.current.handleShapeMouseDown('cp1', mockEvent(20, 20)));
      expect(result.current.dragInitialPositions['cp1']).toEqual({
        vertices: [
          { x: 10, y: 10 },
          { x: 50, y: 10 },
          { x: 30, y: 50 },
        ],
      });
    });

    it('stores x/y positions for regular shapes', () => {
      const props = createProps({ selectedShapeIds: ['s1'] });
      const { result } = renderHook(() => useShapeTransform(props));
      act(() => result.current.handleShapeMouseDown('s1', mockEvent(110, 110)));
      expect(result.current.dragInitialPositions['s1']).toEqual({ x: 100, y: 100 });
    });

    it('blocks drag for viewer role', () => {
      const { result } = renderHook(() => useShapeTransform(createProps({ userRole: 'viewer' })));
      act(() => result.current.handleShapeMouseDown('s1', mockEvent()));
      expect(result.current.isDragging).toBe(false);
    });

    it('blocks drag for shape locked by another user', () => {
      const props = createProps({
        shapes: [{ id: 's1', type: 'rectangle', x: 0, y: 0, lockedBy: 'other-user' }],
      });
      const { result } = renderHook(() => useShapeTransform(props));
      act(() => result.current.handleShapeMouseDown('s1', mockEvent()));
      expect(result.current.isDragging).toBe(false);
    });

    it('allows drag for shape locked by same user', () => {
      const props = createProps({
        shapes: [{ id: 's1', type: 'rectangle', x: 100, y: 100, lockedBy: 'user1', rotation: 0 }],
      });
      const { result } = renderHook(() => useShapeTransform(props));
      act(() => result.current.handleShapeMouseDown('s1', mockEvent(110, 110)));
      expect(result.current.isDragging).toBe(true);
    });

    it('no-ops for nonexistent shape', () => {
      const { result } = renderHook(() => useShapeTransform(createProps()));
      act(() => result.current.handleShapeMouseDown('nope', mockEvent()));
      expect(result.current.isDragging).toBe(false);
    });

    it('no-ops when svgRef is null', () => {
      const props = createProps({ svgRef: { current: null } });
      const { result } = renderHook(() => useShapeTransform(props));
      act(() => result.current.handleShapeMouseDown('s1', mockEvent()));
      expect(result.current.isDragging).toBe(false);
    });

    it('stops propagation and prevents default', () => {
      const { result } = renderHook(() => useShapeTransform(createProps()));
      const e = mockEvent(110, 110);
      act(() => result.current.handleShapeMouseDown('s1', e));
      expect(e.stopPropagation).toHaveBeenCalled();
      expect(e.preventDefault).toHaveBeenCalled();
    });
  });

  describe('handleResizeStart', () => {
    it('starts resize for selected shape', () => {
      const props = createProps({ selectedShapeId: 's1' });
      const { result } = renderHook(() => useShapeTransform(props));
      act(() => result.current.handleResizeStart('se', mockEvent(150, 150)));
      expect(result.current.isResizing).toBe(true);
      expect(result.current.resizeHandle).toBe('se');
      expect(result.current.resizeInitial).toMatchObject({ id: 's1', x: 100, y: 100 });
      expect(props.setIsDraggingLocal).toHaveBeenCalledWith(true);
    });

    it('blocks resize for viewer role', () => {
      const props = createProps({ selectedShapeId: 's1', userRole: 'viewer' });
      const { result } = renderHook(() => useShapeTransform(props));
      act(() => result.current.handleResizeStart('se', mockEvent()));
      expect(result.current.isResizing).toBe(false);
    });

    it('no-ops without selected shape', () => {
      const { result } = renderHook(() => useShapeTransform(createProps()));
      act(() => result.current.handleResizeStart('se', mockEvent()));
      expect(result.current.isResizing).toBe(false);
    });

    it('no-ops when svgRef is null', () => {
      const props = createProps({ selectedShapeId: 's1', svgRef: { current: null } });
      const { result } = renderHook(() => useShapeTransform(props));
      act(() => result.current.handleResizeStart('se', mockEvent()));
      expect(result.current.isResizing).toBe(false);
    });
  });

  describe('handleRotateStart', () => {
    it('starts rotation with initial angle', () => {
      const props = createProps({ selectedShapeId: 's2' });
      const { result } = renderHook(() => useShapeTransform(props));
      act(() => result.current.handleRotateStart(mockEvent(250, 180)));
      expect(result.current.isRotating).toBe(true);
      expect(result.current.rotateInitial).toBe(45);
      expect(props.setIsDraggingLocal).toHaveBeenCalledWith(true);
    });

    it('defaults rotateInitial to 0 when shape has no rotation', () => {
      const props = createProps({ selectedShapeId: 's1' });
      const { result } = renderHook(() => useShapeTransform(props));
      act(() => result.current.handleRotateStart(mockEvent()));
      expect(result.current.rotateInitial).toBe(0);
    });

    it('blocks rotation for viewer role', () => {
      const props = createProps({ selectedShapeId: 's1', userRole: 'viewer' });
      const { result } = renderHook(() => useShapeTransform(props));
      act(() => result.current.handleRotateStart(mockEvent()));
      expect(result.current.isRotating).toBe(false);
    });

    it('no-ops without selected shape', () => {
      const { result } = renderHook(() => useShapeTransform(createProps()));
      act(() => result.current.handleRotateStart(mockEvent()));
      expect(result.current.isRotating).toBe(false);
    });
  });
});
