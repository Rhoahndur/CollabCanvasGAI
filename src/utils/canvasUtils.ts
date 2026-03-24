/**
 * Canvas utility functions for coordinate transformations and calculations
 */

interface ViewportParams {
  offsetX: number;
  offsetY: number;
  zoom: number;
}

interface Point {
  x: number;
  y: number;
}

export function screenToCanvas(
  screenX: number,
  screenY: number,
  viewport: ViewportParams,
  svgRect: DOMRect
): Point {
  const { offsetX, offsetY, zoom } = viewport;
  const relativeX = screenX - svgRect.left;
  const relativeY = screenY - svgRect.top;
  const canvasX = relativeX / zoom + offsetX;
  const canvasY = relativeY / zoom + offsetY;
  return { x: canvasX, y: canvasY };
}

export function isPointInRect(
  pointX: number,
  pointY: number,
  rect: { x: number; y: number; width: number; height: number }
): boolean {
  return (
    pointX >= rect.x &&
    pointX <= rect.x + rect.width &&
    pointY >= rect.y &&
    pointY <= rect.y + rect.height
  );
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function clampPanOffset(
  offsetX: number,
  offsetY: number,
  zoom: number,
  viewportWidth: number,
  viewportHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  paddingPercent: number = 0.2
): { offsetX: number; offsetY: number } {
  const visibleWidth = viewportWidth / zoom;
  const visibleHeight = viewportHeight / zoom;
  const paddingX = canvasWidth * paddingPercent;
  const paddingY = canvasHeight * paddingPercent;

  const minOffsetX = -paddingX;
  const maxOffsetX = canvasWidth - visibleWidth + paddingX;
  const minOffsetY = -paddingY;
  const maxOffsetY = canvasHeight - visibleHeight + paddingY;

  const clampedOffsetX = clamp(offsetX, minOffsetX, maxOffsetX);
  const clampedOffsetY = clamp(offsetY, minOffsetY, maxOffsetY);

  return { offsetX: clampedOffsetX, offsetY: clampedOffsetY };
}

export function calculateFPS(frameTimes: number[]): number {
  if (frameTimes.length < 2) return 0;
  const timeSpan = frameTimes[frameTimes.length - 1] - frameTimes[0];
  const fps = (frameTimes.length - 1) / (timeSpan / 1000);
  return Math.round(fps);
}

export interface ShapeBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

/**
 * Compute the axis-aligned bounding box for any shape.
 *
 * Coordinate conventions (matching SVG rendering):
 *   RECTANGLE / TEXT  — x,y is top-left
 *   IMAGE             — x,y is center (default 200×200)
 *   CIRCLE / POLYGON  — x,y is center
 *   CUSTOM_POLYGON    — absolute vertex coordinates
 */
export function getShapeBounds(shape: {
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  vertices?: Point[];
}): ShapeBounds {
  let minX: number, maxX: number, minY: number, maxY: number;

  switch (shape.type) {
    case 'rectangle':
    case 'text': {
      const w = shape.width || 100;
      const h = shape.height || 100;
      minX = shape.x;
      maxX = shape.x + w;
      minY = shape.y;
      maxY = shape.y + h;
      break;
    }
    case 'image': {
      const w = shape.width || 200;
      const h = shape.height || 200;
      minX = shape.x - w / 2;
      maxX = shape.x + w / 2;
      minY = shape.y - h / 2;
      maxY = shape.y + h / 2;
      break;
    }
    case 'circle':
    case 'polygon': {
      const r = shape.radius || 50;
      minX = shape.x - r;
      maxX = shape.x + r;
      minY = shape.y - r;
      maxY = shape.y + r;
      break;
    }
    case 'customPolygon': {
      if (shape.vertices && shape.vertices.length > 0) {
        const xs = shape.vertices.map((v) => v.x);
        const ys = shape.vertices.map((v) => v.y);
        minX = Math.min(...xs);
        maxX = Math.max(...xs);
        minY = Math.min(...ys);
        maxY = Math.max(...ys);
      } else {
        minX = shape.x;
        maxX = shape.x;
        minY = shape.y;
        maxY = shape.y;
      }
      break;
    }
    default: {
      minX = shape.x;
      maxX = shape.x + (shape.width || 0);
      minY = shape.y;
      maxY = shape.y + (shape.height || 0);
      break;
    }
  }

  const width = maxX - minX;
  const height = maxY - minY;
  return {
    minX,
    maxX,
    minY,
    maxY,
    centerX: minX + width / 2,
    centerY: minY + height / 2,
    width,
    height,
  };
}

export function constrainRectangle(
  x: number,
  y: number,
  width: number,
  height: number,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number; width: number; height: number } {
  const constrainedX = clamp(x, 0, canvasWidth - width);
  const constrainedY = clamp(y, 0, canvasHeight - height);
  return { x: constrainedX, y: constrainedY, width, height };
}

export function constrainCircle(
  x: number,
  y: number,
  radius: number,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number; radius: number } {
  const constrainedX = clamp(x, radius, canvasWidth - radius);
  const constrainedY = clamp(y, radius, canvasHeight - radius);
  return { x: constrainedX, y: constrainedY, radius };
}
