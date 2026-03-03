# CollabCanvasGAI — Architecture

A real-time collaborative canvas application built with React, Firebase, and OpenAI GPT-4o.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENTS (Browsers)                        │
│                                                                     │
│  React 18 SPA ──── Vite Dev Server (localhost:5173)                │
│  Raw SVG Canvas     └── HMR, ESM bundling                          │
│  Custom State Routing (no React Router)                            │
└──────────┬──────────────────────┬──────────────────────┬───────────┘
           │                      │                      │
           │ Auth + Realtime DB   │ Serverless API       │ Static Assets
           ▼                      ▼                      ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐
│  Firebase         │  │  Vercel           │  │  Vercel Edge CDN     │
│  ├─ Auth (OAuth)  │  │  └─ /api/chat     │  │  └─ Production Build │
│  ├─ Realtime DB   │  │     (GPT-4o SSE)  │  │     (vite build)     │
│  └─ Cloud Funcs   │  └──────────┬────────┘  └──────────────────────┘
│     (SendGrid)    │             │
└──────────────────┘             ▼
                      ┌──────────────────┐
                      │  OpenAI API       │
                      │  └─ GPT-4o        │
                      │     (vision +     │
                      │      tool calls)  │
                      └──────────────────┘
```

---

## Tech Stack

| Layer | Technology | Role |
|-------|-----------|------|
| **UI Framework** | React 18.3 | Component rendering, state management |
| **Build Tool** | Vite 5.4 | Dev server, HMR, production bundling (Terser) |
| **Canvas** | Raw SVG | Shape rendering — no canvas library (Konva, Fabric) |
| **Auth** | Firebase Auth | GitHub + Google OAuth providers |
| **Database** | Firebase Realtime DB | All persistent data — shapes, presence, cursors, chat, permissions |
| **Real-time Sync** | Firebase `onValue` listeners | Live shape updates, cursor tracking, presence |
| **AI Backend** | Vercel Serverless Functions | `/api/chat` — proxies OpenAI with tool definitions |
| **AI Model** | OpenAI GPT-4o | Vision (canvas screenshots) + function calling (9 canvas tools) |
| **AI Client** | Vercel AI SDK (`ai/react`) | `useChat` hook for streaming SSE responses |
| **Email** | Firebase Cloud Functions + SendGrid | Canvas invitation emails |
| **Hosting** | Vercel | Primary deployment (CDN + serverless) |
| **Schema Validation** | Zod 3.23 | AI SDK structured output validation |
| **State Management** | React `useState` + `useRef` | No Redux/Zustand — plain React state throughout |
| **Routing** | Custom `window.history.pushState` | Deep links: `/canvas/:id?role=viewer\|editor` |

---

## Component Hierarchy

```
<React.StrictMode>
└── <ErrorBoundary>                    ← Class component, catches render errors
    └── <App>                          ← Root: auth gate + view orchestration
        │
        ├── [loading] → Spinner
        │
        ├── [!user] → <LoginPage>     ← GitHub / Google OAuth
        │
        ├── [dashboard] → <CanvasDashboard>
        │   ├── <CreateCanvasModal>
        │   └── <CanvasCard> × N
        │
        └── [canvas] → Canvas View
            ├── <Canvas>               ← Main SVG canvas (1100+ lines)
            │   ├── <SelectionBox>
            │   ├── <Rectangle> / <Circle> / <Polygon> /
            │   │   <CustomPolygon> / <TextBox> / <Image>
            │   ├── <InlineTextEditor>
            │   ├── <Cursor> × N       ← Remote user cursors
            │   ├── <ShapePalette>
            │   ├── <ColorPicker>
            │   ├── <LayersPanel>
            │   ├── <ZoomControls>
            │   ├── <ContextMenu>
            │   ├── <ChatPanel>        ← Tabbed: Canvas Chat + Canny AI
            │   └── <DebugPanel>       ← Dev-only FPS/connection overlay
            │
            ├── <PresenceSidebar>      ← Online users list
            ├── <CanvasSettingsModal>
            ├── <UserSettingsModal>
            └── <ShareCanvasModal>
