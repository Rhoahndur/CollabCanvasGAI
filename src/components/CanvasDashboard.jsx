import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  getUserCanvases, 
  createCanvas, 
  deleteCanvas,
  updateCanvasMetadata,
} from '../services/canvasService';
import { autoMigrate } from '../services/canvasMigration';
import CanvasCard from './CanvasCard';
import CreateCanvasModal from './CreateCanvasModal';
import './CanvasDashboard.css';

/**
 * CanvasDashboard - Main dashboard for managing multiple canvases
 */
function CanvasDashboard({ onOpenCanvas }) {
  const { user, signOut } = useAuth();
  const [canvases, setCanvases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

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

  // Filter canvases based on search query
  const filteredCanvases = canvases.filter(canvas =>
    canvas.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
    </div>
  );
}

export default CanvasDashboard;

