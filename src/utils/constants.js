/**
 * Canvas and application constants
 * Defines fixed canvas size, zoom limits, colors, and other configuration
 */

// Canvas dimensions - fixed boundaries
export const CANVAS_WIDTH = 5000;
export const CANVAS_HEIGHT = 5000;

// Zoom configuration
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 5;
export const ZOOM_SENSITIVITY = 0.001;
export const DEFAULT_ZOOM = 1;

// Pan configuration
export const PAN_PADDING = 200; // Allow panning slightly beyond canvas edges

// Rectangle defaults
export const MIN_RECTANGLE_SIZE = 20; // Minimum width/height for rectangles
export const DEFAULT_RECTANGLE_WIDTH = 100;
export const DEFAULT_RECTANGLE_HEIGHT = 100;

// Hardcoded colors for pseudorandom assignment (3-5 colors as per spec)
export const CANVAS_COLORS = [
  '#646cff', // Purple-blue
  '#9333ea', // Purple
  '#06b6d4', // Cyan
  '#10b981', // Green
  '#f59e0b', // Orange
];

// Grid configuration
export const GRID_SIZE = 50;
export const GRID_COLOR = 'rgba(255, 255, 255, 0.1)';

// Performance monitoring
export const SHOW_FPS_COUNTER = import.meta.env.DEV; // Only show in development
export const FPS_UPDATE_INTERVAL = 500; // Update FPS every 500ms

// Firestore configuration
export const CURSOR_UPDATE_THROTTLE = 75; // Max cursor updates per second (ms) - reduced for performance
export const DRAG_UPDATE_THROTTLE = 50; // Throttle rectangle drag updates (ms)
export const PRESENCE_HEARTBEAT_INTERVAL = 30000; // Update presence every 30 seconds

// Canvas boundary styling
export const BOUNDARY_COLOR = '#444';
export const BOUNDARY_WIDTH = 2;

// Selection styling
export const SELECTION_COLOR = '#646cff';
export const SELECTION_WIDTH = 3;

// Lock indicator styling
export const LOCKED_OVERLAY_COLOR = 'rgba(255, 100, 100, 0.1)';

// Default canvas ID (for MVP we use a single canvas)
export const DEFAULT_CANVAS_ID = 'main-canvas';

// Data Models

/**
 * Rectangle object structure
 * {
 *   id: string,              // Composite ID format: {userId}_{timestamp}
 *   x: number,               // X position on canvas
 *   y: number,               // Y position on canvas
 *   width: number,           // Rectangle width
 *   height: number,          // Rectangle height
 *   color: string,           // Hex color code
 *   createdBy: string,       // User ID of creator
 *   lockedBy: string | null, // User ID of current lock holder, null if unlocked
 *   timestamp: number,       // Creation timestamp
 * }
 */

/**
 * Cursor object structure
 * {
 *   userId: string,          // User ID
 *   x: number,               // X position on canvas
 *   y: number,               // Y position on canvas
 *   userName: string,        // Display name
 *   timestamp: number,       // Last update timestamp
 *   arrivalTime: number,     // When cursor first appeared (for overlap resolution)
 * }
 */

/**
 * Presence object structure
 * {
 *   userId: string,          // User ID
 *   userName: string,        // Display name
 *   isOnline: boolean,       // Online status
 *   lastSeen: number,        // Last activity timestamp
 *   color: string,           // User's assigned color
 * }
 */

