import React from 'react';
import './ContextMenu.css';

/**
 * Context menu that appears on right-click
 * Supports z-order operations and alignment (when multiple items selected)
 */
function ContextMenu({ x, y, onSendToFront, onSendToBack, onAlign, onClose, selectedCount = 1 }) {
  // Prevent clicks from propagating to canvas
  const handleMenuClick = (e) => {
    e.stopPropagation();
  };

  const handleSendToFront = (e) => {
    e.stopPropagation();
    onSendToFront();
    onClose();
  };

  const handleSendToBack = (e) => {
    e.stopPropagation();
    onSendToBack();
    onClose();
  };

  const handleAlign = (alignment) => (e) => {
    e.stopPropagation();
    onAlign(alignment);
    onClose();
  };

  const itemLabel = selectedCount > 1 ? `${selectedCount} items` : 'item';

  return (
    <div
      className="context-menu"
      style={{ left: `${x}px`, top: `${y}px` }}
      onClick={handleMenuClick}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="context-menu-item" onClick={handleSendToFront}>
        <span className="context-menu-icon">⬆️</span>
        <span>Send to Front</span>
        {selectedCount > 1 && <span className="context-menu-count">({itemLabel})</span>}
      </div>
      <div className="context-menu-item" onClick={handleSendToBack}>
        <span className="context-menu-icon">⬇️</span>
        <span>Send to Back</span>
        {selectedCount > 1 && <span className="context-menu-count">({itemLabel})</span>}
      </div>
      
      {/* Alignment options - only show when multiple items selected */}
      {selectedCount > 1 && onAlign && (
        <>
          <div className="context-menu-divider" />
          <div className="context-menu-section-title">Align {itemLabel}</div>
          
          <div className="context-menu-item" onClick={handleAlign('left')}>
            <span className="context-menu-icon">⬅️</span>
            <span>Align Left</span>
          </div>
          <div className="context-menu-item" onClick={handleAlign('center-horizontal')}>
            <span className="context-menu-icon">↔️</span>
            <span>Align Center</span>
          </div>
          <div className="context-menu-item" onClick={handleAlign('right')}>
            <span className="context-menu-icon">➡️</span>
            <span>Align Right</span>
          </div>
          
          <div className="context-menu-divider" />
          
          <div className="context-menu-item" onClick={handleAlign('top')}>
            <span className="context-menu-icon">⬆️</span>
            <span>Align Top</span>
          </div>
          <div className="context-menu-item" onClick={handleAlign('center-vertical')}>
            <span className="context-menu-icon">↕️</span>
            <span>Align Middle</span>
          </div>
          <div className="context-menu-item" onClick={handleAlign('bottom')}>
            <span className="context-menu-icon">⬇️</span>
            <span>Align Bottom</span>
          </div>
        </>
      )}
    </div>
  );
}

export default ContextMenu;

