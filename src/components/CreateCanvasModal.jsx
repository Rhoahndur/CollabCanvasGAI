import { useState } from 'react';
import { CANVAS_TEMPLATES, MAX_CANVASES_PER_USER } from '../utils/constants';
import styles from './CreateCanvasModal.module.css';

/**
 * CreateCanvasModal - Modal for creating a new canvas
 */
function CreateCanvasModal({ isOpen, onClose, onCreateCanvas, userCanvasCount = 0 }) {
  const [canvasName, setCanvasName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(CANVAS_TEMPLATES.BLANK);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const templates = [
    {
      id: CANVAS_TEMPLATES.BLANK,
      name: 'Blank Canvas',
      icon: '⬜',
      description: 'Start with a clean slate',
    },
    {
      id: CANVAS_TEMPLATES.BRAINSTORM,
      name: 'Brainstorming Board',
      icon: '💡',
      description: 'Organized zones for ideas and actions',
    },
    {
      id: CANVAS_TEMPLATES.WIREFRAME,
      name: 'Wireframe Layout',
      icon: '📐',
      description: 'Layout guides for UI/UX design',
    },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate
    if (!canvasName.trim()) {
      setError('Please enter a canvas name');
      return;
    }

    // Check limit
    if (userCanvasCount >= MAX_CANVASES_PER_USER) {
      setError(`Maximum ${MAX_CANVASES_PER_USER} canvases allowed`);
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      await onCreateCanvas(canvasName.trim(), selectedTemplate);
      // Reset and close
      setCanvasName('');
      setSelectedTemplate(CANVAS_TEMPLATES.BLANK);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create canvas');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      setCanvasName('');
      setSelectedTemplate(CANVAS_TEMPLATES.BLANK);
      setError('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') handleClose();
      }}
    >
      <div className="modal-content">
        <div className="modal-header">
          <div className={styles['header-content']}>
            <h2>Create New Canvas</h2>
            <div className={styles['canvas-limit-badge']}>
              {userCanvasCount} / {MAX_CANVASES_PER_USER} canvases
            </div>
          </div>
          <button
            className="modal-close-btn"
            onClick={handleClose}
            disabled={isCreating}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {/* Canvas Name Input */}
          <div className={styles['form-group']}>
            <label htmlFor="canvas-name">Canvas Name</label>
            {/* eslint-disable jsx-a11y/no-autofocus */}
            <input
              id="canvas-name"
              type="text"
              value={canvasName}
              onChange={(e) => setCanvasName(e.target.value)}
              placeholder="My Awesome Canvas"
              maxLength={50}
              autoFocus
              disabled={isCreating}
            />
            {/* eslint-enable jsx-a11y/no-autofocus */}
          </div>

          {/* Template Selector */}
          <div className={styles['form-group']}>
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
            <label>Choose a Template</label>
            <div className={styles['template-grid']}>
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  className={`${styles['template-card']} ${selectedTemplate === template.id ? styles.selected : ''}`}
                  onClick={() => setSelectedTemplate(template.id)}
                  disabled={isCreating}
                >
                  <div className={styles['template-icon']}>{template.icon}</div>
                  <div className={styles['template-name']}>{template.name}</div>
                  <div className={styles['template-description']}>{template.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Canvas Limit Warning */}
          {userCanvasCount >= MAX_CANVASES_PER_USER - 1 && (
            <div className={styles['canvas-limit-warning']}>
              ⚠️ You have {userCanvasCount} of {MAX_CANVASES_PER_USER} canvases.
              {userCanvasCount >= MAX_CANVASES_PER_USER
                ? ' Delete a canvas to create a new one.'
                : ' This is your last canvas slot.'}
            </div>
          )}

          {/* Error Message */}
          {error && <div className={styles['error-message']}>{error}</div>}

          {/* Actions */}
          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClose}
              disabled={isCreating}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={
                isCreating || !canvasName.trim() || userCanvasCount >= MAX_CANVASES_PER_USER
              }
            >
              {isCreating ? 'Creating...' : 'Create Canvas'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateCanvasModal;