```

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ Component                                                        │
│ (Canvas.jsx, ChatPanel.jsx, etc.)                               │
│                                                                   │
│  User interaction (click, drag, type)                            │
│         │                                                         │
│         ▼                                                         │
│  ┌─────────────┐    state     ┌──────────────┐                   │
│  │   Hooks      │ ◄────────── │  React State  │                  │
│  │  useCanvas   │             │  useState()   │                  │
│  │  useCursors  │             │  useRef()     │                  │
│  │  usePresence │             └──────────────┘                   │
│  │  useHistory  │                                                 │
│  │  useAuth     │                                                 │
│  │  useTheme    │                                                 │
│  └──────┬──────┘                                                  │
│         │                                                         │
│         ▼                                                         │
│  ┌──────────────────┐                                             │
│  │   Services        │                                            │
│  │  canvasService    │ ─── set/update/remove ──►  Firebase RTDB  │
│  │  lockCleanupSvc   │                                            │
│  │  imageService     │ ◄── onValue listeners ───  Firebase RTDB  │
│  │  firebase         │                                            │
│  └──────────────────┘                                             │
└─────────────────────────────────────────────────────────────────┘

   Write Path:  Component → Hook → Service → Firebase RTDB
   Read Path:   Firebase RTDB → onValue callback → Hook state → Component re-render
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
│       │   ├── createdByName: string
│       │   ├── createdAt: number (timestamp)
│       │   ├── lastModified: number (timestamp)
│       │   ├── template: string
│       │   └── settings/
│       │       ├── backgroundColor: string (hex)
│       │       ├── showGrid: boolean
│       │       └── gridSize: number
│       │
│       ├── permissions/
│       │   └── {userId}: "owner" | "editor" | "viewer"
│       │
│       ├── objects/
│       │   └── {objectId}/
│       │       ├── id: string ("{userId}_{timestamp}_{random}")
│       │       ├── type: "rectangle"|"circle"|"polygon"|"customPolygon"|"text"|"image"
│       │       ├── x: number, y: number
│       │       ├── color: string (hex)
│       │       ├── rotation: number (degrees)
│       │       ├── visible: boolean
│       │       ├── name: string
│       │       ├── zIndex: number
│       │       ├── createdBy: string (userId)
│       │       ├── timestamp: number
│       │       ├── lockedBy: string|null (userId)
│       │       ├── lockedByUserName: string|null
│       │       │
│       │       ├── width: number, height: number    (rectangle, text, image)
│       │       ├── radius: number                    (circle, polygon)
│       │       ├── sides: number                     (polygon)
│       │       ├── text: string                      (text)
│       │       ├── fontSize: number                  (text)
│       │       ├── fontWeight: string                (text)
│       │       ├── textColor: string                 (text)
│       │       ├── imageUrl: string (base64)         (image)
│       │       └── vertices: [{x, y}]               (customPolygon)
│       │
│       ├── cursors/
│       │   └── {sessionId}/
│       │       ├── userId: string
│       │       ├── userName: string
│       │       ├── x: number, y: number
│       │       ├── timestamp: number
│       │       ├── arrivalTime: number
│       │       └── isActive: boolean
│       │
│       ├── presence/
│       │   └── {sessionId}/
│       │       ├── sessionId: string
│       │       ├── userId: string
│       │       ├── userName: string
│       │       ├── color: string (hex)
│       │       ├── isOnline: boolean
│       │       ├── isActive: boolean
│       │       └── lastSeen: number (timestamp)
│       │
│       └── chat/
│           └── {messageId}/
│               ├── userId: string
│               ├── userName: string
│               ├── message: string
│               └── timestamp: number
│
└── userCanvases/
    └── {userId}/
        └── {canvasId}/
            ├── name: string
            ├── role: "owner"|"editor"|"viewer"
            ├── lastAccessed: number (timestamp)
            └── starred: boolean
```

---

## Real-Time Collaboration Architecture

### Session Model
- Each browser tab = one session (`sessionId` = `{userId}_{timestamp}_{random}`)
- Sessions tracked in `canvases/{id}/presence` and `canvases/{id}/cursors`
- A single user can have multiple active sessions (multiple tabs)

### Object Locking
```
User A clicks shape       User B sees shape
        │                       │
        ▼                       ▼
  lockObject(id, userA)   Shape renders with
        │                 lock indicator +
        ▼                 "Locked by User A"
  Firebase RTDB sets      tooltip
  lockedBy: userA
  lockedByUserName: "A"
        │
        ▼
  User A drags/edits
        │
        ▼
  unlockObject(id)
  lockedBy: null
```
- Lock cleanup service runs every 10 seconds
- Stale locks (user disconnected > 30 seconds) are force-released
- `forceUnlockObject` and `unlockAllByUser` available for manual cleanup

### Presence Heartbeat
```
  Mount                    Every 5s               Tab Hidden        Tab Visible
    │                         │                      │                  │
    ▼                         ▼                      ▼                  ▼
  setUserPresence()    updatePresenceHeartbeat()  isActive: false   isActive: true
  isOnline: true       lastSeen: Date.now()
  isActive: true
```
- Timeout: 60 seconds — users not seen for 60s are removed by `cleanupStalePresence`
- `beforeunload` handler calls `removePresence` for immediate cleanup

