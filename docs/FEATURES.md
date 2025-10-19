# CollabCanvas Features Documentation

Complete guide to all features in CollabCanvas.

---

## Table of Contents
1. [Core Canvas Features](#core-canvas-features)
2. [Drawing Tools](#drawing-tools)
3. [Multi-Canvas System](#multi-canvas-system)
4. [Canny AI Assistant](#canny-ai-assistant)
5. [Collaboration Features](#collaboration-features)
6. [User Interface](#user-interface)

---

## Core Canvas Features

### Pan and Zoom
- **Pan**: Hold `Shift`, `Cmd`, or `Ctrl` and drag to move around the canvas
- **Zoom**: Scroll wheel to zoom in/out
- **Zoom Controls**: Bottom-right corner for precise zoom control
  - Zoom In/Out buttons
  - Manual zoom percentage input
  - Fit Canvas button (shows entire canvas)

### Infinite Canvas
- Canvas extends infinitely in all directions
- Viewport culling optimizes performance (only visible shapes render)
- Grid background for spatial reference
- Customizable canvas background color

### Object Manipulation
- **Select**: Click to select shapes
- **Multi-Select**: Drag selection rectangle to select multiple shapes
- **Move**: Drag selected shapes to reposition
- **Resize**: Drag selection handles to resize
- **Rotate**: Use rotation handle above selected shapes
- **Delete**: Press `Delete` or `Backspace` to remove selected shapes
- **Duplicate**: Use duplicate button in tool palette

### Undo/Redo
- Full history tracking of all changes
- Undo: `Cmd+Z` / `Ctrl+Z`
- Redo: `Cmd+Shift+Z` / `Ctrl+Shift+Z`

---

## Drawing Tools

Located in the left sidebar tool palette:

### SELECT Tool (Cursor Icon)
- Default tool for selecting and manipulating objects
- Click to select individual shapes
- Drag to create selection rectangle for multi-select

### RECTANGLE Tool
- Click and drag to create rectangles
- Customizable fill color, border, and size
- Supports rotation and resizing after creation

### CIRCLE Tool
- Click and drag to create circles
- Radius adjusts based on drag distance
- Supports all standard manipulations

### POLYGON Tool (Pentagon)
- Click and drag to create regular pentagons
- Can be resized to create larger/smaller polygons
- Supports rotation

### CUSTOM POLYGON Tool
- Click multiple points to define custom polygon vertices
- Press `Enter` to finish and close the polygon
- Press `Escape` to cancel
- Great for creating irregular shapes

### TEXT Tool
- Click to place text boxes on canvas
- Double-click to edit text
- Customizable font size, weight, style, and color
- **Advanced Color Picker**:
  - Gradient color wheel for any color
  - Preset color swatches
  - Recent colors memory
  - Hex input for precise colors

### IMAGE Tool
- Upload images (JPEG, PNG, GIF, WebP)
- Images are resizable and rotatable
- Maintain aspect ratio
- Positioned and manipulated like any other shape

---

## Multi-Canvas System

### Canvas Management

#### Create Canvas
- Click "New Canvas" on dashboard
- Canvases are private by default
- Each canvas has a unique URL

#### Canvas List
- **List View**: Detailed view with metadata
- **Grid View**: Visual thumbnail preview
- **Sort Options**: Last accessed, name, date created
- **Filter**: All, owned, shared
- **Search**: Find canvases by name
- **Star**: Mark favorites (appear at top)

#### Canvas Limits
- Free tier: 10 canvases per user
- Upgrade prompt when limit reached
- Shared canvases don't count toward your limit

### Collaboration & Sharing

#### Roles
- **Owner**: Full control, can delete canvas
- **Editor**: Can edit and invite others
- **Viewer**: Read-only access

#### Share Methods

**1. Share Link**
- Click "Share" button
- Choose "Viewer" or "Editor" access
- Copy link and send to collaborators
- Anyone with link can access (must be signed in)

**2. Email Invitation**
- Click "Share" > "Invite by Email"
- Enter email address
- Choose "Viewer" or "Editor" role
- Recipient receives email with access link
- Powered by SendGrid

#### Collaborator Management
- View all collaborators in canvas settings
- Change roles (viewer ↔ editor)
- Remove collaborators
- See who's currently active (presence indicator)

### Canvas Settings
- **Name**: Rename canvas
- **Background Color**: Customize canvas background
  - Grid color auto-adjusts for contrast
  - Dark grid on light backgrounds
  - Light grid on dark backgrounds
- **Collaborators**: Manage access
- **Duplicate**: Create copy of canvas with all objects
- **Delete**: Remove canvas (owner only)

---

## Canny AI Assistant

Canny is your AI-powered canvas assistant with vision capabilities.

### Access
- Click "Chat" button at bottom-center of canvas
- Resizable chat panel (drag left edge to resize)
- Two tabs: "Users" (canvas chat) and "Canny" (AI assistant)

### Capabilities

#### 1. Canvas Manipulation
Canny can create, arrange, and modify shapes on your canvas.

**Create Shapes**
- "Create 5 blue rectangles"
- "Add 3 red circles in a row"
- "Make a text box that says Hello"
- Shapes appear in your current viewport (where you're looking)

**Arrange Shapes**
- "Align these shapes to the left"
- "Distribute them horizontally"
- "Arrange in a 2x3 grid"
- "Center everything on the canvas"

**Modify Shapes**
- "Make them all green"
- "Rotate selected shapes 45 degrees"
- "Increase the size by 50%"
- "Change opacity to 50%"

**Delete Shapes**
- "Delete all shapes"
- "Remove the selected shapes"
- "Clear the canvas"

#### 2. Vision Capabilities
Canny can SEE your canvas using GPT-4 Vision!

**Automatic Vision Activation**
Vision triggers when you use phrases like:
- "What colors am I using?"
- "Create rectangles around the blue circle"
- "Fill the empty space"
- "Match the pattern on the left"
- "Describe what you see"

Visual indicator shows when Canny is analyzing the canvas.

**Smart Context Understanding**
- Understands spatial relationships ("left of", "above", "around")
- Respects existing designs when adding elements
- Considers color harmony and visual balance
- Can count objects, identify colors, and describe layouts

#### 3. Interactive Features

**Example Prompts**
Quick-start prompts in 5 categories:
- 🎨 Create: Shape creation examples
- 📐 Arrange: Layout examples  
- 👁️ Vision: Visual analysis examples
- ✨ Transform: Modification examples
- ❓ Ask: Question examples

**Stop Button**
- Appears during active requests
- Click to abort long-running operations
- Prevents runaway shape generation

**Guardrails**
- Message length limit: 2000 characters
- Rate limiting: 2 seconds between requests
- Shape creation limits:
  - Max 50 shapes per request
  - Max 1000 shapes on canvas
- Context management: Last 15 messages only

### Best Practices
- Be specific in your requests
- Use vision for spatial tasks ("near the circle")
- Combine operations ("create and arrange")
- Use stop button if things go wrong
- Start with example prompts to learn

---

## Collaboration Features

### Real-Time Multiplayer
- See other users' cursors in real-time
- Colored cursor with user name
- Updates 60 times per second for smooth motion

### Presence Awareness
- **Presence Sidebar** (right side)
  - Shows all active users
  - User avatars with initials
  - Online/away status indicators
  - See yourself marked as "(you)"
- **Minimized Tab** when closed
  - Shows active user count
  - Click to expand

### Object Locking
- Automatic locking when user manipulates an object
- Lock icon appears on locked objects
- Locked by username shown
- Prevents concurrent edits
- **Stale Lock Cleanup**: Locks auto-release when users disconnect

### Canvas Chat
- Real-time chat with all collaborators on the canvas
- Each user has a unique color
- Usernames displayed with messages
- See who's actively chatting
- Separate from Canny AI chat

---

## User Interface

### Theme System
- **Light Theme** (default): Clean, professional appearance
- **Dark Theme**: Easy on the eyes for low-light work
- **System Theme**: Follows OS preference
- Smooth theme transitions
- Settings accessible from ⚙️ button

### Tool Palette (Left Side)
- Icon-only design for compact view
- Tooltips on hover show tool names
- Active tool highlighted in blue
- Action buttons:
  - 🎲 Generate: Create test shapes (performance testing)
  - 📋 Duplicate: Copy selected shapes
  - 🗑️ Clear: Delete all shapes

### Zoom Controls (Bottom-Right)
- Horizontal layout for compact design
- Zoom in/out buttons
- Manual percentage input
- Fit canvas button (⤢ icon)
- Responsive on mobile

### Canvas Header (Top)
- Canvas name (click to rename)
- Object count and FPS display
- User avatar with name
- Settings button (⚙️)
- Sign out button

### Dashboard
- Clean card-based layout
- Quick actions on each card:
  - ⭐ Star/unstar canvas
  - ⋮ Menu (rename, duplicate, delete, settings)
- View toggle (list/grid)
- Sort and filter controls
- Search bar
- User info in top-right
- Settings and sign out

### Keyboard Shortcuts
- `Shift/Cmd/Ctrl + Drag`: Pan canvas
- `Scroll`: Zoom in/out
- `Delete/Backspace`: Delete selected shapes
- `Cmd+Z / Ctrl+Z`: Undo
- `Cmd+Shift+Z / Ctrl+Shift+Z`: Redo
- `Escape`: Cancel custom polygon drawing
- `Enter`: Finish custom polygon
- `Double-Click`: Edit text

### Performance Features
- **Viewport Culling**: Only renders visible shapes
- **Optimistic Updates**: Smooth interaction before server confirms
- **Throttled Sync**: Reduces database writes during rapid changes
- **FPS Counter**: Monitor performance in real-time
- Handles 1000+ shapes smoothly

---

## Upcoming Features

Based on the PRD, features in development or planned:
- **Version History**: Time-travel through canvas changes
- **Comments**: Add annotations and discussions
- **Export**: Download as PNG, SVG, or PDF
- **Templates**: Start from pre-made designs
- **Plugins/Extensions**: Extend functionality
- **Mobile Apps**: Native iOS/Android versions

---

For setup instructions, see [SETUP.md](./SETUP.md)  
For technical details, see [TECHNICAL.md](./TECHNICAL.md)  
For implementation history, see [CHANGELOG.md](./CHANGELOG.md)

