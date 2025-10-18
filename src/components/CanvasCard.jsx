import { useState } from 'react';
import './CanvasCard.css';

/**
 * CanvasCard - Individual canvas card in the dashboard
 */
function CanvasCard({ canvas, onOpenCanvas, onDeleteCanvas, onRenameCanvas }) {
  const [showMenu, setShowMenu] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(canvas.name);

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
    onOpenCanvas(canvas.id);
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

  const toggleMenu = (e) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  return (
    <div className="canvas-card" onClick={handleOpen}>
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
        {canvas.starred && (
          <span className="canvas-star" title="Starred">⭐</span>
        )}
        
        <button
          className="canvas-menu-btn"
          onClick={toggleMenu}
          aria-label="Canvas menu"
        >
          ⋮
        </button>
        
        {showMenu && (
          <div className="canvas-menu" onClick={(e) => e.stopPropagation()}>
            <button onClick={handleRename} disabled={canvas.role !== 'owner'}>
              ✏️ Rename
            </button>
            <button onClick={handleDelete} disabled={canvas.role !== 'owner'} className="danger">
              🗑️ Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default CanvasCard;

