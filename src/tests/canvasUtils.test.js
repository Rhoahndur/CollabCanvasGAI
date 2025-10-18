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
    it('should convert screen coordinates to canvas coordinates with no offset or zoom', () => {
      const viewport = { offsetX: 0, offsetY: 0, zoom: 1 };
      const result = screenToCanvas(100, 200, viewport);
      
      expect(result.x).toBe(100);
      expect(result.y).toBe(200);
    });

    it('should apply viewport offset', () => {
      const viewport = { offsetX: 50, offsetY: 100, zoom: 1 };
      const result = screenToCanvas(100, 200, viewport);
      
      expect(result.x).toBe(50);
      expect(result.y).toBe(100);
    });

    it('should apply zoom', () => {
      const viewport = { offsetX: 0, offsetY: 0, zoom: 2 };
      const result = screenToCanvas(100, 200, viewport);
      
      expect(result.x).toBe(50);
      expect(result.y).toBe(100);
    });

    it('should apply both offset and zoom', () => {
      const viewport = { offsetX: 100, offsetY: 200, zoom: 2 };
      const result = screenToCanvas(200, 400, viewport);
      
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
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

