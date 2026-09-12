import { requireElement } from './dom';

export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'quickshare:theme';

function readStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : null;
  } catch {
    return null;
  }
}

function storeTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    return;
  }
}

function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export function activeTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export function initTheme(): void {
  const toggle = requireElement('theme-toggle', HTMLButtonElement);

  const sync = (): void => {
    const next = activeTheme() === 'dark' ? 'light' : 'dark';
    toggle.setAttribute('aria-label', `Switch to ${next} theme`);
    toggle.setAttribute('title', `Switch to ${next} theme`);
  };

  applyTheme(readStoredTheme() ?? 'dark');
  sync();

  toggle.addEventListener('click', () => {
    const next: Theme = activeTheme() === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    storeTheme(next);
    sync();
  });
}
