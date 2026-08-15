// Pure helpers: URL normalization, provenance/format derivation, colours,
// formatting. No DOM, no storage — safe to reuse anywhere.

export const SUPPORTED_FORMATS = [
  'png',
  'jpg',
  'jpeg',
  'webp',
  'gif',
  'svg',
  'avif',
  'bmp',
];

// Deterministic domain pin palette (see STYLEGUIDE §2).
export const PIN_PALETTE = [
  '#E24B2E',
  '#0E6E6A',
  '#E0A526',
  '#7A5AF8',
  '#2E8B57',
  '#D6336C',
  '#3B82C4',
  '#B5651D',
  '#8AAE2B',
  '#C74BB0',
];

/** Small, stable string hash (djb2-ish) → unsigned int. */
export function hashString(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i += 1) {
    h = (h * 33) ^ str.charCodeAt(i);
  }
  return h >>> 0;
}

/** Deterministic pin colour for a domain. */
export function pinColor(domain) {
  if (!domain) return PIN_PALETTE[0];
  return PIN_PALETTE[hashString(domain) % PIN_PALETTE.length];
}

/**
 * Normalize a URL for dedupe: lowercase host, strip trailing slash and
 * fragment, keep query. Returns null if not parseable as http(s).
 */
export function normalizeUrl(raw) {
  if (!raw) return null;
  let input = String(raw).trim();
  if (!input) return null;
  // Allow protocol-relative and bare-domain inputs by defaulting to https.
  if (input.startsWith('//')) input = `https:${input}`;
  else if (!/^https?:\/\//i.test(input)) {
    // Only auto-prefix things that look like a host/path, not gibberish.
    if (/^[\w-]+(\.[\w-]+)+/.test(input)) input = `https://${input}`;
  }
  let u;
  try {
    u = new URL(input);
  } catch {
    return null;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  u.hostname = u.hostname.toLowerCase();
  u.hash = '';
  let out = u.toString();
  // Strip a single trailing slash on the path (but keep "https://host/").
  if (out.endsWith('/') && u.pathname !== '/') out = out.slice(0, -1);
  return out;
}

/** Extract the registrable-ish domain (hostname without leading www.). */
export function deriveDomain(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/** Best-effort source page = the image URL's origin. */
export function deriveSourcePage(url) {
  try {
    return new URL(url).origin;
  } catch {
    return '';
  }
}

/**
 * Derive the image format from the URL's extension. Returns a lowercase
 * format string (e.g. "jpg") or '' when unknown. jpeg is kept as jpeg for
 * the badge but treated as a supported format.
 */
export function deriveFormat(url) {
  try {
    const { pathname } = new URL(url);
    const m = pathname.toLowerCase().match(/\.([a-z0-9]+)$/);
    if (!m) return '';
    const ext = m[1];
    return SUPPORTED_FORMATS.includes(ext) ? ext : '';
  } catch {
    return '';
  }
}

/** Whether a URL's extension is a supported image format (or extensionless). */
export function isSupportedOrUnknown(url) {
  try {
    const { pathname } = new URL(url);
    const m = pathname.toLowerCase().match(/\.([a-z0-9]+)$/);
    if (!m) return true; // extensionless URLs are allowed; load decides
    return SUPPORTED_FORMATS.includes(m[1]);
  } catch {
    return false;
  }
}

/**
 * Favicon service for a domain (graceful — errors hide the img and the
 * domain pin-dot remains). DuckDuckGo returns a generic icon with HTTP 200
 * for unknown domains, avoiding the 404 console noise Google's endpoint now
 * produces for domains without a favicon.
 */
export function faviconUrl(domain) {
  if (!domain) return '';
  return `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`;
}

let idCounter = 0;
/** Collision-resistant id without Date.now/Math.random dependency at import. */
export function makeId() {
  idCounter += 1;
  return `img_${Date.now().toString(36)}_${idCounter.toString(36)}`;
}

export function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function debounce(fn, ms = 200) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

const DATE_FMT = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});
const TIME_FMT = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
});

/** YYYY-MM-DD key in local time, for day-grouping. */
export function dayKey(ts) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatDay(ts) {
  return DATE_FMT.format(new Date(ts));
}

export function formatTime(ts) {
  return TIME_FMT.format(new Date(ts));
}

/** Compact relative label ("2h ago", "3d ago", else a date). */
export function relativeTime(ts) {
  const diff = Date.now() - ts;
  const sec = Math.round(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(ts));
}
