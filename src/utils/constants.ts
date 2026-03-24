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
export const PAN_PADDING_PERCENT = 0.2;

// Shape types
export const SHAPE_TYPES = {
  RECTANGLE: 'rectangle',
  CIRCLE: 'circle',
  POLYGON: 'polygon',
  CUSTOM_POLYGON: 'customPolygon',
  TEXT: 'text',
  IMAGE: 'image',
} as const;

// Tool types
export const TOOL_TYPES = {
  SELECT: 'select',
  ...SHAPE_TYPES,
} as const;

// Shape defaults
export const MIN_SHAPE_SIZE = 20;
export const MIN_RECTANGLE_SIZE = 20;
export const DEFAULT_RECTANGLE_WIDTH = 100;
export const DEFAULT_RECTANGLE_HEIGHT = 100;
export const MIN_CIRCLE_RADIUS = 10;
export const DEFAULT_CIRCLE_RADIUS = 50;
export const MIN_POLYGON_RADIUS = 10;
export const DEFAULT_POLYGON_SIDES = 5;

// Hardcoded colors for pseudorandom assignment
export const CANVAS_COLORS: readonly string[] = [
  '#646cff',
  '#9333ea',
  '#06b6d4',
  '#10b981',
  '#f59e0b',
];

// Text color palette
export const TEXT_COLORS: readonly string[] = [
  '#ffffff',
  '#cccccc',
  '#888888',
  '#646cff',
  '#9333ea',
  '#06b6d4',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
  '#000000',
];

// Text formatting defaults
export const DEFAULT_FONT_SIZE = 16;
export const FONT_SIZES: readonly number[] = [12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48];
export const DEFAULT_TEXT_COLOR = '#ffffff';
export const DEFAULT_TEXT_BACKGROUND_COLOR = 'transparent';

// Grid configuration
export const GRID_SIZE = 50;
export const GRID_COLOR = 'rgba(255, 255, 255, 0.1)';

// Performance monitoring
export const SHOW_FPS_COUNTER: boolean = import.meta.env.DEV;
export const FPS_UPDATE_INTERVAL = 500;

// Firestore configuration
export const CURSOR_UPDATE_THROTTLE = 75;
export const DRAG_UPDATE_THROTTLE = 50;
export const PRESENCE_HEARTBEAT_INTERVAL = 5000;
export const PRESENCE_TIMEOUT = 60000;
export const PRESENCE_AWAY_TIMEOUT = 120000;
export const AUTO_LOGOUT_TIMEOUT = 1800000;

// Canvas boundary styling
export const BOUNDARY_COLOR = '#444';
export const BOUNDARY_WIDTH = 2;

// Selection styling
export const SELECTION_COLOR = '#646cff';
export const SELECTION_WIDTH = 3;

// Resize and rotation handles
export const HANDLE_SIZE = 8;
export const ROTATION_HANDLE_OFFSET = 40;
export const HANDLE_FILL = '#646cff';
export const HANDLE_STROKE = '#fff';
export const HANDLE_STROKE_WIDTH = 2;

// Lock indicator styling
export const LOCKED_OVERLAY_COLOR = 'rgba(255, 100, 100, 0.1)';

// Default canvas ID
export const DEFAULT_CANVAS_ID = 'main-canvas';

// Multi-Canvas Constants
export const MAX_CANVASES_PER_USER = 2;
export const CANVAS_TEMPLATES = {
  BLANK: 'blank',
  BRAINSTORM: 'brainstorm',
  WIREFRAME: 'wireframe',
} as const;
export const CANVAS_ROLE = {
  OWNER: 'owner',
  EDITOR: 'editor',
  VIEWER: 'viewer',
} as const;
