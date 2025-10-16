import { memo } from 'react';
import { SHAPE_TYPES } from '../utils/constants';
import './ShapePalette.css';

/**
 * ShapePalette component - Tool selector for different shape types
 * Displays a vertical palette on the left side of the canvas
 */
const ShapePalette = memo(function ShapePalette({ selectedTool, onSelectTool }) {
  const tools = [
    {
      type: SHAPE_TYPES.RECTANGLE,
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24">
          <rect x="4" y="6" width="16" height="12" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      ),
      label: 'Rectangle',
    },
    {
      type: SHAPE_TYPES.CIRCLE,
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24">
          <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      ),
      label: 'Circle',
    },
    {
      type: SHAPE_TYPES.POLYGON,
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24">
          <polygon points="12,4 20,9 18,18 6,18 4,9" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      ),
      label: 'Pentagon',
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
            className={`tool-button ${selectedTool === tool.type ? 'active' : ''}`}
            onClick={() => onSelectTool(tool.type)}
            title={tool.label}
            aria-label={tool.label}
          >
            {tool.icon}
            <span className="tool-label">{tool.label}</span>
          </button>
        ))}
      </div>
      <div className="shape-palette-hint">
        Click and drag to create
      </div>
    </div>
  );
});

export default ShapePalette;

