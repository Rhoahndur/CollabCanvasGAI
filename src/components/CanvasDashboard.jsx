import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  getUserCanvases, 
  createCanvas, 
  deleteCanvas,
  updateCanvasMetadata,
  duplicateCanvas,
  toggleCanvasStarred,
} from '../services/canvasService';
import { autoMigrate } from '../services/canvasMigration';
import CanvasCard from './CanvasCard';
import CreateCanvasModal from './CreateCanvasModal';
import './CanvasDashboard.css';

// Canvas limit per user
const CANVAS_LIMIT = 2;

/**
 * CanvasDashboard - Main dashboard for managing multiple canvases
 */
function CanvasDashboard({ onOpenCanvas }) {
  const { user, signOut } = useAuth();
  const [canvases, setCanvases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('lastAccessed'); // 'lastAccessed', 'name', 'created'
  const [filterBy, setFilterBy] = useState('all'); // 'all', 'owned', 'shared'

  // Load user's canvases
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    loadCanvases();
  }, [user]);

  const loadCanvases = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Auto-migrate if needed
      await autoMigrate(user.uid, user.displayName, user);
      
      // Load canvases
      const userCanvases = await getUserCanvases(user.uid);
      setCanvases(userCanvases);
    } catch (err) {
      console.error('Error loading canvases:', err);
      setError(err.message || 'Failed to load canvases');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCanvas = async (name, template) => {
    // Check canvas limit
    if (canvases.length >= CANVAS_LIMIT) {
      setShowLimitModal(true);
      return;
    }
    
    try {
      const canvasId = await createCanvas(user.uid, name, template);
      console.log('✅ Canvas created:', canvasId);
      
      // Reload canvases
      await loadCanvases();
      
      // Open the new canvas
      onOpenCanvas(canvasId, name);
    } catch (error) {
      console.error('Error creating canvas:', error);
      throw error;
    }
  };

  const handleDeleteCanvas = async (canvasId) => {
    try {
      await deleteCanvas(canvasId, user.uid);
      console.log('✅ Canvas deleted:', canvasId);
      
      // Reload canvases
      await loadCanvases();
    } catch (error) {
      console.error('Error deleting canvas:', error);
      throw error;
    }
  };

  const handleRenameCanvas = async (canvasId, newName) => {
    try {
      await updateCanvasMetadata(canvasId, { name: newName });
      console.log('✅ Canvas renamed:', canvasId, newName);
      
      // Update local state
      setCanvases(prevCanvases =>
        prevCanvases.map(canvas =>
          canvas.id === canvasId ? { ...canvas, name: newName } : canvas
        )
      );
    } catch (error) {
      console.error('Error renaming canvas:', error);
      throw error;
    }
  };

  const handleDuplicateCanvas = async (canvasId, canvasName) => {
    try {
      const newName = `${canvasName} (Copy)`;
      const newCanvasId = await duplicateCanvas(canvasId, user.uid, newName);
      console.log('✅ Canvas duplicated:', canvasId, '→', newCanvasId);
      
      // Reload canvases
      await loadCanvases();
      
      // Optionally open the new canvas
      // onOpenCanvas(newCanvasId, newName);
    } catch (error) {
      console.error('Error duplicating canvas:', error);
      throw error;
    }
  };

  const handleToggleStar = async (canvasId) => {
    try {
      const newStarred = await toggleCanvasStarred(canvasId, user.uid);
      console.log('⭐ Canvas star toggled:', canvasId, newStarred);
      
      // Update local state
      setCanvases(prevCanvases =>
        prevCanvases.map(canvas =>
          canvas.id === canvasId ? { ...canvas, starred: newStarred } : canvas
        )
      );
    } catch (error) {
      console.error('Error toggling star:', error);
    }
  };

  // Filter and sort canvases
  const filteredCanvases = canvases
    .filter(canvas => {
      // Search query filter
      if (!canvas.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Role filter
      if (filterBy === 'owned' && canvas.role !== 'owner') {
        return false;
      }
      if (filterBy === 'shared' && canvas.role === 'owner') {
        return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      // Starred canvases always first
      if (a.starred && !b.starred) return -1;
      if (!a.starred && b.starred) return 1;
      
      // Then by selected sort option
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'created':
          // Assuming canvasId contains timestamp, or use a created field if available
          return a.id.localeCompare(b.id);
        case 'lastAccessed':
        default:
          return (b.lastAccessed || 0) - (a.lastAccessed || 0);
      }
    });

  if (!user) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-empty">
          <h2>Please sign in to access your canvases</h2>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-loading">
          <div className="loading-spinner"></div>
          <p>Loading your canvases...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-error">
          <h2>⚠️ Error Loading Canvases</h2>
          <p>{error}</p>
          <button onClick={loadCanvases} className="btn btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Dashboard Header */}
      <header className="dashboard-header">
        <div className="dashboard-title">
          <h1>My Canvases</h1>
          <span className="canvas-count">
            {canvases.length} {canvases.length === 1 ? 'canvas' : 'canvases'}
          </span>
        </div>
        
        <div className="dashboard-actions">
          {user && (
            <div className="user-display">
              <span className="user-name">{user.displayName || user.email}</span>
            </div>
          )}
          
          <button 
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            ＋ New Canvas
          </button>
          
          <button
            className="btn btn-secondary"
            onClick={signOut}
            title="Sign out"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Filter Tabs */}
      {canvases.length > 0 && (
        <div className="filter-tabs">
          <button
            className={`filter-tab ${filterBy === 'all' ? 'active' : ''}`}
            onClick={() => setFilterBy('all')}
          >
            All Canvases
          </button>
          <button
            className={`filter-tab ${filterBy === 'owned' ? 'active' : ''}`}
            onClick={() => setFilterBy('owned')}
          >
            My Canvases
          </button>
          <button
            className={`filter-tab ${filterBy === 'shared' ? 'active' : ''}`}
            onClick={() => setFilterBy('shared')}
          >
            Shared with Me
          </button>
        </div>
      )}
      
      {/* Search and View Controls */}
      {canvases.length > 0 && (
        <div className="dashboard-controls">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search canvases..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="sort-select">
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="lastAccessed">Last Accessed</option>
              <option value="name">Name</option>
              <option value="created">Date Created</option>
            </select>
          </div>
          
          <div className="view-toggle">
            <button
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              ◫
            </button>
            <button
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              ☰
            </button>
          </div>
        </div>
      )}

      {/* Canvas Grid/List */}
      {filteredCanvases.length > 0 ? (
        <div className={`canvas-${viewMode}`}>
          {filteredCanvases.map((canvas) => (
            <CanvasCard
              key={canvas.id}
              canvas={canvas}
              onOpenCanvas={onOpenCanvas}
              onDeleteCanvas={handleDeleteCanvas}
              onRenameCanvas={handleRenameCanvas}
              onDuplicateCanvas={handleDuplicateCanvas}
              onToggleStar={handleToggleStar}
            />
          ))}
        </div>
      ) : canvases.length > 0 ? (
        <div className="dashboard-empty">
          <h2>No canvases found</h2>
          <p>Try a different search term</p>
        </div>
      ) : (
        <div className="dashboard-empty">
          <div className="empty-icon">🎨</div>
          <h2>No canvases yet</h2>
          <p>Create your first canvas to get started!</p>
          <button
            className="btn btn-primary btn-large"
            onClick={() => setShowCreateModal(true)}
          >
            ＋ Create Your First Canvas
          </button>
        </div>
      )}

      {/* Create Canvas Modal */}
      <CreateCanvasModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateCanvas={handleCreateCanvas}
        userCanvasCount={canvases.length}
      />
      
      {/* Canvas Limit Modal */}
      {showLimitModal && (
        <div className="modal-overlay" onClick={() => setShowLimitModal(false)}>
          <div className="modal-content limit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Canvas Limit Reached</h2>
              <button className="modal-close" onClick={() => setShowLimitModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="limit-icon">🎨</div>
              <p className="limit-message">
                You've reached the maximum of <strong>{CANVAS_LIMIT} canvases</strong> for your account.
              </p>
              <p className="limit-hint">
                To create a new canvas, please delete an existing one first.
              </p>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-primary" 
                onClick={() => setShowLimitModal(false)}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CanvasDashboard;

