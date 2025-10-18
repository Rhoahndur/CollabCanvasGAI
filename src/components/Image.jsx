import { memo } from 'react';

/**
 * Image component - Renders an image on the canvas
 * @param {string} id - Unique identifier
 * @param {number} x - X coordinate (top-left)
 * @param {number} y - Y coordinate (top-left)
 * @param {number} width - Width of image
 * @param {number} height - Height of image
 * @param {string} imageData - Base64 data URL of the image
 * @param {string} color - Border color
 * @param {number} rotation - Rotation in degrees
 * @param {boolean} isSelected - Whether the image is selected
 * @param {boolean} isLocked - Whether the image is locked
 * @param {string} lockedBy - User ID who locked it
 * @param {string} lockedByUserName - Name of user who locked it
 * @param {function} onClick - Click handler
 * @param {function} onMouseDown - Mouse down handler
 */
const Image = memo(function Image({ 
  id, 
  x, 
  y, 
  width = 200, 
  height = 200,
  imageData,
  color,
  rotation = 0,
  isSelected, 
  isLocked,
  lockedBy,
  lockedByUserName,
  onClick,
  onMouseDown,
}) {
  const centerX = x + width / 2;
  const centerY = y + height / 2;

  const handleClick = (e) => {
    if (isLocked) {
      e.stopPropagation();
      return;
    }
    if (onClick) {
      onClick(id, e);
    }
  };

  const handleMouseDown = (e) => {
    if (isLocked) {
      e.stopPropagation();
      return;
    }
    if (onMouseDown) {
      onMouseDown(id, e);
    }
  };

  return (
    <g
      style={{ 
        transform: `rotate(${rotation}deg)`,
        transformOrigin: `${centerX}px ${centerY}px`,
      }}
    >
      {/* Background rectangle for border */}
      <rect
        x={x - 2}
        y={y - 2}
        width={width + 4}
        height={height + 4}
        fill="none"
        stroke={color}
        strokeWidth={2}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        style={{ 
          cursor: isLocked ? 'not-allowed' : 'pointer',
        }}
      />
      
      {/* Image */}
      <image
        href={imageData}
        x={x}
        y={y}
        width={width}
        height={height}
        preserveAspectRatio="none"
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        style={{ 
          cursor: isLocked ? 'not-allowed' : 'pointer',
          userSelect: 'none',
          pointerEvents: isLocked ? 'none' : 'auto',
        }}
      />

      {/* Lock indicator (if locked by someone else) */}
      {isLocked && (
        <g style={{ pointerEvents: 'none' }}>
          {/* Semi-transparent overlay */}
          <rect
            x={x}
            y={y}
            width={width}
            height={height}
            fill="rgba(255, 100, 100, 0.1)"
          />
          {/* Lock icon background */}
          <circle
            cx={x + width - 20}
            cy={y + 20}
            r={12}
            fill="rgba(239, 68, 68, 0.9)"
          />
          {/* Lock icon */}
          <g transform={`translate(${x + width - 20}, ${y + 20})`}>
            <rect
              x={-4}
              y={-2}
              width={8}
              height={6}
              fill="white"
              rx={1}
            />
            <path
              d="M -3,-2 v -3 a 3,3 0 0 1 6,0 v 3"
              stroke="white"
              strokeWidth={1.5}
              fill="none"
            />
          </g>
          {/* Locked by text */}
          {lockedByUserName && (
            <text
              x={x + width / 2}
              y={y + height + 20}
              fill="#ef4444"
              fontSize="12"
              fontWeight="600"
              textAnchor="middle"
              style={{ userSelect: 'none' }}
            >
              🔒 {lockedByUserName}
            </text>
          )}
        </g>
      )}
    </g>
  );
});

export default Image;

