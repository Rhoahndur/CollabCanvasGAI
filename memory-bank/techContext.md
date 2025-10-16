# Technical Context

## Technology Stack

### Frontend
```json
{
  "framework": "React 18.3.1",
  "buildTool": "Vite 5.4.2",
  "language": "JavaScript (ES6+)",
  "rendering": "SVG (native DOM)",
  "styling": "CSS (vanilla, no frameworks)"
}
```

### Backend
```json
{
  "platform": "Firebase",
  "database": "Firestore",
  "authentication": "Firebase Auth (GitHub OAuth)",
  "hosting": "Firebase Hosting + Vercel",
  "realtime": "Firestore onSnapshot listeners"
}
```

### Development Tools
- **Package Manager:** npm (package-lock.json present)
- **Node Version:** 18+ recommended
- **Browser Support:** Modern browsers (Chrome, Firefox, Safari, Edge)
- **Version Control:** Git

## Dependencies

### Production Dependencies
```json
{
  "firebase": "^10.13.0",
  "react": "^18.3.1",
  "react-dom": "^18.3.1"
}
```

**Why so lean?**
- No state management library (React hooks sufficient)
- No routing library (single page)
- No UI framework (custom SVG components)
- No WebSocket library (Firestore handles real-time)

### Development Dependencies
```json
{
  "@types/react": "^18.3.3",
  "@types/react-dom": "^18.3.0",
  "@vitejs/plugin-react": "^4.3.1",
  "terser": "^5.44.0",
  "vite": "^5.4.2"
}
```

## Project Structure

```
CollabCanvasGAI/
├── src/
│   ├── components/          # React components
│   │   ├── Canvas.jsx       # Main canvas (750 lines, complex)
│   │   ├── Rectangle.jsx    # SVG rectangle (memoized)
│   │   ├── Cursor.jsx       # Multiplayer cursor
│   │   ├── PresenceSidebar.jsx
│   │   ├── LoginPage.jsx
│   │   └── ErrorBoundary.jsx
│   │
│   ├── hooks/               # Custom React hooks
│   │   ├── useCanvas.js     # Canvas state + Firestore sync
│   │   ├── useCursors.js    # Cursor tracking
│   │   ├── usePresence.js   # User presence
│   │   └── useAuth.js       # Authentication
│   │
│   ├── services/            # Firebase services
│   │   ├── firebase.js      # Firebase config + init
│   │   └── canvasService.js # CRUD operations
│   │
│   ├── utils/               # Utility functions
│   │   ├── canvasUtils.js   # Coordinate transforms, collision
│   │   ├── colorUtils.js    # Color palette
│   │   ├── constants.js     # Configuration constants
│   │   └── testData.js      # Performance testing utilities
│   │
│   ├── App.jsx              # Root component (auth routing)
│   ├── App.css              # Global styles
│   └── main.jsx             # Entry point (ReactDOM.render)
│
├── public/                  # Static assets
├── dist/                    # Production build output
├── memory-bank/             # Memory Bank documentation
│
├── firebase.json            # Firebase config
├── firestore.rules          # Database security rules
├── firestore.indexes.json   # Firestore indexes
├── vercel.json              # Vercel deployment config
├── vite.config.js           # Vite build config
├── package.json             # Dependencies + scripts
├── .env.local               # Environment variables (not in git)
└── env.template             # Template for .env.local
```

## Firebase Configuration

### Firestore Collections
```
canvases/
  └── {canvasId}/
      ├── objects/              # Rectangles
      │   └── {userId}_{timestamp}
      │       ├── id: string
      │       ├── x: number
      │       ├── y: number
      │       ├── width: number
      │       ├── height: number
      │       ├── color: string
      │       ├── createdBy: string (userId)
      │       ├── lockedBy: string | null
      │       ├── lockedByUserName: string | null
      │       └── timestamp: Timestamp
      │
      ├── cursors/              # Real-time cursor positions
      │   └── {sessionId}
      │       ├── sessionId: string
      │       ├── userId: string
      │       ├── x: number
      │       ├── y: number
      │       ├── userName: string
      │       ├── timestamp: Timestamp
      │       └── arrivalTime: number
      │
      └── presence/             # User presence awareness
          └── {sessionId}
              ├── sessionId: string
              ├── userId: string
              ├── userName: string
              ├── color: string
              ├── isOnline: boolean
              ├── lastSeen: Timestamp
              └── timestamp: Timestamp
```

**Note:** Currently using single canvas with ID: "default"

### Firestore Security Rules
Located in: `firestore.rules`

Key rules:
- Authentication required for all read/write operations
- Users can only lock/unlock objects they own
- Users can update their own cursor/presence
- All authenticated users can read all data

### Firebase Hosting
Configured in: `firebase.json`

```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

## Environment Variables

### Required Variables (.env.local)
```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

**Note:** Vite requires `VITE_` prefix for env vars to be exposed to client.

### Getting Firebase Credentials
1. Go to Firebase Console → Project Settings
2. Scroll to "Your apps" section
3. Click "Web app" icon or add new web app
4. Copy config object values to .env.local

