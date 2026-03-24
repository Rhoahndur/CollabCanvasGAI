# CollabCanvasGAI — Architecture

A real-time collaborative canvas application with AI assistance, built with React, Firebase, and OpenAI GPT-4o.

---

## System Overview

```
                              CLIENTS (Browsers)

   React 18 SPA            Vite Dev Server (localhost:5173)
   SVG Canvas              HMR, ESM bundling
   React Router v7         TypeScript (incremental)
        |                        |                      |
        | Auth + Realtime DB     | Serverless API       | Static Assets
        v                        v                      v
  +--------------+    +------------------+    +-------------------+
  |  Firebase    |    |  Vercel          |    |  Vercel Edge CDN  |
  |  Auth (OAuth)|    |  /api/chat       |    |  Production Build |
  |  Realtime DB |    |  (GPT-4o SSE)   |    |  (vite build)     |
  |  Cloud Funcs |    +--------+---------+    +-------------------+
  |  (SendGrid)  |             |
  +--------------+             v
                    +------------------+
                    |  OpenAI API      |
                    |  GPT-4o          |
                    |  (vision +       |
                    |   tool calls)    |
                    +------------------+
```

---

## Tech Stack

| Layer | Technology | Role |
|---|---|---|
| **UI** | React 18.3 | Component rendering, state via hooks |
| **Build** | Vite 5.4 | Dev server, HMR, Terser production bundling |
| **Canvas** | Raw SVG | Shape rendering — no canvas libraries |
| **Language** | JavaScript + TypeScript | Incremental TS migration (`allowJs: true`, `strict: true`) |
| **Routing** | React Router v7 | `BrowserRouter`, `Routes`, `useParams`, `useNavigate` |
| **Auth** | Firebase Auth | GitHub + Google OAuth providers |
| **Database** | Firebase Realtime DB | All persistent data — shapes, presence, cursors, chat, permissions |
| **Real-time Sync** | Firebase `onValue` listeners | Live shape updates, cursor tracking, presence |
| **AI Backend** | Vercel Serverless Functions | `/api/chat` — proxies OpenAI with Zod validation + rate limiting |
| **AI Model** | OpenAI GPT-4o | Vision (canvas screenshots) + function calling (9 tools) |
| **AI Client** | Vercel AI SDK (`ai/react`) | `useChat` hook for streaming SSE responses |
| **Validation** | Zod | Env var validation at startup, API request body validation |
| **Error Tracking** | `reportError()` (errorHandler.ts) | Centralized — structured dev console, Sentry-ready in production |
| **Styling** | CSS + CSS Modules | Global themes.css, component `.module.css` files |
| **Email** | Firebase Cloud Functions + SendGrid | Canvas invitation emails |
| **Hosting** | Vercel | CDN + serverless; Firebase for DB/auth/functions |
| **Testing** | Vitest + Testing Library + happy-dom | Behavioral tests (renderHook, render, fireEvent) |
| **Linting** | ESLint 9 + Prettier + Husky | Pre-commit hooks via lint-staged |
| **State** | React `useState` + `useRef` | No external state library — plain React throughout |

---

## Component Hierarchy

