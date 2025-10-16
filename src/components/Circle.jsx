import { memo } from 'react';
import { SELECTION_COLOR, SELECTION_WIDTH } from '../utils/constants';
import { getUserColor, getContrastColor } from '../utils/colorUtils';

/**
 * Circle component - SVG circle for collaborative canvas
 * Renders a single circle with optional selection highlight
 * Memoized for performance with large numbers of objects
 */
const Circle = memo(function Circle({ 
  id,
  x, 
  y, 
  radius,
  color,
  rotation = 0,
  isSelected = false,
  isLocked = false,
  lockedBy = null,
  lockedByUserName = null,
  onClick,
  onMouseDown,
}) {
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

  // Rotation transform (circles don't visually rotate, but we keep it for consistency)
  const transform = rotation ? `rotate(${rotation} ${x} ${y})` : undefined;

  return (
    <g className="circle-group" transform={transform}>
      {/* Main circle */}
      <circle
        cx={x}
        cy={y}
        r={radius}
        fill={color}
        className={`canvas-circle ${isLocked ? 'locked' : ''}`}
        style={{
          cursor: isLocked && !isSelected ? 'not-allowed' : 'pointer',
        }}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
      />
      
      {/* Selection highlight */}
      {isSelected && (
        <circle
          cx={x}
          cy={y}
          r={radius}
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
          <circle
            cx={x}
            cy={y}
            r={radius}
            fill="rgba(255, 100, 100, 0.1)"
            className="lock-indicator"
            style={{
              pointerEvents: 'none',
            }}
          />
          {/* Show user name label for locked circle */}
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

export default Circle;

