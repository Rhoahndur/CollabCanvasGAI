import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import {
  getUserCanvases,
  createCanvas,
  deleteCanvas,
  updateCanvasMetadata,
  duplicateCanvas,
  toggleCanvasStarred,
} from '../services/canvasService';
import { autoMigrate } from '../services/canvasMigration';
import { reportError } from '../utils/errorHandler';
import CanvasCard from './CanvasCard';
import CreateCanvasModal from './CreateCanvasModal';
import UserSettingsModal from './UserSettingsModal';
import styles from './CanvasDashboard.module.css';

// Canvas limit per user
const CANVAS_LIMIT = 2;

/**
 * CanvasDashboard - Main dashboard for managing multiple canvases
 */
function CanvasDashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const onOpenCanvas = useCallback((canvasId) => navigate(`/canvas/${canvasId}`), [navigate]);
  const { theme, setTheme } = useTheme();
  const [canvases, setCanvases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadCanvases only closes over `user`, which is already in the dep array
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
      reportError(err, { component: 'CanvasDashboard', action: 'loadCanvases' });
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

      // Reload canvases
      await loadCanvases();

      // Open the new canvas
      onOpenCanvas(canvasId, name);
    } catch (error) {
      reportError(error, { component: 'CanvasDashboard', action: 'handleCreateCanvas' });
      throw error;
    }
  };

  const handleDeleteCanvas = async (canvasId) => {
    try {
      await deleteCanvas(canvasId, user.uid);

      // Reload canvases
      await loadCanvases();
    } catch (error) {
      reportError(error, { component: 'CanvasDashboard', action: 'handleDeleteCanvas' });
      throw error;
    }
  };

  const handleRenameCanvas = async (canvasId, newName) => {
    try {
      await updateCanvasMetadata(canvasId, { name: newName });

      // Update local state
      setCanvases((prevCanvases) =>
        prevCanvases.map((canvas) =>
          canvas.id === canvasId ? { ...canvas, name: newName } : canvas
        )
      );
    } catch (error) {
      reportError(error, { component: 'CanvasDashboard', action: 'handleRenameCanvas' });
      throw error;
    }
  };

  const handleDuplicateCanvas = async (canvasId, canvasName) => {
    try {
      const newName = `${canvasName} (Copy)`;
      await duplicateCanvas(canvasId, user.uid, newName);

      // Reload canvases
      await loadCanvases();

      // Optionally open the new canvas
      // onOpenCanvas(newCanvasId, newName);
    } catch (error) {
      reportError(error, { component: 'CanvasDashboard', action: 'handleDuplicateCanvas' });
      throw error;
    }
  };

  const handleToggleStar = async (canvasId) => {
    try {
      const newStarred = await toggleCanvasStarred(canvasId, user.uid);

      // Update local state
      setCanvases((prevCanvases) =>
        prevCanvases.map((canvas) =>
          canvas.id === canvasId ? { ...canvas, starred: newStarred } : canvas
        )
      );
    } catch (error) {
      reportError(error, { component: 'CanvasDashboard', action: 'handleToggleStar' });
    }
  };

  // Filter and sort canvases
  const filteredCanvases = canvases
    .filter((canvas) => {
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
      <div className={styles['dashboard-container']}>
        <div className={styles['dashboard-empty']}>
          <h2>Please sign in to access your canvases</h2>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles['dashboard-container']}>
        <div className={styles['dashboard-loading']}>
          <div className="loading-spinner"></div>
          <p>Loading your canvases...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles['dashboard-container']}>
        <div className={styles['dashboard-error']}>
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
    <div className={styles['dashboard-container']}>
      {/* Dashboard Header */}
      <header className={styles['dashboard-header']}>
        <div className={styles['dashboard-title']}>
          <h1>My Canvases</h1>
          <span className={styles['canvas-count']}>
            {canvases.length} {canvases.length === 1 ? 'canvas' : 'canvases'}
          </span>
        </div>

        <div className={styles['dashboard-actions']}>
          {user && (
            <div className={styles['user-display']}>
              <span className={styles['user-name']}>{user.displayName || user.email}</span>
            </div>
          )}

          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            ＋ New Canvas
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => setIsSettingsOpen(true)}
            title="Settings"
            aria-label="Open settings"
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6m-1.36-6.36l-4.24 4.24m-4.24 4.24l-4.24 4.24" />
            </svg>
          </button>

          <button className="btn btn-secondary" onClick={signOut} title="Sign out">
            Sign Out
          </button>
        </div>
      </header>

      {/* Filter Tabs */}
      {canvases.length > 0 && (
        <div className={styles['filter-tabs']}>
          <button
            className={`${styles['filter-tab']} ${filterBy === 'all' ? styles.active : ''}`}
            onClick={() => setFilterBy('all')}
          >
            All Canvases
          </button>
          <button
            className={`${styles['filter-tab']} ${filterBy === 'owned' ? styles.active : ''}`}
            onClick={() => setFilterBy('owned')}
          >
            My Canvases
          </button>
          <button
            className={`${styles['filter-tab']} ${filterBy === 'shared' ? styles.active : ''}`}
            onClick={() => setFilterBy('shared')}
          >
            Shared with Me
          </button>
        </div>
      )}

      {/* Search and View Controls */}
      {canvases.length > 0 && (
        <div className={styles['dashboard-controls']}>
          <div className={styles['search-box']}>
            <span className={styles['search-icon']}>🔍</span>
            <input
              type="text"
              placeholder="Search canvases..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className={styles['sort-select']}>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="lastAccessed">Last Accessed</option>
              <option value="name">Name</option>
              <option value="created">Date Created</option>
            </select>
          </div>

          <div className={styles['view-toggle']}>
            <button
              className={`${styles['view-btn']} ${viewMode === 'grid' ? styles.active : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              ◫
            </button>
            <button
              className={`${styles['view-btn']} ${viewMode === 'list' ? styles.active : ''}`}
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
        <div className={styles[viewMode === 'list' ? 'canvas-list' : 'canvas-grid']}>
          {filteredCanvases.map((canvas) => (
            <CanvasCard
              key={canvas.id}
              canvas={canvas}
              viewMode={viewMode}
              onOpenCanvas={onOpenCanvas}
              onDeleteCanvas={handleDeleteCanvas}
              onRenameCanvas={handleRenameCanvas}
              onDuplicateCanvas={handleDuplicateCanvas}
              onToggleStar={handleToggleStar}
            />
          ))}
        </div>
      ) : canvases.length > 0 ? (
        <div className={styles['dashboard-empty']}>
          <h2>No canvases found</h2>
          <p>Try a different search term</p>
        </div>
      ) : (
        <div className={styles['dashboard-empty']}>
          <div className={styles['empty-icon']}>🎨</div>
          <h2>No canvases yet</h2>
          <p>Create your first canvas to get started!</p>
          <button className="btn btn-primary btn-large" onClick={() => setShowCreateModal(true)}>
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
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowLimitModal(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setShowLimitModal(false);
          }}
        >
          <div className={`modal-content ${styles['limit-modal']}`}>
            <div className="modal-header">
              <h2>Canvas Limit Reached</h2>
              <button className="modal-close" onClick={() => setShowLimitModal(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className={styles['limit-icon']}>🎨</div>
              <p className={styles['limit-message']}>
                You've reached the maximum of <strong>{CANVAS_LIMIT} canvases</strong> for your
                account.
              </p>
              <p className={styles['limit-hint']}>
                To create a new canvas, please delete an existing one first.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setShowLimitModal(false)}>
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Settings Modal */}
      <UserSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        theme={theme}
        onThemeChange={setTheme}
      />
    </div>
  );
}

export default CanvasDashboard;
