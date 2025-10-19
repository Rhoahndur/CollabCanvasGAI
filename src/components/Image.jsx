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
  onContextMenu,
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
  
  const handleContextMenu = (e) => {
    e.stopPropagation();
    if (onContextMenu) onContextMenu(e);
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
        onContextMenu={handleContextMenu}
        style={{ 
          cursor: isLocked && !isSelected ? 'not-allowed' : 'pointer',
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
      
      {/* Note: No locked indicator for images - they always appear at full color */}
    </g>
  );
});

export default Image;

