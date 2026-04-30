// Input:  Component reading user's theme preference from localStorage
// Output: No hydration mismatch — consistent server/client render

'use client';
import { useState, useEffect } from 'react';

export default function ThemeProvider({ children }) {
  // Start with a default that matches on both server and client
  const [theme, setTheme] = useState('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Only runs on client after hydration
    const saved = localStorage.getItem('theme') || 'light';
    setTheme(saved);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
    }
  }, [theme, mounted]);

  return (
    <div data-theme={mounted ? theme : undefined}>
      {children}
      {mounted && (
        <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}>
          Toggle Theme
        </button>
      )}
    </div>
  );
}
