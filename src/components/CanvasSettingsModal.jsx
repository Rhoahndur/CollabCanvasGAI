import { useState, useEffect } from 'react';
import { getCanvasMetadata, updateCanvasMetadata } from '../services/canvasService';
import './CanvasSettingsModal.css';

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
  }, [isOpen, canvasId]);

  const loadSettings = async () => {
    try {
      const metadata = await getCanvasMetadata(canvasId);
      if (metadata?.settings) {
        setBackgroundColor(metadata.settings.backgroundColor || '#1a1a1a');
        setGridVisible(metadata.settings.gridVisible === true);
      }
    } catch (err) {
      console.error('Failed to load canvas settings:', err);
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
      console.error('Failed to save settings:', err);
      setError('Failed to save settings. Please try again.');
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
    <div className="settings-modal-overlay" onClick={handleClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="settings-modal-header">
          <h2>Canvas Settings</h2>
          <button className="settings-modal-close" onClick={handleClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="settings-modal-content">
          {/* Error/Success Messages */}
          {error && <div className="settings-modal-error">{error}</div>}
          {successMessage && <div className="settings-modal-success">{successMessage}</div>}

          {/* Canvas Name Display */}
          <div className="settings-canvas-name">
            <span className="settings-label">Canvas:</span>
            <span className="settings-value">{canvasName}</span>
          </div>

          {/* Background Color Section */}
          <div className="settings-section">
            <h3>Background Color</h3>
            <p className="settings-section-description">
              Choose a background color for your canvas
            </p>

            <div className="settings-color-palette">
              {colorPalette.map((color) => (
                <button
                  key={color.value}
                  className={`settings-color-swatch ${
                    backgroundColor === color.value ? 'selected' : ''
                  }`}
                  style={{ backgroundColor: color.value }}
                  onClick={() => setBackgroundColor(color.value)}
                  title={color.name}
                  aria-label={`Set background to ${color.name}`}
                >
                  {backgroundColor === color.value && (
                    <span className="settings-color-check">✓</span>
                  )}
                </button>
              ))}
            </div>

            {/* Custom Color Picker */}
            <div className="settings-custom-color">
              <label htmlFor="custom-color">Custom Color:</label>
              <input
                id="custom-color"
                type="color"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="settings-color-input"
              />
              <span className="settings-color-value">{backgroundColor}</span>
            </div>
          </div>

          {/* Grid Visibility Section */}
          <div className="settings-section">
            <h3>Grid</h3>
            <p className="settings-section-description">
              Show or hide the canvas grid
            </p>

            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={gridVisible}
                onChange={(e) => setGridVisible(e.target.checked)}
              />
              <span className="settings-toggle-slider"></span>
              <span className="settings-toggle-label">
                {gridVisible ? 'Grid Visible' : 'Grid Hidden'}
              </span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="settings-modal-footer">
          <button
            className="settings-modal-cancel-btn"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="settings-modal-save-btn"
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

