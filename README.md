# CollabCanvas MVP

A real-time collaborative design tool built with React, Firebase, and SVG. Create and manipulate rectangles on a shared canvas with multiplayer cursors, object locking, and presence awareness.

## Features

- 🎨 **SVG-based Canvas** with pan/zoom and visible boundaries
- 👥 **Real-time Collaboration** with <50ms cursor sync
- 🔒 **Object Locking** to prevent simultaneous manipulation
- 🎭 **Multiplayer Cursors** with hover-based name labels
- 📍 **Presence Awareness** with sidebar showing online users
- 🔐 **GitHub OAuth** authentication (extensible to Google/email)
- 🎨 **Pseudorandom Colors** for created objects
- ⚡ **60 FPS Performance** target

## Tech Stack

- **Frontend:** React 18 + Vite
- **Rendering:** SVG (native DOM)
- **Backend:** Firebase (Firestore + Auth + Hosting)
- **Real-time:** Firestore onSnapshot listeners
- **State:** React Hooks

## Prerequisites

Before you begin, ensure you have installed:
- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) (comes with Node.js)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and follow the setup wizard
3. Enable **Firestore Database**:
   - Go to Firestore Database
   - Click "Create database"
   - Start in **test mode** for development
4. Enable **Firebase Authentication**:
   - Go to Authentication > Sign-in method
   - Enable **GitHub** provider
   - Follow the GitHub OAuth app setup instructions
   - (Optional) Set up Google and Email/Password for future use

### 3. Configure Environment Variables

Create a `.env.local` file in the project root with your Firebase credentials:

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

To get these values:
1. Go to Firebase Console > Project Settings
2. Scroll down to "Your apps"
3. Click the web icon (</>) to add a web app
4. Copy the config values to your `.env.local` file

⚠️ **Important:** Never commit `.env.local` to version control!

### 4. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Project Structure

```
collabcanvas/
├── src/
│   ├── components/       # React components
│   ├── hooks/           # Custom React hooks
│   ├── services/        # Firebase & API services
│   ├── utils/           # Utility functions
│   ├── App.jsx          # Main App component
│   └── main.jsx         # Entry point
├── public/              # Static assets
└── index.html           # HTML template
```

## Firebase Setup Details

### Firestore Collections Structure

```
canvases/{canvasId}/
  ├── objects/          # Rectangle objects with locking
  ├── cursors/          # Real-time cursor positions
  └── presence/         # Online user tracking
```

### Security Rules (to be added later)

Firestore security rules will require authentication for all operations.

## Architecture

See `architecture.md` for detailed system architecture and data flow diagrams.

## Testing

Test the app with multiple browser windows:
1. Open Chrome (sign in as User A)
2. Open Firefox or Incognito (sign in as User B)
3. Test cursor sync, object creation, and locking

## Deployment

Deployment will be configured using Firebase Hosting in PR #11.

## Contributing

This is an MVP project following a structured PR approach. See `tasks.md` for the development roadmap.

## License

MIT

