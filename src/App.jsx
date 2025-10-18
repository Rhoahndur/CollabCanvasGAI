import { useRef, useEffect, useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { usePresence } from './hooks/usePresence'
import LoginPage from './components/LoginPage'
import CanvasDashboard from './components/CanvasDashboard'
import Canvas from './components/Canvas'
import PresenceSidebar from './components/PresenceSidebar'
import ShareCanvasModal from './components/ShareCanvasModal'
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
  
  // Store sessionId globally for access during sign out
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__currentSessionId = sessionIdRef.current;
    }
  }, []);
  
  const { user, loading, signIn } = useAuth()
  
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
  }

  // Handle going back to dashboard
  const handleBackToDashboard = () => {
    setCurrentView('dashboard')
    setCurrentCanvasId(null)
    setCurrentCanvasName('')
  }
  
  // Handle opening share modal
  const handleOpenShareModal = () => {
    setIsShareModalOpen(true)
  }
  
  // Handle closing share modal
  const handleCloseShareModal = () => {
    setIsShareModalOpen(false)
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
        />
        <PresenceSidebar 
          onlineUsers={onlineUsers} 
          currentSessionId={sessionIdRef.current}
        />
      </main>
      
      {/* Share Canvas Modal */}
      <ShareCanvasModal
        canvasId={currentCanvasId}
        canvasName={currentCanvasName}
        currentUserId={user?.uid}
        isOpen={isShareModalOpen}
        onClose={handleCloseShareModal}
      />
    </div>
  )
}

export default App

