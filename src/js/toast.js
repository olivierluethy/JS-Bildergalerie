// Bottom-center toast stack. Facts + direction, never mood (STYLEGUIDE §5).
import { iconEl } from './icons.js';

let container;

function ensureContainer() {
  if (container) return container;
  container = document.createElement('div');
  container.className =
    'fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 ' +
    'pointer-events-none';
  container.setAttribute('aria-live', 'polite');
  document.body.appendChild(container);
  return container;
}

const VARIANTS = {
  info: { icon: 'info', accent: 'text-brand' },
  success: { icon: 'check', accent: 'text-[color:#43b06a]' },
  warn: { icon: 'triangle-alert', accent: 'text-pin' },
};

/**
 * Show a toast.
 * @param {string} message
 * @param {{variant?:'info'|'success'|'warn', duration?:number, action?:{label:string,onClick:()=>void}}} opts
 */
export function toast(message, opts = {}) {
  const { variant = 'info', duration = 3500, action } = opts;
  const root = ensureContainer();
  const conf = VARIANTS[variant] || VARIANTS.info;

  const el = document.createElement('div');
  el.className =
    'pointer-events-auto flex max-w-md items-center gap-3 rounded-lg bg-ink ' +
    'text-bg shadow-pop px-4 py-3 text-sm animate-toast-in';
  el.setAttribute('role', variant === 'warn' ? 'alert' : 'status');
  if (variant === 'warn') el.setAttribute('aria-live', 'assertive');

  const iconWrap = document.createElement('span');
  iconWrap.className = `shrink-0 ${conf.accent}`;
  iconWrap.appendChild(iconEl(conf.icon, { className: 'size-[18px]' }));

  const text = document.createElement('span');
  text.className = 'min-w-0 flex-1';
  text.textContent = message;

  el.append(iconWrap, text);

  if (action) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className =
      'shrink-0 rounded-md px-2 py-1 font-mono text-label uppercase ' +
      'tracking-[0.08em] text-bg/90 underline-offset-2 hover:underline ' +
      'cursor-pointer';
    btn.textContent = action.label;
    btn.addEventListener('click', () => {
      action.onClick();
      dismiss();
    });
    el.appendChild(btn);
  }

  root.appendChild(el);

  let timer;
  function dismiss() {
    clearTimeout(timer);
    el.style.transition = 'opacity .2s ease, transform .2s ease';
    el.style.opacity = '0';
    el.style.transform = 'translateY(6px)';
    setTimeout(() => el.remove(), 220);
  }

  timer = setTimeout(dismiss, duration);
  el.addEventListener('mouseenter', () => clearTimeout(timer));
  el.addEventListener('mouseleave', () => {
    timer = setTimeout(dismiss, 1500);
  });

  return dismiss;
}
