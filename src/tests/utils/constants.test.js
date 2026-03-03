import { describe, it, expect } from 'vitest';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  MIN_ZOOM,
  MAX_ZOOM,
  DEFAULT_ZOOM,
  ZOOM_SENSITIVITY,
  MIN_SHAPE_SIZE,
  DEFAULT_RECTANGLE_WIDTH,
  DEFAULT_RECTANGLE_HEIGHT,
  DEFAULT_CIRCLE_RADIUS,
  DEFAULT_POLYGON_SIDES,
  CANVAS_COLORS,
  TEXT_COLORS,
  DEFAULT_FONT_SIZE,
  FONT_SIZES,
  GRID_SIZE,
  CURSOR_UPDATE_THROTTLE,
  DRAG_UPDATE_THROTTLE,
  PRESENCE_HEARTBEAT_INTERVAL,
  PRESENCE_TIMEOUT,
  MAX_CANVASES_PER_USER,
  SHAPE_TYPES,
  CANVAS_ROLE,
} from '../../utils/constants';

describe('constants', () => {
  describe('canvas dimensions', () => {
    it('has positive canvas width and height', () => {
      expect(CANVAS_WIDTH).toBeGreaterThan(0);
      expect(CANVAS_HEIGHT).toBeGreaterThan(0);
    });

    it('canvas is 5000x5000', () => {
      expect(CANVAS_WIDTH).toBe(5000);
      expect(CANVAS_HEIGHT).toBe(5000);
    });
  });

  describe('zoom limits', () => {
    it('MIN_ZOOM < DEFAULT_ZOOM < MAX_ZOOM', () => {
      expect(MIN_ZOOM).toBeLessThan(DEFAULT_ZOOM);
      expect(DEFAULT_ZOOM).toBeLessThan(MAX_ZOOM);
    });

    it('MIN_ZOOM is positive', () => {
      expect(MIN_ZOOM).toBeGreaterThan(0);
    });

    it('ZOOM_SENSITIVITY is a small positive number', () => {
      expect(ZOOM_SENSITIVITY).toBeGreaterThan(0);
      expect(ZOOM_SENSITIVITY).toBeLessThan(1);
    });
  });

  describe('shape defaults', () => {
    it('MIN_SHAPE_SIZE is positive', () => {
      expect(MIN_SHAPE_SIZE).toBeGreaterThan(0);
    });

    it('default sizes are >= MIN_SHAPE_SIZE', () => {
      expect(DEFAULT_RECTANGLE_WIDTH).toBeGreaterThanOrEqual(MIN_SHAPE_SIZE);
      expect(DEFAULT_RECTANGLE_HEIGHT).toBeGreaterThanOrEqual(MIN_SHAPE_SIZE);
      expect(DEFAULT_CIRCLE_RADIUS).toBeGreaterThanOrEqual(MIN_SHAPE_SIZE / 2);
    });

    it('default polygon sides is >= 3', () => {
      expect(DEFAULT_POLYGON_SIDES).toBeGreaterThanOrEqual(3);
    });
  });

  describe('colors', () => {
    it('CANVAS_COLORS has at least 3 colors', () => {
      expect(CANVAS_COLORS.length).toBeGreaterThanOrEqual(3);
    });

    it('all canvas colors are hex strings', () => {
      CANVAS_COLORS.forEach((c) => {
        expect(c).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });

    it('TEXT_COLORS has at least 5 colors', () => {
      expect(TEXT_COLORS.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('text', () => {
    it('DEFAULT_FONT_SIZE is in FONT_SIZES array', () => {
      expect(FONT_SIZES).toContain(DEFAULT_FONT_SIZE);
    });

    it('FONT_SIZES is sorted ascending', () => {
      for (let i = 1; i < FONT_SIZES.length; i++) {
        expect(FONT_SIZES[i]).toBeGreaterThan(FONT_SIZES[i - 1]);
      }
    });
  });

  describe('timing constants', () => {
    it('GRID_SIZE is positive', () => {
      expect(GRID_SIZE).toBeGreaterThan(0);
    });

    it('throttles are positive', () => {
      expect(CURSOR_UPDATE_THROTTLE).toBeGreaterThan(0);
      expect(DRAG_UPDATE_THROTTLE).toBeGreaterThan(0);
    });

    it('presence heartbeat < timeout', () => {
      expect(PRESENCE_HEARTBEAT_INTERVAL).toBeLessThan(PRESENCE_TIMEOUT);
    });
  });

  describe('enums', () => {
    it('SHAPE_TYPES has required types', () => {
      expect(SHAPE_TYPES.RECTANGLE).toBe('rectangle');
      expect(SHAPE_TYPES.CIRCLE).toBe('circle');
      expect(SHAPE_TYPES.POLYGON).toBe('polygon');
      expect(SHAPE_TYPES.TEXT).toBe('text');
      expect(SHAPE_TYPES.IMAGE).toBe('image');
    });

    it('CANVAS_ROLE has owner, editor, viewer', () => {
      expect(CANVAS_ROLE.OWNER).toBe('owner');
      expect(CANVAS_ROLE.EDITOR).toBe('editor');
      expect(CANVAS_ROLE.VIEWER).toBe('viewer');
    });

    it('MAX_CANVASES_PER_USER is positive', () => {
      expect(MAX_CANVASES_PER_USER).toBeGreaterThan(0);
    });
  });
});
