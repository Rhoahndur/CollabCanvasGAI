# CollabCanvas 🎨

> A real-time collaborative canvas application built with React, Firebase, and SVG

[![Live Demo](https://img.shields.io/badge/demo-live-success)](https://your-project-id.web.app)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

CollabCanvas is a multiplayer drawing application where multiple users can create, move, and interact with rectangles in real-time. See other users' cursors, collaborate seamlessly, and experience smooth 60 FPS performance even with hundreds of objects.

![CollabCanvas Demo](./docs/demo.gif)

---

## ✨ Features

### Core Functionality
- 🎨 **Real-time Collaboration** - See what everyone is doing instantly
- 🖱️ **Live Cursors** - Track other users' mouse positions with name labels
- 📦 **Object Creation** - Click and drag to create colored rectangles
- ↔️ **Object Movement** - Select and drag rectangles with automatic locking
- 🔒 **Conflict Prevention** - Object locking prevents simultaneous editing
- 👥 **Presence System** - See who's online in the sidebar
- 🎯 **Click-to-Select** - Clear selection workflow with visual feedback

### Technical Features
- ⚡ **60 FPS Performance** - Viewport culling renders only visible objects
- 📱 **Responsive Design** - Works on desktop browsers
- 🌐 **Offline Support** - Firebase persistence for reliable data sync
- 🔄 **Auto-Reconnection** - Handles network interruptions gracefully
- 📊 **Performance Monitoring** - FPS counter in development mode
- 🎨 **SVG-Based Canvas** - Crisp rendering at any zoom level

### User Experience
- 🔐 **GitHub OAuth** - Quick and secure authentication
- 🎨 **Pseudorandom Colors** - Automatic color assignment for objects
- 🖼️ **Pan & Zoom** - Navigate large canvases smoothly
- 📏 **Canvas Boundaries** - Clear visual limits with enforced constraints
- ⌨️ **Keyboard Shortcuts** - Hold Shift/Cmd to pan
- 💨 **Smooth Interactions** - Optimistic updates for instant feedback

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18+)
- **npm** or **yarn**
- **Firebase account** ([Sign up free](https://firebase.google.com/))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/collabcanvas.git
   cd collabcanvas
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Firebase**
   
   Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com/)
   
   Enable these services:
   - **Authentication** → GitHub provider
   - **Firestore Database** → Production mode
   - **Hosting** (optional for deployment)

4. **Configure environment variables**
   
   Copy the template and add your Firebase credentials:
   ```bash
   cp env.template .env.local
   ```
   
   Edit `.env.local` with your Firebase config:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

5. **Deploy Firestore rules**
   ```bash
   firebase deploy --only firestore:rules
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

7. **Open in browser**
   ```
   http://localhost:5173
   ```

---

## 📖 User Guide

### Creating Rectangles
1. Click and drag anywhere on the canvas
2. Release to create a rectangle with a random color
3. Minimum size: 20x20 pixels

### Selecting & Moving
1. **Click** a rectangle to select it (shows highlighted border)
2. **Drag** the selected rectangle to move it
3. Other users cannot move rectangles you've selected
4. **Click empty space** to deselect

### Navigation
- **Pan**: Hold Shift/Cmd/Ctrl + drag, or middle mouse drag
- **Zoom**: Scroll with mouse wheel
- **Boundaries**: Canvas edges are visible and prevent infinite scrolling

### Multiplayer
- See other users in the **Presence Sidebar** on the right
- **Cursor labels** appear on hover showing user names
- **Locked objects** show who's currently moving them
- Real-time sync keeps everyone in sync (< 100ms latency)

---

## 🏗️ Architecture

### Tech Stack

**Frontend:**
- React 18 (with hooks)
- Vite (build tool)
- SVG for rendering

**Backend:**
- Firebase Authentication (GitHub OAuth)
- Firebase Firestore (real-time database)
- Firebase Hosting (deployment)

**Key Libraries:**
- `firebase` v10+ - Backend services
- No heavy dependencies - lean and fast!

### Project Structure

```
collabcanvas/
├── src/
│   ├── components/          # React components
│   │   ├── Canvas.jsx       # Main canvas component
│   │   ├── Rectangle.jsx    # SVG rectangle component
│   │   ├── Cursor.jsx       # User cursor component
│   │   ├── PresenceSidebar.jsx
│   │   ├── LoginPage.jsx
│   │   └── ErrorBoundary.jsx
│   ├── hooks/               # Custom React hooks
│   │   ├── useAuth.js       # Authentication
│   │   ├── useCanvas.js     # Canvas state
│   │   ├── useCursors.js    # Cursor tracking
│   │   └── usePresence.js   # User presence
│   ├── services/            # Firebase services
│   │   ├── firebase.js      # Firebase config
│   │   └── canvasService.js # Firestore operations
│   ├── utils/               # Utilities
│   │   ├── canvasUtils.js   # Canvas calculations
│   │   ├── colorUtils.js    # Color assignment
│   │   ├── constants.js     # Configuration
│   │   └── testData.js      # Performance testing
│   ├── App.jsx              # Main app component
│   ├── main.jsx             # Entry point
│   └── App.css              # Global styles
├── public/                  # Static assets
├── firebase.json            # Firebase configuration
├── firestore.rules          # Database security rules
├── vite.config.js           # Vite configuration
└── package.json             # Dependencies
```

### Data Models

**Rectangle:**
```javascript
{
  id: "userId_timestamp",    // Composite ID prevents conflicts
  x: 100,                     // X position
  y: 200,                     // Y position
  width: 150,                 // Width
  height: 100,                // Height
  color: "#FF6B6B",           // Fill color
  createdBy: "userId",        // Creator
  lockedBy: "userId",         // Current user moving it (or null)
  lockedByUserName: "Alice",  // Display name
  timestamp: 1234567890       // Creation time
}
```

**Cursor:**
```javascript
{
  sessionId: "session_123",   // Unique per browser tab
  userId: "userId",           // User identifier
  x: 500,                     // X position
  y: 300,                     // Y position
  userName: "Alice",          // Display name
  timestamp: 1234567890,      // Last update
  arrivalTime: 1234567890     // For label priority
}
```

**Presence:**
```javascript
{
  sessionId: "session_123",   // Unique per tab
  userId: "userId",           // User identifier
  userName: "Alice",          // Display name
  color: "#4ECDC4",           // Assigned color
  isOnline: true,             // Online status
  lastSeen: 1234567890        // Heartbeat timestamp
}
```

---

## 🎨 Key Design Decisions

1. **SVG vs Canvas API**: SVG chosen for crisp rendering and easier event handling
2. **Composite Object IDs**: `userId_timestamp` format prevents ID conflicts
3. **Viewport Culling**: Only render visible objects for performance
4. **Object Locking**: Prevents race conditions when moving objects
5. **Session-Based Presence**: Each browser tab = unique session for accurate counts
6. **Pseudorandom Colors**: Fixed palette for consistent aesthetics
7. **Optimistic Updates**: Local updates before Firestore sync for smooth UX

---

## ⚡ Performance Optimizations

- **React.memo** on Rectangle component prevents unnecessary re-renders
- **Viewport culling** renders only visible objects (85% reduction with 500+ objects)
- **useMemo** for expensive calculations (viewBox, grid lines, visible rectangles)
- **Throttled cursor updates** (75ms interval = ~13 updates/second)
- **Code splitting** separates React and Firebase bundles
- **Terser minification** removes console.log in production
- **IndexedDB persistence** for offline support and faster loads

### Performance Targets
- ✅ **60 FPS** with 500+ objects
- ✅ **< 100ms** object sync latency
- ✅ **< 75ms** cursor sync latency
- ✅ **5+ users** without degradation

---

## 🧪 Testing

### Development Testing

**Test with 500 objects:**
```javascript
// Open browser console
window.testCanvas.generate500()

// Or 1000 objects
window.testCanvas.generate1000()

// Or a grid pattern
window.testCanvas.generateGrid(20, 25)  // 500 rectangles
```

### Multi-User Testing

1. Open 5 browser windows/profiles
2. Log in with GitHub in each
3. Test simultaneous:
   - Object creation
   - Object movement
   - Cursor tracking
   - Lock conflicts

See **[PERFORMANCE_TESTING.md](./PERFORMANCE_TESTING.md)** for detailed testing guide.

---

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

Creates optimized production build in `dist/` folder.

### Deploy to Firebase Hosting

```bash
# Deploy everything
npm run deploy

# Deploy hosting only
npm run deploy:hosting

# Deploy Firestore rules only
npm run deploy:rules
```

### Environment Variables

Production environment uses same variables as development. Ensure `.env.local` is **not** committed to Git (already in `.gitignore`).

For Firebase Hosting, set environment variables in Firebase Console or use:
```bash
firebase functions:config:set env.key="value"
```

---

## 🔐 Security

### Firestore Security Rules

Rules enforce:
- ✅ Authentication required for all operations
- ✅ Users can only lock/unlock their own objects
- ✅ Read access for all authenticated users
- ✅ Write access only for object creators or when unlocked

See **[firestore.rules](./firestore.rules)** for full rules.

### Best Practices

- **Never commit** `.env.local` (contains secrets)
- **Use environment variables** for all Firebase config
- **Enable GitHub OAuth** only from your domain
- **Set up Firestore rules** before going live
- **Monitor Firebase usage** in console to prevent abuse

---

## 🐛 Troubleshooting

### Common Issues

**"Authentication failed"**
- Check GitHub OAuth is enabled in Firebase Console
- Verify callback URL is set correctly
- Ensure domain is whitelisted

**"Connection status shows reconnecting"**
- Check internet connection
- Verify Firestore rules allow read/write
- Check Firebase quota hasn't been exceeded

**"Objects not syncing"**
- Verify Firestore rules are deployed
- Check browser console for errors
- Ensure authenticated user has valid token

**"Safari loads slowly"**
- First load may take longer due to IndexedDB setup
- Subsequent loads should be faster
- Clear browser cache if problems persist

**"User count incorrect"**
- Multiple stale sessions may exist
- Wait 40 seconds for automatic cleanup
- Refresh the page to clean up immediately

### Debug Mode

Development mode shows FPS counter with:
- Current FPS
- Render time
- Visible/total objects
- Zoom level
- Canvas position
- Firestore connection status

Set `SHOW_FPS_COUNTER = true` in `constants.js` to enable.

---

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📧 Contact

**Project Link**: [https://github.com/yourusername/collabcanvas](https://github.com/yourusername/collabcanvas)

**Live Demo**: [https://your-project-id.web.app](https://your-project-id.web.app)

---

## 🙏 Acknowledgments

- [React](https://reactjs.org/) - UI framework
- [Firebase](https://firebase.google.com/) - Backend platform
- [Vite](https://vitejs.dev/) - Build tool
- [SVG](https://developer.mozilla.org/en-US/docs/Web/SVG) - Graphics format

---

**Built with ❤️ using React, Firebase, and SVG**
