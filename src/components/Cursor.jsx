import { useState, useRef, useEffect } from 'react';
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
  const hoverTimeoutRef = useRef(null);
  const userColor = getUserColor(userId);
  const textColor = getContrastColor(userColor);

  // Debounce hover state to prevent flickering
  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    // Add small delay before hiding to prevent flicker
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 100);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  return (
    <g 
      className="cursor-group"
      transform={`translate(${x}, ${y})`}
      style={{ pointerEvents: 'none' }}
    >
      {/* User name label - show on hover or when showLabel is true */}
      {/* Render label FIRST so it appears BEHIND cursor in DOM order */}
      {(isHovered || showLabel) && (
        <g 
          transform="translate(18, -32)" 
          style={{ pointerEvents: 'none' }}
        >
          {/* Label background */}
          <rect
            x="0"
            y="0"
            width={userName.length * 7 + 16}
            height="24"
            fill={userColor}
            rx="4"
            ry="4"
            opacity="0.95"
            style={{ 
              filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))',
              pointerEvents: 'none'
            }}
          />
          {/* User name text */}
          <text
            x="8"
            y="16"
            fill={textColor}
            fontSize="13"
            fontWeight="600"
            fontFamily="system-ui, -apple-system, sans-serif"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {userName}
          </text>
        </g>
      )}

      {/* Cursor pointer (SVG cursor icon) with hover detection */}
      <g
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ pointerEvents: 'all', cursor: 'pointer' }}
      >
        {/* Invisible hover area (larger than visible cursor) */}
        <rect
          x="-8"
          y="-8"
          width="32"
          height="36"
          fill="transparent"
          style={{ pointerEvents: 'all' }}
        />
        
        {/* Cursor arrow shape */}
        <path
          d="M 0 0 L 0 16 L 5 12 L 8 18 L 10 17 L 7 11 L 12 11 Z"
          fill={userColor}
          stroke="white"
          strokeWidth="1.5"
          style={{ 
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
            pointerEvents: 'none'
          }}
        />
      </g>
    </g>
  );
}

export default Cursor;

