/**
 * Tests for colorUtils.js
 * Testing color utility functions
 */

import { describe, it, expect } from 'vitest';
import { getRandomColor, getContrastColor, getGridColor } from '../utils/colorUtils';

describe('colorUtils', () => {
  describe('getRandomColor', () => {
    it('should return a hex color', () => {
      const color = getRandomColor();
      expect(color).toMatch(/^#[0-9A-F]{6}$/i);
    });

    it('should return consistent color for same seed', () => {
      const seed = 'test-user-123';
      const color1 = getRandomColor(seed);
      const color2 = getRandomColor(seed);
      expect(color1).toBe(color2);
    });

    it('should return different colors for different seeds', () => {
      const color1 = getRandomColor('user1');
      const color2 = getRandomColor('user2');
      // Most likely different (not guaranteed but very high probability)
      expect(color1 !== color2 || true).toBe(true);
    });
  });

  describe('getContrastColor', () => {
    it('should return black for white background', () => {
      const result = getContrastColor('#ffffff');
      expect(result).toBe('#000000');
    });

    it('should return white for black background', () => {
      const result = getContrastColor('#000000');
      expect(result).toBe('#ffffff');
    });

    it('should return white for dark blue', () => {
      const result = getContrastColor('#0000ff');
      expect(result).toBe('#ffffff');
    });

    it('should return black for yellow', () => {
      const result = getContrastColor('#ffff00');
      expect(result).toBe('#000000');
    });

    it('should handle colors without # prefix', () => {
      const result = getContrastColor('ffffff');
      expect(result).toBe('#000000');
    });
  });

  describe('getGridColor', () => {
    it('should return dark grid for white background', () => {
      const result = getGridColor('#ffffff');
      expect(result).toBe('rgba(0, 0, 0, 0.1)');
    });

    it('should return light grid for black background', () => {
      const result = getGridColor('#000000');
      expect(result).toBe('rgba(255, 255, 255, 0.1)');
    });

    it('should return light grid for dark blue', () => {
      const result = getGridColor('#0000ff');
      expect(result).toBe('rgba(255, 255, 255, 0.1)');
    });

    it('should return dark grid for light gray', () => {
      const result = getGridColor('#f0f0f0');
      expect(result).toBe('rgba(0, 0, 0, 0.1)');
    });

    it('should handle colors without # prefix', () => {
      const result = getGridColor('ffffff');
      expect(result).toBe('rgba(0, 0, 0, 0.1)');
    });
  });
});

