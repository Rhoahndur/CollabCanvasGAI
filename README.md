# CollabCanvasGAI

A real-time collaborative canvas application with AI-powered drawing assistance, built with React, Firebase, and OpenRouter.

Multiple users can simultaneously draw shapes, see live cursors, chat, and use an AI assistant to generate and manipulate canvas objects — all in real time.

---

## Features

### Drawing & Shapes
- **6 shape types** — Rectangles, circles, regular polygons, custom polygons (vertex-by-vertex), text boxes, and images
- **Click-and-drag creation** — Draw shapes directly on a 5000x5000 SVG canvas
- **Transform tools** — Move, resize, rotate any shape
- **Multi-selection** — Shift+click or drag-select multiple shapes, then move/align/delete as a group
- **Copy/paste** — Ctrl+C/V for shapes, Ctrl+V for images from clipboard
- **Undo/redo** — Ctrl+Z / Ctrl+Shift+Z
- **Layers panel** — Reorder, rename, toggle visibility, z-order (bring to front / send to back)
- **Context menu** — Right-click for z-order and alignment operations
- **Color picker** — Per-shape color selection

### Real-Time Collaboration
- **Live shape sync** — All changes broadcast instantly via Firebase Realtime Database
- **Live cursors** — See other users' mouse positions with name labels
- **Presence sidebar** — Online/away status for all connected users
- **Object locking** — Shapes lock when selected, preventing simultaneous editing conflicts
- **Stale lock cleanup** — Auto-releases locks from disconnected users (30s timeout)
- **Canvas chat** — Real-time text chat between collaborators

### AI Assistant (Canny)
- **Powered by OpenRouter** — Streaming responses via Vercel serverless functions (configurable model, default: `nvidia/nemotron-nano-12b-v2-vl:free`)
- **Vision** — Captures canvas as JPEG screenshot for visual understanding ("look at the canvas", "what do you see")
- **9 canvas tools** — createShape, createShapesBatch, alignShapes, distributeShapes, arrangeInGrid, updateShapeProperties, deleteShapes, getCanvasInfo, selectShapes
- **Safety limits** — Max 50 shapes per batch, 1000 total shapes, all positions clamped to canvas bounds

### Multi-Canvas Dashboard
- **Create canvases** from templates (blank, brainstorm, wireframe)
- **Share via link** with role-based access (owner/editor/viewer)
- **Canvas settings** — Background color, grid toggle
- **Star, rename, duplicate, delete** canvases
- **Email invitations** via SendGrid (Firebase Cloud Functions)

### Authentication & Security
- **GitHub and Google OAuth** via Firebase Auth
- **Role-based permissions** — Owner, editor, viewer per canvas
- **Environment validation** — Zod schemas validate all Firebase config at startup
- **API input validation** — Request body validated with Zod, rate limited (20 req/min per IP)
- **Security headers** — Helmet middleware on dev server, restricted CORS origins
- **Firebase security rules** — Enforce auth, ownership, and lock constraints at the database level

### Performance
- **60 FPS target** with 500+ objects via viewport culling
- **Throttled updates** — Cursors at 75ms, drag operations at 50ms
- **Code splitting** — Separate vendor chunks for React and Firebase
- **Terser minification** — console.log stripped in production
- **IndexedDB persistence** — Offline support via Firebase

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, SVG canvas |
| Language | JavaScript + TypeScript (incremental migration) |
| Routing | React Router v7 |
| Auth | Firebase Auth (GitHub + Google OAuth) |
| Database | Firebase Realtime Database |
| AI | OpenRouter (vision + function calling, configurable model) |
| AI Client | Vercel AI SDK (`useChat` hook, SSE streaming) |
| Hosting | Vercel (CDN + serverless) |
| Email | Firebase Cloud Functions + SendGrid |
| Testing | Vitest + Testing Library + happy-dom |
| Linting | ESLint 9 + Prettier + Husky pre-commit hooks |
| Validation | Zod |

---

## Quick Start

### Prerequisites

