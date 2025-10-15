import { useState } from 'react';
import { getUserColor, getContrastColor } from '../utils/colorUtils';

/**
 * Cursor component - SVG cursor for other users
 * Displays cursor icon and user name label on hover
 */
function Cursor({ 
  userId, 
  x, 
  y, 
  userName,
  showLabel = false,
}) {
  const [isHovered, setIsHovered] = useState(false);
  const userColor = getUserColor(userId);
  const textColor = getContrastColor(userColor);

  return (
    <g 
      className="cursor-group"
      transform={`translate(${x}, ${y})`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ pointerEvents: 'all' }}
    >
      {/* Cursor pointer (SVG cursor icon) */}
      <g>
        {/* Cursor arrow shape */}
        <path
          d="M 0 0 L 0 16 L 5 12 L 8 18 L 10 17 L 7 11 L 12 11 Z"
          fill={userColor}
          stroke="white"
          strokeWidth="1"
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
        />
      </g>

      {/* User name label - show on hover or when showLabel is true */}
      {(isHovered || showLabel) && (
        <g transform="translate(15, -5)">
          {/* Label background */}
          <rect
            x="0"
            y="0"
            width={userName.length * 7 + 12}
            height="22"
            fill={userColor}
            rx="4"
            ry="4"
            style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
          />
          {/* User name text */}
          <text
            x="6"
            y="15"
            fill={textColor}
            fontSize="12"
            fontWeight="600"
            fontFamily="system-ui, -apple-system, sans-serif"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {userName}
          </text>
        </g>
      )}
    </g>
  );
}

export default Cursor;

