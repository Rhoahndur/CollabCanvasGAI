import { useState, useEffect, useCallback } from 'react';
import { SHAPE_TYPES } from '../utils/constants';
import { uploadImage, handlePasteEvent } from '../services/imageService';
import { createShape } from '../services/canvasService';
import { getRandomColor } from '../utils/colorUtils';
import { reportError } from '../utils/errorHandler';

/**
 * useCanvasClipboard — Clipboard state (copy/paste shapes) and image paste from OS clipboard.
 */
export function useCanvasClipboard({
  user,
  canvasId,
  viewport,
  containerSize,
  recordAction,
  notifyFirestoreActivity,
}) {
  const [clipboard, setClipboard] = useState([]);

  // Handle paste event (Ctrl+V) for images
  const handlePaste = useCallback(
    async (e) => {
      if (!user) return;

      // Don't intercept normal text paste
      if (
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.isContentEditable
      ) {
        return;
      }

      try {
        const imageFile = await handlePasteEvent(e);
        if (imageFile) {
          e.preventDefault();

          const { url, width, height } = await uploadImage(imageFile, user.uid);
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
        }
      } catch (error) {
        reportError(error, { component: 'useCanvasClipboard', action: 'handlePaste' });
      }
    },
    [user, viewport, containerSize, canvasId, recordAction, notifyFirestoreActivity]
  );

  // Paste event listener
  useEffect(() => {
    window.addEventListener('paste', handlePaste, { passive: false });
    return () => window.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  return { clipboard, setClipboard };
}
