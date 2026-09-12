import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // 1. Check local storage preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme;
    }

    // 2. Check system preferences
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }

    // 3. Fallback default
    return 'light';
  });

  useEffect(() => {
    // Apply theme to the document HTML element
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Method to toggle theme between 'light' and 'dark'
  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  // Allow setting theme explicitly (e.g. from backend defaults if no local preference is set yet)
  const setSystemDefaultTheme = (defaultTheme) => {
    const hasLocalPreference = localStorage.getItem('theme');
    if (!hasLocalPreference && (defaultTheme === 'light' || defaultTheme === 'dark')) {
      setTheme(defaultTheme);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, setSystemDefaultTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
