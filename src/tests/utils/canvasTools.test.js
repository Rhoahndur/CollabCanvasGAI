import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeCanvasTool, canvasToolDefinitions } from '../../utils/canvasTools';

// Helper to build a mock context
function makeContext(overrides = {}) {
  return {
    shapes: [],
    selectedShapeIds: [],
    createShape: vi.fn((data) => ({ id: `mock_${Date.now()}`, ...data })),
    updateShape: vi.fn(),
    deleteShape: vi.fn(),
    selectShape: vi.fn(),
    deselectShape: vi.fn(),
    viewport: { centerX: 2500, centerY: 2500, zoom: 1, offsetX: 0, offsetY: 0 },
    canvasId: 'test-canvas',
    userId: 'user1',
    ...overrides,
  };
}

describe('canvasToolDefinitions', () => {
  it('exports 9 tool definitions', () => {
    expect(canvasToolDefinitions).toHaveLength(9);
  });

  it('each definition has type "function" with name and parameters', () => {
    canvasToolDefinitions.forEach((def) => {
      expect(def.type).toBe('function');
      expect(def.function.name).toBeTruthy();
      expect(def.function.parameters).toBeDefined();
    });
  });
});

describe('executeCanvasTool', () => {
  it('returns error for unknown tool', () => {
    const result = executeCanvasTool('nonExistent', {}, makeContext());
    expect(result.success).toBe(false);
    expect(result.message).toContain('Unknown tool');
  });

  describe('createShape', () => {
    it('creates a rectangle with defaults', () => {
      const ctx = makeContext();
      const result = executeCanvasTool('createShape', { shapeType: 'rectangle' }, ctx);
      expect(result.success).toBe(true);
      expect(ctx.createShape).toHaveBeenCalledTimes(1);
      expect(result.data.count).toBe(1);
    });

    it('creates multiple shapes with count', () => {
      const ctx = makeContext();
      const result = executeCanvasTool('createShape', { shapeType: 'circle', count: 3 }, ctx);
      expect(result.success).toBe(true);
      expect(ctx.createShape).toHaveBeenCalledTimes(3);
      expect(result.data.count).toBe(3);
    });

    it('rejects count exceeding MAX_SHAPES_PER_CALL (50)', () => {
      const result = executeCanvasTool(
        'createShape',
        { shapeType: 'rectangle', count: 51 },
        makeContext()
      );
      expect(result.success).toBe(false);
      expect(result.message).toContain('Maximum is 50');
    });

    it('rejects when canvas would exceed MAX_TOTAL_SHAPES (1000)', () => {
      const shapes = Array.from({ length: 999 }, (_, i) => ({ id: `s${i}` }));
      const result = executeCanvasTool(
        'createShape',
        { shapeType: 'rectangle', count: 2 },
        makeContext({ shapes })
      );
      expect(result.success).toBe(false);
      expect(result.message).toContain('limit is 1000');
    });

    it('creates text shape with text property', () => {
      const ctx = makeContext();
      executeCanvasTool('createShape', { shapeType: 'text', text: 'Hello' }, ctx);
      const call = ctx.createShape.mock.calls[0][0];
      expect(call.text).toBe('Hello');
      expect(call.type).toBe('text');
    });

    it('constrains positions within canvas bounds', () => {
      const ctx = makeContext();
      executeCanvasTool('createShape', { shapeType: 'rectangle', x: -100, y: -100 }, ctx);
      const call = ctx.createShape.mock.calls[0][0];
      expect(call.x).toBeGreaterThanOrEqual(0);
      expect(call.y).toBeGreaterThanOrEqual(0);
    });
  });

  describe('createShapesBatch', () => {
    it('creates shapes at specific positions', () => {
      const ctx = makeContext();
      const shapes = [
        { shapeType: 'rectangle', x: 100, y: 100 },
        { shapeType: 'circle', x: 200, y: 200 },
      ];
      const result = executeCanvasTool('createShapesBatch', { shapes }, ctx);
      expect(result.success).toBe(true);
      expect(result.data.created).toBe(2);
    });

    it('rejects empty batch', () => {
      const result = executeCanvasTool('createShapesBatch', { shapes: [] }, makeContext());
      expect(result.success).toBe(false);
    });

    it('rejects batch exceeding 50 shapes', () => {
      const shapes = Array.from({ length: 51 }, (_, i) => ({
        shapeType: 'rectangle',
        x: i * 10,
        y: 0,
      }));
      const result = executeCanvasTool('createShapesBatch', { shapes }, makeContext());
      expect(result.success).toBe(false);
      expect(result.message).toContain('Maximum is 50');
    });
  });

  describe('alignShapes', () => {
    const shapes = [
      { id: 's1', type: 'rectangle', x: 100, y: 100, width: 50, height: 50 },
      { id: 's2', type: 'rectangle', x: 300, y: 300, width: 50, height: 50 },
    ];

    it('aligns all shapes left when no selection', () => {
      const ctx = makeContext({ shapes });
      const result = executeCanvasTool(
        'alignShapes',
        { alignment: 'left', useSelected: false },
        ctx
      );
      expect(result.success).toBe(true);
      expect(ctx.updateShape).toHaveBeenCalledTimes(2);
    });

    it('returns error when no shapes exist', () => {
      const result = executeCanvasTool('alignShapes', { alignment: 'left' }, makeContext());
      expect(result.success).toBe(false);
    });

    it('aligns only selected shapes when useSelected is true', () => {
      const ctx = makeContext({ shapes, selectedShapeIds: ['s1'] });
      const result = executeCanvasTool(
        'alignShapes',
        { alignment: 'center-horizontal', useSelected: true },
        ctx
      );
      expect(result.success).toBe(true);
      expect(result.data.count).toBe(1);
    });
  });

  describe('distributeShapes', () => {
    const shapes = [
      { id: 's1', type: 'rectangle', x: 100, y: 100, width: 50, height: 50 },
      { id: 's2', type: 'rectangle', x: 300, y: 100, width: 50, height: 50 },
      { id: 's3', type: 'rectangle', x: 500, y: 100, width: 50, height: 50 },
    ];

    it('distributes shapes horizontally', () => {
      const ctx = makeContext({ shapes });
      const result = executeCanvasTool(
        'distributeShapes',
        { direction: 'horizontal', useSelected: false },
        ctx
      );
      expect(result.success).toBe(true);
      expect(result.data.count).toBe(3);
    });

    it('requires at least 2 shapes', () => {
      const ctx = makeContext({ shapes: [shapes[0]] });
      const result = executeCanvasTool(
        'distributeShapes',
        { direction: 'horizontal', useSelected: false },
        ctx
      );
      expect(result.success).toBe(false);
      expect(result.message).toContain('at least 2');
    });
  });

  describe('arrangeInGrid', () => {
    const shapes = [
      { id: 's1', type: 'rectangle', x: 0, y: 0, width: 50, height: 50 },
      { id: 's2', type: 'circle', x: 0, y: 0, radius: 30 },
      { id: 's3', type: 'rectangle', x: 0, y: 0, width: 50, height: 50 },
      { id: 's4', type: 'rectangle', x: 0, y: 0, width: 50, height: 50 },
    ];

    it('arranges shapes in a 2x2 grid', () => {
      const ctx = makeContext({ shapes });
      const result = executeCanvasTool(
        'arrangeInGrid',
        { rows: 2, columns: 2, useSelected: false },
        ctx
      );
      expect(result.success).toBe(true);
      expect(result.data.rows).toBe(2);
      expect(result.data.columns).toBe(2);
    });

    it('returns error with no shapes', () => {
      const result = executeCanvasTool('arrangeInGrid', { rows: 2, columns: 2 }, makeContext());
      expect(result.success).toBe(false);
    });
  });

  describe('updateShapeProperties', () => {
    it('updates color on all shapes', () => {
      const shapes = [
        { id: 's1', type: 'rectangle', x: 100, y: 100 },
        { id: 's2', type: 'circle', x: 200, y: 200 },
      ];
      const ctx = makeContext({ shapes });
      const result = executeCanvasTool(
        'updateShapeProperties',
        { color: '#ff0000', useSelected: false },
        ctx
      );
      expect(result.success).toBe(true);
      expect(ctx.updateShape).toHaveBeenCalledTimes(2);
    });

    it('returns error with no shapes', () => {
      const result = executeCanvasTool(
        'updateShapeProperties',
        { color: '#ff0000' },
        makeContext()
      );
      expect(result.success).toBe(false);
    });
  });

  describe('deleteShapes', () => {
    it('requires confirmation', () => {
      const shapes = [{ id: 's1', type: 'rectangle', x: 0, y: 0 }];
      const result = executeCanvasTool(
        'deleteShapes',
        { confirmation: false },
        makeContext({ shapes })
      );
      expect(result.success).toBe(false);
      expect(result.message).toContain('confirmation');
    });

    it('deletes shapes when confirmed', () => {
      const shapes = [{ id: 's1', type: 'rectangle', x: 0, y: 0 }];
      const ctx = makeContext({ shapes });
      const result = executeCanvasTool(
        'deleteShapes',
        { confirmation: true, useSelected: false },
        ctx
      );
      expect(result.success).toBe(true);
      expect(ctx.deleteShape).toHaveBeenCalledWith('s1');
    });
  });

  describe('getCanvasInfo', () => {
    it('returns canvas state', () => {
      const shapes = [
        { id: 's1', type: 'rectangle' },
        { id: 's2', type: 'circle' },
        { id: 's3', type: 'rectangle' },
      ];
      const result = executeCanvasTool(
        'getCanvasInfo',
        {},
        makeContext({ shapes, selectedShapeIds: ['s1'] })
      );
      expect(result.success).toBe(true);
      expect(result.data.totalShapes).toBe(3);
      expect(result.data.selectedShapes).toBe(1);
      expect(result.data.shapesByType.rectangle).toBe(2);
      expect(result.data.shapesByType.circle).toBe(1);
    });
  });

  describe('selectShapes', () => {
    it('selects shapes by type', () => {
      const shapes = [
        { id: 's1', type: 'rectangle', color: '#fff' },
        { id: 's2', type: 'circle', color: '#fff' },
      ];
      const ctx = makeContext({ shapes });
      const result = executeCanvasTool('selectShapes', { shapeType: 'rectangle' }, ctx);
      expect(result.success).toBe(true);
      expect(result.data.count).toBe(1);
      expect(ctx.selectShape).toHaveBeenCalledWith('s1');
    });

    it('selects shapes by color', () => {
      const shapes = [
        { id: 's1', type: 'rectangle', color: '#ff0000' },
        { id: 's2', type: 'circle', color: '#00ff00' },
      ];
      const ctx = makeContext({ shapes });
      const result = executeCanvasTool('selectShapes', { color: '#ff0000' }, ctx);
      expect(result.data.count).toBe(1);
    });

    it('selects all with shapeType "all"', () => {
      const shapes = [
        { id: 's1', type: 'rectangle', color: '#fff' },
        { id: 's2', type: 'circle', color: '#fff' },
      ];
      const ctx = makeContext({ shapes });
      const result = executeCanvasTool('selectShapes', { shapeType: 'all' }, ctx);
      expect(result.data.count).toBe(2);
    });
  });
});
