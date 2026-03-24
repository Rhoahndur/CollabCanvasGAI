import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { usePresence } from '../hooks/usePresence';
import { requestCanvasAccess, getCanvasMetadata } from '../services/canvasService';
import { reportError } from '../utils/errorHandler';
import Canvas from './Canvas';
import PresenceSidebar from './PresenceSidebar';
import ShareCanvasModal from './ShareCanvasModal';
import CanvasSettingsModal from './CanvasSettingsModal';
import UserSettingsModal from './UserSettingsModal';

function CanvasRoute({ sessionId }) {
  const { canvasId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  const [canvasName, setCanvasName] = useState('');
  const [accessChecked, setAccessChecked] = useState(false);

  // Canvas settings
  const [canvasSettings, setCanvasSettings] = useState({
    backgroundColor: '#1a1a1a',
    gridVisible: false,
  });

  // Modal state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCanvasSettingsModalOpen, setIsCanvasSettingsModalOpen] = useState(false);
  const [isUserSettingsModalOpen, setIsUserSettingsModalOpen] = useState(false);

  // Presence
  const { onlineUsers } = usePresence(sessionId, user?.uid, user?.displayName, canvasId);

  // Check canvas access on mount
  useEffect(() => {
    if (!user || !canvasId) return;

    const checkAccess = async () => {
      const requestedRole = searchParams.get('role') || 'viewer';

      const accessResult = await requestCanvasAccess(
        canvasId,
        user.uid,
        user.displayName || user.email,
        requestedRole
      );

      if (accessResult.success) {
        setCanvasName(accessResult.canvasName || 'Shared Canvas');
        setAccessChecked(true);
      } else {
        reportError(accessResult.error, { component: 'CanvasRoute', action: 'checkAccess' });
        alert(`Cannot open canvas: ${accessResult.error}`);
        navigate('/');
      }
    };

    checkAccess();
  }, [user, canvasId, searchParams, navigate]);

  // Load canvas settings
  useEffect(() => {
    if (!canvasId || !accessChecked) return;

    const loadSettings = async () => {
      try {
        const metadata = await getCanvasMetadata(canvasId);
        if (metadata?.settings) {
          setCanvasSettings({
            backgroundColor: metadata.settings.backgroundColor || '#1a1a1a',
            gridVisible: metadata.settings.gridVisible === true,
          });
        } else {
          setCanvasSettings({ backgroundColor: '#1a1a1a', gridVisible: false });
        }
      } catch (error) {
        reportError(error, { component: 'CanvasRoute', action: 'loadSettings' });
        setCanvasSettings({ backgroundColor: '#1a1a1a', gridVisible: false });
      }
    };

    loadSettings();
  }, [canvasId, accessChecked]);

  if (!accessChecked) {
    return (
      <div className="app">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading canvas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <a href="#canvas-main" className="sr-only">
        Skip to canvas
      </a>
      <header className="app-header">
        <div className="header-left">
          <button className="btn-back" onClick={() => navigate('/')} title="Back to Dashboard">
            &larr; Dashboard
          </button>
          <h1>CollabCanvas</h1>
        </div>
        <div className="header-right">
          <button
            className="btn-canvas-settings"
            onClick={() => setIsCanvasSettingsModalOpen(true)}
            title="Canvas Settings (Background, Grid)"
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M9 21V9" />
            </svg>
            Canvas
          </button>
          <button
            className="btn-share"
            onClick={() => setIsShareModalOpen(true)}
            title="Share Canvas"
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
            </svg>
            Share
          </button>
          <button
            className="btn-user-settings"
            onClick={() => setIsUserSettingsModalOpen(true)}
            title="User Settings (Theme, Appearance)"
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v3m0 16v3M5.64 5.64l2.12 2.12m8.48 8.48l2.12 2.12M1 12h3m16 0h3M5.64 18.36l2.12-2.12m8.48-8.48l2.12-2.12" />
            </svg>
            Settings
          </button>
          <div className="user-info">
            {user.photoURL && (
              <img src={user.photoURL} alt={user.displayName} className="user-avatar" />
            )}
            <span className="user-name">{user.displayName}</span>
          </div>
        </div>
      </header>
      <main id="canvas-main" className="app-main canvas-main">
        <Canvas
          sessionId={sessionId}
          onlineUsersCount={onlineUsers.length}
          canvasId={canvasId}
          backgroundColor={canvasSettings.backgroundColor}
          gridVisible={canvasSettings.gridVisible}
        />
        <PresenceSidebar onlineUsers={onlineUsers} currentSessionId={sessionId} />
      </main>

      <CanvasSettingsModal
        canvasId={canvasId}
        canvasName={canvasName}
        isOpen={isCanvasSettingsModalOpen}
        onClose={() => setIsCanvasSettingsModalOpen(false)}
        onSettingsChange={setCanvasSettings}
      />

      <UserSettingsModal
        isOpen={isUserSettingsModalOpen}
        onClose={() => setIsUserSettingsModalOpen(false)}
        theme={theme}
        onThemeChange={setTheme}
      />

      <ShareCanvasModal
        canvasId={canvasId}
        canvasName={canvasName}
        currentUserId={user?.uid}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />
    </div>
  );
}

export default CanvasRoute;
