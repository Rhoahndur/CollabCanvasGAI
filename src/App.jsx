import { useRef, useEffect, useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { usePresence } from './hooks/usePresence'
import LoginPage from './components/LoginPage'
import CanvasDashboard from './components/CanvasDashboard'
import Canvas from './components/Canvas'
import PresenceSidebar from './components/PresenceSidebar'
import './App.css'

function App() {
  // Generate unique session ID for this browser tab/window
  const sessionIdRef = useRef(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
  
  // Routing state
  const [currentView, setCurrentView] = useState('dashboard') // 'dashboard' or 'canvas'
  const [currentCanvasId, setCurrentCanvasId] = useState(null)
  
  // Store sessionId globally for access during sign out
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__currentSessionId = sessionIdRef.current;
    }
  }, []);
  
  const { user, loading, signIn } = useAuth()
  const { onlineUsers } = usePresence(sessionIdRef.current, user?.uid, user?.displayName)

  // Handle opening a canvas
  const handleOpenCanvas = (canvasId) => {
    setCurrentCanvasId(canvasId)
    setCurrentView('canvas')
  }

  // Handle going back to dashboard
  const handleBackToDashboard = () => {
    setCurrentView('dashboard')
    setCurrentCanvasId(null)
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
    </div>
  )
}

export default App

