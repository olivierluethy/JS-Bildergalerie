// Versioned localStorage store for the image collection.
// Handles migration from the legacy `toDos` schema, normalized-URL dedupe,
// and change notification. Single source of truth for gallery state.

import {
  normalizeUrl,
  deriveDomain,
  deriveSourcePage,
  deriveFormat,
  makeId,
} from './util.js';

const STORAGE_KEY = 'pa:gallery';
const SCHEMA_VERSION = 2;
const LEGACY_INDEX_KEY = 'toDos';

/** @typedef {{id:string,url:string,normalized:string,sourcePage:string,domain:string,format:string,addedAt:number}} ImageRecord */

let state = { version: SCHEMA_VERSION, images: [] };
const listeners = new Set();

function emit() {
  for (const fn of listeners) fn(getAll());
}

/** Subscribe to state changes. Returns an unsubscribe function. */
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to persist gallery', err);
  }
}

/** Build a full record from a raw URL (+ optional timestamp / id). */
function makeRecord(url, { addedAt, id } = {}) {
  const normalized = normalizeUrl(url) || url;
  return {
    id: id || makeId(),
    url,
    normalized,
    sourcePage: deriveSourcePage(url),
    domain: deriveDomain(url),
    format: deriveFormat(url),
    addedAt: addedAt ?? Date.now(),
  };
}

/** Migrate the legacy toDos/toDo_* schema into records (non-destructive). */
function migrateLegacy() {
  let index;
  try {
    index = JSON.parse(localStorage.getItem(LEGACY_INDEX_KEY));
  } catch {
    index = null;
  }
  if (!Array.isArray(index) || index.length === 0) return [];

  const seen = new Set();
  const migrated = [];
  for (const key of index) {
    let raw;
    try {
      raw = JSON.parse(localStorage.getItem(key));
    } catch {
      raw = null;
    }
    const url = raw && typeof raw.value === 'string' ? raw.value : null;
    if (!url) continue;
    const rec = makeRecord(url, { addedAt: legacyTimestamp(key) });
    if (seen.has(rec.normalized)) continue;
    seen.add(rec.normalized);
    migrated.push(rec);
  }
  return migrated;
}

/** Recover a timestamp from a legacy id like `toDo_1699999999999`. */
function legacyTimestamp(key) {
  const m = /toDo_(\d+)/.exec(key || '');
  const n = m ? Number(m[1]) : NaN;
  return Number.isFinite(n) && n > 0 ? n : Date.now();
}

/** Load persisted state, migrating from any older shape without data loss. */
export function load() {
  let stored = null;
  try {
    stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    stored = null;
  }

  if (stored && Array.isArray(stored.images)) {
    // Re-derive any fields missing from an older v2 write, keep the rest.
    state = {
      version: SCHEMA_VERSION,
      images: stored.images
        .filter((r) => r && typeof r.url === 'string')
        .map((r) => ({
          ...makeRecord(r.url, { addedAt: r.addedAt, id: r.id }),
          // Preserve explicitly-stored provenance if present.
          sourcePage: r.sourcePage ?? deriveSourcePage(r.url),
          domain: r.domain ?? deriveDomain(r.url),
          format: r.format ?? deriveFormat(r.url),
          normalized: r.normalized ?? normalizeUrl(r.url) ?? r.url,
        })),
    };
    persist();
    return getAll();
  }

  // No v2 store yet — attempt legacy migration.
  const migrated = migrateLegacy();
  state = { version: SCHEMA_VERSION, images: migrated };
  persist();
  return getAll();
}

/** All records, newest first. */
export function getAll() {
  return [...state.images].sort((a, b) => b.addedAt - a.addedAt);
}

export function count() {
  return state.images.length;
}

export function getById(id) {
  return state.images.find((r) => r.id === id) || null;
}

/** Find an existing record by normalized URL (dedupe key). */
export function findByUrl(url) {
  const norm = normalizeUrl(url) || url;
  return state.images.find((r) => r.normalized === norm) || null;
}

/**
 * Add an image by URL. Returns
 *   { ok: true, record } on success, or
 *   { ok: false, reason: 'duplicate', existing } when already present.
 */
export function add(url, meta = {}) {
  const existing = findByUrl(url);
  if (existing) return { ok: false, reason: 'duplicate', existing };
  const record = makeRecord(url, meta);
  state.images.push(record);
  persist();
  emit();
  return { ok: true, record };
}

/** Remove a record by id. Returns true if something was removed. */
export function remove(id) {
  const before = state.images.length;
  state.images = state.images.filter((r) => r.id !== id);
  if (state.images.length === before) return false;
  persist();
  emit();
  return true;
}

/** Distinct domains with counts, sorted by count desc then name. */
export function domainStats() {
  const map = new Map();
  for (const r of state.images) {
    map.set(r.domain, (map.get(r.domain) || 0) + 1);
  }
  return [...map.entries()]
    .map(([domain, n]) => ({ domain, count: n }))
    .sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain));
}