```
<React.StrictMode>
  <ErrorBoundary>
    <BrowserRouter>
      <App>
        <Routes>
          "/" -> <CanvasDashboard>
          |       ├── <CreateCanvasModal>
          |       ├── <UserSettingsModal>
          |       └── <CanvasCard> x N
          |
          "/canvas/:canvasId" -> <CanvasRoute>
          |   ├── skip link (a.sr-only)
          |   ├── header (nav, share, settings buttons)
          |   ├── <Canvas>                         <- Main SVG canvas (1,345 lines)
          |   |   ├── <ShapePalette>               <- Drawing toolbar (role="toolbar")
          |   |   ├── <ColorPicker>
          |   |   ├── <ZoomControls>
          |   |   ├── <LayersPanel>
          |   |   ├── <ContextMenu>                <- Right-click (role="menu", keyboard nav)
          |   |   ├── <SelectionBox>               <- Drag selection rectangle
          |   |   ├── <MultiSelectionBox>          <- Multi-select bounding box + handles
          |   |   ├── <ShapePreview>               <- Preview during drawing
          |   |   ├── <CustomPolygonPreview>       <- Vertex visualization
          |   |   ├── <ShapeRenderer>              <- Shape type dispatch loop
          |   |   |   ├── <Rectangle>
          |   |   |   ├── <Circle>
          |   |   |   ├── <Polygon>
          |   |   |   ├── <CustomPolygon>
          |   |   |   ├── <TextBox>
          |   |   |   └── <Image>
          |   |   ├── <InlineTextEditor>           <- In-place text editing
          |   |   ├── <Cursor> x N                 <- Remote user cursors
          |   |   ├── <ChatPanel>                  <- Tabbed: Canvas Chat + Canny AI
          |   |   └── <DebugPanel>                 <- Dev-only FPS overlay
          |   ├── <PresenceSidebar>                <- Online users list
          |   ├── <CanvasSettingsModal>
          |   ├── <UserSettingsModal>
          |   └── <ShareCanvasModal>
          |
          "*" -> <NotFoundPage>
        </Routes>
      </App>
    </BrowserRouter>
  </ErrorBoundary>
</React.StrictMode>
```

---

## Hook Architecture

Canvas.jsx is a wiring component that connects 13 custom hooks to the JSX tree. Each hook owns a specific concern:

```
Canvas.jsx
  |
  +-- useAuth()              -> user, signOut
  +-- useCanvas()            -> shapes, selectedShapeId, selectShape, deselectShape,
  |                             connectionStatus, notifyFirestoreActivity
  +-- useCursors()           -> remoteCursors (filtered, deduplicated)
  +-- useHistory()           -> recordAction, popUndo, popRedo
  +-- useTheme()             -> theme, setTheme
  +-- useViewport()          -> viewport (zoom, offsetX/Y), viewBox, containerSize,
  |                             handleZoomIn/Out/Reset, handleWheel, handlePan
  +-- useSelection()         -> selectedShapeIds, setSelectedShapeIds,
  |                             selectionRect, isSelecting
  +-- useShapeDrawing()      -> isDrawing, previewRect, drawingStart/Move/End
  +-- useShapeTransform()    -> isDragging, isResizing, isRotating,
  |                             handleDrag/Resize/Rotate start/move/end
  +-- useCanvasKeyboard()    -> (attaches global keydown listener)
  +-- useCanvasClipboard()   -> clipboard, setClipboard, (paste event listener)
  +-- useCustomPolygon()     -> isDrawingCustomPolygon, customPolygonVertices,
                                handleFinishCustomPolygon
```

All hooks receive dependencies as parameters and return state + handlers. Canvas.jsx wires them together and renders the SVG.

---

## Data Flow

```
  User Interaction (click, drag, type)
         |
         v
  Component (Canvas.jsx, ChatPanel.jsx, etc.)
         |
         v
  Custom Hook (useCanvas, useShapeTransform, etc.)
         |
         v
  Service (canvasService.js, firebase.js, etc.)
         |
    set / update / remove
         |
         v
  Firebase Realtime Database
         |
    onValue listener callback
         |
         v
  Hook state update (setShapes, setOnlineUsers, etc.)
         |
         v
  React re-render

  Write Path:  Component -> Hook -> Service -> Firebase RTDB
  Read Path:   Firebase RTDB -> onValue callback -> Hook -> Component re-render
```

---

## Database Schema (Firebase Realtime DB)

