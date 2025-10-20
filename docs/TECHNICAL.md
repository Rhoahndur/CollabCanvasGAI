# CollabCanvas Technical Documentation

Technical details, architecture decisions, and implementation notes.

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Database Structure](#database-structure)
4. [Security & Permissions](#security--permissions)
5. [Real-Time Systems](#real-time-systems)
6. [Performance Optimizations](#performance-optimizations)
7. [AI Integration](#ai-integration)

---

## Architecture Overview

CollabCanvas uses a modern client-server architecture with real-time capabilities.

### High-Level Architecture
```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Client    │────▶│   Firebase   │────▶│   OpenAI    │
│  (React)    │     │ (Auth + DB)  │     │   (Canny)   │
└─────────────┘     └──────────────┘     └─────────────┘
       │                    │                     │
       │                    │                     │
       └────────────────────┴─────────────────────┘
              Real-time Sync & AI Responses
```

### Component Structure
```
src/
├── components/        # React components
│   ├── Canvas.jsx    # Main canvas component
│   ├── ChatPanel.jsx # Chat & Canny AI interface
│   ├── ShapePalette.jsx
│   ├── PresenceSidebar.jsx
│   └── ...
├── hooks/            # Custom React hooks
│   ├── useCanvas.js  # Canvas state management
│   ├── useCursors.js # Multiplayer cursors
│   ├── usePresence.js # User presence
│   └── useAuth.js    # Authentication
├── services/         # External services
│   ├── firebase.js   # Firebase initialization
│   ├── canvasService.js # Canvas CRUD operations
│   └── imageService.js  # Image upload/storage
└── utils/            # Utility functions
    ├── canvasUtils.js    # Coordinate transforms
    ├── canvasTools.js    # Canny tool implementations
    ├── canvasCapture.js  # Canvas vision capture
    └── colorUtils.js     # Color manipulation
```

---

## Technology Stack

### Frontend
- **React 18.3.1**: UI framework
- **Vite 5.4.2**: Build tool & dev server
- **SVG**: Vector graphics for canvas shapes
- **CSS Variables**: Theme system

### Backend Services
- **Firebase Authentication**: User auth (Google, GitHub)
- **Firestore**: Object storage (shapes, images, metadata)
- **Realtime Database**: Live data (cursors, presence, canvas state)
- **Firebase Storage**: Image file storage
- **Firebase Functions**: Serverless email sending

### AI & APIs
- **OpenAI GPT-4o**: Canny AI assistant with vision
- **Vercel AI SDK**: Streaming chat interface
- **SendGrid**: Email invitation delivery

### Deployment
- **Vercel**: Frontend hosting & serverless functions
- **Firebase Hosting**: Alternative deployment option

---

## Database Structure

### Firestore (Persistent Data)

**Structure:**
```
firestore/
├── users/{userId}
│   ├── displayName: string
│   ├── email: string
│   ├── photoURL: string
│   └── createdAt: timestamp
│
└── canvases/{canvasId}/
    └── objects/{objectId}
        ├── type: 'rectangle' | 'circle' | 'polygon' | 'text' | 'image' | 'customPolygon'
        ├── x, y: number (position)
        ├── width, height: number (dimensions, optional)
        ├── radius: number (for circles)
        ├── color: string (fill color)
        ├── rotation: number (degrees)
        ├── createdBy: userId
        ├── timestamp: number
        ├── lockedBy: userId | null (for collaboration)
        ├── lockedByUserName: string | null
        └── ... (type-specific fields)
```

### Realtime Database (Live Data)

**Structure:**
```
realtimeDB/
├── canvases/{canvasId}
│   ├── name: string
│   ├── createdBy: userId
│   ├── createdAt: timestamp
│   ├── lastAccessed: timestamp
│   ├── settings/
│   │   ├── backgroundColor: string
│   │   └── gridVisible: boolean
│   ├── collaborators/{userId}
│   │   ├── role: 'owner' | 'editor' | 'viewer'
│   │   ├── addedAt: timestamp
│   │   └── addedBy: userId
│   └── metadata/
│       ├── objectCount: number
│       └── lastModified: timestamp
│
├── userCanvases/{userId}/{canvasId}
│   ├── role: 'owner' | 'editor' | 'viewer'
│   ├── starred: boolean
│   ├── lastAccessed: timestamp
│   └── name: string
│
├── cursors/{canvasId}/{userId}
│   ├── x, y: number
│   ├── userName: string
│   ├── color: string
│   └── timestamp: number
│
├── presence/{canvasId}/{userId}
│   ├── userName: string
│   ├── online: boolean
│   ├── lastSeen: timestamp
│   └── status: 'active' | 'away'
│
└── canvasChat/{canvasId}/{messageId}
    ├── userId: string
    ├── userName: string
    ├── message: string
    ├── timestamp: number
    └── color: string
```

### Firebase Storage

**Structure:**
```
storage/
└── canvasImages/{canvasId}/{imageId}.{ext}
```

---

## Security & Permissions

### Firestore Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // Canvas objects - authenticated users only
    match /canvases/{canvasId}/objects/{objectId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

### Realtime Database Rules

```javascript
{
  "rules": {
    // Canvas data
    "canvases": {
      "$canvasId": {
        ".read": "auth != null",
        ".write": "auth != null && (
          data.child('collaborators').child(auth.uid).child('role').val() == 'owner' ||
          data.child('collaborators').child(auth.uid).child('role').val() == 'editor'
        )"
      }
    },
    
    // User's canvas list
    "userCanvases": {
      "$userId": {
        ".read": "auth.uid == $userId",
        ".write": "auth.uid == $userId"
      }
    },
    
    // Cursors - user can only write their own
    "cursors": {
      "$canvasId": {
        ".read": "auth != null",
        "$userId": {
          ".write": "auth.uid == $userId"
        }
      }
    },
    
    // Presence - user can only write their own
    "presence": {
      "$canvasId": {
        ".read": "auth != null",
        "$userId": {
          ".write": "auth.uid == $userId"
        }
      }
    },
    
    // Canvas chat - authenticated users can read/write
    "canvasChat": {
      "$canvasId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
```

### Role-Based Access Control (RBAC)

**Role Hierarchy:**
```
Owner > Editor > Viewer
```

**Permissions Matrix:**
| Action | Owner | Editor | Viewer |
|--------|-------|--------|--------|
| View canvas | ✅ | ✅ | ✅ |
| Edit objects | ✅ | ✅ | ❌ |
| Add objects | ✅ | ✅ | ❌ |
| Delete objects | ✅ | ✅ | ❌ |
| Invite collaborators | ✅ | ✅ | ❌ |
| Change settings | ✅ | ✅ | ❌ |
| Remove collaborators | ✅ | ✅ (not owner) | ❌ |
| Delete canvas | ✅ | ❌ | ❌ |
| Change canvas name | ✅ | ✅ | ❌ |

---

## Real-Time Systems

### Multiplayer Cursors

**Implementation:**
- Firebase Realtime Database for low-latency updates
- Throttled updates (60 FPS max)
- Automatic cleanup on disconnect
- Color-coded per user

**Code Pattern:**
```javascript
// Update cursor position
const updateCursor = throttle((x, y) => {
  const cursorRef = ref(realtimeDb, `cursors/${canvasId}/${userId}`);
  set(cursorRef, { x, y, userName, color, timestamp: Date.now() });
}, 16); // ~60 FPS

// Listen for other cursors
onValue(cursorsRef, (snapshot) => {
  const cursors = snapshot.val() || {};
  setCursors(Object.entries(cursors).filter(([id]) => id !== userId));
});

// Cleanup on disconnect
onDisconnect(cursorRef).remove();
```

### Presence System

**Features:**
- Online/offline detection
- Last seen timestamp
- Active/away status
- Connection state monitoring

**Stale Lock Cleanup:**
- Integrated with presence system
- Locks auto-release when user disconnects
- Prevents permanent lock issues
- Runs every 30 seconds

### Object Synchronization

**Optimistic Updates:**
1. Update local state immediately (feels instant)
2. Write to Firebase in background
3. Listen for confirmation/conflicts
4. Resolve conflicts (last-write-wins)

**Throttling:**
- Drag operations: Throttled to 100ms
- Cursor movements: Throttled to 16ms (60 FPS)
- Resize/rotate: Throttled to 100ms

---

## Performance Optimizations

### Viewport Culling

Only render shapes visible in the current viewport:

```javascript
const isShapeVisible = (shape, viewport) => {
  const buffer = 100; // Extra margin
  const { offsetX, offsetY, zoom } = viewport;
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  
  const viewLeft = offsetX - buffer;
  const viewRight = offsetX + (screenWidth / zoom) + buffer;
  const viewTop = offsetY - buffer;
  const viewBottom = offsetY + (screenHeight / zoom) + buffer;
  
  // Check if shape bounds intersect viewport
  return (
    shape.x + shape.width > viewLeft &&
    shape.x < viewRight &&
    shape.y + shape.height > viewTop &&
    shape.y < viewBottom
  );
};
```

**Results:**
- Canvas with 1000 shapes: Only ~50-100 rendered at once
- Maintains 60 FPS even with thousands of shapes
- Smooth pan/zoom regardless of object count

### React Optimizations

- `React.memo()` on shape components
- `useMemo()` for expensive calculations
- `useCallback()` for stable function references
- Throttled/debounced updates to reduce re-renders

### Image Optimization

- Images stored in Firebase Storage
- Lazy loading for images outside viewport
- Compression on upload (optional)
- Base64 caching for frequently used images

### Database Optimizations

- Compound queries where possible
- Indexed fields for fast lookups
- Pagination for large result sets
- Connection pooling

---

## AI Integration

### Canny Architecture

```
┌──────────┐    HTTP/SSE     ┌───────────┐    OpenAI API    ┌──────────┐
│  Client  │ ───────────────▶│  Server   │ ────────────────▶│  OpenAI  │
│ (React)  │                 │ (Express) │                  │ (GPT-4o) │
└──────────┘                 └───────────┘                  └──────────┘
     │                              │                              │
     │                              │                              │
     │◀─────────────────────────────┴──────────────────────────────┘
     │           Streaming Response + Tool Calls
```

### Tool Implementation

Canny has access to these tools:

1. **createShape**: Create shapes with specified properties
2. **alignShapes**: Align shapes (left, right, top, bottom, center)
3. **distributeShapes**: Evenly distribute shapes
4. **arrangeInGrid**: Arrange shapes in rows × columns
5. **updateShapeProperties**: Modify colors, sizes, rotation
6. **deleteShapes**: Remove shapes (with confirmation)
7. **getCanvasInfo**: Query canvas state
8. **selectShapes**: Select shapes by type or color

**Tool Definition Example:**
```javascript
{
  type: 'function',
  function: {
    name: 'createShape',
    description: 'Create a new shape on the canvas',
    parameters: {
      type: 'object',
      properties: {
        shapeType: { 
          type: 'string', 
          enum: ['rectangle', 'circle', 'polygon', 'text', 'customPolygon'] 
        },
        x: { type: 'number', description: 'X position' },
        y: { type: 'number', description: 'Y position' },
        color: { type: 'string', description: 'Fill color (hex)' },
        count: { type: 'number', description: 'Number of shapes to create' }
      },
      required: ['shapeType']
    }
  }
}
```

### Vision Integration

**GPT-4o with Vision:**
- Model: `gpt-4o` (multimodal)
- Max tokens: 4096 (increased for vision processing)
- Image format: Base64-encoded PNG from SVG

**Canvas Capture Process:**
1. User asks question with spatial context
2. Check if vision is needed (keyword detection)
3. Capture SVG canvas → convert to PNG → base64
4. Send image + text to GPT-4o
5. Stream response with visual understanding

**Smart Activation Keywords:**
- Spatial: "near", "around", "left of", "above", "below"
- Demonstrative: "these", "those", "that", "this"
- Visual: "see", "look", "show", "appears", "looks like"
- Questions: "what", "where", "which", "how many"
- Colors: "color", "blue", "red", etc.

### Streaming Implementation

**Server-Sent Events (SSE):**
```javascript
// Server: Stream responses
res.setHeader('Content-Type', 'text/event-stream');
for await (const chunk of stream) {
  const content = chunk.choices[0]?.delta?.content || '';
  if (content) {
    res.write(`0:${JSON.stringify(content)}\n`);
  }
}
res.end();

// Client: Process stream
const { messages, input, handleSubmit, isLoading } = useChat({
  api: '/api/chat',
  experimental_onToolCall: async (toolCall) => {
    // Execute tool and return result
    return executeCanvasTool(toolCall, canvasContext);
  }
});
```

---

## Migration Notes

### Realtime Database Migration

**Why:** Originally used Firestore for everything, migrated live data to Realtime Database for better performance.

**Benefits:**
- Lower latency for cursors/presence
- Better support for disconnect detection
- More efficient for frequently changing data
- Reduced Firestore costs

**What Moved:**
- ✅ Cursors
- ✅ Presence
- ✅ Canvas metadata
- ✅ Collaborator lists
- ✅ User canvas lists
- ✅ Canvas chat

**What Stayed:**
- ✅ Canvas objects (shapes)
- ✅ User profiles
- ✅ Images (Firestore + Storage)

### Refactoring: Rectangles → Shapes

**Why:** Originally built with only rectangles, later added multiple shape types.

**Changes:**
- `rectangles` → `shapes` in code
- `createRectangle()` → `createShape()`
- `Rectangle.jsx` → kept for backward compatibility
- Added: `Circle.jsx`, `Polygon.jsx`, `TextBox.jsx`, `Image.jsx`

**Backward Compatibility:**
- Old `createRectangle()` still works (calls `createShape()`)
- Database field remains `objects` (generic)
- Type field distinguishes shape types

---

## Bug Fixes & Edge Cases

### Anonymous User Handling

**Issue:** When `user.userName` is undefined (rare edge case with incomplete auth data), the presence sidebar would crash with `TypeError: undefined is not an object (evaluating 'user.userName.charAt')`.

**Root Cause:** Direct access to `userName.charAt(0)` without checking if `userName` exists first.

**Solution:** Added defensive fallbacks in `PresenceSidebar.jsx`:

```javascript
// User avatar with fallback
<div
  className="user-indicator"
  style={{ backgroundColor: userColor }}
  title={user.userName || 'Anonymous'}
>
  {(user.userName || 'A').charAt(0).toUpperCase()}
</div>

// User name display with fallback
<div className="user-name">
  {user.userName || 'Anonymous'}
  {isCurrentUser && <span className="you-label">(you)</span>}
</div>
```

**Result:**
- ✅ No crashes when userName is undefined
- ✅ Shows "Anonymous" as fallback name
- ✅ Shows "A" as fallback avatar initial
- ✅ Improved robustness of presence system

**When This Occurs:**
- Firebase auth data incomplete
- User object created before displayName set
- Race condition during authentication
- Network issues during user profile fetch

---

For setup instructions, see [SETUP.md](./SETUP.md)  
For feature documentation, see [FEATURES.md](./FEATURES.md)  
For implementation history, see [CHANGELOG.md](./CHANGELOG.md)

