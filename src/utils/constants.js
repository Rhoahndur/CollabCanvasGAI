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
export const PAN_PADDING_PERCENT = 0.2; // Allow panning 20% beyond canvas edges

// Shape types
export const SHAPE_TYPES = {
  RECTANGLE: 'rectangle',
  CIRCLE: 'circle',
  POLYGON: 'polygon',
  CUSTOM_POLYGON: 'customPolygon',
  TEXT: 'text',
  IMAGE: 'image',
};

// Tool types
export const TOOL_TYPES = {
  SELECT: 'select',
  ...SHAPE_TYPES,
};

// Shape defaults
export const MIN_SHAPE_SIZE = 20; // Minimum width/height/radius for shapes
export const MIN_RECTANGLE_SIZE = 20; // Alias for MIN_SHAPE_SIZE (kept for backward compatibility)
export const DEFAULT_RECTANGLE_WIDTH = 100;
export const DEFAULT_RECTANGLE_HEIGHT = 100;
export const MIN_CIRCLE_RADIUS = 10;
export const DEFAULT_CIRCLE_RADIUS = 50;
export const MIN_POLYGON_RADIUS = 10;
export const DEFAULT_POLYGON_SIDES = 5; // Pentagon by default

// Hardcoded colors for pseudorandom assignment (3-5 colors as per spec)
export const CANVAS_COLORS = [
  '#646cff', // Purple-blue
  '#9333ea', // Purple
  '#06b6d4', // Cyan
  '#10b981', // Green
  '#f59e0b', // Orange
];

// Text color palette (for text formatting)
export const TEXT_COLORS = [
  '#ffffff', // White
  '#cccccc', // Light Gray
  '#888888', // Gray
  '#646cff', // Purple-blue
  '#9333ea', // Purple
  '#06b6d4', // Cyan
  '#10b981', // Green
  '#f59e0b', // Orange
  '#ef4444', // Red
  '#ec4899', // Pink
  '#000000', // Black
];

// Text formatting defaults
export const DEFAULT_FONT_SIZE = 16;
export const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48];
export const DEFAULT_TEXT_COLOR = '#ffffff';

// Grid configuration
export const GRID_SIZE = 50;
export const GRID_COLOR = 'rgba(255, 255, 255, 0.1)';

// Performance monitoring
export const SHOW_FPS_COUNTER = import.meta.env.DEV; // Only show in development
export const FPS_UPDATE_INTERVAL = 500; // Update FPS every 500ms

// Firestore configuration
export const CURSOR_UPDATE_THROTTLE = 75; // Max cursor updates per second (ms) - reduced for performance
export const DRAG_UPDATE_THROTTLE = 50; // Throttle shape drag updates (ms)
export const PRESENCE_HEARTBEAT_INTERVAL = 5000; // Update presence every 5 seconds (frequent for reliability)
export const PRESENCE_TIMEOUT = 60000; // Consider user offline after 60 seconds of inactivity (generous buffer)
export const PRESENCE_AWAY_TIMEOUT = 120000; // Consider user away after 2 minutes of inactivity
export const AUTO_LOGOUT_TIMEOUT = 1800000; // Auto-logout after 30 minutes of inactivity (30 * 60 * 1000)

// Canvas boundary styling
export const BOUNDARY_COLOR = '#444';
export const BOUNDARY_WIDTH = 2;

// Selection styling
export const SELECTION_COLOR = '#646cff';
export const SELECTION_WIDTH = 3;

// Resize and rotation handles
export const HANDLE_SIZE = 8; // Size of resize handles in pixels
export const ROTATION_HANDLE_OFFSET = 40; // Distance of rotation handle from shape
export const HANDLE_FILL = '#646cff';
export const HANDLE_STROKE = '#fff';
export const HANDLE_STROKE_WIDTH = 2;

// Lock indicator styling
export const LOCKED_OVERLAY_COLOR = 'rgba(255, 100, 100, 0.1)';

// Default canvas ID (for MVP we use a single canvas)
export const DEFAULT_CANVAS_ID = 'main-canvas';

// Multi-Canvas Constants
export const MAX_CANVASES_PER_USER = 2; // Maximum canvases per user
export const CANVAS_TEMPLATES = {
  BLANK: 'blank',
  BRAINSTORM: 'brainstorm',
  WIREFRAME: 'wireframe',
};
export const CANVAS_ROLE = {
  OWNER: 'owner',
  EDITOR: 'editor',
  VIEWER: 'viewer',
};

// Data Models

/**
 * Shape object structure (base for all shapes)
 * {
 *   id: string,              // Composite ID format: {userId}_{timestamp}
 *   type: string,            // Shape type: 'rectangle', 'circle', 'polygon', 'customPolygon', 'text', 'image'
 *   x: number,               // X position on canvas (center for circle/polygon, top-left for rectangle/text/image)
 *   y: number,               // Y position on canvas
 *   color: string,           // Hex color code
 *   createdBy: string,       // User ID of creator
 *   lockedBy: string | null, // User ID of current lock holder, null if unlocked
 *   timestamp: number,       // Creation timestamp
 *   rotation: number,        // Rotation angle in degrees (default: 0)
 *   
 *   // Rectangle-specific
 *   width: number,           // Rectangle width (only for rectangles)
 *   height: number,          // Rectangle height (only for rectangles)
 *   
 *   // Circle-specific
 *   radius: number,          // Circle radius (only for circles)
 *   
 *   // Polygon-specific
 *   radius: number,          // Polygon radius (only for polygons)
 *   sides: number,           // Number of sides (only for polygons)
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

