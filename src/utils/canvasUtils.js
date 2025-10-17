/**
 * Canvas utility functions for coordinate transformations and calculations
 */

/**
 * Convert screen coordinates to canvas coordinates
 * Takes into account the current viewport (pan and zoom)
 * 
 * @param {number} screenX - X coordinate on screen
 * @param {number} screenY - Y coordinate on screen
 * @param {Object} viewport - Current viewport state {offsetX, offsetY, zoom}
 * @param {DOMRect} svgRect - SVG element's bounding rectangle
 * @returns {Object} Canvas coordinates {x, y}
 */
export function screenToCanvas(screenX, screenY, viewport, svgRect) {
  const { offsetX, offsetY, zoom } = viewport;
  
  // Convert screen position to relative position within SVG
  const relativeX = screenX - svgRect.left;
  const relativeY = screenY - svgRect.top;
  
  // Account for zoom and offset
  const canvasX = relativeX / zoom + offsetX;
  const canvasY = relativeY / zoom + offsetY;
  
  return { x: canvasX, y: canvasY };
}

/**
 * Convert canvas coordinates to screen coordinates
 * Takes into account the current viewport (pan and zoom)
 * 
 * @param {number} canvasX - X coordinate on canvas
 * @param {number} canvasY - Y coordinate on canvas
 * @param {Object} viewport - Current viewport state {offsetX, offsetY, zoom}
 * @param {DOMRect} svgRect - SVG element's bounding rectangle
 * @returns {Object} Screen coordinates {x, y}
 */
export function canvasToScreen(canvasX, canvasY, viewport, svgRect) {
  const { offsetX, offsetY, zoom } = viewport;
  
  // Account for offset and zoom
  const relativeX = (canvasX - offsetX) * zoom;
  const relativeY = (canvasY - offsetY) * zoom;
  
  // Convert to screen position
  const screenX = relativeX + svgRect.left;
  const screenY = relativeY + svgRect.top;
  
  return { x: screenX, y: screenY };
}

/**
 * Check if a point is inside a rectangle
 * 
 * @param {number} pointX - X coordinate of point
 * @param {number} pointY - Y coordinate of point
 * @param {Object} rect - Rectangle object {x, y, width, height}
 * @returns {boolean} True if point is inside rectangle
 */
export function isPointInRect(pointX, pointY, rect) {
  return (
    pointX >= rect.x &&
    pointX <= rect.x + rect.width &&
    pointY >= rect.y &&
    pointY <= rect.y + rect.height
  );
}

/**
 * Clamp a value between min and max
 * 
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Calculate clamped pan offset to keep canvas within bounds
 * 
 * @param {number} offsetX - Desired X offset
 * @param {number} offsetY - Desired Y offset
 * @param {number} zoom - Current zoom level
 * @param {number} viewportWidth - Width of viewport
 * @param {number} viewportHeight - Height of viewport
 * @param {number} canvasWidth - Width of canvas
 * @param {number} canvasHeight - Height of canvas
 * @param {number} paddingPercent - Padding beyond boundaries as percentage (e.g., 0.2 for 20%)
 * @returns {Object} Clamped offsets {offsetX, offsetY}
 */
export function clampPanOffset(
  offsetX,
  offsetY,
  zoom,
  viewportWidth,
  viewportHeight,
  canvasWidth,
  canvasHeight,
  paddingPercent = 0.2
) {
  // Calculate visible area in canvas coordinates
  const visibleWidth = viewportWidth / zoom;
  const visibleHeight = viewportHeight / zoom;
  
  // Calculate padding as percentage of canvas size
  const paddingX = canvasWidth * paddingPercent;
  const paddingY = canvasHeight * paddingPercent;
  
  // Calculate min/max offsets with padding
  const minOffsetX = -paddingX;
  const maxOffsetX = canvasWidth - visibleWidth + paddingX;
  const minOffsetY = -paddingY;
  const maxOffsetY = canvasHeight - visibleHeight + paddingY;
  
  // Clamp offsets
  const clampedOffsetX = clamp(offsetX, minOffsetX, maxOffsetX);
  const clampedOffsetY = clamp(offsetY, minOffsetY, maxOffsetY);
  
  return {
    offsetX: clampedOffsetX,
    offsetY: clampedOffsetY,
  };
}

/**
 * Calculate FPS from frame timestamps
 * 
 * @param {number[]} frameTimes - Array of frame timestamps
 * @returns {number} Current FPS
 */
export function calculateFPS(frameTimes) {
  if (frameTimes.length < 2) return 0;
  
  const timeSpan = frameTimes[frameTimes.length - 1] - frameTimes[0];
  const fps = (frameTimes.length - 1) / (timeSpan / 1000);
  
  return Math.round(fps);
}

/**
 * Constrain a rectangle to stay within canvas boundaries
 * 
 * @param {number} x - Rectangle x position
 * @param {number} y - Rectangle y position
 * @param {number} width - Rectangle width
 * @param {number} height - Rectangle height
 * @param {number} canvasWidth - Canvas width
 * @param {number} canvasHeight - Canvas height
 * @returns {Object} Constrained rectangle {x, y, width, height}
 */
export function constrainRectangle(x, y, width, height, canvasWidth, canvasHeight) {
  // Clamp position to keep rectangle on canvas
  const constrainedX = clamp(x, 0, canvasWidth - width);
  const constrainedY = clamp(y, 0, canvasHeight - height);
  
  return {
    x: constrainedX,
    y: constrainedY,
    width,
    height,
  };
}

/**
 * Constrain a circle/polygon to stay within canvas boundaries
 * 
 * @param {number} x - Center x position
 * @param {number} y - Center y position
 * @param {number} radius - Circle/polygon radius
 * @param {number} canvasWidth - Canvas width
 * @param {number} canvasHeight - Canvas height
 * @returns {Object} Constrained position {x, y, radius}
 */
export function constrainCircle(x, y, radius, canvasWidth, canvasHeight) {
  // Clamp position to keep circle/polygon on canvas
  const constrainedX = clamp(x, radius, canvasWidth - radius);
  const constrainedY = clamp(y, radius, canvasHeight - radius);
  
  return {
    x: constrainedX,
    y: constrainedY,
    radius,
  };
}

