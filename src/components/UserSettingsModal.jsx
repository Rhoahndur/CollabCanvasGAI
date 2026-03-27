import { useState, useEffect } from 'react';
import styles from './UserSettingsModal.module.css';

/**
 * UserSettingsModal - User preferences modal
 * Currently supports theme selection
 */
export default function UserSettingsModal({ isOpen, onClose, theme, onThemeChange }) {
  const [selectedTheme, setSelectedTheme] = useState(theme);

  useEffect(() => {
    setSelectedTheme(theme);
  }, [theme]);

  if (!isOpen) return null;

  const handleThemeSelect = (newTheme) => {
    setSelectedTheme(newTheme);
    onThemeChange(newTheme);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const themeOptions = [
    {
      value: 'light',
      label: 'Light',
      icon: '☀️',
      description: 'Clean, bright interface',
    },
    {
      value: 'dark',
      label: 'Dark',
      icon: '🌙',
      description: 'Easy on the eyes',
    },
    {
      value: 'system',
      label: 'System',
      icon: '💻',
      description: 'Match your device',
    },
  ];

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      className={styles['settings-modal-overlay']}
      onClick={handleOverlayClick}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className={styles['settings-modal']}>
        <div className={styles['settings-modal-header']}>
          <h2>Settings</h2>
          <button
            className={styles['settings-modal-close']}
            onClick={onClose}
            aria-label="Close settings"
          >
            <svg
              viewBox="0 0 24 24"
              width="24"
              height="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className={styles['settings-modal-content']}>
          <div className={styles['settings-section']}>
            <h3 className={styles['settings-section-title']}>Appearance</h3>
            <p className={styles['settings-section-description']}>
              Customize how CollabCanvas looks for you
            </p>

            <div className={styles['theme-options']}>
              {themeOptions.map((option) => (
                <button
                  key={option.value}
                  className={`${styles['theme-option']} ${selectedTheme === option.value ? styles.active : ''}`}
                  onClick={() => handleThemeSelect(option.value)}
                >
                  <span className={styles['theme-option-icon']}>{option.icon}</span>
                  <div className={styles['theme-option-content']}>
                    <div className={styles['theme-option-label']}>{option.label}</div>
                    <div className={styles['theme-option-description']}>{option.description}</div>
                  </div>
                  {selectedTheme === option.value && (
                    <svg
                      className={styles['theme-option-check']}
                      viewBox="0 0 24 24"
                      width="20"
                      height="20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={styles['settings-modal-footer']}>
          <p className={styles['settings-info']}>
            Theme preference is saved locally on your device
          </p>
        </div>
      </div>
    </div>
  );
}
