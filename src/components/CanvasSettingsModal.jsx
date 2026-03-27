import { useState, useEffect } from 'react';
import { getCanvasMetadata, updateCanvasMetadata } from '../services/canvasService';
import { reportError } from '../utils/errorHandler';
import styles from './CanvasSettingsModal.module.css';

/**
 * CanvasSettingsModal component - Manage canvas settings
 * Allows owners to:
 * - Change background color
 * - Toggle grid visibility
 * - Configure default permissions (future)
 */
function CanvasSettingsModal({ canvasId, canvasName, isOpen, onClose, onSettingsChange }) {
  const [backgroundColor, setBackgroundColor] = useState('#1a1a1a');
  const [gridVisible, setGridVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Predefined color palette
  const colorPalette = [
    { name: 'Dark Gray', value: '#1a1a1a' },
    { name: 'Black', value: '#000000' },
    { name: 'Dark Blue', value: '#0f172a' },
    { name: 'Dark Purple', value: '#1e1b4b' },
    { name: 'Dark Green', value: '#14532d' },
    { name: 'Dark Red', value: '#450a0a' },
    { name: 'Light Gray', value: '#f3f4f6' },
    { name: 'White', value: '#ffffff' },
  ];

  // Load current settings
  useEffect(() => {
    if (isOpen && canvasId) {
      loadSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadSettings only closes over `canvasId`, which is already in the dep array
  }, [isOpen, canvasId]);

  const loadSettings = async () => {
    try {
      const metadata = await getCanvasMetadata(canvasId);
      if (metadata?.settings) {
        setBackgroundColor(metadata.settings.backgroundColor || '#1a1a1a');
        setGridVisible(metadata.settings.gridVisible === true);
      }
    } catch (err) {
      reportError(err, { component: 'CanvasSettingsModal', action: 'loadSettings' });
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      await updateCanvasMetadata(canvasId, {
        settings: {
          backgroundColor,
          gridVisible,
        },
      });

      setSuccessMessage('Settings saved successfully!');

      // Notify parent component of changes
      if (onSettingsChange) {
        onSettingsChange({ backgroundColor, gridVisible });
      }

      setTimeout(() => {
        setSuccessMessage('');
        onClose();
      }, 1500);
    } catch (err) {
      reportError(err, { component: 'CanvasSettingsModal', action: 'handleSave', canvasId });

      // Provide more specific error messages
      let errorMessage = 'Failed to save settings. Please try again.';
      if (
        err.code === 'PERMISSION_DENIED' ||
        err.message?.includes('permission') ||
        err.message?.includes('PERMISSION_DENIED')
      ) {
        errorMessage =
          'Permission denied. You need owner or editor access to change canvas settings.';
        reportError('Permission denied for canvas settings', {
          component: 'CanvasSettingsModal',
          action: 'handleSave.permissionDenied',
          canvasId,
        });
      } else if (err.code === 'NETWORK_ERROR' || err.message?.includes('network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError('');
    setSuccessMessage('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      className={styles['settings-modal-overlay']}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') handleClose();
      }}
    >
      <div className={styles['settings-modal']}>
        {/* Header */}
        <div className={styles['settings-modal-header']}>
          <h2>Canvas Settings</h2>
          <p className={styles['settings-modal-subtitle']}>
            Background and grid settings for this canvas
          </p>
          <button
            className={styles['settings-modal-close']}
            onClick={handleClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className={styles['settings-modal-content']}>
          {/* Error/Success Messages */}
          {error && <div className={styles['settings-modal-error']}>{error}</div>}
          {successMessage && (
            <div className={styles['settings-modal-success']}>{successMessage}</div>
          )}

          {/* Canvas Name Display */}
          <div className={styles['settings-canvas-name']}>
            <span className={styles['settings-label']}>Canvas:</span>
            <span className={styles['settings-value']}>{canvasName}</span>
          </div>

          {/* Background Color Section */}
          <div className={styles['settings-section']}>
            <h3>Background Color</h3>
            <p className={styles['settings-section-description']}>
              Choose a background color for your canvas
            </p>

            <div className={styles['settings-color-palette']}>
              {colorPalette.map((color) => (
                <button
                  key={color.value}
                  className={`${styles['settings-color-swatch']} ${
                    backgroundColor === color.value ? styles.selected : ''
                  }`}
                  style={{ backgroundColor: color.value }}
                  onClick={() => setBackgroundColor(color.value)}
                  title={color.name}
                  aria-label={`Set background to ${color.name}`}
                >
                  {backgroundColor === color.value && (
                    <span className={styles['settings-color-check']}>✓</span>
                  )}
                </button>
              ))}
            </div>

            {/* Custom Color Picker */}
            <div className={styles['settings-custom-color']}>
              <label htmlFor="custom-color">Custom Color:</label>
              <input
                id="custom-color"
                type="color"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className={styles['settings-color-input']}
              />
              <span className={styles['settings-color-value']}>{backgroundColor}</span>
            </div>
          </div>

          {/* Grid Visibility Section */}
          <div className={styles['settings-section']}>
            <h3>Grid</h3>
            <p className={styles['settings-section-description']}>Show or hide the canvas grid</p>

            <label className={styles['settings-toggle']}>
              <input
                type="checkbox"
                checked={gridVisible}
                onChange={(e) => setGridVisible(e.target.checked)}
              />
              <span className={styles['settings-toggle-slider']}></span>
              <span className={styles['settings-toggle-label']}>
                {gridVisible ? 'Grid Visible' : 'Grid Hidden'}
              </span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className={styles['settings-modal-footer']}>
          <button
            className={styles['settings-modal-cancel-btn']}
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className={styles['settings-modal-save-btn']}
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CanvasSettingsModal;