```
root/
├── canvases/
│   └── {canvasId}/
│       ├── metadata/
│       │   ├── name: string
│       │   ├── createdBy: string (userId)
│       │   ├── createdAt: number (timestamp ms)
│       │   ├── lastModified: number (timestamp ms)
│       │   ├── template: "blank" | "brainstorm" | "wireframe"
│       │   └── settings/
│       │       ├── backgroundColor: string (hex)
│       │       └── gridVisible: boolean
│       │
│       ├── permissions/
│       │   └── {userId}: "owner" | "editor" | "viewer"
│       │
│       ├── objects/
│       │   └── {objectId}/                         # ID format: {userId}_{timestamp}_{random7}
│       │       ├── id: string
│       │       ├── type: "rectangle" | "circle" | "polygon" |
│       │       │         "customPolygon" | "text" | "image"
│       │       ├── x: number, y: number            # Position (canvas coords, 0-5000)
│       │       ├── color: string (hex/rgba)
│       │       ├── rotation: number (degrees)
│       │       ├── visible: boolean
│       │       ├── name: string                    # Auto-generated display name
│       │       ├── zIndex: number (timestamp)
│       │       ├── createdBy: string (userId)
│       │       ├── timestamp: number
│       │       ├── lockedBy: string | null
│       │       ├── lockedByUserName: string | null
│       │       │
│       │       # Type-specific fields:
│       │       ├── width, height: number           # rectangle, text, image
│       │       ├── radius: number                  # circle, polygon
│       │       ├── sides: number                   # polygon (default 5)
│       │       ├── text, fontSize, fontWeight,
│       │       │   textColor: string               # text
│       │       ├── imageUrl: string (base64)       # image
│       │       └── vertices: [{x, y}]             # customPolygon
│       │
│       ├── cursors/
│       │   └── {sessionId}/
│       │       ├── sessionId, userId, userName: string
│       │       ├── x, y: number
│       │       ├── timestamp, arrivalTime: number
│       │       └── isActive: boolean
│       │
│       ├── presence/
│       │   └── {sessionId}/
│       │       ├── sessionId, userId, userName: string
│       │       ├── color: string (hex)
│       │       ├── isOnline, isActive: boolean
│       │       └── lastSeen: number (timestamp)
│       │
│       ├── chat/
│       │   └── {messageId}/
│       │       ├── userId, userName: string
│       │       ├── text: string
│       │       └── timestamp: number
│       │
│       └── invitations/
│           └── {invitationId}/
│               ├── email, canvasName, inviterName: string
│               ├── role: "editor" | "viewer"
│               ├── sent: boolean
│               └── sentAt: number (timestamp)
│
└── userCanvases/                                   # Index for fast dashboard queries
    └── {userId}/
        └── {canvasId}/
            ├── name: string
            ├── role: "owner" | "editor" | "viewer"
            ├── lastAccessed: number (timestamp)
            └── starred: boolean
```

---

## Real-Time Collaboration

### Session Model
- Each browser tab = one session (`session_{timestamp}_{random9}`)
- Sessions tracked in `presence/` and `cursors/` under each canvas
- A single user can have multiple active sessions (multiple tabs)
- `onDisconnect` handlers auto-clean cursors and presence
- Session ID exposed as `window.__currentSessionId` for cleanup on sign out

### Object Locking

```
User A selects shape           User B sees shape
        |                            |
        v                            v
  lockObject(id, userA)        Shape renders with
        |                      lock indicator +
        v                      "Locked by User A"
  Firebase RTDB sets
  lockedBy: userA
        |
        v
  User A drags/resizes/rotates
        |
        v
  unlockObject(id)
  lockedBy: null
```

- Lock cleanup service polls every 10 seconds
- Stale locks (user disconnected > 30s) are force-released
- `forceUnlockObject()` and `unlockAllByUser()` for manual cleanup

### Presence Heartbeat

```
Mount             Every 5s                 Tab Hidden         Tab Visible
  |                  |                        |                   |
  v                  v                        v                   v
setUserPresence()  updatePresenceHeartbeat()  isActive: false   re-set presence
isOnline: true     lastSeen: Date.now()                         isActive: true
isActive: true
```

- 60-second timeout — users not seen are removed by `cleanupStalePresence()`
- `beforeunload` handler calls `removePresence()` for immediate cleanup
- Client-side 5-second re-filter catches stale users without new DB events

### Cursor Sync
- Mouse movement throttled to 75ms updates
- Client-side filter: exclude own session, stale cursors (> 45s), inactive cursors
- Drag operations throttled to 50ms

---

## AI Integration

