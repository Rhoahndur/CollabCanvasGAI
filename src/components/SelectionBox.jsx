import { memo } from 'react';
import { 
  SELECTION_COLOR, 
  SELECTION_WIDTH, 
  HANDLE_SIZE, 
  HANDLE_FILL, 
  HANDLE_STROKE, 
  HANDLE_STROKE_WIDTH,
  ROTATION_HANDLE_OFFSET,
  SHAPE_TYPES,
} from '../utils/constants';

/**
 * SelectionBox component - Renders selection outline, resize handles, and rotation handle
 * for the currently selected shape
 */
const SelectionBox = memo(function SelectionBox({ 
  shape,
  zoom,
  onResizeStart,
  onRotateStart,
}) {
  if (!shape) return null;

  const handleSize = HANDLE_SIZE / zoom;
  const strokeWidth = SELECTION_WIDTH / zoom;
  const handleStrokeWidth = HANDLE_STROKE_WIDTH / zoom;
  const rotationOffset = ROTATION_HANDLE_OFFSET / zoom;

  // Calculate bounding box based on shape type
  let bounds = { x: 0, y: 0, width: 0, height: 0, centerX: 0, centerY: 0 };
  
  if (shape.type === SHAPE_TYPES.RECTANGLE || shape.type === SHAPE_TYPES.TEXT || shape.type === SHAPE_TYPES.IMAGE) {
    // Safety check for width/height
    const width = shape.width || 100;
    const height = shape.height || 100;
    
    // Rectangles, text boxes, and images have the same bounding box structure
    // Images use x,y as center, so we need to calculate top-left
    const x = shape.type === SHAPE_TYPES.IMAGE ? shape.x - width / 2 : shape.x;
    const y = shape.type === SHAPE_TYPES.IMAGE ? shape.y - height / 2 : shape.y;
    
    bounds = {
      x: x,
      y: y,
      width: width,
      height: height,
      centerX: x + width / 2,
      centerY: y + height / 2,
    };
  } else if (shape.type === SHAPE_TYPES.CIRCLE) {
    bounds = {
      x: shape.x - shape.radius,
      y: shape.y - shape.radius,
      width: shape.radius * 2,
      height: shape.radius * 2,
      centerX: shape.x,
      centerY: shape.y,
    };
  } else if (shape.type === SHAPE_TYPES.POLYGON) {
    bounds = {
      x: shape.x - shape.radius,
      y: shape.y - shape.radius,
      width: shape.radius * 2,
      height: shape.radius * 2,
      centerX: shape.x,
      centerY: shape.y,
    };
  } else if (shape.type === SHAPE_TYPES.CUSTOM_POLYGON && shape.vertices) {
    // Calculate bounding box from vertices
    const vertices = shape.vertices;
    const minX = Math.min(...vertices.map(v => v.x));
    const maxX = Math.max(...vertices.map(v => v.x));
    const minY = Math.min(...vertices.map(v => v.y));
    const maxY = Math.max(...vertices.map(v => v.y));
    
    bounds = {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2,
    };
  }

  // Resize handles for rectangles, text boxes, and images (8 handles: 4 corners + 4 edges)
  const resizeHandles = [];
  
  if (shape.type === SHAPE_TYPES.RECTANGLE || shape.type === SHAPE_TYPES.TEXT || shape.type === SHAPE_TYPES.IMAGE) {
    // Corners
    resizeHandles.push(
      { type: 'nw', x: bounds.x, y: bounds.y, cursor: 'nw-resize' },
      { type: 'ne', x: bounds.x + bounds.width, y: bounds.y, cursor: 'ne-resize' },
      { type: 'sw', x: bounds.x, y: bounds.y + bounds.height, cursor: 'sw-resize' },
      { type: 'se', x: bounds.x + bounds.width, y: bounds.y + bounds.height, cursor: 'se-resize' },
    );
    // Edges
    resizeHandles.push(
      { type: 'n', x: bounds.centerX, y: bounds.y, cursor: 'n-resize' },
      { type: 's', x: bounds.centerX, y: bounds.y + bounds.height, cursor: 's-resize' },
      { type: 'w', x: bounds.x, y: bounds.centerY, cursor: 'w-resize' },
      { type: 'e', x: bounds.x + bounds.width, y: bounds.centerY, cursor: 'e-resize' },
    );
  } else {
    // For circles and polygons, use 4 cardinal direction handles
    resizeHandles.push(
      { type: 'n', x: bounds.centerX, y: bounds.y, cursor: 'n-resize' },
      { type: 's', x: bounds.centerX, y: bounds.y + bounds.height, cursor: 's-resize' },
      { type: 'w', x: bounds.x, y: bounds.centerY, cursor: 'w-resize' },
      { type: 'e', x: bounds.x + bounds.width, y: bounds.centerY, cursor: 'e-resize' },
    );
  }

  // Rotation handle position (above the shape)
  const rotationHandleX = bounds.centerX;
  const rotationHandleY = bounds.y - rotationOffset;

  // Apply rotation transform around the shape's center
  const rotation = shape.rotation || 0;
  const transform = `rotate(${rotation} ${bounds.centerX} ${bounds.centerY})`;

  return (
    <g className="selection-box" transform={transform}>
      {/* Selection outline */}
      <rect
        x={bounds.x}
        y={bounds.y}
        width={bounds.width}
        height={bounds.height}
        fill="none"
        stroke={SELECTION_COLOR}
        strokeWidth={strokeWidth}
        strokeDasharray={`${5 / zoom} ${3 / zoom}`}
        style={{ pointerEvents: 'none' }}
      />

      {/* Resize handles */}
      {resizeHandles.map((handle) => (
        <rect
          key={handle.type}
          x={handle.x - handleSize / 2}
          y={handle.y - handleSize / 2}
          width={handleSize}
          height={handleSize}
          fill={HANDLE_FILL}
          stroke={HANDLE_STROKE}
          strokeWidth={handleStrokeWidth}
          style={{ cursor: handle.cursor }}
          onMouseDown={(e) => {
            e.stopPropagation();
            if (onResizeStart) {
              onResizeStart(handle.type, e);
            }
          }}
        />
      ))}

      {/* Line connecting to rotation handle */}
      <line
        x1={bounds.centerX}
        y1={bounds.y}
        x2={rotationHandleX}
        y2={rotationHandleY}
        stroke={SELECTION_COLOR}
        strokeWidth={strokeWidth}
        style={{ pointerEvents: 'none' }}
      />

      {/* Rotation handle */}
      <circle
        cx={rotationHandleX}
        cy={rotationHandleY}
        r={handleSize / 1.5}
        fill={HANDLE_FILL}
        stroke={HANDLE_STROKE}
        strokeWidth={handleStrokeWidth}
        style={{ cursor: 'grab' }}
        onMouseDown={(e) => {
          e.stopPropagation();
          if (onRotateStart) {
            onRotateStart(e);
          }
        }}
      />
    </g>
  );
});

export default SelectionBox;

