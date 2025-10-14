import { useAuth } from './hooks/useAuth'
import LoginPage from './components/LoginPage'
import './App.css'

function App() {
  const { user, loading, signIn, signOut } = useAuth()

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
      <main className="app-main">
        <p>Canvas will be implemented here...</p>
        <p className="welcome-message">Welcome, {user.displayName}! 🎨</p>
      </main>
    </div>
  )
}

export default App