```
+------------------+      POST /api/chat       +------------------+
|  ChatPanel       | ----------------------->  |  Vercel          |
|  (Canny tab)     |    { messages,            |  /api/chat       |
|                  |      canvasContext,        |                  |
|  useChat()       |      image? (base64) }    |  OpenAI GPT-4o   |
|  (ai/react)      |                           |  (streaming)     |
|                  | <---- SSE stream --------- |                  |
|                  |    text + tool calls       |                  |
+--------+---------+                           +------------------+
         |
         | executeCanvasTool(name, args, context)
         v
+------------------------------------------------------+
|  canvasTools.js - 9 AI Tools                          |
|                                                        |
|  createShape         -> canvasService.createShape     |
|  createShapesBatch   -> batch create (max 50)         |
|  updateShapeProperties -> canvasService.updateShape   |
|  deleteShapes        -> canvasService.deleteShape     |
|  alignShapes         -> compute + batch update        |
|  distributeShapes    -> compute + batch update        |
|  arrangeInGrid       -> compute + batch create        |
|  getCanvasInfo       -> return current shapes         |
|  selectShapes        -> filter by type/color/name     |
|                                                        |
|  Safety: MAX_SHAPES_PER_CALL = 50                     |
|          MAX_TOTAL_SHAPES = 1000                      |
|  All positions clamped to 0-5000 canvas bounds        |
+------------------------------------------------------+
```

### Vision Flow
1. User message contains visual keywords ("look at", "what do you see", etc.)
2. `shouldUseVision()` detects keywords -> `captureCanvasImage()` renders SVG to JPEG
3. Base64 image (max 800x600, 0.8 quality) sent alongside messages to `/api/chat`
4. GPT-4o analyzes canvas visually and responds with tool calls or suggestions

### Tool Call Flow
1. GPT-4o returns streaming response with `tool_calls` in delta chunks
2. Server accumulates tool calls, appends `__TOOL_CALLS__...__END_TOOL_CALLS__` marker
3. Client `useEffect` parses marker, calls `executeCanvasTool()` for each tool
4. Results applied via `canvasService` (synced to all users via Firebase)

---

## Error Handling

All errors flow through `src/utils/errorHandler.ts`:

```typescript
reportError(error, { component: 'Canvas', action: 'createShape', canvasId })
```

- **Development:** Structured `console.error` with `[component > action]` prefix
- **Production:** Sends to Sentry if `window.__SENTRY__` is available, falls back to `console.error`
- Integrated across all services, hooks, and components
- Only `testData.js` (dev utility) retains raw `console.error`

---

## TypeScript Strategy

Incremental migration with `allowJs: true` and `checkJs: false`:

- **Converted to `.ts`:** constants, canvasUtils, colorUtils, envValidation, errorHandler
- **Type definitions:** `src/types/canvas.ts` — Shape (discriminated union), Viewport, Cursor, PresenceEntry, User, CanvasMetadata, HistoryAction
- **Still `.js/.jsx`:** Components, hooks, services (can be migrated incrementally)
- **CI:** `tsc --noEmit` runs in CI and as `npm run typecheck`

---

## CSS Strategy

- **Global:** `themes.css` (CSS custom properties for light/dark), `App.css` (layout)
- **CSS Modules:** `ZoomControls.module.css`, `ErrorBoundary.module.css` (scoped, Vite-native)
- **Component CSS:** Remaining components use `Component.css` (can be migrated to modules)
- **Accessibility:** `.sr-only` utility class in `themes.css`

---

## Accessibility

- **Skip link:** `<a href="#canvas-main" class="sr-only">Skip to canvas</a>`
- **ARIA roles:** `toolbar` on ShapePalette, `radiogroup` on shape selection, `menu`/`menuitem` on ContextMenu, `status` with `aria-live="polite"` on canvas stats
- **Keyboard navigation:** Arrow keys in ContextMenu, full keyboard shortcuts for all canvas operations
- **Focus management:** Context menu auto-focuses on mount

---

## Deployment Topology

