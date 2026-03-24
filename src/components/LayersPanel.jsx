import { useState, useRef, useEffect } from 'react';
import styles from './LayersPanel.module.css';

/**
 * LayersPanel - Illustrator-style layers panel for shape management
 * Shows all shapes with selection, visibility, and locking controls
 */
function LayersPanel({
  shapes = [],
  selectedShapeIds = [],
  onSelectShape,
  onToggleVisibility,
  onRenameShape,
  userRole = 'editor',
  isOpen = false,
  onTogglePanel,
}) {
  const [editingShapeId, setEditingShapeId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const editInputRef = useRef(null);
  const panelRef = useRef(null);

  // Focus input when editing starts
  useEffect(() => {
    if (editingShapeId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingShapeId]);

  // Close panel when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      const toggleBtn = document.querySelector('.layers-toggle-btn');

      if (
        panelRef.current &&
        !panelRef.current.contains(e.target) &&
        toggleBtn &&
        !toggleBtn.contains(e.target)
      ) {
        onTogglePanel();
      }
    };

    // Add slight delay to avoid immediate close
    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onTogglePanel]);

  // Sort shapes by z-index (highest first = top of list = front of canvas)
  const sortedShapes = [...shapes].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));

  const handleLayerClick = (shapeId, e) => {
    e.stopPropagation();

    // Don't select if clicking on visibility toggle or edit input
    if (
      e.target.closest('[data-layer-action="visibility"]') ||
      e.target.closest('[data-layer-action="name-input"]')
    ) {
      return;
    }

    onSelectShape(shapeId);
  };

  const handleVisibilityToggle = (shapeId, e) => {
    e.stopPropagation();
    onToggleVisibility(shapeId);
  };

  const handleNameDoubleClick = (shape, e) => {
    e.stopPropagation();
    if (userRole === 'viewer') return;

    setEditingShapeId(shape.id);
    setEditingName(shape.name || getDefaultShapeName(shape));
  };

  const handleNameChange = (e) => {
    setEditingName(e.target.value);
  };

  const handleNameSubmit = (shapeId) => {
    const trimmedName = editingName.trim();
    if (trimmedName) {
      onRenameShape(shapeId, trimmedName);
    }
    setEditingShapeId(null);
    setEditingName('');
  };

  const handleNameBlur = (shapeId) => {
    handleNameSubmit(shapeId);
  };

  const handleNameKeyDown = (shapeId, e) => {
    if (e.key === 'Enter') {
      handleNameSubmit(shapeId);
    } else if (e.key === 'Escape') {
      setEditingShapeId(null);
      setEditingName('');
    }
  };

  const getDefaultShapeName = (shape) => {
    if (!shape) return 'Shape';

    const typeNames = {
      rectangle: 'Rectangle',
      circle: 'Circle',
      polygon: 'Pentagon',
      customPolygon: 'Polygon',
      text: 'Text',
      image: 'Image',
    };

    return typeNames[shape.type] || 'Shape';
  };

  const getShapeIcon = (type) => {
    switch (type) {
      case 'rectangle':
        return (
          <svg viewBox="0 0 16 16" fill="currentColor">
            <rect x="2" y="4" width="12" height="8" />
          </svg>
        );
      case 'circle':
        return (
          <svg viewBox="0 0 16 16" fill="currentColor">
            <circle cx="8" cy="8" r="6" />
          </svg>
        );
      case 'polygon':
      case 'customPolygon':
        return (
          <svg viewBox="0 0 16 16" fill="currentColor">
            <polygon points="8,2 14,12 2,12" />
          </svg>
        );
      case 'text':
        return (
          <svg viewBox="0 0 16 16" fill="currentColor">
            <text x="8" y="12" fontSize="12" textAnchor="middle" fontWeight="bold">
              T
            </text>
          </svg>
        );
      case 'image':
        return (
          <svg viewBox="0 0 16 16" fill="currentColor">
            <rect
              x="2"
              y="2"
              width="12"
              height="12"
              rx="1"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <circle cx="6" cy="6" r="1.5" />
            <path d="M 2 11 L 6 7 L 10 11 L 14 7 L 14 14 L 2 14 Z" />
          </svg>
        );
      default:
        return (
          <svg viewBox="0 0 16 16" fill="currentColor">
            <rect x="2" y="2" width="12" height="12" />
          </svg>
        );
    }
  };

  const isSelected = (shapeId) => {
    return selectedShapeIds.includes(shapeId);
  };

  if (!isOpen) return null;

  return (
    <div ref={panelRef} className={styles['layers-panel']}>
      {/* Panel Header */}
      <div className={styles['layers-header']}>
        <h3>Layers</h3>
        <button
          className={styles['layers-close-btn']}
          onClick={onTogglePanel}
          title="Close layers panel"
        >
          ✕
        </button>
      </div>

      {/* Layers List */}
      <div className={styles['layers-list-wrapper']}>
        <div className={styles['layers-list']}>
          {sortedShapes.length === 0 ? (
            <div className={styles['layers-empty']}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 21V9" />
              </svg>
              <p>No shapes yet</p>
              <span>Create shapes to see them here</span>
            </div>
          ) : (
            sortedShapes.map((shape) => {
              const isShapeSelected = isSelected(shape.id);
              const isVisible = shape.visible !== false;
              const isLocked = shape.lockedBy && shape.lockedBy !== shape.createdBy;

              return (
                <div
                  key={shape.id}
                  role="button"
                  tabIndex={0}
                  className={`${styles['layer-item']} ${isShapeSelected ? styles['selected'] : ''} ${!isVisible ? styles['hidden'] : ''}`}
                  onClick={(e) => handleLayerClick(shape.id, e)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleLayerClick(shape.id, e);
                    }
                  }}
                >
                  {/* Visibility Toggle */}
                  <button
                    className={styles['layer-visibility-toggle']}
                    data-layer-action="visibility"
                    onClick={(e) => handleVisibilityToggle(shape.id, e)}
                    title={isVisible ? 'Hide shape' : 'Show shape'}
                  >
                    {isVisible ? '👁' : '👁‍🗨'}
                  </button>

                  {/* Shape Icon */}
                  <div className={styles['layer-icon']} style={{ color: shape.color || '#646cff' }}>
                    {getShapeIcon(shape.type)}
                  </div>

                  {/* Shape Name */}
                  {editingShapeId === shape.id ? (
                    <input
                      ref={editInputRef}
                      type="text"
                      className={styles['layer-name-input']}
                      data-layer-action="name-input"
                      value={editingName}
                      onChange={handleNameChange}
                      onBlur={() => handleNameBlur(shape.id)}
                      onKeyDown={(e) => handleNameKeyDown(shape.id, e)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <div
                      className={styles['layer-name']}
                      onDoubleClick={(e) => handleNameDoubleClick(shape, e)}
                      title={shape.name || getDefaultShapeName(shape)}
                    >
                      {shape.name || getDefaultShapeName(shape)}
                    </div>
                  )}

                  {/* Lock Indicator */}
                  {isLocked && (
                    <div
                      className={styles['layer-lock-indicator']}
                      title={`Locked by ${shape.lockedByUserName || 'another user'}`}
                    >
                      🔒
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default LayersPanel;
