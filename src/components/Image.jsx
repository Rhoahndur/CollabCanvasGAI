import { memo } from 'react';

/**
 * Image component - Renders an image on the canvas
 * @param {string} id - Unique identifier
 * @param {number} x - X coordinate (center)
 * @param {number} y - Y coordinate (center)
 * @param {number} width - Width of image
 * @param {number} height - Height of image
 * @param {string} imageUrl - URL of the image to display
 * @param {string} color - Border color (for selection outline)
 * @param {number} rotation - Rotation in degrees
 * @param {boolean} isSelected - Whether the image is selected
 * @param {boolean} isLocked - Whether the image is locked
 * @param {string} lockedBy - User ID who locked it
 * @param {string} lockedByUserName - Name of user who locked it
 * @param {function} onClick - Click handler
 * @param {function} onMouseDown - Mouse down handler
 * @param {function} onDoubleClick - Double click handler
 */
const Image = memo(function Image({ 
  id, 
  x, 
  y, 
  width = 200, 
  height = 200,
  imageUrl,
  color,
  rotation = 0,
  isSelected, 
  isLocked,
  lockedBy,
  lockedByUserName,
  onClick,
  onMouseDown,
  onDoubleClick,
}) {
  // Calculate center for rotation
  const centerX = x;
  const centerY = y;
  
  // Calculate top-left corner from center
  const topLeftX = x - width / 2;
  const topLeftY = y - height / 2;

  const handleClick = (e) => {
    e.stopPropagation();
    if (onClick) onClick(id, e);
  };

  const handleMouseDown = (e) => {
    e.stopPropagation();
    if (onMouseDown) onMouseDown(id, e);
  };

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    if (onDoubleClick) onDoubleClick(id, e);
  };

  return (
    <g
      className="canvas-image"
      style={{ 
        transform: `rotate(${rotation}deg)`,
        transformOrigin: `${centerX}px ${centerY}px`,
      }}
    >
      {/* Image element */}
      <image
        href={imageUrl}
        x={topLeftX}
        y={topLeftY}
        width={width}
        height={height}
        preserveAspectRatio="none"
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        style={{ 
          cursor: isLocked ? 'not-allowed' : 'pointer',
        }}
      />
      
      {/* Border (always visible for context) */}
      <rect
        x={topLeftX}
        y={topLeftY}
        width={width}
        height={height}
        fill="none"
        stroke={isSelected ? color : 'rgba(255, 255, 255, 0.3)'}
        strokeWidth={isSelected ? 2 : 1}
        strokeDasharray={isSelected ? undefined : '4 2'}
        style={{ pointerEvents: 'none' }}
      />
      
      {/* Locked indicator */}
      {isLocked && (
        <g style={{ pointerEvents: 'none' }}>
          {/* Semi-transparent overlay */}
          <rect
            x={topLeftX}
            y={topLeftY}
            width={width}
            height={height}
            fill="rgba(0, 0, 0, 0.3)"
          />
          
          {/* Lock icon */}
          <g transform={`translate(${x}, ${y})`}>
            <circle cx="0" cy="0" r="16" fill="rgba(255, 255, 255, 0.9)" />
            <g transform="translate(-8, -8)">
              <rect x="6" y="9" width="4" height="5" fill="#666" />
              <path
                d="M 8 9 C 8 7.3 6.7 6 5 6 C 3.3 6 2 7.3 2 9 L 2 10 L 3 10 L 3 9 C 3 7.9 3.9 7 5 7 C 6.1 7 7 7.9 7 9 L 7 10 L 8 10 Z"
                transform="translate(3, 0)"
                fill="#666"
              />
            </g>
          </g>
          
          {/* Locked by text */}
          {lockedByUserName && (
            <text
              x={x}
              y={y + 35}
              textAnchor="middle"
              fontSize="11"
              fill="white"
              fontWeight="600"
              style={{
                textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                userSelect: 'none',
              }}
            >
              {lockedByUserName}
            </text>
          )}
        </g>
      )}
    </g>
  );
});

export default Image;

