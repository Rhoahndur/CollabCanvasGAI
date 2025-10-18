/**
 * Color utility functions for canvas objects and user colors
 */

import { CANVAS_COLORS } from './constants';

/**
 * Get a pseudorandom color from the hardcoded color palette
 * Uses a simple index rotation for now, can be made more sophisticated later
 * 
 * @param {string} seed - Optional seed for consistent color assignment (e.g., userId)
 * @returns {string} Hex color code
 */
export function getRandomColor(seed) {
  if (seed) {
    // Generate a consistent index based on the seed (userId)
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % CANVAS_COLORS.length;
    return CANVAS_COLORS[index];
  }
  
  // Random selection if no seed provided
  const index = Math.floor(Math.random() * CANVAS_COLORS.length);
  return CANVAS_COLORS[index];
}

/**
 * Get a color for a user based on their userId
 * Ensures each user gets a consistent color
 * 
 * @param {string} userId - User ID
 * @returns {string} Hex color code
 */
export function getUserColor(userId) {
  return getRandomColor(userId);
}

/**
 * Get a contrasting text color (black or white) for a given background color
 * 
 * @param {string} hexColor - Hex color code (e.g., '#646cff')
 * @returns {string} '#000000' or '#ffffff'
 */
export function getContrastColor(hexColor) {
  // Remove # if present
  const hex = hexColor.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return black for light colors, white for dark colors
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

/**
 * Get an appropriate grid color based on background color
 * Light backgrounds get dark grid, dark backgrounds get light grid
 * 
 * @param {string} backgroundColor - Hex color code for background
 * @returns {string} Hex color code for grid
 */
export function getGridColor(backgroundColor) {
  // Remove # if present
  const hex = backgroundColor.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Light background (luminance > 0.5) → dark grid with low opacity
  // Dark background (luminance <= 0.5) → light grid with low opacity
  if (luminance > 0.5) {
    return 'rgba(0, 0, 0, 0.1)'; // Dark grid for light backgrounds
  } else {
    return 'rgba(255, 255, 255, 0.1)'; // Light grid for dark backgrounds
  }
}

