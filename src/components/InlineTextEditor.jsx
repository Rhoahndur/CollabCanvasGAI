import { useEffect, useRef } from 'react';
import './InlineTextEditor.css';

/**
 * InlineTextEditor - Renders an inline textarea overlaid on the canvas for text editing
 * @param {object} shape - The shape being edited
 * @param {string} text - Current text value
 * @param {function} onTextChange - Callback when text changes
 * @param {function} onFinish - Callback when editing is complete
 * @param {object} viewport - Current viewport (zoom, offsetX, offsetY)
 * @param {object} containerSize - Canvas container size
 */
function InlineTextEditor({ shape, text, onTextChange, onFinish, viewport, containerSize }) {
  const textareaRef = useRef(null);

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
        onFinish(true); // Save
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onFinish]);

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

  return (
    <div
      className="inline-text-editor-overlay"
      onClick={(e) => {
        // Click outside to finish
        if (e.target === e.currentTarget) {
          onFinish(true);
        }
      }}
    >
      <div
        className="inline-text-editor-container"
        style={{
          left: `${position.left}px`,
          top: `${position.top}px`,
          width: `${position.width}px`,
          height: `${position.height}px`,
        }}
      >
        <textarea
          ref={textareaRef}
          className="inline-text-editor-textarea"
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder="Type text here..."
          spellCheck={false}
        />
        <div className="inline-text-editor-hint">
          <span>Cmd/Ctrl + Enter to save • Esc to cancel</span>
        </div>
      </div>
    </div>
  );
}

export default InlineTextEditor;

