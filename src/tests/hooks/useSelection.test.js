/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSelection } from '../../hooks/useSelection';

describe('useSelection', () => {
  it('starts with empty selection', () => {
    const { result } = renderHook(() => useSelection());
    expect(result.current.selectedShapeIds).toEqual([]);
    expect(result.current.isSelecting).toBe(false);
  });

  it('sets selected shape IDs', () => {
    const { result } = renderHook(() => useSelection());
    act(() => result.current.setSelectedShapeIds(['s1', 's2']));
    expect(result.current.selectedShapeIds).toEqual(['s1', 's2']);
  });

  it('toggles isSelecting state', () => {
    const { result } = renderHook(() => useSelection());
    act(() => result.current.setIsSelecting(true));
    expect(result.current.isSelecting).toBe(true);
  });

  it('resolveSelection deselects on tiny drag (click)', () => {
    const { result } = renderHook(() => useSelection());
    const deselectMock = vi.fn();
    act(() => {
      result.current.setSelectStart({ x: 100, y: 100 });
      result.current.setSelectCurrent({ x: 102, y: 102 });
    });
    let selected;
    act(() => {
      selected = result.current.resolveSelection([], deselectMock);
    });
    expect(selected).toEqual([]);
    expect(deselectMock).toHaveBeenCalled();
  });

  it('resolveSelection finds rectangles within selection', () => {
    const { result } = renderHook(() => useSelection());
    const shapes = [
      { id: 's1', type: 'rectangle', x: 50, y: 50, width: 100, height: 100 },
      { id: 's2', type: 'rectangle', x: 500, y: 500, width: 50, height: 50 },
    ];
    act(() => {
      result.current.setSelectStart({ x: 0, y: 0 });
      result.current.setSelectCurrent({ x: 200, y: 200 });
    });
    let selected;
    act(() => {
      selected = result.current.resolveSelection(shapes, vi.fn());
    });
    expect(selected).toContain('s1');
    expect(selected).not.toContain('s2');
  });

  it('resolveSelection handles circle shapes by bounding box', () => {
    const { result } = renderHook(() => useSelection());
    const shapes = [{ id: 'c1', type: 'circle', x: 100, y: 100, radius: 50 }];
    act(() => {
      result.current.setSelectStart({ x: 0, y: 0 });
      result.current.setSelectCurrent({ x: 200, y: 200 });
    });
    let selected;
    act(() => {
      selected = result.current.resolveSelection(shapes, vi.fn());
    });
    expect(selected).toContain('c1');
  });

  it('resolveSelection handles custom polygon shapes', () => {
    const { result } = renderHook(() => useSelection());
    const shapes = [
      {
        id: 'cp1',
        type: 'customPolygon',
        x: 0,
        y: 0,
        vertices: [
          { x: 50, y: 50 },
          { x: 150, y: 50 },
          { x: 100, y: 150 },
        ],
      },
    ];
    act(() => {
      result.current.setSelectStart({ x: 0, y: 0 });
      result.current.setSelectCurrent({ x: 200, y: 200 });
    });
    let selected;
    act(() => {
      selected = result.current.resolveSelection(shapes, vi.fn());
    });
    expect(selected).toContain('cp1');
  });

  it('updates select start coordinates', () => {
    const { result } = renderHook(() => useSelection());
    act(() => result.current.setSelectStart({ x: 10, y: 20 }));
    expect(result.current.selectStart).toEqual({ x: 10, y: 20 });
  });

  it('updates selectedShapeIds after resolveSelection', () => {
    const { result } = renderHook(() => useSelection());
    const shapes = [{ id: 's1', type: 'rectangle', x: 50, y: 50, width: 100, height: 100 }];
    act(() => {
      result.current.setSelectStart({ x: 0, y: 0 });
      result.current.setSelectCurrent({ x: 200, y: 200 });
    });
    act(() => result.current.resolveSelection(shapes, vi.fn()));
    expect(result.current.selectedShapeIds).toEqual(['s1']);
  });
});
