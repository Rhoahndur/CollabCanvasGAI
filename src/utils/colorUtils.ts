/**
 * Color utility functions for canvas objects and user colors
 */

import { CANVAS_COLORS } from './constants';

export function getRandomColor(seed?: string): string {
  if (seed) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % CANVAS_COLORS.length;
    return CANVAS_COLORS[index];
  }

  const index = Math.floor(Math.random() * CANVAS_COLORS.length);
  return CANVAS_COLORS[index];
}

export function getUserColor(userId: string): string {
  return getRandomColor(userId);
}

export function getContrastColor(hexColor: string): string {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

export function getGridColor(backgroundColor: string): string {
  const hex = backgroundColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  if (luminance > 0.5) {
    return 'rgba(0, 0, 0, 0.1)';
  } else {
    return 'rgba(255, 255, 255, 0.1)';
  }
}
