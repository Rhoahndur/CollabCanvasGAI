# Firebase Setup Guide

This guide walks you through setting up Firebase for CollabCanvas (Task 1.3).

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or **"Create a project"**
3. Enter project name: `collabcanvas` (or your preferred name)
4. (Optional) Enable Google Analytics
5. Click **"Create project"**
6. Wait for project creation to complete

## Step 2: Enable Firestore Database

1. In Firebase Console, click **"Firestore Database"** in the left sidebar
2. Click **"Create database"**
3. Choose **"Start in test mode"** (we'll add security rules later)
4. Select a Cloud Firestore location (choose closest to your users)
5. Click **"Enable"**

### Firestore Collections (will be created by the app):
```
canvases/
  └── {canvasId}/
      ├── objects/      # Rectangle shapes
      ├── cursors/      # User cursor positions
      └── presence/     # Online users
```

## Step 3: Enable Authentication

### Enable GitHub OAuth Provider

1. In Firebase Console, click **"Authentication"** in the left sidebar
2. Click **"Get started"** (if first time)
3. Go to **"Sign-in method"** tab
4. Click **"GitHub"**
5. Toggle **"Enable"**

#### Set up GitHub OAuth App:

6. Go to [GitHub Developer Settings](https://github.com/settings/developers)
7. Click **"New OAuth App"**
8. Fill in:
   - **Application name**: `CollabCanvas` (or your preferred name)
   - **Homepage URL**: `http://localhost:5173` (for development)
   - **Authorization callback URL**: Copy from Firebase (looks like: `https://your-project.firebaseapp.com/__/auth/handler`)
9. Click **"Register application"**
10. Copy **Client ID** and **Client Secret**
11. Paste them back into Firebase Console
12. Click **"Save"**

### Enable Google OAuth Provider

1. In the same **"Sign-in method"** tab, click **"Google"**
2. Toggle **"Enable"**
3. Enter your project support email (e.g., your personal email)
4. (Optional) Customize the public-facing name for your project
5. Click **"Save"**

**Note:** Google OAuth is easier to set up than GitHub since it doesn't require creating an external OAuth app.

### (Optional) Enable Email/Password for Future

1. Click **"Email/Password"** in sign-in methods
2. Toggle **"Enable"**
3. Click **"Save"**

## Step 4: Get Firebase Configuration

1. In Firebase Console, click the **gear icon** ⚙️ next to "Project Overview"
2. Click **"Project settings"**
3. Scroll down to **"Your apps"** section
4. If no web app exists:
   - Click the **web icon** `</>`
   - Enter app nickname: `CollabCanvas Web`
   - **Do NOT** check "Also set up Firebase Hosting" (we'll do this later)
   - Click **"Register app"**
5. Copy the `firebaseConfig` object values

## Step 5: Create Environment File

Create a file named `.env.local` in the project root:

```bash
# In the CollabCanvasGAI directory
touch .env.local
```

Add your Firebase configuration:

```env
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
```

### Where to find each value:

| Variable | Location in Firebase Config |
|----------|----------------------------|
| `VITE_FIREBASE_API_KEY` | `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `VITE_FIREBASE_PROJECT_ID` | `projectId` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `VITE_FIREBASE_APP_ID` | `appId` |

⚠️ **Important:** 
- Never commit `.env.local` to git!
- The `.gitignore` file already excludes it
- Use `VITE_` prefix for environment variables in Vite projects

## Step 6: Verify Setup

1. Make sure Node.js is installed:
   ```bash
   node --version  # Should be v18 or higher
   npm --version
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open `http://localhost:5173` in your browser
5. Check the browser console for errors
   - If you see Firebase initialization errors, double-check your `.env.local` file
   - Make sure all values are correct and no quotes are included

## Step 7: Test Firebase Connection

Open the browser console and run:

```javascript
// Check if Firebase is initialized
console.log(firebase.apps.length > 0 ? 'Firebase connected!' : 'Firebase not connected')
```

## Firestore Security Rules (Coming in PR #4)

For now, we're using test mode. In PR #4, we'll add proper security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /canvases/{canvasId}/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Troubleshooting

### "Firebase: Error (auth/unauthorized-domain)"
- Go to Firebase Console > Authentication > Settings
- Add `localhost` and `127.0.0.1` to authorized domains

### "Firebase: No Firebase App '[DEFAULT]' has been created"
- Check that `.env.local` exists and has all required variables
- Restart the dev server after creating `.env.local`

### GitHub OAuth not working
- Verify callback URL in GitHub OAuth app matches Firebase
- Check that Client ID and Secret are correctly copied
- Make sure GitHub provider is enabled in Firebase Console

### Firestore permission denied
- Ensure you're in test mode for development
- Check that test mode expiration date hasn't passed

## Next Steps

Once Firebase is set up:
- ✅ Task 1.1: React project initialized
- ✅ Task 1.2: Firebase dependencies installed
- ✅ Task 1.3: Firebase project created and configured
- ➡️ Next: PR #2 - Authentication System

## Useful Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Data Model](https://firebase.google.com/docs/firestore/data-model)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)

