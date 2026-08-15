// Lucide icon helper. We import only the icons the app uses and expose two
// helpers: iconSvg() for template-string rendering and setIcon() for DOM nodes.
import {
  createElement,
  Plus,
  ClipboardPaste,
  Link,
  ExternalLink,
  Copy,
  Trash2,
  Maximize2,
  ZoomIn,
  ZoomOut,
  X,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Search,
  LayoutGrid,
  CalendarClock,
  Share2,
  ImageOff,
  Check,
  Info,
  TriangleAlert,
  RotateCcw,
  Images,
  Locate,
} from '../../vendor/lucide.js';

const REGISTRY = {
  plus: Plus,
  'clipboard-paste': ClipboardPaste,
  link: Link,
  'external-link': ExternalLink,
  copy: Copy,
  'trash-2': Trash2,
  'maximize-2': Maximize2,
  'zoom-in': ZoomIn,
  'zoom-out': ZoomOut,
  x: X,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  sun: Sun,
  moon: Moon,
  search: Search,
  'layout-grid': LayoutGrid,
  'calendar-clock': CalendarClock,
  'share-2': Share2,
  'image-off': ImageOff,
  check: Check,
  info: Info,
  'triangle-alert': TriangleAlert,
  'rotate-ccw': RotateCcw,
  images: Images,
  locate: Locate,
};

/** Build an SVG element for the named icon. */
export function iconEl(name, { className = 'size-[18px]', stroke = 1.75 } = {}) {
  const node = REGISTRY[name];
  if (!node) throw new Error(`Unknown icon: ${name}`);
  const el = createElement(node);
  el.setAttribute('stroke-width', String(stroke));
  el.setAttribute('aria-hidden', 'true');
  if (className) el.setAttribute('class', className);
  return el;
}

/** Icon as an HTML string, for use inside template literals. */
export function iconSvg(name, opts) {
  return iconEl(name, opts).outerHTML;
}

/** Replace <span data-icon="name" data-class="..."> placeholders in a root. */
export function hydrateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((slot) => {
    const name = slot.getAttribute('data-icon');
    const className = slot.getAttribute('data-class') || 'size-[18px]';
    const stroke = slot.getAttribute('data-stroke') || 1.75;
    try {
      slot.replaceChildren(iconEl(name, { className, stroke: Number(stroke) }));
      slot.removeAttribute('data-icon');
    } catch {
      /* leave unknown placeholders untouched */
    }
  });
}
