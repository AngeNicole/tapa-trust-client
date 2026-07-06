import { useState } from 'react';
import { Icons } from './shared/icons.jsx';

// Light/dark toggle. Persists the choice in localStorage and sets a class on
// <html>; an explicit choice overrides the OS preference (see styles.css).
export function applyStoredTheme() {
  try {
    const t = localStorage.getItem('tapa_theme');
    if (t === 'dark' || t === 'light') document.documentElement.classList.add(t);
  } catch { /* ignore */ }
}

function current() {
  const c = document.documentElement.classList;
  if (c.contains('dark')) return 'dark';
  if (c.contains('light')) return 'light';
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeToggle() {
  const [theme, setTheme] = useState(current);
  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    const el = document.documentElement;
    el.classList.remove('dark', 'light');
    el.classList.add(next);
    try { localStorage.setItem('tapa_theme', next); } catch { /* ignore */ }
    setTheme(next);
  }
  return (
    <button type="button" className="icon-btn" onClick={toggle}
      aria-label="Toggle dark mode" title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
      {theme === 'dark' ? Icons.sun : Icons.moon}
    </button>
  );
}
