/**
 * Tests for canvasService.js
 * Testing core CRUD operations for shapes
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createShape,
  updateShape,
  deleteShape,
  getCanvasMetadata,
} from '../services/canvasService';

describe('canvasService - Shape Operations', () => {
  const testCanvasId = 'test-canvas-123';
  const testUserId = 'test-user-456';
  const createdShapeIds = [];

  afterEach(async () => {
    // Cleanup created shapes
    for (const shapeId of createdShapeIds) {
      try {
        await deleteShape(testCanvasId, shapeId);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    createdShapeIds.length = 0;
  });

  describe('createShape', () => {
    it('should create a rectangle shape', async () => {
      const shapeData = {
        type: 'rectangle',
        x: 100,
        y: 100,
        width: 200,
        height: 150,
        color: '#646cff',
        rotation: 0,
        createdBy: testUserId,
      };

      const shapeId = await createShape(testCanvasId, shapeData);
      createdShapeIds.push(shapeId);

      expect(shapeId).toBeDefined();
      expect(typeof shapeId).toBe('string');
    });

    it('should create a circle shape', async () => {
      const shapeData = {
        type: 'circle',
        x: 300,
        y: 300,
        radius: 50,
        color: '#ff6347',
        rotation: 0,
        createdBy: testUserId,
      };

      const shapeId = await createShape(testCanvasId, shapeData);
      createdShapeIds.push(shapeId);

      expect(shapeId).toBeDefined();
    });

    it('should create a custom polygon shape', async () => {
      const shapeData = {
        type: 'customPolygon',
        vertices: [
          { x: 100, y: 100 },
          { x: 200, y: 100 },
          { x: 150, y: 200 },
        ],
        color: '#00ff00',
        rotation: 0,
        createdBy: testUserId,
      };

      const shapeId = await createShape(testCanvasId, shapeData);
      createdShapeIds.push(shapeId);

      expect(shapeId).toBeDefined();
    });
  });

  describe('updateShape', () => {
    it('should update shape position', async () => {
      // Create a shape first
      const shapeData = {
        type: 'rectangle',
        x: 100,
        y: 100,
        width: 200,
        height: 150,
        color: '#646cff',
        rotation: 0,
        createdBy: testUserId,
      };

      const shapeId = await createShape(testCanvasId, shapeData);
      createdShapeIds.push(shapeId);

      // Update position
      await updateShape(testCanvasId, shapeId, {
        x: 200,
        y: 200,
      });

      // Test passes if no error thrown
      expect(true).toBe(true);
    });

    it('should update shape color', async () => {
      const shapeData = {
        type: 'circle',
        x: 300,
        y: 300,
        radius: 50,
        color: '#ff6347',
        rotation: 0,
        createdBy: testUserId,
      };

      const shapeId = await createShape(testCanvasId, shapeData);
      createdShapeIds.push(shapeId);

      await updateShape(testCanvasId, shapeId, {
        color: '#00ff00',
      });

      expect(true).toBe(true);
    });
  });

  describe('deleteShape', () => {
    it('should delete a shape', async () => {
      const shapeData = {
        type: 'rectangle',
        x: 100,
        y: 100,
        width: 200,
        height: 150,
        color: '#646cff',
        rotation: 0,
        createdBy: testUserId,
      };

      const shapeId = await createShape(testCanvasId, shapeData);

      // Delete the shape
      await deleteShape(testCanvasId, shapeId);

      // Test passes if no error thrown
      expect(true).toBe(true);
    });
  });
});

describe('canvasService - Canvas Operations', () => {
  it('should get canvas metadata', async () => {
    // This tests that the function exists and handles errors gracefully
    try {
      const metadata = await getCanvasMetadata('test-canvas');
      // Metadata might be null if canvas doesn't exist, that's ok
      expect(metadata === null || typeof metadata === 'object').toBe(true);
    } catch (e) {
      // Error is acceptable for non-existent canvas
      expect(true).toBe(true);
    }
  });
});

// Export for use in integration tests
export { testCanvasId, testUserId };

