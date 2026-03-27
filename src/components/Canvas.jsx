/**
 * XSS / Sanitization Note:
 * All user-generated text is rendered through React's JSX escaping (TextBox, ChatPanel, etc.),
 * which safely encodes HTML entities. SVG <text> elements do not interpret HTML markup.
 * There is no use of dangerouslySetInnerHTML anywhere in this codebase.
 * If future features require rendering raw HTML (e.g., rich text), add DOMPurify sanitization.
 */
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  MIN_ZOOM,
  MAX_ZOOM,
  GRID_SIZE,
  BOUNDARY_COLOR,
  BOUNDARY_WIDTH,
  SHOW_FPS_COUNTER,
  FPS_UPDATE_INTERVAL,
  MIN_RECTANGLE_SIZE,
  MIN_CIRCLE_RADIUS,
  MIN_POLYGON_RADIUS,
  CURSOR_UPDATE_THROTTLE,
  DRAG_UPDATE_THROTTLE,
  SHAPE_TYPES,
  TOOL_TYPES,
  DEFAULT_POLYGON_SIDES,
  AUTO_LOGOUT_TIMEOUT,
  DEFAULT_CANVAS_ID,
  PAN_PADDING_PERCENT,
} from '../utils/constants';
import {
  screenToCanvas,
  clampPanOffset,
  clamp,
  calculateFPS,
  constrainRectangle,
  constrainCircle,
} from '../utils/canvasUtils';
import {
  testFirestoreConnection,
  createShape,
  updateShape,
  batchUpdateShapes,
  deleteShape,
  updateCursor,
  removeCursor,
  updatePresenceHeartbeat,
  getUserRole,
} from '../services/canvasService';
import { uploadImage } from '../services/imageService';
import { startLockCleanup } from '../services/lockCleanupService';
import { reportError } from '../utils/errorHandler';
import { useCanvas } from '../hooks/useCanvas';
import { useCursors } from '../hooks/useCursors';
import { useAuth } from '../hooks/useAuth';
import { useHistory } from '../hooks/useHistory';
import { useViewport } from '../hooks/useViewport';
import { useCustomPolygon } from '../hooks/useCustomPolygon';
import { useSelection } from '../hooks/useSelection';
import { useCanvasClipboard } from '../hooks/useCanvasClipboard';
import { useShapeDrawing } from '../hooks/useShapeDrawing';
import { useShapeTransform } from '../hooks/useShapeTransform';
import { useCanvasKeyboard } from '../hooks/useCanvasKeyboard';
import { getRandomColor, getGridColor } from '../utils/colorUtils';
import { setup500Test, generateTestShapes } from '../utils/testData';
import { executeCanvasTool } from '../utils/canvasTools';
import Cursor from './Cursor';
import ShapePalette from './ShapePalette';
import SelectionBox from './SelectionBox';
import ZoomControls from './ZoomControls';
import ChatPanel from './ChatPanel';
import InlineTextEditor from './InlineTextEditor';
import ContextMenu from './ContextMenu';
import DebugPanel from './DebugPanel';
import LayersPanel from './LayersPanel';
import ShapeRenderer from './ShapeRenderer';
import MultiSelectionBox from './MultiSelectionBox';
import ShapePreview from './ShapePreview';
import CustomPolygonPreview from './CustomPolygonPreview';
import styles from './Canvas.module.css';

/**
 * Canvas component — SVG-based collaborative canvas with pan and zoom.
 * Wires together extracted hooks and renders the UI shell.
 */
