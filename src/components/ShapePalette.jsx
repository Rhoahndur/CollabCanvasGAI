import { memo } from 'react';
import { TOOL_TYPES } from '../utils/constants';
import './ShapePalette.css';

/**
 * ShapePalette component - Tool selector for different shape types and selection tool
 * Displays a vertical palette on the left side of the canvas
 */
const ShapePalette = memo(function ShapePalette({ 
  selectedTool, 
  onSelectTool, 
  onClearAll, 
  onGenerate500,
  onImageUpload
}) {
  const tools = [
    {
      type: TOOL_TYPES.SELECT,
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path d="M3 3 L8 20 L12 13 L19 16 L3 3 Z" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      ),
      label: 'Select',
    },
    {
      type: TOOL_TYPES.RECTANGLE,
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24">
          <rect x="4" y="6" width="16" height="12" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      ),
      label: 'Rectangle',
    },
    {
      type: TOOL_TYPES.CIRCLE,
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24">
          <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      ),
      label: 'Circle',
    },
    {
      type: TOOL_TYPES.POLYGON,
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24">
          <polygon points="12,4 20,9 18,18 6,18 4,9" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      ),
      label: 'Pentagon',
    },
    {
      type: TOOL_TYPES.TEXT,
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path d="M4 7V4h16v3M9 20h6M12 4v16" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      ),
      label: 'Text Box',
    },
    {
      type: TOOL_TYPES.IMAGE,
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24">
          <rect x="3" y="3" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
          <path d="M21 15l-5-5L5 21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      label: 'Image (Coming Soon)',
      isUpload: true,
      disabled: true,
    },
  ];

  return (
    <div className="shape-palette">
      <div className="shape-palette-header">
        <h3>Tools</h3>
      </div>
      <div className="shape-palette-tools">
        {tools.map((tool) => (
          <button
            key={tool.type}
            className={`tool-button ${selectedTool === tool.type ? 'active' : ''} ${tool.disabled ? 'disabled' : ''}`}
            onClick={() => {
              if (tool.disabled) return;
              if (tool.isUpload && onImageUpload) {
                onImageUpload();
              } else {
                onSelectTool(tool.type);
              }
            }}
            title={tool.label}
            aria-label={tool.label}
            disabled={tool.disabled}
          >
            {tool.icon}
            <span className="tool-label">{tool.label}</span>
          </button>
        ))}
      </div>
      
      {/* Action buttons */}
      {onGenerate500 && onClearAll && (
        <div className="shape-palette-actions">
          <button
            className="action-button action-generate"
            onClick={onGenerate500}
            title="Generate 10 random shapes"
            aria-label="Generate 10 random shapes"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            <span>Generate 10</span>
          </button>
          
          <button
            className="action-button action-clear"
            onClick={onClearAll}
            title="Clear all shapes"
            aria-label="Clear all shapes"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
              <path d="M10 11v6M14 11v6" />
            </svg>
            <span>Clear All</span>
          </button>
        </div>
      )}
      
      <div className="shape-palette-hint">
        Click and drag to create
      </div>
    </div>
  );
});

export default ShapePalette;

