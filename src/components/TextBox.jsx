import { memo } from 'react';

/**
 * TextBox component - Renders a text box on the canvas
 * @param {string} id - Unique identifier
 * @param {number} x - X coordinate (top-left)
 * @param {number} y - Y coordinate (top-left)
 * @param {number} width - Width of text box
 * @param {number} height - Height of text box
 * @param {string} text - Text content
 * @param {string} color - Text and border color
 * @param {number} rotation - Rotation in degrees
 * @param {number} fontSize - Font size
 * @param {boolean} isSelected - Whether the text box is selected
 * @param {boolean} isLocked - Whether the text box is locked
 * @param {string} lockedBy - User ID who locked it
 * @param {string} lockedByUserName - Name of user who locked it
 * @param {function} onClick - Click handler
 * @param {function} onMouseDown - Mouse down handler
 * @param {function} onDoubleClick - Double click handler for editing
 */
const TextBox = memo(function TextBox({ 
  id, 
  x, 
  y, 
  width = 200, 
  height = 60,
  text = 'Double-click to edit',
  color,
  rotation = 0,
  fontSize = 16,
  isSelected, 
  isLocked,
  lockedBy,
  lockedByUserName,
  onClick,
  onMouseDown,
  onDoubleClick,
}) {
  // Calculate center for rotation
  const centerX = x + width / 2;
  const centerY = y + height / 2;

  return (
    <g
      id={id}
      onClick={onClick}
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
      style={{ 
        cursor: isLocked ? 'not-allowed' : 'pointer',
        transform: `rotate(${rotation}deg)`,
        transformOrigin: `${centerX}px ${centerY}px`,
      }}
    >
      {/* Background rectangle */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="rgba(30, 30, 30, 0.9)"
        stroke={color}
        strokeWidth={2}
        rx={4}
      />
      
      {/* Text content - centered */}
      <text
        x={centerX}
        y={centerY}
        fill={color}
        fontSize={fontSize}
        fontFamily="Arial, sans-serif"
        textAnchor="middle"
        dominantBaseline="middle"
        style={{
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        {text.split('\n').map((line, i, arr) => (
          <tspan
            key={i}
            x={centerX}
            dy={i === 0 ? -((arr.length - 1) * fontSize) / 2 : fontSize}
          >
            {line}
          </tspan>
        ))}
      </text>

      {/* Selection highlight */}
      {isSelected && (
        <rect
          x={x - 2}
          y={y - 2}
          width={width + 4}
          height={height + 4}
          fill="none"
          stroke="#646cff"
          strokeWidth={2}
          rx={5}
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Lock indicator */}
      {isLocked && lockedBy && (
        <g style={{ pointerEvents: 'none' }}>
          <rect
            x={x + width - 30}
            y={y + 5}
            width={25}
            height={20}
            fill="rgba(255, 100, 100, 0.9)"
            stroke="#ff4444"
            strokeWidth={1}
            rx={3}
          />
          <text
            x={x + width - 17.5}
            y={y + 17}
            fill="white"
            fontSize={12}
            fontWeight="bold"
            textAnchor="middle"
          >
            🔒
          </text>
          {lockedByUserName && (
            <text
              x={x + width / 2}
              y={y - 5}
              fill="#ff4444"
              fontSize={12}
              fontWeight="bold"
              textAnchor="middle"
            >
              {lockedByUserName}
            </text>
          )}
        </g>
      )}
    </g>
  );
});

export default TextBox;