- Node.js v22+
- Firebase project ([console.firebase.google.com](https://console.firebase.google.com/))
- OpenRouter API key (for AI features)

### Setup

```bash
# Clone and install
git clone https://github.com/yourusername/CollabCanvasGAI.git
cd CollabCanvasGAI
npm install

# Configure environment
cp env.template .env.local
# Edit .env.local with your Firebase credentials and OpenAI key

# Deploy database rules
firebase deploy --only database

# Start development (React + API server)
npm run dev:all
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Environment Variables

**Frontend (Vite) — required in `.env.local`:**
```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_DATABASE_URL=...
```

**Server — required for AI features:**
```env
OPENROUTER_API_KEY=...
OPENROUTER_MODEL=nvidia/nemotron-nano-12b-v2-vl:free   # optional, any OpenRouter model
```

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Vite dev server (port 5173) |
| `npm run server` | Express API server (port 3001) |
| `npm run dev:all` | Both servers concurrently |
| `npm run build` | Production build |
| `npm run preview` | Preview production build locally |
| `npm run test` | Run tests (Vitest) |
| `npm run test:watch` | Tests in watch mode |
| `npm run test:ui` | Vitest UI dashboard |
| `npm run test:coverage` | Tests with coverage report |
| `npm run lint` | ESLint check |
| `npm run lint:fix` | ESLint with auto-fix |
| `npm run typecheck` | TypeScript check (`tsc --noEmit`) |
| `npm run format` | Prettier formatting |
| `npm run format:check` | Prettier check (no write) |
| `npm run deploy:vercel` | Deploy to Vercel |
| `npm run deploy:hosting` | Deploy to Firebase Hosting |
| `npm run deploy:database:rules` | Deploy Firebase Realtime DB rules |

---

## Project Structure

```
CollabCanvasGAI/
├── api/
│   └── chat.js                    # Vercel serverless function (GPT-4o proxy, Zod, rate limiting)
├── functions/
│   └── index.js                   # Firebase Cloud Functions (SendGrid invitation emails)
├── src/
│   ├── main.jsx                   # Entry point (ErrorBoundary + BrowserRouter)
│   ├── App.jsx                    # Route definitions, session ID generation
│   ├── App.css                    # Global layout styles
│   ├── themes.css                 # Light/dark theme CSS custom properties
│   ├── styles/
│   │   └── shared.css             # Shared global classes (buttons, modals, shape/cursor styles)
│   ├── vite-env.d.ts              # Vite global type declarations
│   ├── types/
│   │   └── canvas.ts              # TypeScript interfaces (Shape, Viewport, User, ...)
│   ├── components/
│   │   ├── Canvas.jsx             # Main SVG canvas (1,345 lines, wires 13 hooks)
│   │   ├── CanvasRoute.jsx        # Canvas page wrapper (access control, settings, presence)
│   │   ├── CanvasDashboard.jsx    # Multi-canvas list/grid view
│   │   ├── ChatPanel.jsx          # Canny AI + canvas chat (tabbed)
│   │   ├── LoginPage.jsx          # GitHub/Google OAuth buttons
│   │   ├── NotFoundPage.jsx       # 404 page
│   │   ├── ErrorBoundary.jsx      # React error boundary with reportError
│   │   ├── ShapePalette.jsx       # Drawing tool selection toolbar
│   │   ├── ShapeRenderer.jsx      # Shape type dispatch loop
│   │   ├── ShapePreview.jsx       # Drawing preview overlay
│   │   ├── Rectangle.jsx          # Rectangle shape component
│   │   ├── Circle.jsx             # Circle shape component
│   │   ├── Polygon.jsx            # Regular polygon shape component
│   │   ├── CustomPolygon.jsx      # Custom polygon (vertex-by-vertex)
│   │   ├── CustomPolygonPreview.jsx # Vertex visualization during drawing
│   │   ├── TextBox.jsx            # Text shape component
│   │   ├── Image.jsx              # Image shape component
│   │   ├── MultiSelectionBox.jsx  # Multi-select bounding box + transform handles
│   │   ├── SelectionBox.jsx       # Drag-to-select rectangle
│   │   ├── InlineTextEditor.jsx   # In-place text editing overlay
│   │   ├── ZoomControls.jsx       # Zoom in/out/fit/reset
│   │   ├── ColorPicker.jsx        # Color selection
│   │   ├── ContextMenu.jsx        # Right-click menu (keyboard accessible)
│   │   ├── LayersPanel.jsx        # Layer ordering + visibility toggle
│   │   ├── Cursor.jsx             # Remote user cursor display
│   │   ├── PresenceSidebar.jsx    # Online users list
│   │   ├── DebugPanel.jsx         # Dev-only FPS/connection overlay
│   │   ├── CanvasSettingsModal.jsx # Canvas background/grid settings
│   │   ├── UserSettingsModal.jsx  # User display name settings
│   │   ├── ShareCanvasModal.jsx   # Share canvas with role assignment
│   │   ├── CreateCanvasModal.jsx  # New canvas creation with templates
│   │   └── CanvasCard.jsx         # Canvas card in dashboard grid
│   ├── hooks/
│   │   ├── useAuth.js             # Firebase auth state + token refresh
│   │   ├── useCanvas.js           # Shape CRUD + real-time sync + locking
│   │   ├── useCursors.js          # Remote cursor tracking + deduplication
│   │   ├── usePresence.js         # Online user presence + heartbeat
│   │   ├── useHistory.js          # Undo/redo stack
│   │   ├── useTheme.js            # Light/dark theme toggle (localStorage)
│   │   ├── useViewport.js         # Pan, zoom, viewBox, coordinate transforms
│   │   ├── useSelection.js        # Single + multi-selection with drag rectangle
│   │   ├── useShapeDrawing.js     # Shape creation preview + completion
│   │   ├── useShapeTransform.js   # Drag, resize, rotate handlers
│   │   ├── useCanvasKeyboard.js   # All keyboard shortcuts (Delete, Ctrl+Z, etc.)
│   │   ├── useCanvasClipboard.js  # Copy/paste shapes + image paste from clipboard
│   │   └── useCustomPolygon.js    # Custom polygon vertex-by-vertex drawing
│   ├── services/
│   │   ├── firebase.js            # Firebase init (Auth, Realtime DB) + OAuth providers
│   │   ├── canvasService.js       # All Realtime DB operations (1,251 lines)
│   │   ├── lockCleanupService.js  # Stale lock auto-release (30s timeout, 10s poll)
│   │   ├── canvasMigration.js     # Single-to-multi canvas data migration
│   │   └── imageService.js        # Image resize + base64 conversion
│   ├── utils/
│   │   ├── constants.ts           # Canvas size, colors, thresholds, role enums
│   │   ├── canvasUtils.ts         # screenToCanvas, canvasToScreen, collision detection
│   │   ├── colorUtils.ts          # Color assignment, contrast, grid colors
│   │   ├── errorHandler.ts        # Centralized error reporting (dev console + Sentry)
│   │   ├── envValidation.ts       # Zod schema for Firebase env var validation
│   │   ├── canvasTools.js         # AI tool definitions + executeCanvasTool()
│   │   ├── canvasCapture.js       # SVG-to-JPEG screenshot for AI vision
│   │   └── testData.js            # Performance test shape generators (dev only)
│   └── tests/
│       ├── setup.js               # Vitest setup (Firebase + browser API mocks)
│       ├── hooks/                  # Hook tests (7: useAuth, useHistory, useTheme, useViewport, useSelection, useShapeDrawing, useShapeTransform)
│       ├── components/             # Component tests (2: ErrorBoundary, ZoomControls)
│       ├── services/               # Service tests (4: canvasService, lockCleanupService, canvasMigration, imageService)
│       └── utils/                  # Utility tests (6: canvasTools, canvasUtils, colorUtils, constants, envValidation, errorHandler)
├── server.js                      # Local Express dev server (Helmet, CORS, /api/chat proxy)
├── vite.config.js                 # Vite build config (code splitting, Terser)
├── vitest.config.js               # Test config (forks pool, 6GB heap, coverage thresholds)
├── tsconfig.json                  # TypeScript config (strict, allowJs, incremental)
├── eslint.config.js               # ESLint 9 flat config (React + TS + API rules)
├── .prettierrc.json               # Prettier formatting config
├── database.rules.json            # Firebase Realtime DB security rules
├── firebase.json                  # Firebase project config (hosting, database, functions)
├── vercel.json                    # Vercel deployment config (rewrites, caching, functions)
├── env.template                   # Environment variable template
└── .github/workflows/ci.yml      # GitHub Actions (lint -> test -> build)
```

---

## Testing

```bash
npm run test             # Run all 212 tests
npm run test:watch       # Watch mode
npm run test:coverage    # With coverage report
npm run test:ui          # Vitest UI dashboard
```

**Test stack:** Vitest + Testing Library (React) + happy-dom

Tests are behavioral — hooks tested with `renderHook` + `act`, components with `render` + `screen` + `fireEvent`, services with mocked Firebase, utilities with direct function calls.

19 test suites covering hooks (7), components (2), services (4), and utilities (6).

Coverage thresholds: 15% statements/lines, 50% branches, 30% functions.

---

## Deployment

**Vercel (frontend + API):**
```bash
npm run deploy:vercel
```
- Frontend served from Vercel Edge CDN with 1-year cache for hashed assets
- `/api/chat` runs as a serverless function (60s timeout, 1GB memory)
- SPA routing via `vercel.json` rewrites
- Auto-deploys on push to `main` and `dev` branches

**Firebase (database + auth + functions):**
```bash
firebase deploy --only database   # Security rules
firebase deploy --only functions  # Cloud functions (invitation emails)
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| Ctrl+C | Copy selected shapes |
| Ctrl+V | Paste shapes (or paste image from clipboard) |
| Ctrl+D | Duplicate selected shapes |
| Ctrl+Z | Undo |
| Ctrl+Shift+Z | Redo |
| Ctrl+] | Bring to front |
| Ctrl+[ | Send to back |
| Ctrl+=/- | Zoom in/out |
| Ctrl+0 | Reset zoom |
| Delete/Backspace | Delete selected shapes |
| Enter | Finish custom polygon |
| Escape | Cancel custom polygon / deselect |

---

## CI/CD

GitHub Actions pipeline (`.github/workflows/ci.yml`):
1. **Lint** — ESLint + Prettier check
2. **Test** — Vitest with coverage (uploaded as artifact)
3. **Build** — Vite production build (dummy env vars)

Triggers on push to `main`/`dev` and pull requests.

---

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed system design, data flow diagrams, database schema, and AI integration details.

---

## License

MIT