## Development Setup

### Initial Setup
```bash
# Clone repository
git clone <repo-url>
cd CollabCanvasGAI

# Install dependencies
npm install

# Copy environment template
cp env.template .env.local

# Edit .env.local with your Firebase credentials
nano .env.local

# Deploy Firestore rules
firebase deploy --only firestore:rules

# Start development server
npm run dev
```

### Development Server
```bash
npm run dev
# Opens at http://localhost:5173
```

**Features:**
- Hot module replacement (HMR)
- Fast refresh for React components
- Source maps for debugging
- FPS counter (if SHOW_FPS_COUNTER = true in constants.js)

### Production Build
```bash
npm run build
# Output: dist/ directory
```

**Optimizations:**
- Code splitting (vendor chunks)
- Minification with Terser
- Tree shaking
- CSS bundling
- Asset optimization

### Deployment

#### Firebase Hosting
```bash
npm run deploy          # Build + deploy everything
npm run deploy:hosting  # Deploy hosting only
npm run deploy:rules    # Deploy Firestore rules only
```

#### Vercel
```bash
npm run deploy:vercel   # Deploy to Vercel
```

**Live URLs:**
- Firebase: [your-project-id].web.app
- Vercel: [your-project].vercel.app

## Technical Constraints

### Browser Requirements
- **Modern ES6+ support** (async/await, arrow functions, destructuring)
- **SVG support** (all modern browsers)
- **IndexedDB** (for Firestore offline persistence)
- **WebSocket** (for Firestore real-time listeners)

### Performance Constraints
- **Canvas size:** Fixed at 5000×5000px (configurable in constants.js)
- **Object limit:** Tested up to 1000 objects (viewport culling required)
- **Concurrent users:** Tested with 5+ users, Firebase scales to thousands
- **Zoom range:** 0.1× (10%) to 5× (500%)

### Firebase Limitations
- **Free tier (Spark plan):**
  - 50k reads/day
  - 20k writes/day
  - 20k deletes/day
  - 1 GB stored data
  - 10 GB bandwidth/month

- **Performance:**
  - Firestore max writes: 1 write/second per document
  - Real-time listeners scale well (no documented limit)

### Security Constraints
- **Authentication required:** No anonymous access
- **GitHub OAuth only:** Google/email providers not yet implemented
- **Single canvas:** All users share "default" canvas
- **No delete API:** Objects persist unless manually removed

## Build Configuration

### Vite Config (vite.config.js)
```javascript
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
        },
      },
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
      },
    },
  },
});
```

**Why code splitting?**
- React bundle: ~140 KB
- Firebase bundle: ~150 KB
- App code: ~30 KB
- Total: ~320 KB (before compression)
- With gzip: ~100 KB total

## Testing Utilities

### Performance Testing (Dev Mode Only)
```javascript
// In browser console:
window.testCanvas.generate500()    // Create 500 random rectangles
window.testCanvas.generate1000()   // Create 1000 random rectangles
window.testCanvas.generateGrid(20, 25)  // Create 20×25 grid
```

**Location:** `src/utils/testData.js`

### FPS Monitoring
Set `SHOW_FPS_COUNTER = true` in `src/utils/constants.js`

Shows:
- Current FPS
- Render time (ms)
- Object count (visible / total)
- Zoom level
- Canvas position
- Firestore connection status

## Common Development Tasks

### Adding a New Feature
1. Create hook in `src/hooks/` (if state management needed)
2. Add service functions in `src/services/canvasService.js`
3. Create/update components in `src/components/`
4. Update Firestore rules if new collections
5. Add constants in `src/utils/constants.js`
6. Test with multiple browser windows

### Debugging Real-time Sync Issues
1. Check Firestore Console → Data tab
2. Look for `console.log` in subscription handlers
3. Verify Firestore rules allow operation
4. Check connection status indicator in UI
5. Monitor Network tab for Firestore requests

### Optimizing Performance
1. Enable FPS counter to see current performance
2. Use React DevTools Profiler to find slow renders
3. Check viewport culling is working (visible vs. total count)
4. Look for unnecessary re-renders (add React.memo)
5. Profile with Chrome DevTools Performance tab

## Known Technical Issues

### Resolved Issues
- ✅ Rectangles jumping back during drag (optimistic updates + refs)
- ✅ Stale selection outline on mouse leave (auto-deselect on leave)
- ✅ Multiple stale sessions inflating user count (session-based presence + cleanup)
- ✅ Performance degradation with 500+ objects (viewport culling)
- ✅ Cursor spam in Firestore (throttling to 75ms)

### Outstanding Technical Debt
- ⚠️ No automated tests (manual testing only)
- ⚠️ No TypeScript (could improve type safety)
- ⚠️ Console.log statements in production (Terser removes most)
- ⚠️ No CI/CD pipeline (manual deployment)

---

*This document provides the technical foundation for understanding and extending the codebase. When implementing new features, follow the existing patterns and conventions.*

