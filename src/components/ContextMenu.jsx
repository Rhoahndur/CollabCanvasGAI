import React, { useEffect, useRef } from 'react';
import './ContextMenu.css';

/**
 * Context menu that appears on right-click
 * Supports z-order operations and alignment (when multiple items selected)
 */

const activateOnEnterOrSpace = (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    e.currentTarget.click();
  }
};

function ContextMenu({ x, y, onSendToFront, onSendToBack, onAlign, onClose, selectedCount = 1 }) {
  const menuRef = useRef(null);

  // Focus the menu on mount and handle keyboard navigation
  useEffect(() => {
    if (menuRef.current) {
      menuRef.current.focus();
    }
  }, []);

  const handleKeyDown = (e) => {
    const items = menuRef.current?.querySelectorAll('[role="menuitem"]');
    if (!items || items.length === 0) return;

    const currentIndex = Array.from(items).indexOf(document.activeElement);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
      items[next].focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
      items[prev].focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

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
      ref={menuRef}
      className="context-menu"
      style={{ left: `${x}px`, top: `${y}px` }}
      onClick={handleMenuClick}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={handleKeyDown}
      role="menu"
      aria-label="Shape actions"
      tabIndex={-1}
    >
      <div
        className="context-menu-item"
        role="menuitem"
        tabIndex={-1}
        onClick={handleSendToFront}
        onKeyDown={activateOnEnterOrSpace}
      >
        <span className="context-menu-icon">⬆️</span>
        <span>Send to Front</span>
        {selectedCount > 1 && <span className="context-menu-count">({itemLabel})</span>}
      </div>
      <div
        className="context-menu-item"
        role="menuitem"
        tabIndex={-1}
        onClick={handleSendToBack}
        onKeyDown={activateOnEnterOrSpace}
      >
        <span className="context-menu-icon">⬇️</span>
        <span>Send to Back</span>
        {selectedCount > 1 && <span className="context-menu-count">({itemLabel})</span>}
      </div>

      {/* Alignment options - only show when multiple items selected */}
      {selectedCount > 1 && onAlign && (
        <>
          <div className="context-menu-divider" role="separator" />
          <div className="context-menu-section-title">Align {itemLabel}</div>

          <div
            className="context-menu-item"
            role="menuitem"
            tabIndex={-1}
            onClick={handleAlign('left')}
            onKeyDown={activateOnEnterOrSpace}
          >
            <span className="context-menu-icon">⬅️</span>
            <span>Align Left</span>
          </div>
          <div
            className="context-menu-item"
            role="menuitem"
            tabIndex={-1}
            onClick={handleAlign('center-horizontal')}
            onKeyDown={activateOnEnterOrSpace}
          >
            <span className="context-menu-icon">↔️</span>
            <span>Align Center</span>
          </div>
          <div
            className="context-menu-item"
            role="menuitem"
            tabIndex={-1}
            onClick={handleAlign('right')}
            onKeyDown={activateOnEnterOrSpace}
          >
            <span className="context-menu-icon">➡️</span>
            <span>Align Right</span>
          </div>

          <div className="context-menu-divider" role="separator" />

          <div
            className="context-menu-item"
            role="menuitem"
            tabIndex={-1}
            onClick={handleAlign('top')}
            onKeyDown={activateOnEnterOrSpace}
          >
            <span className="context-menu-icon">⬆️</span>
            <span>Align Top</span>
          </div>
          <div
            className="context-menu-item"
            role="menuitem"
            tabIndex={-1}
            onClick={handleAlign('center-vertical')}
            onKeyDown={activateOnEnterOrSpace}
          >
            <span className="context-menu-icon">↕️</span>
            <span>Align Middle</span>
          </div>
          <div
            className="context-menu-item"
            role="menuitem"
            tabIndex={-1}
            onClick={handleAlign('bottom')}
            onKeyDown={activateOnEnterOrSpace}
          >
            <span className="context-menu-icon">⬇️</span>
            <span>Align Bottom</span>
          </div>
        </>
      )}
    </div>
  );
}

export default ContextMenu;
