// Light/dark theme via Tailwind's class strategy. Persisted in localStorage,
// initialised from the system preference on first visit.
import { iconEl } from './icons.js';

const KEY = 'pa:theme';

function stored() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function systemPrefersDark() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

function isDark() {
  const pref = stored();
  if (pref === 'dark') return true;
  if (pref === 'light') return false;
  return systemPrefersDark();
}

function apply(dark) {
  document.documentElement.classList.toggle('dark', dark);
  document
    .querySelector('meta[name="color-scheme"]')
    ?.setAttribute('content', dark ? 'dark' : 'light');
}

function updateButton(btn, dark) {
  btn.replaceChildren(
    iconEl(dark ? 'sun' : 'moon', { className: 'size-[18px]' }),
  );
  btn.setAttribute(
    'aria-label',
    dark ? 'Switch to light theme' : 'Switch to dark theme',
  );
  btn.setAttribute('title', dark ? 'Light theme' : 'Dark theme');
}

/** Apply the persisted/system theme immediately (call before paint). */
export function initTheme() {
  apply(isDark());
}

/** Wire a toggle button. */
export function mountThemeToggle(btn) {
  updateButton(btn, isDark());
  btn.addEventListener('click', () => {
    const next = !document.documentElement.classList.contains('dark');
    apply(next);
    try {
      localStorage.setItem(KEY, next ? 'dark' : 'light');
    } catch {
      /* ignore */
    }
    updateButton(btn, next);
  });

  // Follow the system preference only while the user hasn't chosen explicitly.
  window
    .matchMedia?.('(prefers-color-scheme: dark)')
    .addEventListener('change', (e) => {
      if (stored()) return;
      apply(e.matches);
      updateButton(btn, e.matches);
    });
}
