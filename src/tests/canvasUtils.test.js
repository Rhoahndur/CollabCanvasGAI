/**
 * Tests for canvasUtils.js
 * Testing canvas utility functions
 */

import { describe, it, expect } from 'vitest';
import {
  screenToCanvas,
  clamp,
  isPointInRect,
  constrainRectangle,
  constrainCircle,
} from '../utils/canvasUtils';

describe('canvasUtils', () => {
  describe('screenToCanvas', () => {
    const svgRect = { left: 0, top: 0 };

    it('should convert screen coordinates to canvas coordinates with no offset or zoom', () => {
      const viewport = { offsetX: 0, offsetY: 0, zoom: 1 };
      const result = screenToCanvas(100, 200, viewport, svgRect);

      expect(result.x).toBe(100);
      expect(result.y).toBe(200);
    });

    it('should apply viewport offset', () => {
      // canvasX = (screenX - svgRect.left) / zoom + offsetX = (100-0)/1 + 50 = 150
      const viewport = { offsetX: 50, offsetY: 100, zoom: 1 };
      const result = screenToCanvas(100, 200, viewport, svgRect);

      expect(result.x).toBe(150);
      expect(result.y).toBe(300);
    });

    it('should apply zoom', () => {
      // canvasX = (screenX - 0) / 2 + 0 = 50
      const viewport = { offsetX: 0, offsetY: 0, zoom: 2 };
      const result = screenToCanvas(100, 200, viewport, svgRect);

      expect(result.x).toBe(50);
      expect(result.y).toBe(100);
    });

    it('should apply both offset and zoom', () => {
      // canvasX = (200-0)/2 + 100 = 200, canvasY = (400-0)/2 + 200 = 400
      const viewport = { offsetX: 100, offsetY: 200, zoom: 2 };
      const result = screenToCanvas(200, 400, viewport, svgRect);

      expect(result.x).toBe(200);
      expect(result.y).toBe(400);
    });
  });

  describe('clamp', () => {
    it('should return value if within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
    });

    it('should return min if value is below range', () => {
      expect(clamp(-5, 0, 10)).toBe(0);
    });

    it('should return max if value is above range', () => {
      expect(clamp(15, 0, 10)).toBe(10);
    });

    it('should handle equal min and max', () => {
      expect(clamp(5, 10, 10)).toBe(10);
    });
  });

  describe('isPointInRect', () => {
    const rect = { x: 100, y: 100, width: 200, height: 150 };

    it('should return true for point inside rectangle', () => {
      expect(isPointInRect(200, 150, rect)).toBe(true);
    });

    it('should return false for point outside rectangle', () => {
      expect(isPointInRect(50, 50, rect)).toBe(false);
      expect(isPointInRect(350, 150, rect)).toBe(false);
      expect(isPointInRect(200, 300, rect)).toBe(false);
    });

    it('should return true for point on rectangle edge', () => {
      expect(isPointInRect(100, 100, rect)).toBe(true);
      expect(isPointInRect(300, 250, rect)).toBe(true);
    });
  });

  describe('constrainRectangle', () => {
    const canvasWidth = 1000;
    const canvasHeight = 800;

    it('should not modify rectangle within bounds', () => {
      const result = constrainRectangle(100, 100, 200, 150, canvasWidth, canvasHeight);

      expect(result.x).toBe(100);
      expect(result.y).toBe(100);
      expect(result.width).toBe(200);
      expect(result.height).toBe(150);
    });

    it('should constrain rectangle extending beyond right edge', () => {
      const result = constrainRectangle(900, 100, 200, 150, canvasWidth, canvasHeight);

      expect(result.x + result.width).toBeLessThanOrEqual(canvasWidth);
    });

    it('should constrain rectangle extending beyond bottom edge', () => {
      const result = constrainRectangle(100, 700, 200, 150, canvasWidth, canvasHeight);

      expect(result.y + result.height).toBeLessThanOrEqual(canvasHeight);
    });

    it('should constrain rectangle beyond left edge', () => {
      const result = constrainRectangle(-50, 100, 200, 150, canvasWidth, canvasHeight);

      expect(result.x).toBeGreaterThanOrEqual(0);
    });

    it('should constrain rectangle beyond top edge', () => {
      const result = constrainRectangle(100, -50, 200, 150, canvasWidth, canvasHeight);

      expect(result.y).toBeGreaterThanOrEqual(0);
    });
  });

  describe('constrainCircle', () => {
    const canvasWidth = 1000;
    const canvasHeight = 800;

    it('should not modify circle within bounds', () => {
      const result = constrainCircle(500, 400, 50, canvasWidth, canvasHeight);

      expect(result.x).toBe(500);
      expect(result.y).toBe(400);
      expect(result.radius).toBe(50);
    });

    it('should constrain circle extending beyond right edge', () => {
      const result = constrainCircle(980, 400, 50, canvasWidth, canvasHeight);

      expect(result.x + result.radius).toBeLessThanOrEqual(canvasWidth);
    });

    it('should constrain circle extending beyond bottom edge', () => {
      const result = constrainCircle(500, 780, 50, canvasWidth, canvasHeight);

      expect(result.y + result.radius).toBeLessThanOrEqual(canvasHeight);
    });

    it('should constrain circle beyond left edge', () => {
      const result = constrainCircle(20, 400, 50, canvasWidth, canvasHeight);

      expect(result.x - result.radius).toBeGreaterThanOrEqual(0);
    });

    it('should constrain circle beyond top edge', () => {
      const result = constrainCircle(500, 20, 50, canvasWidth, canvasHeight);

      expect(result.y - result.radius).toBeGreaterThanOrEqual(0);
    });
  });
});
