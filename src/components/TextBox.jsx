import { memo, useMemo } from 'react';

/**
 * Wraps text into lines that fit within a given width
 * @param {string} text - Text to wrap
 * @param {number} maxWidth - Maximum width in pixels
 * @param {number} fontSize - Font size in pixels
 * @param {string} fontWeight - Font weight
 * @returns {string[]} Array of text lines
 */
function wrapText(text, maxWidth, fontSize, fontWeight) {
  if (!text) return [];
  
  // Rough character width estimation based on font size
  // Bold text is slightly wider
  const charWidth = fontSize * (fontWeight === 'bold' ? 0.65 : 0.6);
  const padding = 16; // Account for padding
  const availableWidth = maxWidth - padding;
  const maxCharsPerLine = Math.floor(availableWidth / charWidth);
  
  if (maxCharsPerLine < 1) return [];
  
  const words = text.split(/\s+/);
  const lines = [];
  let currentLine = '';
  
  words.forEach(word => {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    
    if (testLine.length <= maxCharsPerLine) {
      currentLine = testLine;
    } else {
      // Word too long, try to split it
      if (word.length > maxCharsPerLine) {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = '';
        }
        // Split long word across multiple lines
        for (let i = 0; i < word.length; i += maxCharsPerLine) {
          lines.push(word.slice(i, i + maxCharsPerLine));
        }
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    }
  });
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
}

/**
 * TextBox component - Renders a text box on the canvas with text wrapping
 * @param {string} id - Unique identifier
 * @param {number} x - X coordinate (top-left)
 * @param {number} y - Y coordinate (top-left)
 * @param {number} width - Width of text box
 * @param {number} height - Height of text box
 * @param {string} text - Text content
 * @param {string} color - Border color
 * @param {string} textColor - Text color (defaults to color if not specified)
 * @param {number} rotation - Rotation in degrees
 * @param {number} fontSize - Font size
 * @param {string} fontWeight - Font weight ('normal' or 'bold')
 * @param {string} fontStyle - Font style ('normal' or 'italic')
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
  textColor,
  rotation = 0,
  fontSize = 16,
  fontWeight = 'normal',
  fontStyle = 'normal',
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
  
  // Wrap text into lines
  const wrappedLines = useMemo(() => 
    wrapText(text, width, fontSize, fontWeight),
    [text, width, fontSize, fontWeight]
  );
  
  // Calculate line height (1.2x font size for readability)
  const lineHeight = fontSize * 1.2;
  const padding = 8;
  const availableHeight = height - (padding * 2);
  const maxVisibleLines = Math.floor(availableHeight / lineHeight);
  
  // Check if text overflows
  const hasOverflow = wrappedLines.length > maxVisibleLines;
  const visibleLines = hasOverflow ? wrappedLines.slice(0, maxVisibleLines) : wrappedLines;
  
  // Calculate starting Y position for vertically centered text
  const totalTextHeight = visibleLines.length * lineHeight;
  const startY = y + (height - totalTextHeight) / 2 + fontSize * 0.8;
  
  // Event handlers that pass the id parameter
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
  
  const handleDoubleClick = (e) => {
    e.stopPropagation();
    if (onDoubleClick) {
      onDoubleClick(e);
    }
  };

  return (
    <g
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
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
      
      {/* Clipping path for text overflow */}
      <defs>
        <clipPath id={`clip-${id}`}>
          <rect
            x={x + 4}
            y={y + 4}
            width={width - 8}
            height={height - 8}
            rx={3}
          />
        </clipPath>
      </defs>
      
      {/* Text content - wrapped and clipped */}
      <g clipPath={`url(#clip-${id})`}>
        {visibleLines.map((line, i) => (
          <text
            key={i}
            x={x + 8}
            y={startY + (i * lineHeight)}
            fill={textColor || color}
            fontSize={fontSize}
            fontWeight={fontWeight}
            fontStyle={fontStyle}
            fontFamily="Arial, sans-serif"
            textAnchor="start"
            style={{
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          >
            {line}
          </text>
        ))}
      </g>
      
      {/* Overflow indicator (star) */}
      {hasOverflow && (
        <g style={{ pointerEvents: 'none' }}>
          {/* Small circle background for star */}
          <circle
            cx={x + width - 15}
            cy={y + height - 15}
            r={10}
            fill="rgba(255, 200, 0, 0.9)"
            stroke="#ff9900"
            strokeWidth={1}
          />
          {/* Star icon */}
          <text
            x={x + width - 15}
            y={y + height - 15}
            fill="#000"
            fontSize={14}
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            ★
          </text>
        </g>
      )}

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

