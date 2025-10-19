import { useRef, useEffect, useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { usePresence } from './hooks/usePresence'
import { requestCanvasAccess, cleanupStalePresence } from './services/canvasService'
import LoginPage from './components/LoginPage'
import CanvasDashboard from './components/CanvasDashboard'
import Canvas from './components/Canvas'
import PresenceSidebar from './components/PresenceSidebar'
import ShareCanvasModal from './components/ShareCanvasModal'
import CanvasSettingsModal from './components/CanvasSettingsModal'
import './App.css'

function App() {
  // Generate unique session ID for this browser tab/window
  const sessionIdRef = useRef(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
  
  // Routing state
  const [currentView, setCurrentView] = useState('dashboard') // 'dashboard' or 'canvas'
  const [currentCanvasId, setCurrentCanvasId] = useState(null)
  const [currentCanvasName, setCurrentCanvasName] = useState('')
  
  // Share modal state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  
  // Settings modal state
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [canvasSettings, setCanvasSettings] = useState({
    backgroundColor: '#1a1a1a',
    gridVisible: false,
  })
  
  // Store sessionId globally for access during sign out
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__currentSessionId = sessionIdRef.current;
    }
  }, []);
  
  // Expose debug utilities for manual cleanup
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__debugCleanup = async (canvasId = null) => {
        const targetCanvasId = canvasId || currentCanvasId;
        if (!targetCanvasId) {
          console.warn('⚠️ No canvas ID provided and no canvas currently open. Please provide a canvas ID: window.__debugCleanup("canvasId")');
          return 0;
        }
        console.log(`🧹 Manually cleaning up stale presence for canvas: ${targetCanvasId}`);
        const cleaned = await cleanupStalePresence(targetCanvasId);
        console.log(`✅ Cleaned up ${cleaned} stale sessions`);
        return cleaned;
      };
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        delete window.__debugCleanup;
      }
    };
  }, [currentCanvasId]);
  
  const { user, loading, signIn } = useAuth()
  
  // Handle URL-based canvas routing (for shared links)
  useEffect(() => {
    if (!user) return; // Wait for user to be loaded
    
    const handleURLChange = async () => {
      const path = window.location.pathname;
      const canvasMatch = path.match(/^\/canvas\/(.+)$/);
      
      if (canvasMatch) {
        const canvasId = canvasMatch[1];
        
        // Parse query parameters to get requested role
        const urlParams = new URLSearchParams(window.location.search);
        const requestedRole = urlParams.get('role') || 'viewer';
        
        // Request access to the canvas (grants specified role if needed)
        const accessResult = await requestCanvasAccess(
          canvasId, 
          user.uid, 
          user.displayName || user.email,
          requestedRole
        );
        
        if (accessResult.success) {
          // Open the canvas from the URL
          setCurrentCanvasId(canvasId);
          setCurrentCanvasName(accessResult.canvasName || 'Shared Canvas');
          setCurrentView('canvas');
          
          if (!accessResult.alreadyHadAccess) {
            console.log(`✅ Granted viewer access to canvas: ${accessResult.canvasName}`);
          }
        } else {
          // Canvas not found or error
          console.error('Failed to access canvas:', accessResult.error);
          alert(`Cannot open canvas: ${accessResult.error}`);
          // Navigate back to dashboard
          setCurrentView('dashboard');
          setCurrentCanvasId(null);
          setCurrentCanvasName('');
          window.history.pushState({}, '', '/');
        }
      } else if (path === '/') {
        // Navigate to dashboard
        setCurrentView('dashboard');
        setCurrentCanvasId(null);
        setCurrentCanvasName('');
      }
    };
    
    // Handle initial URL
    handleURLChange();
    
    // Handle browser back/forward buttons
    window.addEventListener('popstate', handleURLChange);
    
    return () => {
      window.removeEventListener('popstate', handleURLChange);
    };
  }, [user])
  
  // Only use presence when on a canvas (not on dashboard)
  const { onlineUsers } = usePresence(
    sessionIdRef.current, 
    user?.uid, 
    user?.displayName,
    currentView === 'canvas' ? currentCanvasId : null
  )

  // Handle opening a canvas
  const handleOpenCanvas = (canvasId, canvasName = '') => {
    setCurrentCanvasId(canvasId)
    setCurrentCanvasName(canvasName)
    setCurrentView('canvas')
    // Update URL to reflect current canvas
    window.history.pushState({}, '', `/canvas/${canvasId}`)
  }

  // Handle going back to dashboard
  const handleBackToDashboard = () => {
    setCurrentView('dashboard')
    setCurrentCanvasId(null)
    setCurrentCanvasName('')
    // Update URL to reflect dashboard
    window.history.pushState({}, '', '/')
  }
  
  // Handle opening share modal
  const handleOpenShareModal = () => {
    setIsShareModalOpen(true)
  }
  
  // Handle closing share modal
  const handleCloseShareModal = () => {
    setIsShareModalOpen(false)
  }
  
  // Handle opening settings modal
  const handleOpenSettingsModal = () => {
    setIsSettingsModalOpen(true)
  }
  
  // Handle closing settings modal
  const handleCloseSettingsModal = () => {
    setIsSettingsModalOpen(false)
  }
  
  // Handle settings change
  const handleSettingsChange = (newSettings) => {
    setCanvasSettings(newSettings)
  }

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="app">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  // Show login page if not authenticated
  if (!user) {
    return <LoginPage onSignIn={signIn} />
  }

  // Show dashboard view
  if (currentView === 'dashboard') {
    return (
      <div className="app">
        <CanvasDashboard onOpenCanvas={handleOpenCanvas} />
      </div>
    )
  }

  // Show canvas view
  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <button 
            className="btn-back" 
            onClick={handleBackToDashboard}
            title="Back to Dashboard"
          >
            ← Dashboard
          </button>
          <h1>CollabCanvas</h1>
        </div>
        <div className="header-right">
          <button 
            className="btn-settings" 
            onClick={handleOpenSettingsModal}
            title="Canvas Settings"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v3m0 16v3M5.64 5.64l2.12 2.12m8.48 8.48l2.12 2.12M1 12h3m16 0h3M5.64 18.36l2.12-2.12m8.48-8.48l2.12-2.12" />
            </svg>
            Settings
          </button>
          <button 
            className="btn-share" 
            onClick={handleOpenShareModal}
            title="Share Canvas"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
            </svg>
            Share
          </button>
          <div className="user-info">
            {user.photoURL && (
              <img
                src={user.photoURL}
                alt={user.displayName}
                className="user-avatar"
              />
            )}
            <span className="user-name">{user.displayName}</span>
          </div>
        </div>
      </header>
      <main className="app-main canvas-main">
        <Canvas 
          sessionId={sessionIdRef.current} 
          onlineUsersCount={onlineUsers.length}
          canvasId={currentCanvasId}
          backgroundColor={canvasSettings.backgroundColor}
          gridVisible={canvasSettings.gridVisible}
        />
        <PresenceSidebar 
          onlineUsers={onlineUsers} 
          currentSessionId={sessionIdRef.current}
        />
      </main>
      
      {/* Canvas Settings Modal */}
      <CanvasSettingsModal
        canvasId={currentCanvasId}
        canvasName={currentCanvasName}
        isOpen={isSettingsModalOpen}
        onClose={handleCloseSettingsModal}
        onSettingsChange={handleSettingsChange}
      />
      
      {/* Share Canvas Modal */}
        <ShareCanvasModal
          canvasId={currentCanvasId}
          canvasName={currentCanvasName}
          currentUserId={user?.uid}
          currentUserName={user?.displayName || user?.email}
          isOpen={isShareModalOpen}
          onClose={handleCloseShareModal}
        />
    </div>
  )
}

export default App

