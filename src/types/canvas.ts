// Shape types
export type ShapeType = 'rectangle' | 'circle' | 'polygon' | 'customPolygon' | 'text' | 'image';
export type ToolType = 'select' | ShapeType;
export type CanvasRole = 'owner' | 'editor' | 'viewer';

// Base shape properties shared by all shapes
export interface ShapeBase {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  color: string;
  createdBy: string;
  lockedBy: string | null;
  lockedByUserName: string | null;
  timestamp: number;
  rotation: number;
  zIndex?: number;
}

export interface RectangleShape extends ShapeBase {
  type: 'rectangle';
  width: number;
  height: number;
}

export interface CircleShape extends ShapeBase {
  type: 'circle';
  radius: number;
}

export interface PolygonShape extends ShapeBase {
  type: 'polygon';
  radius: number;
  sides: number;
}

export interface CustomPolygonShape extends ShapeBase {
  type: 'customPolygon';
  vertices: { x: number; y: number }[];
}

export interface TextShape extends ShapeBase {
  type: 'text';
  width: number;
  height: number;
  text: string;
  fontSize: number;
  textColor: string;
  backgroundColor?: string;
}

export interface ImageShape extends ShapeBase {
  type: 'image';
  width: number;
  height: number;
  imageUrl: string;
}

export type Shape =
  | RectangleShape
  | CircleShape
  | PolygonShape
  | CustomPolygonShape
  | TextShape
  | ImageShape;

// Viewport
export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

// Cursor (real-time cursor positions)
export interface Cursor {
  userId: string;
  x: number;
  y: number;
  userName: string;
  timestamp: number;
  arrivalTime: number;
}

// Presence (online users)
export interface PresenceEntry {
  userId: string;
  userName: string;
  isOnline: boolean;
  lastSeen: number;
  color: string;
  sessionId?: string;
  status?: 'active' | 'away';
}

// Authenticated user
export interface User {
  uid: string;
  email: string | null;
  displayName: string;
  photoURL: string | null;
}

// Canvas metadata
export interface CanvasMetadata {
  id: string;
  name: string;
  ownerId: string;
  createdAt: number;
  updatedAt: number;
  starred?: boolean;
  template?: string;
  settings?: CanvasSettings;
  members?: Record<string, CanvasRole>;
}

export interface CanvasSettings {
  backgroundColor: string;
  gridVisible: boolean;
}

// Undo/redo action
export interface HistoryAction {
  type: 'create' | 'delete';
  shapeId: string;
  shapeData?: Shape;
  timestamp?: number;
}
