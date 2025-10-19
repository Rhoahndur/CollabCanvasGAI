import { initializeApp } from 'firebase/app';
import { getAuth, GithubAuthProvider, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Set up OAuth providers
export const githubProvider = new GithubAuthProvider();
export const googleProvider = new GoogleAuthProvider();

// Initialize Firestore Database (keeping for backwards compatibility)
export const db = getFirestore(app);

// Initialize Realtime Database
export const realtimeDb = getDatabase(app);

// console.log('✅ Firebase Realtime Database initialized');

// Enable offline persistence (async for better Safari compatibility)
enableIndexedDbPersistence(db, {
  // Safari sometimes needs this for better compatibility
  forceOwnership: false
})
  .then(() => {
    // console.log('✅ Firestore offline persistence enabled');
  })
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('⚠️ Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
      console.warn('⚠️ The current browser does not support offline persistence.');
    } else {
      console.warn('⚠️ Could not enable persistence:', err);
    }
    // App will continue to work without persistence
  });

// Authentication service functions

/**
 * Sign in with GitHub OAuth using popup
 */
export const signInWithGitHub = async () => {
  try {
    const result = await signInWithPopup(auth, githubProvider);
    
    // Extract GitHub username from the auth response
    if (result.additionalUserInfo && result.additionalUserInfo.username) {
      const githubUsername = result.additionalUserInfo.username;
      console.log('🎯 GitHub username from OAuth:', githubUsername);
      
      // Store in localStorage so we can access it later
      localStorage.setItem('github_username', githubUsername);
    }
    
    console.log('📦 Sign in result:', {
      user: result.user.displayName,
      additionalUserInfo: result.additionalUserInfo,
    });
    
    return result.user;
  } catch (error) {
    console.error('GitHub sign in error:', error);
    throw error;
  }
};

/**
 * Sign in with Google OAuth using popup
 */
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    
    console.log('📦 Google sign in result:', {
      user: result.user.displayName,
      email: result.user.email,
    });
    
    return result.user;
  } catch (error) {
    console.error('Google sign in error:', error);
    throw error;
  }
};

/**
 * Sign out the current user
 */
export const signOutUser = async () => {
  try {
    // Clean up localStorage
    localStorage.removeItem('github_username');
    
    await signOut(auth);
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
};

export default app;