### Cursor Sync
- Mouse movement throttled to 75ms updates (`CURSOR_UPDATE_THROTTLE`)
- Client-side filter: exclude own session, stale cursors (> 45s), inactive cursors
- 5-second re-filter interval catches stale cursors without DB updates

---

## AI Integration

```
┌──────────────┐     POST /api/chat      ┌──────────────┐
│  ChatPanel    │ ──────────────────────► │  Vercel       │
│  (Canny tab)  │    { messages,          │  /api/chat    │
│               │      canvasContext,     │               │
│  useChat()    │      image? (base64) }  │  OpenAI       │
│  (ai/react)   │                         │  GPT-4o       │
│               │ ◄────── SSE stream ──── │  (streaming)  │
│               │    text + tool calls    │               │
└──────┬───────┘                         └──────────────┘
       │
       │ executeCanvasTool(name, args, context)
       ▼
┌──────────────────────────────────────────────────┐
│  canvasTools.js — 9 AI Tools                      │
│                                                    │
│  createShape        → canvasService.createShape   │
│  createShapesBatch  → batch create (max 50)       │
│  updateShapeProperties → canvasService.updateShape │
│  deleteShapes       → canvasService.deleteShape   │
│  alignShapes        → compute + batch update      │
│  distributeShapes   → compute + batch update      │
│  arrangeInGrid      → compute + batch create      │
│  getCanvasInfo      → return current shapes       │
│  selectShapes       → filter by type/color/name   │
│                                                    │
│  Safety: MAX_SHAPES_PER_CALL = 50                 │
│          MAX_TOTAL_SHAPES = 1000                  │
│  All positions clamped to CANVAS_WIDTH/HEIGHT     │
└──────────────────────────────────────────────────┘
```

### Vision Flow
1. User types message containing visual keywords ("look at", "what do you see", etc.)
2. `shouldUseVision()` detects keywords → `captureCanvasImage()` renders SVG to JPEG
3. Base64 image sent alongside messages to `/api/chat`
4. GPT-4o analyzes canvas visually and responds with suggestions or tool calls

### Tool Call Flow
1. GPT-4o returns streaming response with `tool_calls` in delta chunks
2. Server accumulates tool calls, appends `__TOOL_CALLS__...__END_TOOL_CALLS__` marker
3. Client parses marker, calls `executeCanvasTool()` for each tool
4. Results applied to canvas via `canvasService` (synced to all users via Firebase)

---

## Deployment Topology

```
┌──────────────────────────────────────────────────────┐
│                     Vercel                            │
│                                                       │
│  ┌─────────────┐    ┌──────────────────────────┐     │
│  │ Edge CDN     │    │ Serverless Functions      │    │
│  │ Static SPA   │    │ /api/chat (Node.js 18)   │    │
│  │ (vite build) │    │ OpenAI proxy + streaming  │    │
│  └─────────────┘    └──────────────────────────┘     │
│                                                       │
│  Git Integration: auto-deploy on push to main/dev    │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│                    Firebase                           │
│                                                       │
│  ┌─────────────┐  ┌──────────┐  ┌────────────────┐  │
│  │ Auth          │  │ Realtime │  │ Cloud Functions │  │
│  │ GitHub OAuth  │  │ Database │  │ sendInvitation  │  │
│  │ Google OAuth  │  │ (primary │  │ cleanupOld      │  │
│  │               │  │  store)  │  │ Invitations     │  │
│  └─────────────┘  └──────────┘  └────────────────┘  │
└──────────────────────────────────────────────────────┘

Local Development:
  vite (5173) ─── React SPA with HMR
  server.js (3001) ─── Express proxy for /api/chat
  Firebase ─── Direct client SDK connection
```

---

## Directory Structure

