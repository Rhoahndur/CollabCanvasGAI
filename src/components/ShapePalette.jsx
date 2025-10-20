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
  onImageUpload,
  onDuplicate,
  onAlign,
  hasSelection
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
      type: TOOL_TYPES.CUSTOM_POLYGON,
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path d="M12,4 L20,9 L18,18 L6,18 L4,9 Z" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="12" cy="4" r="2" fill="currentColor" />
          <circle cx="20" cy="9" r="2" fill="currentColor" />
          <circle cx="18" cy="18" r="2" fill="currentColor" />
        </svg>
      ),
      label: 'Custom Polygon',
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
      label: 'Image',
      isUpload: true,
    },
  ];

  return (
    <div className="shape-palette">
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
          </button>
        ))}
      </div>
      
      {/* Alignment tools - only show when shapes are selected */}
      {hasSelection && onAlign && (
        <div className="shape-palette-alignment">
          <div className="alignment-section-title">Align</div>
          <div className="alignment-buttons">
            <button
              className="align-button"
              onClick={() => onAlign('left')}
              title="Align Left"
              aria-label="Align left"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="4" x2="3" y2="20" />
                <rect x="6" y="6" width="10" height="4" />
                <rect x="6" y="14" width="14" height="4" />
              </svg>
            </button>
            
            <button
              className="align-button"
              onClick={() => onAlign('center-horizontal')}
              title="Align Center Horizontally"
              aria-label="Align center horizontally"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="4" x2="12" y2="20" />
                <rect x="7" y="6" width="10" height="4" />
                <rect x="5" y="14" width="14" height="4" />
              </svg>
            </button>
            
            <button
              className="align-button"
              onClick={() => onAlign('right')}
              title="Align Right"
              aria-label="Align right"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="21" y1="4" x2="21" y2="20" />
                <rect x="8" y="6" width="10" height="4" />
                <rect x="4" y="14" width="14" height="4" />
              </svg>
            </button>
            
            <button
              className="align-button"
              onClick={() => onAlign('top')}
              title="Align Top"
              aria-label="Align top"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="4" y1="3" x2="20" y2="3" />
                <rect x="6" y="6" width="4" height="10" />
                <rect x="14" y="6" width="4" height="14" />
              </svg>
            </button>
            
            <button
              className="align-button"
              onClick={() => onAlign('center-vertical')}
              title="Align Center Vertically"
              aria-label="Align center vertically"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="4" y1="12" x2="20" y2="12" />
                <rect x="6" y="7" width="4" height="10" />
                <rect x="14" y="5" width="4" height="14" />
              </svg>
            </button>
            
            <button
              className="align-button"
              onClick={() => onAlign('bottom')}
              title="Align Bottom"
              aria-label="Align bottom"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="4" y1="21" x2="20" y2="21" />
                <rect x="6" y="8" width="4" height="10" />
                <rect x="14" y="4" width="4" height="14" />
              </svg>
            </button>
          </div>
        </div>
      )}
      
      {/* Action buttons */}
      {onGenerate500 && onClearAll && (
        <div className="shape-palette-actions">
          {onDuplicate && (
            <button
              className="action-button action-duplicate"
              onClick={onDuplicate}
              disabled={!hasSelection}
              title="Duplicate (Cmd/Ctrl+D)"
              aria-label="Duplicate selected shape"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </button>
          )}
          
          <button
            className="action-button action-generate"
            onClick={onGenerate500}
            title="Generate 10 random shapes"
            aria-label="Generate 10 random shapes"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
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
          </button>
        </div>
      )}
      
      {selectedTool === TOOL_TYPES.CUSTOM_POLYGON && (
        <div className="shape-palette-hint" title="Click to add vertices, press Enter to finish, Escape to cancel">
          ⏎
        </div>
      )}
    </div>
  );
});

export default ShapePalette;

