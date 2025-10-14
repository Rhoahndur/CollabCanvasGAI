import { SELECTION_COLOR, SELECTION_WIDTH } from '../utils/constants';

/**
 * Rectangle component - SVG rectangle for collaborative canvas
 * Renders a single rectangle with optional selection highlight
 */
function Rectangle({ 
  id,
  x, 
  y, 
  width, 
  height, 
  color, 
  isSelected = false,
  isLocked = false,
  lockedBy = null,
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
      )}
    </g>
  );
}

export default Rectangle;

