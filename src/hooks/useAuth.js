import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import { signInWithGitHub, signOutUser } from '../services/firebase';
import { removeCursor } from '../services/canvasService';
import { DEFAULT_CANVAS_ID } from '../utils/constants';

/**
 * Custom hook for managing authentication state
 * Provides user object, loading state, and auth functions
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        // Extract display name from OAuth profile, fallback to GitHub username or email
        const displayName = 
          currentUser.displayName || 
          currentUser.reloadUserInfo?.screenName || 
          currentUser.email?.split('@')[0] || 
          'Anonymous User';

        setUser({
          uid: currentUser.uid,
          email: currentUser.email,
          displayName,
          photoURL: currentUser.photoURL,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    try {
      setLoading(true);
      await signInWithGitHub();
    } catch (error) {
      console.error('Sign in error:', error);
      setLoading(false);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      // Remove cursor before signing out (while we still have auth)
      const sessionId = typeof window !== 'undefined' ? window.__currentSessionId : null;
      if (sessionId) {
        try {
          await removeCursor(DEFAULT_CANVAS_ID, sessionId);
          console.log('Cursor removed before sign out');
        } catch (error) {
          console.warn('Failed to remove cursor before sign out:', error);
        }
      }
      
      // Now sign out
      await signOutUser();
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  return {
    user,
    loading,
    signIn,
    signOut,
  };
}

