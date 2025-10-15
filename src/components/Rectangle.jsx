import { memo } from 'react';
import { SELECTION_COLOR, SELECTION_WIDTH } from '../utils/constants';
import { getUserColor, getContrastColor } from '../utils/colorUtils';

/**
 * Rectangle component - SVG rectangle for collaborative canvas
 * Renders a single rectangle with optional selection highlight
 * Memoized for performance with large numbers of objects
 */
const Rectangle = memo(function Rectangle({ 
  id,
  x, 
  y, 
  width, 
  height, 
  color, 
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

  return (
    <g className="rectangle-group">
      {/* Main rectangle */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={color}
        className={`canvas-rectangle ${isLocked ? 'locked' : ''}`}
        style={{
          cursor: isLocked && !isSelected ? 'not-allowed' : 'pointer',
        }}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
      />
      
      {/* Selection highlight */}
      {isSelected && (
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
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
          <rect
            x={x}
            y={y}
            width={width}
            height={height}
            fill="rgba(255, 100, 100, 0.1)"
            className="lock-indicator"
            style={{
              pointerEvents: 'none',
            }}
          />
          {/* Show user name label for locked rectangle */}
          {lockedByUserName && (
            <g transform={`translate(${x + 5}, ${y - 10})`}>
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

export default Rectangle;

