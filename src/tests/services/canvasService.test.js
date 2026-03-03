import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref, set, update, remove, get, onValue } from 'firebase/database';
import {
  generateObjectId,
  createShape,
  updateShape,
  deleteShape,
  monitorConnection,
} from '../../services/canvasService';

// Firebase mocks are set up in setup.js

describe('canvasService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateObjectId', () => {
    it('includes userId in the ID', () => {
      const id = generateObjectId('user123');
      expect(id).toContain('user123');
    });

    it('generates unique IDs', () => {
      const id1 = generateObjectId('user1');
      const id2 = generateObjectId('user1');
      expect(id1).not.toBe(id2);
    });

    it('follows format: userId_timestamp_random', () => {
      const id = generateObjectId('user1');
      const parts = id.split('_');
      expect(parts.length).toBe(3);
      expect(parts[0]).toBe('user1');
      expect(Number(parts[1])).toBeGreaterThan(0);
      expect(parts[2].length).toBeGreaterThan(0);
    });
  });

  describe('createShape', () => {
    it('calls firebase set with shape data', async () => {
      const shapeData = {
        type: 'rectangle',
        x: 100,
        y: 200,
        width: 50,
        height: 50,
        color: '#ff0000',
        createdBy: 'user1',
      };
      const result = await createShape('canvas1', shapeData);
      expect(ref).toHaveBeenCalled();
      expect(set).toHaveBeenCalled();
      expect(typeof result).toBe('string');
    });
  });

  describe('updateShape', () => {
    it('calls firebase update with correct data', async () => {
      await updateShape('canvas1', 'shape1', { x: 150, y: 250 });
      expect(ref).toHaveBeenCalled();
      expect(update).toHaveBeenCalled();
    });
  });

  describe('deleteShape', () => {
    it('calls firebase remove', async () => {
      await deleteShape('canvas1', 'shape1');
      expect(ref).toHaveBeenCalled();
      expect(remove).toHaveBeenCalled();
    });
  });

  describe('monitorConnection', () => {
    it('subscribes to .info/connected and returns unsubscribe', () => {
      const callback = vi.fn();
      const unsub = monitorConnection(callback);
      expect(onValue).toHaveBeenCalled();
      expect(typeof unsub).toBe('function');
    });
  });
});
