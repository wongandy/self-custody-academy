export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'sca-theme';

export function getStoredTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // localStorage can be unavailable (private browsing); fall back to dark
  }
  return 'dark';
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle('theme-light', theme === 'light');
  root.classList.toggle('theme-dark', theme === 'dark');
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // preference simply won't persist if storage is blocked
  }
}