```
CollabCanvasGAI/
├── api/
│   ├── chat.js                 ← Vercel serverless (GPT-4o proxy)
│   └── package.json            ← { "type": "commonjs" }
├── functions/
│   └── index.js                ← Firebase Cloud Functions (SendGrid)
├── public/
│   └── vite.svg
├── src/
│   ├── App.jsx                 ← Root component
│   ├── main.jsx                ← Entry point
│   ├── components/
│   │   ├── Canvas.jsx          ← Main SVG canvas
│   │   ├── CanvasDashboard.jsx ← Multi-canvas list view
│   │   ├── CanvasCard.jsx      ← Dashboard canvas card
│   │   ├── ChatPanel.jsx       ← AI + human chat
│   │   ├── ErrorBoundary.jsx   ← Error catching wrapper
│   │   ├── ZoomControls.jsx    ← Zoom in/out/fit
│   │   ├── LayersPanel.jsx     ← Shape layer ordering
│   │   ├── ShapePalette.jsx    ← Shape creation toolbar
│   │   ├── ColorPicker.jsx     ← Color selection
│   │   ├── ContextMenu.jsx     ← Right-click menu
│   │   ├── PresenceSidebar.jsx ← Online users
│   │   ├── LoginPage.jsx       ← OAuth login
│   │   ├── SelectionBox.jsx    ← Drag selection
│   │   ├── InlineTextEditor.jsx← In-place text editing
│   │   ├── Cursor.jsx          ← Remote cursor display
│   │   ├── DebugPanel.jsx      ← Dev overlay
│   │   ├── Rectangle.jsx       ← Shape renderers...
│   │   ├── Circle.jsx
│   │   ├── Polygon.jsx
│   │   ├── CustomPolygon.jsx
│   │   ├── TextBox.jsx
│   │   └── Image.jsx
│   ├── hooks/
│   │   ├── useAuth.js          ← Firebase auth state
│   │   ├── useCanvas.js        ← Shape CRUD + sync
│   │   ├── useCursors.js       ← Cursor tracking
│   │   ├── useHistory.js       ← Local undo/redo
│   │   ├── usePresence.js      ← Online presence
│   │   └── useTheme.js         ← Theme preference
│   ├── services/
│   │   ├── firebase.js         ← Firebase init + auth
│   │   ├── canvasService.js    ← All Realtime DB operations
│   │   ├── lockCleanupService.js ← Stale lock cleanup
│   │   ├── canvasMigration.js  ← Single→multi migration
│   │   └── imageService.js     ← Image processing
│   ├── utils/
│   │   ├── canvasTools.js      ← AI tool definitions + execution
│   │   ├── canvasUtils.js      ← Pure geometry functions
│   │   ├── colorUtils.js       ← Color utilities
│   │   ├── constants.js        ← App-wide constants
│   │   ├── canvasCapture.js    ← SVG→JPEG for vision
│   │   └── testData.js         ← Performance test generators
│   └── tests/
│       └── setup.js            ← Vitest global setup
├── docs/                       ← Documentation archive
├── memory-bank/                ← AI context continuity
├── database.rules.json         ← Firebase RTDB rules
├── firebase.json               ← Firebase project config
├── vercel.json                 ← Vercel deploy config
├── vite.config.js              ← Vite build config
└── vitest.config.js            ← Vitest test config
```

---

## Feature Suggestions

### Drawing Enhancements
1. **Freehand/Pen Tool** — SVG `<path>` shapes from mouse input. New `type: 'path'` in objects collection with `d` attribute stored as point array.
2. **Line/Arrow Tool** — Straight lines and arrows for diagramming. Natural extension of the wireframe template pattern.
3. **Sticky Notes** — Unified rect+text composite shape. Improves on the brainstorm template pattern with a single `type: 'stickyNote'`.
4. **Shape Grouping** — Persist multi-select as `type: 'group'` with a children array. Enables move/scale/lock on grouped objects.
5. **Full Color Picker** — Color wheel + hex input replacing the current 5-color palette (`CANVAS_COLORS`).

### Collaboration
6. **Positional Comments** — Comment pins placed on canvas coordinates with threaded discussions stored under `canvases/{id}/comments`.
7. **Cursor Chat** — Brief messages floating next to user cursors (Figma-style). Ephemeral, stored in cursor data with auto-expire.
8. **Version History** — Server-side canvas snapshots with rollback capability. Periodic snapshots of `objects/` to a `snapshots/` node.
9. **Separate Human Chat** — Distinct channel from the Canny AI chat, allowing team discussion without AI context pollution.

### AI Capabilities
10. **Layout Suggestions** — Canny analyzes canvas via vision and suggests alignment, spacing, and color improvements as tool calls.
11. **Template Generation** — Generate full canvas layouts from text descriptions ("create a user flow diagram with 5 steps").
12. **Natural Language Style Editing** — Commands like "make it more professional" via vision analysis + `updateShapeProperties` tool calls.

### UX
13. **Keyboard Shortcuts Panel** — Discoverable overlay (press `?`) listing all available shortcuts. Data-driven from a shortcuts registry.
14. **Mini-map Navigation** — Small canvas overview in corner with viewport indicator and click-to-navigate.
15. **Shape Search/Filter** — Search by name, type, or creator in the LayersPanel. Useful on canvases with many objects.
16. **Raise Canvas Limit** — Increase `MAX_CANVASES_PER_USER` from 2 (one-line change in `src/utils/constants.js`).
