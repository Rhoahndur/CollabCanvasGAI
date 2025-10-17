import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import { signOutUser } from '../services/firebase';
import { removeCursor, removePresence } from '../services/canvasService';
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
        // Try to get GitHub username from localStorage (saved during sign-in)
        const storedGithubUsername = localStorage.getItem('github_username');
        
        // Debug: Log available user data to find GitHub username
        console.log('🔍 Auth user data:', {
          storedGithubUsername,
          displayName: currentUser.displayName,
          email: currentUser.email,
          reloadUserInfo: currentUser.reloadUserInfo,
          providerData: currentUser.providerData,
        });
        
        // Extract GitHub username (handle) from provider data
        let githubUsername = null;
        
        // Try multiple sources for GitHub username
        if (currentUser.providerData && currentUser.providerData.length > 0) {
          const githubProvider = currentUser.providerData.find(p => p.providerId === 'github.com');
          if (githubProvider) {
            // GitHub username is often in the displayName for GitHub provider
            githubUsername = githubProvider.displayName;
          }
        }
        
        // Fallback chain: Stored GitHub username > reloadUserInfo.screenName > provider displayName > user displayName > email
        // Works for both GitHub and Google OAuth
        const displayName = 
          storedGithubUsername ||
          currentUser.reloadUserInfo?.screenName || 
          githubUsername ||
          currentUser.displayName || 
          currentUser.email?.split('@')[0] || 
          'Anonymous User';
        
        console.log('✅ Using display name:', displayName);

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

  // Note: signIn is now handled directly in LoginPage component
  // to support multiple auth providers (GitHub, Google)
  const signIn = async () => {
    // This is kept for backward compatibility but not used
    // Auth is now handled in LoginPage with signInWithGitHub/signInWithGoogle
    console.warn('signIn called from useAuth - use provider-specific methods instead');
  };

  const signOut = async () => {
    try {
      // Remove cursor and presence before signing out (while we still have auth)
      const sessionId = typeof window !== 'undefined' ? window.__currentSessionId : null;
      if (sessionId) {
        try {
          // Remove both cursor and presence
          await Promise.all([
            removeCursor(DEFAULT_CANVAS_ID, sessionId),
            removePresence(DEFAULT_CANVAS_ID, sessionId)
          ]);
          console.log('Cursor and presence removed before sign out');
        } catch (error) {
          console.warn('Failed to remove cursor/presence before sign out:', error);
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

