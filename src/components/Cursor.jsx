import { getUserColor, getContrastColor } from '../utils/colorUtils';

/**
 * Cursor component - SVG cursor for other users
 * Always displays cursor icon and user name label
 */
function Cursor({ 
  userId, 
  x, 
  y, 
  userName,
}) {
  const userColor = getUserColor(userId);
  const textColor = getContrastColor(userColor);

  return (
    <g 
      className="cursor-group"
      transform={`translate(${x}, ${y})`}
      style={{ pointerEvents: 'none' }}
    >
      {/* User name label - ALWAYS visible */}
      {/* Render label FIRST so it appears BEHIND cursor in DOM order */}
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

      {/* Cursor pointer (SVG cursor icon) */}
      <g style={{ pointerEvents: 'none' }}>
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

