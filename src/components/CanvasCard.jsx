import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './CanvasCard.css';

/**
 * CanvasCard - Individual canvas card in the dashboard
 */
function CanvasCard({ canvas, onOpenCanvas, onDeleteCanvas, onRenameCanvas, onDuplicateCanvas, onToggleStar }) {
  const [showMenu, setShowMenu] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(canvas.name);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuButtonRef = useRef(null);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Never';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const handleOpen = () => {
    onOpenCanvas(canvas.id, canvas.name);
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    
    if (window.confirm(`Delete "${canvas.name}"? This cannot be undone.`)) {
      try {
        await onDeleteCanvas(canvas.id);
      } catch (error) {
        alert(`Failed to delete canvas: ${error.message}`);
      }
    }
    setShowMenu(false);
  };

  const handleRename = (e) => {
    e.stopPropagation();
    setIsRenaming(true);
    setShowMenu(false);
  };

  const handleRenameSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const trimmedName = newName.trim();
    if (trimmedName && trimmedName !== canvas.name) {
      try {
        await onRenameCanvas(canvas.id, trimmedName);
      } catch (error) {
        alert(`Failed to rename canvas: ${error.message}`);
      }
    }
    setIsRenaming(false);
  };

  const handleRenameCancel = (e) => {
    e.stopPropagation();
    setNewName(canvas.name);
    setIsRenaming(false);
  };

  const handleDuplicate = async (e) => {
    e.stopPropagation();
    
    try {
      await onDuplicateCanvas(canvas.id, canvas.name);
    } catch (error) {
      alert(`Failed to duplicate canvas: ${error.message}`);
    }
    setShowMenu(false);
  };

  const handleToggleStar = (e) => {
    e.stopPropagation();
    onToggleStar(canvas.id);
  };

  const toggleMenu = (e) => {
    e.stopPropagation();
    
    if (!showMenu && menuButtonRef.current) {
      // Calculate menu position relative to viewport
      const rect = menuButtonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4, // 4px below button
        left: rect.right - 140  // Align right edge (140px is menu width)
      });
    }
    
    setShowMenu(!showMenu);
  };
  
  // Close menu when clicking outside
  useEffect(() => {
    if (!showMenu) return;
    
    const handleClickOutside = (e) => {
      if (menuButtonRef.current && !menuButtonRef.current.contains(e.target)) {
        // Check if click is on the menu itself (in portal)
        const menuElement = document.getElementById(`canvas-menu-${canvas.id}`);
        if (!menuElement || !menuElement.contains(e.target)) {
          setShowMenu(false);
        }
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu, canvas.id]);

  return (
    <div className={`canvas-card ${showMenu ? 'menu-open' : ''}`} onClick={handleOpen}>
      {/* Canvas Thumbnail */}
      <div className="canvas-thumbnail">
        <div className="canvas-thumbnail-placeholder">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 3h18v18H3V3z" stroke="currentColor" strokeWidth="2" fill="none"/>
            <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
      </div>
      
      {/* Canvas Info */}
      <div className="canvas-info">
        {isRenaming ? (
          <form onSubmit={handleRenameSubmit} onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Escape') handleRenameCancel(e);
              }}
              autoFocus
              maxLength={50}
              className="canvas-name-input"
            />
          </form>
        ) : (
          <h3 className="canvas-name" title={canvas.name}>
            {canvas.name}
          </h3>
        )}
        
        <div className="canvas-meta">
          <span className="canvas-role">{canvas.role}</span>
          <span className="canvas-meta-divider">•</span>
          <span className="canvas-date">{formatDate(canvas.lastAccessed)}</span>
        </div>
      </div>
      
      {/* Canvas Actions */}
      <div className="canvas-actions">
        <button
          className="canvas-star-btn"
          onClick={handleToggleStar}
          title={canvas.starred ? "Unstar canvas" : "Star canvas"}
          aria-label={canvas.starred ? "Unstar canvas" : "Star canvas"}
        >
          {canvas.starred ? '⭐' : '☆'}
        </button>
        
        <button
          ref={menuButtonRef}
          className="canvas-menu-btn"
          onClick={toggleMenu}
          aria-label="Canvas menu"
        >
          ⋮
        </button>
        
        {showMenu && createPortal(
          <div 
            id={`canvas-menu-${canvas.id}`}
            className="canvas-menu canvas-menu-portal" 
            style={{
              position: 'fixed',
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={handleRename} disabled={canvas.role !== 'owner'}>
              ✏️ Rename
            </button>
            <button onClick={handleDuplicate} disabled={canvas.role !== 'owner'}>
              📋 Duplicate
            </button>
            <button onClick={handleDelete} disabled={canvas.role !== 'owner'} className="danger">
              🗑️ Delete
            </button>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}

export default CanvasCard;

