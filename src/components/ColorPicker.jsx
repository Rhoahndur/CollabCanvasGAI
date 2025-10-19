import { useState, useRef, useEffect } from 'react';
import './ColorPicker.css';

/**
 * ColorPicker - Advanced color picker with gradient wheel, presets, and recent colors
 * @param {string} value - Current color value
 * @param {function} onChange - Callback when color changes
 * @param {string} label - Label for the picker
 * @param {boolean} allowTransparent - Whether to allow transparent color option
 */
function ColorPicker({ value, onChange, label = 'Color', allowTransparent = false }) {
  const [showPicker, setShowPicker] = useState(false);
  const [recentColors, setRecentColors] = useState(() => {
    // Load recent colors from localStorage
    const saved = localStorage.getItem('recentTextColors');
    return saved ? JSON.parse(saved) : [];
  });
  const pickerRef = useRef(null);
  const canvasRef = useRef(null);

  // Preset colors
  const presetColors = [
    '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
    '#008000', '#800000', '#FFC0CB', '#A52A2A', '#808080',
  ];

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowPicker(false);
      }
    };

    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPicker]);

  // Draw color wheel on canvas
  useEffect(() => {
    if (!canvasRef.current || !showPicker) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = canvas.width / 2 - 5;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw color wheel
    for (let angle = 0; angle < 360; angle += 1) {
      const startAngle = (angle - 2) * Math.PI / 180;
      const endAngle = angle * Math.PI / 180;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();

      // Create gradient from center (white) to edge (full color)
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      gradient.addColorStop(0, '#FFFFFF');
      gradient.addColorStop(0.7, `hsl(${angle}, 100%, 50%)`);
      gradient.addColorStop(1, `hsl(${angle}, 100%, 30%)`);

      ctx.fillStyle = gradient;
      ctx.fill();
    }

    // Draw inner shadow for depth
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [showPicker]);

  const handleColorSelect = (color) => {
    onChange(color);
    
    // Add to recent colors (max 5)
    const updated = [color, ...recentColors.filter(c => c !== color)].slice(0, 5);
    setRecentColors(updated);
    localStorage.setItem('recentTextColors', JSON.stringify(updated));
    
    setShowPicker(false);
  };

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Get pixel color from canvas
    const ctx = canvas.getContext('2d');
    const pixelData = ctx.getImageData(x, y, 1, 1).data;
    const color = `#${[pixelData[0], pixelData[1], pixelData[2]]
      .map(x => x.toString(16).padStart(2, '0'))
      .join('')}`;

    handleColorSelect(color);
  };

  return (
    <div className="color-picker-wrapper" ref={pickerRef}>
      <label className="color-picker-label">{label}:</label>
      
      {/* Current Color Button */}
      <button
        className="color-picker-button"
        onClick={(e) => {
          e.stopPropagation();
          setShowPicker(!showPicker);
        }}
        title="Click to change color"
      >
        {value === 'transparent' ? (
          <div className="color-preview transparent-pattern" />
        ) : (
          <div 
            className="color-preview" 
            style={{ backgroundColor: value }}
          />
        )}
      </button>

      {/* Color Picker Dropdown */}
      {showPicker && (
        <div className="color-picker-dropdown" onClick={(e) => e.stopPropagation()}>
          {/* Transparent Option */}
          {allowTransparent && (
            <div className="color-section">
              <button
                className={`transparent-button ${value === 'transparent' ? 'active' : ''}`}
                onClick={() => handleColorSelect('transparent')}
                title="Transparent background"
              >
                <div className="transparent-pattern"></div>
                <span>Transparent</span>
              </button>
            </div>
          )}

          {/* Color Wheel */}
          <div className="color-wheel-section">
            <canvas
              ref={canvasRef}
              className="color-wheel"
              width={180}
              height={180}
              onClick={handleCanvasClick}
            />
          </div>

          {/* Preset Colors */}
          <div className="color-section">
            <div className="color-section-title">Preset Colors</div>
            <div className="color-grid">
              {presetColors.map(color => (
                <button
                  key={color}
                  className={`color-tile ${value === color ? 'active' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorSelect(color)}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* Recent Colors */}
          {recentColors.length > 0 && (
            <div className="color-section">
              <div className="color-section-title">Recent Colors</div>
              <div className="color-grid">
                {recentColors.map((color, index) => (
                  <button
                    key={`${color}-${index}`}
                    className={`color-tile ${value === color ? 'active' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => handleColorSelect(color)}
                    title={color}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Hex Input */}
          <div className="color-section">
            <input
              type="text"
              className="color-hex-input"
              value={value}
              onChange={(e) => {
                const hex = e.target.value;
                if (/^#[0-9A-F]{6}$/i.test(hex)) {
                  handleColorSelect(hex);
                }
              }}
              placeholder="#000000"
              maxLength={7}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default ColorPicker;

