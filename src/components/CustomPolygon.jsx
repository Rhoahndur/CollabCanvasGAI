import { memo } from 'react';
import { SELECTION_COLOR, SELECTION_WIDTH } from '../utils/constants';
import { getUserColor, getContrastColor } from '../utils/colorUtils';

/**
 * CustomPolygon component - SVG polygon with arbitrary vertices for collaborative canvas
 * Renders a polygon with custom vertex points
 * Memoized for performance with large numbers of objects
 */
const CustomPolygon = memo(function CustomPolygon({ 
  id,
  vertices, // Array of {x, y} points
  color,
  rotation = 0,
  text = null,
  fontSize = 14,
  fontWeight = 'normal',
  fontStyle = 'normal',
  textColor = null,
  isSelected = false,
  isLocked = false,
  lockedBy = null,
  lockedByUserName = null,
  onClick,
  onMouseDown,
  onDoubleClick,
  onContextMenu,
}) {
  if (!vertices || vertices.length < 3) {
    return null; // Need at least 3 vertices to draw a polygon
  }

  // Convert vertices to SVG points string
  const points = vertices.map(v => `${v.x},${v.y}`).join(' ');

  // Calculate centroid for text positioning and rotation
  const centroidX = vertices.reduce((sum, v) => sum + v.x, 0) / vertices.length;
  const centroidY = vertices.reduce((sum, v) => sum + v.y, 0) / vertices.length;

  const handleClick = (e) => {
    e.stopPropagation();
    if (onClick) {
      onClick(id, e);
    }
  };

  const handleMouseDown = (e) => {
    e.stopPropagation();
    if (onMouseDown) {
      onMouseDown(id, e);
    }
  };
  
  const handleDoubleClick = (e) => {
    e.stopPropagation();
    if (onDoubleClick) {
      onDoubleClick(e);
    }
  };
  
  const handleContextMenu = (e) => {
    e.stopPropagation();
    if (onContextMenu) {
      onContextMenu(e);
    }
  };

  // Rotation transform around centroid
  const transform = rotation ? `rotate(${rotation} ${centroidX} ${centroidY})` : undefined;

  return (
    <g className="custom-polygon-group" transform={transform}>
      {/* Main polygon */}
      <polygon
        points={points}
        fill={color}
        className={`canvas-custom-polygon ${isLocked ? 'locked' : ''}`}
        style={{
          cursor: isLocked && !isSelected ? 'not-allowed' : 'pointer',
        }}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      />
      
      {/* Text content (centered at centroid) */}
      {text && (
        <text
          x={centroidX}
          y={centroidY}
          fill={textColor || getContrastColor(color)}
          fontSize={fontSize}
          fontWeight={fontWeight}
          fontStyle={fontStyle}
          fontFamily="Arial, sans-serif"
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        >
          {text.split('\n').map((line, i, arr) => (
            <tspan
              key={i}
              x={centroidX}
              dy={i === 0 ? -((arr.length - 1) * fontSize) / 2 : fontSize}
            >
              {line}
            </tspan>
          ))}
        </text>
      )}
      
      {/* Selection highlight */}
      {isSelected && (
        <polygon
          points={points}
          fill="none"
          stroke={SELECTION_COLOR}
          strokeWidth={SELECTION_WIDTH}
          className="selection-highlight"
          style={{
            pointerEvents: 'none',
          }}
        />
      )}
      
      {/* Lock indicator (subtle overlay) */}
      {isLocked && !isSelected && (
        <>
          <polygon
            points={points}
            fill="rgba(255, 100, 100, 0.1)"
            className="lock-indicator"
            style={{
              pointerEvents: 'none',
            }}
          />
          {/* Show user name label for locked polygon */}
          {lockedByUserName && (
            <g transform={`translate(${centroidX - (lockedByUserName.length * 7 + 12) / 2}, ${centroidY - 30})`}>
              {/* Label background */}
              <rect
                x="0"
                y="0"
                width={lockedByUserName.length * 7 + 12}
                height="22"
                fill={getUserColor(lockedBy)}
                rx="4"
                ry="4"
                style={{ 
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                  pointerEvents: 'none',
                }}
              />
              {/* User name text */}
              <text
                x="6"
                y="15"
                fill={getContrastColor(getUserColor(lockedBy))}
                fontSize="12"
                fontWeight="600"
                fontFamily="system-ui, -apple-system, sans-serif"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {lockedByUserName}
              </text>
            </g>
          )}
        </>
      )}
    </g>
  );
});

export default CustomPolygon;

