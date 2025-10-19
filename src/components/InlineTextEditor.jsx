import { useEffect, useRef, useState } from 'react';
import { FONT_SIZES, DEFAULT_FONT_SIZE, DEFAULT_TEXT_COLOR, DEFAULT_TEXT_BACKGROUND_COLOR } from '../utils/constants';
import ColorPicker from './ColorPicker';
import './InlineTextEditor.css';

/**
 * InlineTextEditor - Renders an inline textarea overlaid on the canvas for text editing
 * @param {object} shape - The shape being edited
 * @param {string} text - Current text value
 * @param {function} onTextChange - Callback when text changes
 * @param {function} onFinish - Callback when editing is complete (receives updates object)
 * @param {object} viewport - Current viewport (zoom, offsetX, offsetY)
 * @param {object} containerSize - Canvas container size
 */
function InlineTextEditor({ shape, text, onTextChange, onFinish, viewport, containerSize }) {
  const textareaRef = useRef(null);
  
  // Text formatting state
  const [fontSize, setFontSize] = useState(shape.fontSize || DEFAULT_FONT_SIZE);
  const [isBold, setIsBold] = useState(shape.fontWeight === 'bold' || false);
  const [isItalic, setIsItalic] = useState(shape.fontStyle === 'italic' || false);
  const [textColor, setTextColor] = useState(shape.textColor || shape.color || DEFAULT_TEXT_COLOR);
  const [backgroundColor, setBackgroundColor] = useState(shape.backgroundColor || DEFAULT_TEXT_BACKGROUND_COLOR);

  // Focus the textarea when component mounts
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onFinish(false); // Cancel without saving
      } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        // Save with formatting changes
        const updates = {
          fontSize,
          fontWeight: isBold ? 'bold' : 'normal',
          fontStyle: isItalic ? 'italic' : 'normal',
          textColor,
          backgroundColor,
        };
        onFinish(true, updates); // Save with formatting
      } else if (e.key === 'b' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsBold(!isBold);
      } else if (e.key === 'i' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsItalic(!isItalic);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onFinish, fontSize, isBold, isItalic, textColor, backgroundColor]);

  // Calculate position on screen based on shape position and viewport
  const getScreenPosition = () => {
    // Calculate shape center in canvas coordinates
    let centerX, centerY, width, height;
    
    if (shape.type === 'text' || shape.type === 'rectangle') {
      centerX = shape.x + (shape.width || 200) / 2;
      centerY = shape.y + (shape.height || 60) / 2;
      width = shape.width || 200;
      height = shape.height || 60;
    } else if (shape.type === 'circle' || shape.type === 'polygon') {
      centerX = shape.x;
      centerY = shape.y;
      width = shape.radius * 2;
      height = shape.radius * 2;
    } else {
      // Default fallback
      centerX = shape.x || 0;
      centerY = shape.y || 0;
      width = shape.width || 200;
      height = shape.height || 60;
    }

    // Convert canvas coordinates to screen coordinates
    const screenX = (centerX - viewport.offsetX) * viewport.zoom;
    const screenY = (centerY - viewport.offsetY) * viewport.zoom;
    const screenWidth = width * viewport.zoom;
    const screenHeight = height * viewport.zoom;

    return {
      left: screenX - screenWidth / 2,
      top: screenY - screenHeight / 2,
      width: screenWidth,
      height: screenHeight,
    };
  };

  const position = getScreenPosition();

  const handleSave = () => {
    const updates = {
      fontSize,
      fontWeight: isBold ? 'bold' : 'normal',
      fontStyle: isItalic ? 'italic' : 'normal',
      textColor,
      backgroundColor,
    };
    onFinish(true, updates);
  };

  return (
    <div
      className="inline-text-editor-overlay"
      onClick={(e) => {
        // Click outside to finish
        if (e.target === e.currentTarget) {
          handleSave();
        }
      }}
    >
      <div
        className="inline-text-editor-container"
        style={{
          left: `${position.left}px`,
          top: `${position.top}px`,
          width: `${position.width}px`,
          minHeight: `${position.height}px`,
        }}
      >
        {/* Formatting Toolbar */}
        <div className="text-editor-toolbar">
          {/* Font Size */}
          <div className="toolbar-group">
            <label className="toolbar-label">Size:</label>
            <select
              className="toolbar-select"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              onClick={(e) => e.stopPropagation()}
            >
              {FONT_SIZES.map(size => (
                <option key={size} value={size}>{size}px</option>
              ))}
            </select>
          </div>

          {/* Bold */}
          <button
            className={`toolbar-button ${isBold ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setIsBold(!isBold);
            }}
            title="Bold (Cmd/Ctrl+B)"
          >
            <strong>B</strong>
          </button>

          {/* Italic */}
          <button
            className={`toolbar-button ${isItalic ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setIsItalic(!isItalic);
            }}
            title="Italic (Cmd/Ctrl+I)"
          >
            <em>I</em>
          </button>

          {/* Text Color Picker */}
          <ColorPicker
            value={textColor}
            onChange={setTextColor}
            label="Color"
          />

          {/* Background Color Picker */}
          <ColorPicker
            value={backgroundColor}
            onChange={setBackgroundColor}
            label="BG"
            allowTransparent={true}
          />
        </div>

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          className="inline-text-editor-textarea"
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder="Type text here..."
          spellCheck={false}
          style={{
            fontSize: `${fontSize}px`,
            fontWeight: isBold ? 'bold' : 'normal',
            fontStyle: isItalic ? 'italic' : 'normal',
            color: textColor,
          }}
        />

        {/* Hints */}
        <div className="inline-text-editor-hint">
          <span>Cmd/Ctrl + Enter to save • Esc to cancel • Cmd/Ctrl + B/I for bold/italic</span>
        </div>
      </div>
    </div>
  );
}

export default InlineTextEditor;

