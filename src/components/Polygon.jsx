import { memo } from 'react';
import { SELECTION_COLOR, SELECTION_WIDTH } from '../utils/constants';
import { getUserColor, getContrastColor } from '../utils/colorUtils';

/**
 * Polygon component - SVG polygon for collaborative canvas
 * Renders a regular polygon with optional selection highlight
 * Memoized for performance with large numbers of objects
 */
const Polygon = memo(function Polygon({ 
  id,
  x, 
  y, 
  radius,
  sides = 5,
  color,
  rotation = 0,
  isSelected = false,
  isLocked = false,
  lockedBy = null,
  lockedByUserName = null,
  onClick,
  onMouseDown,
  onMouseLeave,
}) {
  // Calculate polygon points
  const calculatePoints = (cx, cy, r, numSides) => {
    const points = [];
    const angleStep = (Math.PI * 2) / numSides;
    const startAngle = -Math.PI / 2; // Start from top
    
    for (let i = 0; i < numSides; i++) {
      const angle = startAngle + angleStep * i;
      const px = cx + r * Math.cos(angle);
      const py = cy + r * Math.sin(angle);
      points.push(`${px},${py}`);
    }
    
    return points.join(' ');
  };

  const points = calculatePoints(x, y, radius, sides);

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

  const handleMouseLeave = (e) => {
    e.stopPropagation();
    if (onMouseLeave) {
      onMouseLeave(id, e);
    }
  };

  // Rotation transform around center
  const transform = rotation ? `rotate(${rotation} ${x} ${y})` : undefined;

  return (
    <g className="polygon-group" transform={transform}>
      {/* Main polygon */}
      <polygon
        points={points}
        fill={color}
        className={`canvas-polygon ${isLocked ? 'locked' : ''}`}
        style={{
          cursor: isLocked && !isSelected ? 'not-allowed' : 'pointer',
        }}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
      />
      
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
            <g transform={`translate(${x - (lockedByUserName.length * 7 + 12) / 2}, ${y - radius - 15})`}>
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

export default Polygon;

