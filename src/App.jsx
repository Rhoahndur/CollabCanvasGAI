import { useRef, useEffect } from 'react'
import { useAuth } from './hooks/useAuth'
import { usePresence } from './hooks/usePresence'
import LoginPage from './components/LoginPage'
import Canvas from './components/Canvas'
import PresenceSidebar from './components/PresenceSidebar'
import './App.css'

function App() {
  // Generate unique session ID for this browser tab/window
  const sessionIdRef = useRef(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
  
  // Store sessionId globally for access during sign out
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__currentSessionId = sessionIdRef.current;
    }
  }, []);
  
  const { user, loading, signIn, signOut } = useAuth()
  const { onlineUsers } = usePresence(sessionIdRef.current, user?.uid, user?.displayName)

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

  // Show canvas view when authenticated
  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
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
          <button className="btn-signout" onClick={signOut}>
            Sign Out
          </button>
        </div>
      </header>
      <main className="app-main canvas-main">
        <Canvas sessionId={sessionIdRef.current} />
        <PresenceSidebar 
          onlineUsers={onlineUsers} 
          currentSessionId={sessionIdRef.current}
        />
      </main>
    </div>
  )
}

export default App

