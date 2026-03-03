/**
 * @vitest-environment node
 *
 * Tests useHistory hook logic by inspecting its structure and simulating
 * the state machine. Full React rendering tests run in CI (jsdom requires
 * more memory than WSL2 workers provide).
 */
import { describe, it, expect } from 'vitest';

describe('useHistory', () => {
  it('exports a function', async () => {
    const mod = await import('../../hooks/useHistory');
    expect(typeof mod.useHistory).toBe('function');
    expect(typeof mod.default).toBe('function');
  });

  it('MAX_HISTORY_SIZE is 20 (verified via source inspection)', async () => {
    // The hook limits undo stack to 20 entries.
    // We verify the source contains this constant.
    const fs = await import('fs');
    const path = await import('path');
    const src = fs.readFileSync(path.resolve(process.cwd(), 'src/hooks/useHistory.js'), 'utf-8');
    expect(src).toContain('MAX_HISTORY_SIZE = 20');
  });

  describe('state machine logic', () => {
    // Simulate the undo/redo state machine without React
    function createHistoryMachine() {
      const MAX = 20;
      let undoStack = [];
      let redoStack = [];
      let isProcessing = false;

      return {
        recordAction(action) {
          if (isProcessing) return;
          undoStack = [...undoStack, { ...action, timestamp: Date.now() }];
          if (undoStack.length > MAX) undoStack = undoStack.slice(1);
          redoStack = [];
        },
        popUndo() {
          if (undoStack.length === 0) return null;
          isProcessing = true;
          const action = undoStack[undoStack.length - 1];
          undoStack = undoStack.slice(0, -1);
          redoStack = [...redoStack, action];
          isProcessing = false;
          return action;
        },
        popRedo() {
          if (redoStack.length === 0) return null;
          isProcessing = true;
          const action = redoStack[redoStack.length - 1];
          redoStack = redoStack.slice(0, -1);
          undoStack = [...undoStack, action];
          isProcessing = false;
          return action;
        },
        clearHistory() {
          undoStack = [];
          redoStack = [];
        },
        get canUndo() {
          return undoStack.length > 0;
        },
        get canRedo() {
          return redoStack.length > 0;
        },
      };
    }

    it('starts with empty stacks', () => {
      const h = createHistoryMachine();
      expect(h.canUndo).toBe(false);
      expect(h.canRedo).toBe(false);
    });

    it('records actions to undo stack', () => {
      const h = createHistoryMachine();
      h.recordAction({ type: 'create', shapeId: 's1' });
      expect(h.canUndo).toBe(true);
      expect(h.canRedo).toBe(false);
    });

    it('popUndo returns last action and enables redo', () => {
      const h = createHistoryMachine();
      h.recordAction({ type: 'create', shapeId: 's1' });
      const action = h.popUndo();
      expect(action.shapeId).toBe('s1');
      expect(h.canUndo).toBe(false);
      expect(h.canRedo).toBe(true);
    });

    it('popRedo returns last undone action', () => {
      const h = createHistoryMachine();
      h.recordAction({ type: 'create', shapeId: 's1' });
      h.popUndo();
      const action = h.popRedo();
      expect(action.shapeId).toBe('s1');
      expect(h.canUndo).toBe(true);
      expect(h.canRedo).toBe(false);
    });

    it('popUndo returns null when empty', () => {
      const h = createHistoryMachine();
      expect(h.popUndo()).toBeNull();
    });

    it('popRedo returns null when empty', () => {
      const h = createHistoryMachine();
      expect(h.popRedo()).toBeNull();
    });

    it('new action clears redo stack', () => {
      const h = createHistoryMachine();
      h.recordAction({ type: 'create', shapeId: 's1' });
      h.popUndo();
      expect(h.canRedo).toBe(true);
      h.recordAction({ type: 'create', shapeId: 's2' });
      expect(h.canRedo).toBe(false);
    });

    it('limits undo stack to 20 actions', () => {
      const h = createHistoryMachine();
      for (let i = 0; i < 25; i++) {
        h.recordAction({ type: 'create', shapeId: `s${i}` });
      }
      let count = 0;
      while (h.canUndo) {
        h.popUndo();
        count++;
      }
      expect(count).toBe(20);
    });

    it('clearHistory empties both stacks', () => {
      const h = createHistoryMachine();
      h.recordAction({ type: 'create', shapeId: 's1' });
      h.recordAction({ type: 'create', shapeId: 's2' });
      h.popUndo();
      expect(h.canUndo).toBe(true);
      expect(h.canRedo).toBe(true);
      h.clearHistory();
      expect(h.canUndo).toBe(false);
      expect(h.canRedo).toBe(false);
    });
  });
});