function Canvas({
  sessionId,
  onlineUsersCount = 0,
  canvasId = DEFAULT_CANVAS_ID,
  backgroundColor = '#1a1a1a',
  gridVisible = false,
}) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);

  // ----- Core state hooks -----
  const { user, signOut } = useAuth();
  const {
    shapes,
    setShapes,
    selectedShapeId,
    selectShape,
    deselectShape,
    loading: canvasLoading,
    error: canvasError,
    connectionStatus,
    setIsDraggingLocal,
    notifyFirestoreActivity,
    setBatchDeleting,
  } = useCanvas(user?.uid, user?.displayName, canvasId);
  const { cursors } = useCursors(sessionId, canvasId);
  const { recordAction, popUndo, popRedo } = useHistory();

  // User role
  const [userRole, setUserRole] = useState(null);

  // Selected drawing tool
  const [selectedTool, setSelectedTool] = useState(TOOL_TYPES.SELECT);

  // Text editing
  const [editingTextId, setEditingTextId] = useState(null);
  const [editingText, setEditingText] = useState('');

  // Context menu
  const [contextMenu, setContextMenu] = useState(null);

  // Layers panel
  const [isLayersPanelOpen, setIsLayersPanelOpen] = useState(false);

  // FPS & performance
  const [fps, setFps] = useState(0);
  const [renderTime, setRenderTime] = useState(0);
  const frameTimesRef = useRef([]);
  const lastFpsUpdateRef = useRef(Date.now());
  const renderStartRef = useRef(Date.now());

  // Firestore connection
  const [firestoreStatus, setFirestoreStatus] = useState('testing');

  // Cursor tracking
  const lastCursorUpdate = useRef(0);
  const cursorArrivalTime = useRef(Date.now());
  const lastDragUpdate = useRef(0);

  // Activity tracking
  const lastActivityRef = useRef(Date.now());
  const activityThrottleRef = useRef(null);

  // File input ref
  const fileInputRef = useRef(null);

  // ----- Extracted hooks -----
  const {
    viewport,
    setViewport,
    isPanning,
    setIsPanning,
    panStart,
    setPanStart,
    panOffset,
    setPanOffset,
    containerSize,
    viewBox,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
    handleZoomSet,
    handleFitCanvas,
  } = useViewport(svgRef, containerRef);

  const {
    isDrawingCustomPolygon,
    setIsDrawingCustomPolygon,
    customPolygonVertices,
    setCustomPolygonVertices,
    handleFinishCustomPolygon,
  } = useCustomPolygon({
    user,
    canvasId,
    recordAction,
    notifyFirestoreActivity,
    setSelectedTool,
  });

  const {
    selectedShapeIds,
    setSelectedShapeIds,
    isSelecting,
    setIsSelecting,
    selectStart,
    setSelectStart,
    selectCurrent,
    setSelectCurrent,
    resolveSelection,
  } = useSelection();

  const {
    isDrawing,
    setIsDrawing,
    drawStart,
    setDrawStart,
    drawCurrent,
    setDrawCurrent,
    previewRect,
  } = useShapeDrawing();

  const { clipboard, setClipboard } = useCanvasClipboard({
    user,
    canvasId,
    viewport,
    containerSize,
    recordAction,
    notifyFirestoreActivity,
  });

  const transform = useShapeTransform({
    svgRef,
    shapes,
    user,
    selectedShapeId,
    selectedShapeIds,
    selectShape,
    viewport,
    setIsDraggingLocal,
    userRole,
    trackActivity: useCallback(() => {
      const now = Date.now();
      lastActivityRef.current = now;
      if (activityThrottleRef.current) return;
      activityThrottleRef.current = setTimeout(() => {
        activityThrottleRef.current = null;
      }, 3000);
      if (sessionId) {
        updatePresenceHeartbeat(undefined, sessionId, true).catch((err) =>
          reportError(err, { component: 'Canvas', action: 'presenceHeartbeat' })
        );
      }
    }, [sessionId]),
  });

  const {
    isDragging,
    setIsDragging,
    dragStart,
    setDragStart,
    dragOffset: _dragOffset,
    setDragOffset,
    draggedShapeIds,
    setDraggedShapeIds,
    dragInitialPositions,
    setDragInitialPositions,
    isResizing,
    setIsResizing,
    resizeHandle,
    setResizeHandle,
    resizeStart: _resizeStart,
    setResizeStart,
    resizeInitial,
    setResizeInitial,
    isRotating,
    setIsRotating,
    rotateStart,
    setRotateStart,
    rotateInitial,
    setRotateInitial,
    didInteractRef,
    handleShapeMouseDown,
    handleResizeStart,
    handleRotateStart,
  } = transform;

  // Stable trackActivity reference for other callbacks
  const trackActivity = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    if (activityThrottleRef.current) return;
    activityThrottleRef.current = setTimeout(() => {
      activityThrottleRef.current = null;
    }, 3000);
    if (sessionId) {
      updatePresenceHeartbeat(undefined, sessionId, true).catch((err) =>
        reportError(err, { component: 'Canvas', action: 'presenceHeartbeat' })
      );
    }
  }, [sessionId]);

  // ----- Effects -----

  // Auto-logout after inactivity
  useEffect(() => {
    if (!user) return;
    const checkInactivity = () => {
      if (Date.now() - lastActivityRef.current >= AUTO_LOGOUT_TIMEOUT) {
        signOut().catch((err) => reportError(err, { component: 'Canvas', action: 'autoLogout' }));
      }
    };
    const intervalId = setInterval(checkInactivity, 60000);
    return () => clearInterval(intervalId);
  }, [user, signOut]);

  // Get user role
  useEffect(() => {
    if (!user?.uid || !canvasId) return;
    getUserRole(canvasId, user.uid).then(setUserRole);
  }, [user?.uid, canvasId]);

  // canEdit used by child components via userRole prop

  // Test Firestore connection
  useEffect(() => {
    testFirestoreConnection().then((ok) => setFirestoreStatus(ok ? 'connected' : 'error'));
  }, []);

  // Lock cleanup service
  useEffect(() => {
    if (!canvasId) return;
    const stopCleanup = startLockCleanup(canvasId);
    return () => stopCleanup();
  }, [canvasId]);

  // Debug helpers (dev only)
  useEffect(() => {
    if (SHOW_FPS_COUNTER && user?.uid) setup500Test(user.uid);
  }, [user?.uid]);

  // FPS monitoring
  useEffect(() => {
    if (!SHOW_FPS_COUNTER) return;
    let id;
    const update = (ts) => {
      const currentRenderTime = performance.now() - renderStartRef.current;
      frameTimesRef.current.push(ts);
      frameTimesRef.current = frameTimesRef.current.filter((t) => t > ts - 1000);
      if (ts - lastFpsUpdateRef.current > FPS_UPDATE_INTERVAL) {
        setFps(calculateFPS(frameTimesRef.current));
        setRenderTime(Math.round(currentRenderTime * 100) / 100);
        lastFpsUpdateRef.current = ts;
      }
      renderStartRef.current = performance.now();
      id = requestAnimationFrame(update);
    };
    id = requestAnimationFrame(update);
    return () => cancelAnimationFrame(id);
  }, []);

  // ----- Handlers -----

  const handleShapeClick = useCallback(() => {}, []);

  // Handle send to front / back
  const handleSendToFront = useCallback(async () => {
    if (!user || (!selectedShapeId && selectedShapeIds.length === 0)) return;
    const ids = selectedShapeIds.length > 0 ? selectedShapeIds : [selectedShapeId];
    const maxZ = shapes.length > 0 ? Math.max(...shapes.map((s) => s.zIndex || 0)) : 0;
    try {
      for (const id of ids) await updateShape(canvasId, id, { zIndex: maxZ + 1 });
      notifyFirestoreActivity();
    } catch (error) {
      reportError(error, { component: 'Canvas', action: 'handleSendToFront' });
    }
  }, [user, selectedShapeId, selectedShapeIds, shapes, canvasId, notifyFirestoreActivity]);

  const handleSendToBack = useCallback(async () => {
    if (!user || (!selectedShapeId && selectedShapeIds.length === 0)) return;
    const ids = selectedShapeIds.length > 0 ? selectedShapeIds : [selectedShapeId];
    const minZ = shapes.length > 0 ? Math.min(...shapes.map((s) => s.zIndex || 0)) : 0;
    try {
      for (const id of ids) await updateShape(canvasId, id, { zIndex: minZ - 1 });
      notifyFirestoreActivity();
    } catch (error) {
      reportError(error, { component: 'Canvas', action: 'handleSendToBack' });
    }
  }, [user, selectedShapeId, selectedShapeIds, shapes, canvasId, notifyFirestoreActivity]);

  // Visibility toggle (layers)
  const handleToggleVisibility = useCallback(
    async (shapeId) => {
      if (!user || userRole === 'viewer') return;
      const shape = shapes.find((s) => s.id === shapeId);
      if (!shape) return;
      try {
        await updateShape(canvasId, shapeId, { visible: shape.visible === false });
        notifyFirestoreActivity();
      } catch (error) {
        reportError(error, { component: 'Canvas', action: 'toggleVisibility' });
      }
    },
    [user, userRole, shapes, canvasId, notifyFirestoreActivity]
  );

  const handleRenameShape = useCallback(
    async (shapeId, newName) => {
      if (!user || userRole === 'viewer') return;
      try {
        await updateShape(canvasId, shapeId, { name: newName });
        notifyFirestoreActivity();
      } catch (error) {
        reportError(error, { component: 'Canvas', action: 'renameShape' });
      }
    },
    [user, userRole, canvasId, notifyFirestoreActivity]
  );

  // Clear all shapes
  const handleClearAll = useCallback(async () => {
    if (!user) return;
    const confirmed = window.confirm(
      `Are you sure you want to delete ALL ${shapes.length} shapes?\n\nThis action cannot be undone!`
    );
    if (!confirmed) return;

    try {
      const deletableShapes = shapes.filter((s) => !s.lockedBy || s.lockedBy === user.uid);
      if (deletableShapes.length === 0) {
        alert('All shapes are locked by other users.');
        return;
      }

      if (deletableShapes.length < shapes.length) {
        const proceed = window.confirm(
          `${shapes.length - deletableShapes.length} shape(s) are locked. Delete the remaining ${deletableShapes.length}?`
        );
        if (!proceed) return;
      }

      deselectShape();
      setSelectedShapeIds([]);
      setBatchDeleting(true);

      const batchSize = 25;
      for (let i = 0; i < deletableShapes.length; i += batchSize) {
        const batch = deletableShapes.slice(i, i + batchSize);
        await Promise.allSettled(batch.map((s) => deleteShape(canvasId, s.id)));
      }

      setTimeout(() => setBatchDeleting(false), 1000);
      notifyFirestoreActivity();
    } catch (error) {
      reportError(error, { component: 'Canvas', action: 'clearAll' });
      setBatchDeleting(false);
    }
  }, [
    shapes,
    user,
    deselectShape,
    setSelectedShapeIds,
    notifyFirestoreActivity,
    setBatchDeleting,
    canvasId,
  ]);

  // Duplicate
  const handleDuplicate = useCallback(async () => {
    if (!user || userRole === 'viewer') return;
    if (!selectedShapeId && selectedShapeIds.length === 0) return;

    const shapesToDuplicate = selectedShapeIds.length > 0 ? selectedShapeIds : [selectedShapeId];
    try {
      const newIds = [];
      if (selectedShapeId) await deselectShape();
      setSelectedShapeIds([]);

      for (const shapeId of shapesToDuplicate) {
        const shape = shapes.find((s) => s.id === shapeId);
        if (!shape) continue;
        const dup = {
          ...shape,
          x: shape.x + 20,
          y: shape.y + 20,
          createdBy: user.uid,
          lockedBy: null,
          lockedByUserName: null,
        };
        delete dup.id;
        delete dup.timestamp;
        const newId = await createShape(canvasId, dup);
        newIds.push(newId);
      }

      if (newIds.length === 1) setTimeout(() => selectShape(newIds[0]), 100);
      else setTimeout(() => setSelectedShapeIds(newIds), 100);
      notifyFirestoreActivity();
    } catch (error) {
      reportError(error, { component: 'Canvas', action: 'duplicateShapes' });
    }
  }, [
    selectedShapeId,
    selectedShapeIds,
    shapes,
    user,
    deselectShape,
    selectShape,
    canvasId,
    notifyFirestoreActivity,
    userRole,
    setSelectedShapeIds,
  ]);

  // Align
  const handleAlign = useCallback(
    (alignment) => {
      if (!user || userRole === 'viewer') return;
      if (!selectedShapeId && selectedShapeIds.length === 0) return;

      const context = {
        shapes,
        selectedShapeIds:
          selectedShapeIds.length > 0 ? selectedShapeIds : selectedShapeId ? [selectedShapeId] : [],
        updateShape: (id, updates) => updateShape(canvasId, id, updates),
        batchUpdateShapes: (updates) => batchUpdateShapes(canvasId, updates),
        canvasId,
        userId: user.uid,
        viewport,
      };
      const result = executeCanvasTool('alignShapes', { alignment, useSelected: true }, context);
      if (result.success) notifyFirestoreActivity();
    },
    [
      user,
      canvasId,
      shapes,
      selectedShapeId,
      selectedShapeIds,
      viewport,
      userRole,
      notifyFirestoreActivity,
    ]
  );

  // Canny AI wrappers
  const handleCreateShapeForCanny = useCallback(
    (shapeData) => {
      if (!user || !canvasId) return null;
      try {
        const shape = {
          ...shapeData,
          id: `${user.uid}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdBy: user.uid,
          timestamp: Date.now(),
          rotation: shapeData.rotation || 0,
          zIndex: Date.now(),
        };
        createShape(canvasId, shape);
        return shape;
      } catch (error) {
        reportError(error, { component: 'Canvas', action: 'cannyCreateShape' });
        return null;
      }
    },
    [user, canvasId]
  );

  const handleUpdateShapeForCanny = useCallback(
    (shapeId, updates) => {
      if (!canvasId) return false;
      try {
        updateShape(canvasId, shapeId, updates);
        return true;
      } catch (error) {
        reportError(error, { component: 'Canvas', action: 'cannyUpdateShape' });
        return false;
      }
    },
    [canvasId]
  );

  const handleBatchUpdateShapesForCanny = useCallback(
    (updates) => {
      if (!canvasId) return false;
      try {
        batchUpdateShapes(canvasId, updates);
        return true;
      } catch (error) {
        reportError(error, { component: 'Canvas', action: 'cannyBatchUpdateShapes' });
        return false;
      }
    },
    [canvasId]
  );

  const handleDeleteShapeForCanny = useCallback(
    (shapeId) => {
      if (!canvasId) return false;
      try {
        deleteShape(canvasId, shapeId);
        return true;
      } catch (error) {
        reportError(error, { component: 'Canvas', action: 'cannyDeleteShape' });
        return false;
      }
    },
    [canvasId]
  );

  // Generate test shapes
  const handleGenerate500 = useCallback(async () => {
    if (!user) return;
    try {
      await generateTestShapes(10, user.uid, canvasId);
      notifyFirestoreActivity();
    } catch (error) {
      reportError(error, { component: 'Canvas', action: 'generateShapes' });
    }
  }, [user, notifyFirestoreActivity, canvasId]);

  // Image upload
  const handleImageUpload = useCallback(() => {
    if (!user) return;
    fileInputRef.current?.click();
  }, [user]);

  const handleFileChange = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      if (!file || !user) return;
      try {
        const { url, width, height } = await uploadImage(file, user.uid);
        const viewportCenterX = -viewport.offsetX + containerSize.width / 2 / viewport.zoom;
        const viewportCenterY = -viewport.offsetY + containerSize.height / 2 / viewport.zoom;
        const imageData = {
          type: SHAPE_TYPES.IMAGE,
          x: viewportCenterX,
          y: viewportCenterY,
          width,
          height,
          imageUrl: url,
          color: getRandomColor(user.uid),
          createdBy: user.uid,
          rotation: 0,
          zIndex: Date.now(),
        };
        const shapeId = await createShape(canvasId, imageData);
        recordAction({ type: 'create', shapeId, shapeData: imageData });
        notifyFirestoreActivity();
      } catch (error) {
        reportError(error, { component: 'Canvas', action: 'uploadImage' });
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [user, viewport, containerSize, canvasId, recordAction, notifyFirestoreActivity]
  );

  // ----- Mouse handlers (handleCanvasMouseDown, handleMouseMove, handleMouseUp) -----

  const handleCanvasMouseDown = useCallback(
    (e) => {
      if (e.button !== 0 || !svgRef.current) return;
      if (contextMenu) setContextMenu(null);
      trackActivity();

      const rect = svgRef.current.getBoundingClientRect();
      const canvasPos = screenToCanvas(e.clientX, e.clientY, viewport, rect);
      const shouldPan = e.shiftKey || e.metaKey || e.ctrlKey;

      if (shouldPan) {
        setIsPanning(true);
        setPanStart({ x: e.clientX, y: e.clientY });
        setPanOffset({ x: viewport.offsetX, y: viewport.offsetY });
      } else if (selectedTool === TOOL_TYPES.CUSTOM_POLYGON) {
        if (userRole === 'viewer') return;
        e.preventDefault();

        if (!isDrawingCustomPolygon) {
          setIsDrawingCustomPolygon(true);
          setCustomPolygonVertices([canvasPos]);
          deselectShape();
          setSelectedShapeIds([]);
        } else {
          const firstVertex = customPolygonVertices[0];
          const dist = Math.sqrt(
            Math.pow(canvasPos.x - firstVertex.x, 2) + Math.pow(canvasPos.y - firstVertex.y, 2)
          );
          if (customPolygonVertices.length >= 3 && dist < 20) {
            handleFinishCustomPolygon();
          } else {
            setCustomPolygonVertices((prev) => [...prev, canvasPos]);
          }
        }
      } else if (selectedTool === TOOL_TYPES.SELECT) {
        setIsSelecting(true);
        setSelectStart(canvasPos);
        setSelectCurrent(canvasPos);
      } else {
        if (userRole === 'viewer') return;
        deselectShape();
        setSelectedShapeIds([]);
        setIsDrawing(true);
        setDrawStart(canvasPos);
        setDrawCurrent(canvasPos);
      }

      e.preventDefault();
    },
    [
      viewport,
      selectedTool,
      deselectShape,
      isDrawingCustomPolygon,
      customPolygonVertices,
      trackActivity,
      userRole,
      contextMenu,
      setIsPanning,
      setPanStart,
      setPanOffset,
      setIsDrawingCustomPolygon,
      setCustomPolygonVertices,
      handleFinishCustomPolygon,
      setIsSelecting,
      setSelectStart,
      setSelectCurrent,
      setSelectedShapeIds,
      setIsDrawing,
      setDrawStart,
      setDrawCurrent,
    ]
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (isDragging || isResizing || isRotating || isPanning || isDrawing || isSelecting) {
        trackActivity();
      }

      // Cursor tracking for multiplayer
      if (svgRef.current && user && (isDragging || isResizing || isRotating)) {
        const now = Date.now();
        if (now - lastCursorUpdate.current > CURSOR_UPDATE_THROTTLE) {
          const rect = svgRef.current.getBoundingClientRect();
          const pos = screenToCanvas(e.clientX, e.clientY, viewport, rect);
          updateCursor(
            canvasId,
            sessionId,
            user.uid,
            pos.x,
            pos.y,
            user.displayName,
            cursorArrivalTime.current,
            true
          )
            .then(() => notifyFirestoreActivity())
            .catch((err) => reportError(err, { component: 'Canvas' }));
          lastCursorUpdate.current = now;
        }
      }

      if (isPanning) {
        const dx = e.clientX - panStart.x;
        const dy = e.clientY - panStart.y;
        const clamped = clampPanOffset(
          panOffset.x - dx / viewport.zoom,
          panOffset.y - dy / viewport.zoom,
          viewport.zoom,
          containerSize.width,
          containerSize.height,
          CANVAS_WIDTH,
          CANVAS_HEIGHT,
          PAN_PADDING_PERCENT
        );
        setViewport((prev) => ({ ...prev, offsetX: clamped.offsetX, offsetY: clamped.offsetY }));
      } else if (isSelecting && svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        setSelectCurrent(screenToCanvas(e.clientX, e.clientY, viewport, rect));
      } else if (isDrawing && svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        setDrawCurrent(screenToCanvas(e.clientX, e.clientY, viewport, rect));
      } else if (isDragging && svgRef.current && (selectedShapeId || draggedShapeIds.length > 0)) {
        const rect = svgRef.current.getBoundingClientRect();
        const canvasPos = screenToCanvas(e.clientX, e.clientY, viewport, rect);
        const dx = canvasPos.x - dragStart.x;
        const dy = canvasPos.y - dragStart.y;
        didInteractRef.current = true;

        setShapes((prev) =>
          prev.map((r) => {
            if (!draggedShapeIds.includes(r.id)) return r;
            const initial = dragInitialPositions[r.id];
            if (!initial) return r;

            if (r.type === SHAPE_TYPES.CUSTOM_POLYGON) {
              const verts = (initial.vertices || r.vertices).map((v) => ({
                x: clamp(v.x + dx, 0, CANVAS_WIDTH),
                y: clamp(v.y + dy, 0, CANVAS_HEIGHT),
              }));
              return { ...r, vertices: verts };
            }

            let newX = initial.x + dx;
            let newY = initial.y + dy;

            if (r.type === SHAPE_TYPES.RECTANGLE || r.type === SHAPE_TYPES.TEXT) {
              const c = constrainRectangle(
                newX,
                newY,
                r.width,
                r.height,
                CANVAS_WIDTH,
                CANVAS_HEIGHT
              );
              newX = c.x;
              newY = c.y;
            } else if (r.type === SHAPE_TYPES.IMAGE) {
              const c = constrainRectangle(
                newX - r.width / 2,
                newY - r.height / 2,
                r.width,
                r.height,
                CANVAS_WIDTH,
                CANVAS_HEIGHT
              );
              newX = c.x + r.width / 2;
              newY = c.y + r.height / 2;
            } else if (r.type === SHAPE_TYPES.CIRCLE || r.type === SHAPE_TYPES.POLYGON) {
              const c = constrainCircle(newX, newY, r.radius, CANVAS_WIDTH, CANVAS_HEIGHT);
              newX = c.x;
              newY = c.y;
            }

            return { ...r, x: newX, y: newY };
          })
        );

        // Throttled Firestore sync during drag
        const now = Date.now();
        if (now - lastDragUpdate.current > DRAG_UPDATE_THROTTLE) {
          draggedShapeIds.forEach((id) => {
            const shape = shapes.find((s) => s.id === id);
            const initial = dragInitialPositions[id];
            if (!shape || !initial) return;

            if (shape.type === SHAPE_TYPES.CUSTOM_POLYGON) {
              const verts = (initial.vertices || shape.vertices).map((v) => ({
                x: clamp(v.x + dx, 0, CANVAS_WIDTH),
                y: clamp(v.y + dy, 0, CANVAS_HEIGHT),
              }));
              updateShape(canvasId, id, { vertices: verts }).catch((err) =>
                reportError(err, { component: 'Canvas' })
              );
            } else {
              let nx = initial.x + dx,
                ny = initial.y + dy;
              if (shape.type === SHAPE_TYPES.RECTANGLE || shape.type === SHAPE_TYPES.TEXT) {
                const c = constrainRectangle(
                  nx,
                  ny,
                  shape.width,
                  shape.height,
                  CANVAS_WIDTH,
                  CANVAS_HEIGHT
                );
                nx = c.x;
                ny = c.y;
              } else if (shape.type === SHAPE_TYPES.IMAGE) {
                const c = constrainRectangle(
                  nx - shape.width / 2,
                  ny - shape.height / 2,
                  shape.width,
                  shape.height,
                  CANVAS_WIDTH,
                  CANVAS_HEIGHT
                );
                nx = c.x + shape.width / 2;
                ny = c.y + shape.height / 2;
              } else if (shape.type === SHAPE_TYPES.CIRCLE || shape.type === SHAPE_TYPES.POLYGON) {
                const c = constrainCircle(nx, ny, shape.radius, CANVAS_WIDTH, CANVAS_HEIGHT);
                nx = c.x;
                ny = c.y;
              }
              updateShape(canvasId, id, { x: nx, y: ny }).catch((err) =>
                reportError(err, { component: 'Canvas' })
              );
            }
          });
          lastDragUpdate.current = now;
        }
      } else if (isResizing && svgRef.current && selectedShapeId && resizeInitial) {
        const rect = svgRef.current.getBoundingClientRect();
        const canvasPos = screenToCanvas(e.clientX, e.clientY, viewport, rect);
        let updates = {};

        if (
          resizeInitial.type === SHAPE_TYPES.RECTANGLE ||
          resizeInitial.type === SHAPE_TYPES.TEXT ||
          resizeInitial.type === SHAPE_TYPES.IMAGE
        ) {
          const { x, y, width, height } = resizeInitial;
          const centerX = resizeInitial.type === SHAPE_TYPES.IMAGE ? x : x + width / 2;
          const centerY = resizeInitial.type === SHAPE_TYPES.IMAGE ? y : y + height / 2;
          const distX = Math.abs(canvasPos.x - centerX);
          const distY = Math.abs(canvasPos.y - centerY);

          let nX = x,
            nY = y,
            nW = width,
            nH = height;
          if (resizeHandle.includes('e') || resizeHandle.includes('w')) {
            nW = distX * 2;
            nX = centerX - nW / 2;
          }
          if (resizeHandle.includes('s') || resizeHandle.includes('n')) {
            nH = distY * 2;
            nY = centerY - nH / 2;
          }
          if (nW < MIN_RECTANGLE_SIZE) {
            nW = MIN_RECTANGLE_SIZE;
            nX = centerX - nW / 2;
          }
          if (nH < MIN_RECTANGLE_SIZE) {
            nH = MIN_RECTANGLE_SIZE;
            nY = centerY - nH / 2;
          }

          const constrained = constrainRectangle(nX, nY, nW, nH, CANVAS_WIDTH, CANVAS_HEIGHT);
          if (resizeInitial.type === SHAPE_TYPES.IMAGE) {
            updates = {
              x: constrained.x + constrained.width / 2,
              y: constrained.y + constrained.height / 2,
              width: constrained.width,
              height: constrained.height,
            };
          } else {
            updates = constrained;
          }
        } else if (
          resizeInitial.type === SHAPE_TYPES.CIRCLE ||
          resizeInitial.type === SHAPE_TYPES.POLYGON
        ) {
          const dist = Math.sqrt(
            Math.pow(canvasPos.x - resizeInitial.x, 2) + Math.pow(canvasPos.y - resizeInitial.y, 2)
          );
          const minR =
            resizeInitial.type === SHAPE_TYPES.CIRCLE ? MIN_CIRCLE_RADIUS : MIN_POLYGON_RADIUS;
          let newRadius = Math.max(dist, minR);
          const maxR = Math.min(
            Math.min(resizeInitial.x, CANVAS_WIDTH - resizeInitial.x),
            Math.min(resizeInitial.y, CANVAS_HEIGHT - resizeInitial.y)
          );
          newRadius = Math.min(newRadius, maxR);
          updates = { radius: newRadius };
        }

        didInteractRef.current = true;
        setShapes((prev) => prev.map((r) => (r.id === selectedShapeId ? { ...r, ...updates } : r)));
      } else if (isRotating && svgRef.current && selectedShapeId) {
        const rect = svgRef.current.getBoundingClientRect();
        const canvasPos = screenToCanvas(e.clientX, e.clientY, viewport, rect);
        const shape = shapes.find((s) => s.id === selectedShapeId);
        if (!shape) return;

        let centerX, centerY;
        if (shape.type === SHAPE_TYPES.RECTANGLE || shape.type === SHAPE_TYPES.TEXT) {
          centerX = shape.x + (shape.width || 0) / 2;
          centerY = shape.y + (shape.height || 0) / 2;
        } else if (shape.type === SHAPE_TYPES.CUSTOM_POLYGON && shape.vertices) {
          const xs = shape.vertices.map((v) => v.x);
          const ys = shape.vertices.map((v) => v.y);
          centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
          centerY = (Math.min(...ys) + Math.max(...ys)) / 2;
        } else {
          centerX = shape.x;
          centerY = shape.y;
        }

        const angle = Math.atan2(canvasPos.y - centerY, canvasPos.x - centerX) * (180 / Math.PI);
        const startAngle =
          Math.atan2(rotateStart.y - centerY, rotateStart.x - centerX) * (180 / Math.PI);
        const rotation = rotateInitial + (angle - startAngle);
        didInteractRef.current = true;
        setShapes((prev) => prev.map((r) => (r.id === selectedShapeId ? { ...r, rotation } : r)));
      }
    },
    [
      isPanning,
      isSelecting,
      isDrawing,
      isDragging,
      isResizing,
      isRotating,
      panStart,
      panOffset,
      viewport,
      containerSize,
      dragStart,
      draggedShapeIds,
      dragInitialPositions,
      resizeHandle,
      resizeInitial,
      rotateStart,
      rotateInitial,
      selectedShapeId,
      shapes,
      user,
      sessionId,
      canvasId,
      notifyFirestoreActivity,
      trackActivity,
      setViewport,
      setSelectCurrent,
      setDrawCurrent,
      setShapes,
      didInteractRef,
    ]
  );

  const handleMouseUp = useCallback(async () => {
    if (isPanning) {
      setIsPanning(false);
    } else if (isSelecting) {
      setIsSelecting(false);
      resolveSelection(shapes, deselectShape);
    } else if (isDrawing) {
      setIsDrawing(false);
      const dx = Math.abs(drawCurrent.x - drawStart.x);
      const dy = Math.abs(drawCurrent.y - drawStart.y);

      if (user) {
        try {
          const color = getRandomColor();
          let shapeData = {
            type: selectedTool,
            color: selectedTool === SHAPE_TYPES.TEXT ? undefined : color,
            createdBy: user.uid,
          };

          if (selectedTool === SHAPE_TYPES.RECTANGLE) {
            if (dx >= MIN_RECTANGLE_SIZE && dy >= MIN_RECTANGLE_SIZE) {
              const constrained = constrainRectangle(
                Math.min(drawStart.x, drawCurrent.x),
                Math.min(drawStart.y, drawCurrent.y),
                dx,
                dy,
                CANVAS_WIDTH,
                CANVAS_HEIGHT
              );
              shapeData = { ...shapeData, ...constrained, rotation: 0, zIndex: Date.now() };
              const id = await createShape(canvasId, shapeData);
              recordAction({ type: 'create', shapeId: id, shapeData });
              notifyFirestoreActivity();
            }
          } else if (selectedTool === SHAPE_TYPES.CIRCLE) {
            const radius = Math.sqrt(dx * dx + dy * dy) / 2;
            if (radius >= MIN_CIRCLE_RADIUS) {
              const constrained = constrainCircle(
                (drawStart.x + drawCurrent.x) / 2,
                (drawStart.y + drawCurrent.y) / 2,
                radius,
                CANVAS_WIDTH,
                CANVAS_HEIGHT
              );
              shapeData = { ...shapeData, ...constrained, rotation: 0, zIndex: Date.now() };
              const id = await createShape(canvasId, shapeData);
              recordAction({ type: 'create', shapeId: id, shapeData });
              notifyFirestoreActivity();
            }
          } else if (selectedTool === SHAPE_TYPES.POLYGON) {
            const radius = Math.sqrt(dx * dx + dy * dy) / 2;
            if (radius >= MIN_POLYGON_RADIUS) {
              const constrained = constrainCircle(
                (drawStart.x + drawCurrent.x) / 2,
                (drawStart.y + drawCurrent.y) / 2,
                radius,
                CANVAS_WIDTH,
                CANVAS_HEIGHT
              );
              shapeData = {
                ...shapeData,
                x: constrained.x,
                y: constrained.y,
                radius: constrained.radius,
                sides: DEFAULT_POLYGON_SIDES,
                rotation: 0,
                zIndex: Date.now(),
              };
              const id = await createShape(canvasId, shapeData);
              recordAction({ type: 'create', shapeId: id, shapeData });
              notifyFirestoreActivity();
            }
          } else if (selectedTool === SHAPE_TYPES.TEXT) {
            let width = dx,
              height = dy;
            if (width < 100) width = 200;
            if (height < 40) height = 60;
            const constrained = constrainRectangle(
              Math.min(drawStart.x, drawCurrent.x),
              Math.min(drawStart.y, drawCurrent.y),
              width,
              height,
              CANVAS_WIDTH,
              CANVAS_HEIGHT
            );
            shapeData = {
              ...shapeData,
              ...constrained,
              text: 'Double-click to edit',
              fontSize: 16,
              backgroundColor: 'transparent',
              rotation: 0,
              zIndex: Date.now(),
            };
            const newId = await createShape(canvasId, shapeData);
            recordAction({ type: 'create', shapeId: newId, shapeData });
            notifyFirestoreActivity();
            setSelectedTool(TOOL_TYPES.SELECT);
            setTimeout(() => {
              if (newId) {
                selectShape(newId);
                setEditingTextId(newId);
                setEditingText('');
              }
            }, 100);
          }
        } catch (error) {
          reportError(error, { component: 'Canvas', action: 'createShape' });
        }
      }
    } else if (isDragging && (selectedShapeId || draggedShapeIds.length > 0)) {
      setIsDragging(false);
      setIsDraggingLocal(false);
      if (user && sessionId)
        removeCursor(canvasId, sessionId).catch((err) => reportError(err, { component: 'Canvas' }));
      setDragStart({ x: 0, y: 0 });
      setDragOffset({ x: 0, y: 0 });

      if (!didInteractRef.current) {
        if (draggedShapeIds.length === 1) deselectShape();
      } else if (user) {
        try {
          await Promise.all(
            draggedShapeIds.map((id) => {
              const shape = shapes.find((s) => s.id === id);
              if (!shape) return Promise.resolve();
              if (shape.type === SHAPE_TYPES.CUSTOM_POLYGON) {
                return updateShape(canvasId, id, { vertices: shape.vertices });
              }
              return updateShape(canvasId, id, { x: shape.x, y: shape.y });
            })
          );
          notifyFirestoreActivity();
        } catch (error) {
          reportError(error, { component: 'Canvas', action: 'updateShapePositions' });
        }
      }
      setDraggedShapeIds([]);
      setDragInitialPositions({});
    } else if (isResizing && selectedShapeId) {
      setIsResizing(false);
      setIsDraggingLocal(false);
      if (user && sessionId)
        removeCursor(canvasId, sessionId).catch((err) => reportError(err, { component: 'Canvas' }));
      setResizeHandle(null);
      setResizeStart({ x: 0, y: 0 });
      setResizeInitial(null);

      const shape = shapes.find((s) => s.id === selectedShapeId);
      if (shape && user) {
        try {
          let updates = {};
          if (
            shape.type === SHAPE_TYPES.RECTANGLE ||
            shape.type === SHAPE_TYPES.TEXT ||
            shape.type === SHAPE_TYPES.IMAGE
          ) {
            updates = { x: shape.x, y: shape.y, width: shape.width, height: shape.height };
          } else if (shape.type === SHAPE_TYPES.CIRCLE || shape.type === SHAPE_TYPES.POLYGON) {
            updates = { radius: shape.radius };
          }
          await updateShape(canvasId, selectedShapeId, updates);
          notifyFirestoreActivity();
        } catch (error) {
          reportError(error, { component: 'Canvas', action: 'updateShapeDimensions' });
        }
      }
    } else if (isRotating && selectedShapeId) {
      setIsRotating(false);
      setIsDraggingLocal(false);
      if (user && sessionId)
        removeCursor(canvasId, sessionId).catch((err) => reportError(err, { component: 'Canvas' }));
      setRotateStart({ x: 0, y: 0 });
      setRotateInitial(0);

      const shape = shapes.find((s) => s.id === selectedShapeId);
      if (shape && user) {
        try {
          await updateShape(canvasId, selectedShapeId, { rotation: shape.rotation || 0 });
          notifyFirestoreActivity();
        } catch (error) {
          reportError(error, { component: 'Canvas', action: 'updateShapeRotation' });
        }
      }
    }
  }, [
    isPanning,
    isSelecting,
    isDrawing,
    isDragging,
    isResizing,
    isRotating,
    drawStart,
    drawCurrent,
    selectedShapeId,
    draggedShapeIds,
    shapes,
    user,
    sessionId,
    canvasId,
    selectedTool,
    setIsDraggingLocal,
    notifyFirestoreActivity,
    deselectShape,
    resolveSelection,
    recordAction,
    selectShape,
    didInteractRef,
    setIsPanning,
    setIsSelecting,
    setIsDrawing,
    setIsDragging,
    setIsResizing,
    setIsRotating,
    setDragStart,
    setDragOffset,
    setDraggedShapeIds,
    setDragInitialPositions,
    setResizeHandle,
    setResizeStart,
    setResizeInitial,
    setRotateStart,
    setRotateInitial,
    setSelectedTool,
  ]);

  // Global mouse listeners
  useEffect(() => {
    if (isPanning || isSelecting || isDrawing || isDragging || isResizing || isRotating) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [
    isPanning,
    isSelecting,
    isDrawing,
    isDragging,
    isResizing,
    isRotating,
    handleMouseMove,
    handleMouseUp,
  ]);

  // Keyboard shortcuts
  useCanvasKeyboard({
    user,
    canvasId,
    shapes,
    selectedShapeId,
    selectedShapeIds,
    setSelectedShapeIds,
    deselectShape,
    selectShape,
    isDrawing,
    isDragging,
    isResizing,
    isRotating,
    isSelecting,
    isDrawingCustomPolygon,
    customPolygonVertices,
    setIsDrawingCustomPolygon,
    setCustomPolygonVertices,
    setSelectedTool,
    handleFinishCustomPolygon,
    clipboard,
    setClipboard,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
    handleSendToFront,
    handleSendToBack,
    popUndo,
    popRedo,
    recordAction,
    notifyFirestoreActivity,
    trackActivity,
    userRole,
  });

  // ----- Memos -----

  const dynamicGridColor = useMemo(() => getGridColor(backgroundColor), [backgroundColor]);

  const gridLines = useMemo(() => {
    const lines = [];
    for (let x = 0; x <= CANVAS_WIDTH; x += GRID_SIZE) {
      lines.push(
        <line
          key={`v-${x}`}
          x1={x}
          y1={0}
          x2={x}
          y2={CANVAS_HEIGHT}
          stroke={dynamicGridColor}
          strokeWidth={1 / viewport.zoom}
        />
      );
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += GRID_SIZE) {
      lines.push(
        <line
          key={`h-${y}`}
          x1={0}
          y1={y}
          x2={CANVAS_WIDTH}
          y2={y}
          stroke={dynamicGridColor}
          strokeWidth={1 / viewport.zoom}
        />
      );
    }
    return lines;
  }, [viewport.zoom, dynamicGridColor]);

  const visibleShapes = useMemo(() => {
    const buf = 200;
    const vl = viewport.offsetX - buf;
    const vt = viewport.offsetY - buf;
    const vr = viewport.offsetX + containerSize.width / viewport.zoom + buf;
    const vb = viewport.offsetY + containerSize.height / viewport.zoom + buf;

    return shapes
      .filter((shape) => {
        if (shape.visible === false) return false;
        let sl, st, sr, sb;
        if (
          shape.type === SHAPE_TYPES.RECTANGLE ||
          shape.type === SHAPE_TYPES.TEXT ||
          shape.type === SHAPE_TYPES.IMAGE
        ) {
          sl = shape.x;
          st = shape.y;
          sr = shape.x + (shape.width || 0);
          sb = shape.y + (shape.height || 0);
        } else if (shape.type === SHAPE_TYPES.CIRCLE || shape.type === SHAPE_TYPES.POLYGON) {
          const r = shape.radius || 0;
          sl = shape.x - r;
          st = shape.y - r;
          sr = shape.x + r;
          sb = shape.y + r;
        } else if (shape.type === SHAPE_TYPES.CUSTOM_POLYGON && shape.vertices) {
          const xs = shape.vertices.map((v) => v.x);
          const ys = shape.vertices.map((v) => v.y);
          sl = Math.min(...xs);
          st = Math.min(...ys);
          sr = Math.max(...xs);
          sb = Math.max(...ys);
        } else {
          return true;
        }
        return !(sl > vr || sr < vl || st > vb || sb < vt);
      })
      .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
  }, [
    shapes,
    viewport.offsetX,
    viewport.offsetY,
    viewport.zoom,
    containerSize.width,
    containerSize.height,
  ]);

  // ----- JSX -----

  return (
    <div className={styles['canvas-container']} ref={containerRef}>
      {/* Header */}
      <div className={styles['canvas-header']}>
        <div className={styles['canvas-header-left']}>
          <span className={styles['canvas-header-stats']} role="status" aria-live="polite">
            {shapes.length} objects &bull; {onlineUsersCount}{' '}
            {onlineUsersCount === 1 ? 'user' : 'users'} online
          </span>
        </div>
        <span className={styles['canvas-header-hint']}>
          Hold Shift/Cmd to pan &bull; Scroll to zoom
        </span>
        <div className={styles['canvas-header-right']}>
          {SHOW_FPS_COUNTER && (
            <span className={styles['canvas-header-fps']}>
              {fps} FPS &bull; {connectionStatus}
            </span>
          )}
          <button className="btn btn-secondary btn-small" onClick={signOut} title="Sign out">
            Sign Out
          </button>
        </div>
      </div>

      <ShapePalette
        selectedTool={selectedTool}
        onSelectTool={setSelectedTool}
        onClearAll={handleClearAll}
        onGenerate500={handleGenerate500}
        onImageUpload={handleImageUpload}
        onDuplicate={handleDuplicate}
        onAlign={handleAlign}
        hasSelection={selectedShapeId || selectedShapeIds.length > 0}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {canvasLoading && (
        <div className={styles['canvas-loading-overlay']}>
          <div className="loading-spinner"></div>
          <p>Loading canvas...</p>
        </div>
      )}

      {canvasError && (
        <div className={styles['canvas-error-overlay']}>
          <div className={styles['error-content']}>
            <div className={styles['error-icon']}>⚠️</div>
            <h3>Connection Error</h3>
            <p>{canvasError}</p>
            <p className={styles['error-hint']}>
              Please check your internet connection and refresh the page.
            </p>
          </div>
        </div>
      )}

      <svg
        ref={svgRef}
        className={styles['canvas-svg']}
        viewBox={viewBox}
        onMouseDown={handleCanvasMouseDown}
        style={{ cursor: isPanning ? 'grabbing' : isDragging ? 'move' : 'crosshair' }}
      >
        <rect x={0} y={0} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill={backgroundColor} />
        {gridVisible && <g className={styles['canvas-grid']}>{gridLines}</g>}
        <rect
          x={0}
          y={0}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          fill="none"
          stroke={BOUNDARY_COLOR}
          strokeWidth={BOUNDARY_WIDTH / viewport.zoom}
        />

        <g className={styles['canvas-content']}>
          <ShapeRenderer
            visibleShapes={visibleShapes}
            selectedShapeId={selectedShapeId}
            selectedShapeIds={selectedShapeIds}
            user={user}
            userRole={userRole}
            onShapeClick={handleShapeClick}
            onShapeMouseDown={handleShapeMouseDown}
            onSelectShape={selectShape}
            onSetEditingTextId={setEditingTextId}
            onSetEditingText={setEditingText}
            onSetContextMenu={setContextMenu}
          />

          {/* Single-selection box */}
          {selectedShapeId && !isDrawing && selectedShapeIds.length === 0 && (
            <SelectionBox
              shape={shapes.find((s) => s.id === selectedShapeId)}
              zoom={viewport.zoom}
              onResizeStart={handleResizeStart}
              onRotateStart={handleRotateStart}
            />
          )}

          {/* Multi-selection box */}
          {selectedShapeIds.length > 1 && !isDrawing && (
            <MultiSelectionBox
              selectedShapeIds={selectedShapeIds}
              shapes={shapes}
              zoom={viewport.zoom}
            />
          )}

          {/* Shape preview while drawing */}
          <ShapePreview
            isDrawing={isDrawing}
            previewRect={previewRect}
            selectedTool={selectedTool}
            drawStart={drawStart}
            drawCurrent={drawCurrent}
            zoom={viewport.zoom}
          />

          {/* Selection rectangle */}
          {isSelecting &&
            (() => {
              const x = Math.min(selectStart.x, selectCurrent.x);
              const y = Math.min(selectStart.y, selectCurrent.y);
              const w = Math.abs(selectCurrent.x - selectStart.x);
              const h = Math.abs(selectCurrent.y - selectStart.y);
              return (
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  fill="rgba(100, 108, 255, 0.1)"
                  stroke="#646cff"
                  strokeWidth={2 / viewport.zoom}
                  strokeDasharray={`${5 / viewport.zoom} ${3 / viewport.zoom}`}
                  style={{ pointerEvents: 'none' }}
                />
              );
            })()}

          {/* Custom polygon preview */}
          {isDrawingCustomPolygon && customPolygonVertices.length > 0 && (
            <CustomPolygonPreview vertices={customPolygonVertices} zoom={viewport.zoom} />
          )}

          {/* Cursors */}
          <g className={styles['cursors-layer']}>
            {cursors.map((c) => (
              <Cursor key={c.sessionId} userId={c.userId} x={c.x} y={c.y} userName={c.userName} />
            ))}
          </g>
        </g>
      </svg>

      {/* Connection status */}
      <div
        className={`${styles['connection-status']} ${styles[`connection-status-${connectionStatus}`] || ''}`}
      >
        <span className={styles['status-dot']}></span>
        <span>
          {connectionStatus === 'connecting' && 'Connecting...'}
          {connectionStatus === 'connected' && 'Connected'}
          {connectionStatus === 'reconnecting' && 'Reconnecting...'}
          {connectionStatus === 'offline' && 'Offline'}
          {connectionStatus === 'error' && 'Connection Error'}
        </span>
      </div>

      {SHOW_FPS_COUNTER && (
        <div className={styles['fps-counter']}>
          <div className={styles['fps-value']}>{fps} FPS</div>
          <div className={styles['fps-render']}>Render: {renderTime}ms</div>
          <div className={styles['fps-objects']}>
            Objects: {visibleShapes.length}/{shapes.length}
            {visibleShapes.length < shapes.length && ' (culled)'}
          </div>
          <div className={styles['fps-zoom']}>Zoom: {(viewport.zoom * 100).toFixed(0)}%</div>
          <div className={styles['fps-pos']}>
            Pos: ({Math.round(viewport.offsetX)}, {Math.round(viewport.offsetY)})
          </div>
          <div className={`${styles['fps-firestore']} ${styles[firestoreStatus] || ''}`}>
            Firestore:{' '}
            {firestoreStatus === 'connected' ? '✓' : firestoreStatus === 'error' ? '✗' : '...'}
          </div>
        </div>
      )}

      <ZoomControls
        zoom={viewport.zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
        onZoomSet={handleZoomSet}
        onFitCanvas={handleFitCanvas}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
      />

      <button
        className={styles['layers-toggle-btn']}
        onClick={() => setIsLayersPanelOpen(!isLayersPanelOpen)}
        title="Toggle layers panel"
        aria-label="Toggle layers panel"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M3 15h18" />
        </svg>
        <span className={styles['layers-count']}>{shapes.length}</span>
      </button>

      <LayersPanel
        shapes={shapes}
        selectedShapeIds={selectedShapeIds}
        onSelectShape={selectShape}
        onToggleVisibility={handleToggleVisibility}
        onRenameShape={handleRenameShape}
        userRole={userRole}
        isOpen={isLayersPanelOpen}
        onTogglePanel={() => setIsLayersPanelOpen(!isLayersPanelOpen)}
      />

      <ChatPanel
        canvasId={canvasId}
        user={user}
        shapes={shapes}
        selectedShapeIds={selectedShapeIds}
        createShape={handleCreateShapeForCanny}
        updateShape={handleUpdateShapeForCanny}
        batchUpdateShapes={handleBatchUpdateShapesForCanny}
        deleteShape={handleDeleteShapeForCanny}
        selectShape={selectShape}
        deselectShape={deselectShape}
        viewport={{
          offsetX: viewport.offsetX,
          offsetY: viewport.offsetY,
          zoom: viewport.zoom,
          centerX: viewport.offsetX + containerSize.width / 2 / viewport.zoom,
          centerY: viewport.offsetY + containerSize.height / 2 / viewport.zoom,
        }}
        svgRef={svgRef}
      />

      {editingTextId && (
        <InlineTextEditor
          shape={shapes.find((s) => s.id === editingTextId)}
          text={editingText}
          onTextChange={setEditingText}
          onFinish={(save, formattingUpdates) => {
            if (save) {
              const currentShape = shapes.find((s) => s.id === editingTextId);
              const updates = { text: editingText };
              if (formattingUpdates) Object.assign(updates, formattingUpdates);
              const hasChanges =
                editingText !== currentShape?.text ||
                (formattingUpdates &&
                  (formattingUpdates.fontSize !== currentShape?.fontSize ||
                    formattingUpdates.fontWeight !== currentShape?.fontWeight ||
                    formattingUpdates.fontStyle !== currentShape?.fontStyle ||
                    formattingUpdates.textColor !== currentShape?.textColor ||
                    formattingUpdates.backgroundColor !== currentShape?.backgroundColor));
              if (hasChanges) updateShape(canvasId, editingTextId, updates);
            }
            setEditingTextId(null);
            setEditingText('');
            deselectShape();
          }}
          viewport={viewport}
          containerSize={containerSize}
        />
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          selectedCount={contextMenu.shapeIds?.length || 1}
          onSendToFront={handleSendToFront}
          onSendToBack={handleSendToBack}
          onAlign={handleAlign}
          onClose={() => setContextMenu(null)}
        />
      )}

      <DebugPanel />
    </div>
  );
}

export default Canvas;
