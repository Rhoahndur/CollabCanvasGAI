import { useRef, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { cleanupStalePresence } from './services/canvasService';
import LoginPage from './components/LoginPage';
import CanvasDashboard from './components/CanvasDashboard';
import CanvasRoute from './components/CanvasRoute';
import NotFoundPage from './components/NotFoundPage';
import './App.css';

function App() {
  const sessionIdRef = useRef(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  // Store sessionId globally for access during sign out
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__currentSessionId = sessionIdRef.current;
    }
  }, []);

  // Expose debug utilities for manual cleanup
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__debugCleanup = async (canvasId) => {
        if (!canvasId) {
          console.warn('Please provide a canvas ID: window.__debugCleanup("canvasId")');
          return 0;
        }
        const cleaned = await cleanupStalePresence(canvasId);
        console.warn(`Cleaned up ${cleaned} stale sessions`);
        return cleaned;
      };
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete window.__debugCleanup;
      }
    };
  }, []);

  const { user, loading, signIn } = useAuth();

  if (loading) {
    return (
      <div className="app">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onSignIn={signIn} />;
  }

  return (
    <Routes>
      <Route path="/" element={<CanvasDashboard />} />
      <Route path="/canvas/:canvasId" element={<CanvasRoute sessionId={sessionIdRef.current} />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
