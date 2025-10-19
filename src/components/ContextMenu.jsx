import React from 'react';
import './ContextMenu.css';

/**
 * Context menu that appears on right-click
 * Supports z-order operations (send to front/back)
 */
function ContextMenu({ x, y, onSendToFront, onSendToBack, onClose, selectedCount = 1 }) {
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
    </div>
  );
}

export default ContextMenu;

