import { useState, useEffect } from 'react';

/**
 * Custom hook to manage theme preferences
 * Supports: light, dark, system
 */
export function useTheme() {
  const [theme, setTheme] = useState(() => {
    // Get saved preference or default to 'light'
    const saved = localStorage.getItem('theme-preference');
    return saved || 'light';
  });

  const [effectiveTheme, setEffectiveTheme] = useState('light');

  useEffect(() => {
    const updateEffectiveTheme = () => {
      let newTheme = theme;
      
      if (theme === 'system') {
        // Use system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        newTheme = prefersDark ? 'dark' : 'light';
      }
      
      setEffectiveTheme(newTheme);
      
      // Apply theme to document
      document.documentElement.setAttribute('data-theme', newTheme);
      
      // Save preference
      localStorage.setItem('theme-preference', theme);
    };

    updateEffectiveTheme();

    // Listen for system theme changes when in 'system' mode
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => updateEffectiveTheme();
      
      // Modern browsers
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
      } else {
        // Fallback for older browsers
        mediaQuery.addListener(handler);
        return () => mediaQuery.removeListener(handler);
      }
    }
  }, [theme]);

  const setThemePreference = (newTheme) => {
    if (['light', 'dark', 'system'].includes(newTheme)) {
      setTheme(newTheme);
    }
  };

  return {
    theme, // User preference: 'light', 'dark', or 'system'
    effectiveTheme, // Actual theme being used: 'light' or 'dark'
    setTheme: setThemePreference,
  };
}