```
+------------------------------------------------------+
|                      Vercel                           |
|                                                       |
|  +-------------+    +--------------------------+     |
|  | Edge CDN    |    | Serverless Functions     |     |
|  | Static SPA  |    | /api/chat (Node.js)      |     |
|  | (vite build)|    | OpenAI proxy + streaming |     |
|  +-------------+    | 60s timeout, 1GB memory  |     |
|                      | Zod validation           |     |
|                      | 20 req/min rate limit    |     |
|                      +--------------------------+     |
|  Git integration: auto-deploy main + dev branches    |
|  Asset caching: 1-year immutable for hashed files    |
+------------------------------------------------------+

+------------------------------------------------------+
|                     Firebase                          |
|                                                       |
|  +-----------+  +------------+  +------------------+ |
|  | Auth      |  | Realtime   |  | Cloud Functions  | |
|  | GitHub    |  | Database   |  | sendCanvas-      | |
|  | Google    |  | (primary   |  |   Invitation     | |
|  | OAuth     |  |  store)    |  | cleanupOld-      | |
|  |           |  |            |  |   Invitations    | |
|  +-----------+  +------------+  +------------------+ |
|                                  (Node.js 18 runtime)|
+------------------------------------------------------+

Local Development:
  Vite (5173)        - React SPA with HMR
  server.js (3001)   - Express proxy for /api/chat (Helmet, CORS)
  Firebase           - Direct client SDK connection
```

---

## Testing Architecture

**Stack:** Vitest + @testing-library/react + happy-dom

**Environment strategy:** Default environment is `node` (avoids WSL2 OOM). Test files that need DOM rendering add `@vitest-environment happy-dom` directive.

**Configuration:** Pool `forks` with `maxForks: 1`, heap limit 6,144 MB.

**Test suites (11 files, 130 tests):**

| Suite | Type | File |
|---|---|---|
| useAuth | Hook (renderHook) | `tests/hooks/useAuth.test.js` |
| useHistory | Hook (renderHook) | `tests/hooks/useHistory.test.js` |
| useTheme | Hook (renderHook) | `tests/hooks/useTheme.test.js` |
| ErrorBoundary | Component (render) | `tests/components/ErrorBoundary.test.jsx` |
| ZoomControls | Component (render) | `tests/components/ZoomControls.test.jsx` |
| canvasService | Service (mocked Firebase) | `tests/services/canvasService.test.js` |
| lockCleanupService | Service (mocked Firebase) | `tests/services/lockCleanupService.test.js` |
| canvasTools | Utility | `tests/utils/canvasTools.test.js` |
| constants | Utility | `tests/utils/constants.test.js` |
| canvasUtils | Utility | `tests/canvasUtils.test.js` |
| colorUtils | Utility | `tests/colorUtils.test.js` |

**Coverage thresholds:** 15% statements/lines, 50% branches, 30% functions.

**CI:** GitHub Actions runs lint -> test (with coverage) -> build on every push/PR to `main`/`dev`.

---

## Performance Optimizations

| Optimization | Implementation |
|---|---|
| Viewport culling | Only shapes within visible viewport are rendered |
| React.memo | Shape components wrapped to prevent unnecessary re-renders |
| useMemo | ViewBox, grid lines, visible shapes computed only when dependencies change |
| Throttled cursors | 75ms interval (~13 updates/sec) |
| Throttled drag | 50ms interval for shape position updates |
| Code splitting | Manual chunks: vendor-react, vendor-firebase |
| Terser | console.log removed in production builds |
| IndexedDB persistence | Firebase offline support for faster loads |
| FPS monitoring | Dev-mode overlay tracks render performance |

**Targets:**
- 60 FPS with 500+ objects
- < 100ms object sync latency
- < 75ms cursor sync latency

---

## Security

### Client-Side
- Zod validates all `VITE_FIREBASE_*` env vars at startup (fails fast with descriptive error)
- No `dangerouslySetInnerHTML` anywhere — React JSX escaping for all user text
- SVG `<text>` elements don't interpret HTML

### API — Vercel Serverless (`api/chat.js`)
- Zod schema validates `req.body.messages` (role enum, content max 50KB, array max 100)
- CORS restricted to Vercel deploy domains + localhost:5173/4173
- Rate limiting: 20 requests/min per IP (in-memory)
- No stack traces in error responses

### API — Local Dev Server (`server.js`)
- Helmet security headers
- CORS restricted to localhost:5173/4173
- 10MB body limit
- No validation or rate limiting (dev-only)

### Firebase Security Rules (`database.rules.json`)
- Authentication required for all reads/writes
- Canvas-level read: user must have a `permissions` entry or `userCanvases` entry
- Canvas-level write: owner-only for top-level canvas operations
- Object write: owner or editor role required
- Cursor/presence write: any authenticated user
- Permissions write: owner can set any user's role; users can modify their own
- userCanvases: each user can only read/write their own index
