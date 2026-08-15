// Add-image modal: type a URL, paste (button + Ctrl/Cmd+V), or drag a link.
// Live preview with derived provenance + format, duplicate detection.
import { iconSvg, hydrateIcons } from './icons.js';
import { toast } from './toast.js';
import * as store from './store.js';
import {
  normalizeUrl,
  deriveDomain,
  deriveFormat,
  deriveSourcePage,
  isSupportedOrUnknown,
  faviconUrl,
  pinColor,
  escapeHtml,
  debounce,
} from './util.js';

let refs = null;
let candidate = null; // last validated, loadable URL
let lastFocused = null;
let hooks = { onAdded: () => {}, onDuplicate: () => {} };

const TEMPLATE = `
<div data-backdrop
     class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4 backdrop-blur-sm animate-fade-in sm:items-center">
  <div role="dialog" aria-modal="true" aria-labelledby="addTitle"
       class="w-full max-w-lg rounded-xl border border-line bg-surface shadow-pop animate-pop-in">
    <div class="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
      <div>
        <h2 id="addTitle" class="font-display text-2xl leading-tight text-ink">Add an image</h2>
        <p class="mt-0.5 text-sm text-ink-soft">Paste or drop a link — we remember where it came from.</p>
      </div>
      <button type="button" data-close class="btn-icon -mr-1.5" aria-label="Close">
        ${iconSvg('x', { className: 'size-5' })}
      </button>
    </div>

    <div class="space-y-4 px-5 py-5">
      <!-- URL input + paste -->
      <div>
        <label for="urlInput" class="mb-1.5 block font-mono text-label uppercase tracking-[0.08em] text-ink-soft">Image URL</label>
        <div class="flex gap-2">
          <div class="relative flex-1">
            <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft">${iconSvg(
              'link',
              { className: 'size-4' },
            )}</span>
            <input id="urlInput" type="url" inputmode="url" autocomplete="off" spellcheck="false"
              placeholder="https://example.com/photo.jpg"
              class="field pl-9" />
          </div>
          <button type="button" data-paste class="btn-secondary shrink-0">
            ${iconSvg('clipboard-paste', { className: 'size-[18px]' })}
            <span class="hidden sm:inline">Paste</span>
          </button>
        </div>
        <p data-hint class="mt-1.5 min-h-[1rem] font-mono text-micro text-ink-soft"></p>
      </div>

      <!-- Dropzone -->
      <div data-dropzone tabindex="0" role="button" aria-label="Drop an image link here"
        class="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-line bg-surface-2/50 px-4 py-5 text-center transition-colors duration-150 hover:border-ink/25">
        ${iconSvg('link', { className: 'size-5 text-ink-soft' })}
        <p class="text-sm text-ink-soft">Drag an image's <strong class="font-semibold text-ink">link</strong> here</p>
        <p class="font-mono text-micro text-ink-soft/80">or press ${'Ctrl/⌘ + V'} to paste</p>
      </div>

      <!-- Preview -->
      <div data-preview hidden class="overflow-hidden rounded-xl border border-line bg-surface-2">
        <div class="relative aspect-video bg-surface-2">
          <div class="shimmer absolute inset-0" data-prev-shimmer></div>
          <img data-prev-img alt="Preview" class="relative z-[1] size-full object-contain opacity-0 transition-opacity duration-300" />
          <div data-prev-badge class="absolute left-2 top-2 z-[2]"></div>
        </div>
        <div data-prev-meta class="flex items-center gap-2 border-t border-line px-3 py-2.5"></div>
      </div>
    </div>

    <div class="flex items-center justify-end gap-2 border-t border-line px-5 py-4">
      <button type="button" data-close class="btn-secondary">Cancel</button>
      <button type="button" data-confirm class="btn-primary" disabled>
        ${iconSvg('plus', { className: 'size-[18px]' })} Add image
      </button>
    </div>
  </div>
</div>`;

/** Extract a usable URL from clipboard/drop text (first http(s) token). */
function extractUrl(text) {
  if (!text) return '';
  const line = text.split(/[\r\n]/).find((l) => l.trim());
  const trimmed = (line || text).trim();
  const m = trimmed.match(/https?:\/\/\S+/i);
  return m ? m[0] : trimmed;
}

function setHint(msg, tone = 'muted') {
  const cls = {
    muted: 'text-ink-soft',
    error: 'text-pin',
    ok: 'text-brand',
  }[tone];
  refs.hint.className = `mt-1.5 min-h-[1rem] font-mono text-micro ${cls}`;
  refs.hint.textContent = msg;
}

function resetPreview() {
  candidate = null;
  refs.preview.hidden = true;
  refs.confirm.disabled = true;
  refs.prevImg.style.opacity = '0';
}

/** Validate + preview the current input value. */
const runPreview = debounce(() => validate(refs.input.value), 350);

function validate(raw) {
  const url = extractUrl(raw);
  if (!url) {
    resetPreview();
    setHint('');
    return;
  }
  const norm = normalizeUrl(url);
  if (!norm) {
    resetPreview();
    setHint('That doesn’t look like a valid http(s) URL.', 'error');
    return;
  }
  if (!isSupportedOrUnknown(norm)) {
    resetPreview();
    setHint('Unsupported format. Use png, jpg, webp, gif, svg, avif or bmp.', 'error');
    return;
  }

  const existing = store.findByUrl(norm);
  if (existing) {
    resetPreview();
    setHint('Already in your gallery.', 'error');
    return;
  }

  setHint('Checking the link…');
  refs.preview.hidden = false;
  refs.prevImg.style.opacity = '0';
  refs.prevShimmer.style.display = '';

  const probe = new Image();
  probe.onload = () => {
    candidate = norm;
    refs.prevImg.src = norm;
    refs.prevImg.style.opacity = '1';
    refs.prevShimmer.style.display = 'none';
    renderPreviewMeta(norm);
    refs.confirm.disabled = false;
    setHint('Looks good — ready to add.', 'ok');
  };
  probe.onerror = () => {
    resetPreview();
    refs.preview.hidden = false;
    refs.prevShimmer.style.display = 'none';
    refs.prevMeta.innerHTML = `<span class="text-sm text-ink-soft">Couldn’t load that image. Check the link.</span>`;
    setHint('The image failed to load.', 'error');
  };
  probe.src = norm;
}

function renderPreviewMeta(url) {
  const domain = deriveDomain(url);
  const format = deriveFormat(url);
  refs.prevBadge.innerHTML = format
    ? `<span class="badge">${escapeHtml(format)}</span>`
    : '';
  refs.prevMeta.innerHTML = `
    <img src="${escapeHtml(faviconUrl(domain))}" alt="" width="16" height="16"
      class="size-4 rounded-sm" onerror="this.style.display='none'" />
    <span class="prov-dot" style="background:${pinColor(domain)}"></span>
    <span class="min-w-0 flex-1 truncate font-mono text-label text-ink">${escapeHtml(
      domain || 'unknown source',
    )}</span>
    <span class="font-mono text-micro text-ink-soft">${escapeHtml(
      deriveSourcePage(url),
    )}</span>`;
}

function confirmAdd() {
  if (!candidate) return;
  const res = store.add(candidate);
  if (!res.ok && res.reason === 'duplicate') {
    close();
    toast('This image is already in your gallery', {
      variant: 'warn',
      action: { label: 'Show it', onClick: () => hooks.onDuplicate(res.existing) },
    });
    return;
  }
  if (res.ok) {
    close();
    toast('Image added to your gallery', { variant: 'success' });
    hooks.onAdded(res.record);
  }
}

async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    if (!text) {
      setHint('Clipboard is empty.', 'error');
      return;
    }
    refs.input.value = extractUrl(text);
    validate(refs.input.value);
  } catch {
    setHint('Can’t read the clipboard — paste with Ctrl/⌘+V instead.', 'error');
    refs.input.focus();
  }
}

// ---- Drag & drop: links only, reject files -------------------------------
function onDragOver(e) {
  e.preventDefault();
  const hasFiles = Array.from(e.dataTransfer.types || []).includes('Files');
  refs.dropzone.classList.remove('border-line', 'border-brand', 'border-pin');
  refs.dropzone.classList.add(hasFiles ? 'border-pin' : 'border-brand');
  refs.dropzone.classList.toggle('bg-brand/5', !hasFiles);
  refs.dropzone.classList.toggle('bg-pin/5', hasFiles);
}
function onDragLeave(e) {
  e.preventDefault();
  resetDropzone();
}
function resetDropzone() {
  refs.dropzone.classList.remove(
    'border-brand',
    'border-pin',
    'bg-brand/5',
    'bg-pin/5',
  );
  refs.dropzone.classList.add('border-line');
}
function onDrop(e) {
  e.preventDefault();
  resetDropzone();
  const dt = e.dataTransfer;
  if (dt.files && dt.files.length > 0) {
    toast('Drag the image’s link, not the file', { variant: 'warn' });
    return;
  }
  const uri = dt.getData('text/uri-list');
  const text = dt.getData('text/plain');
  const url = extractUrl(uri || text);
  if (!url) {
    toast('No link found in what you dropped', { variant: 'warn' });
    return;
  }
  refs.input.value = url;
  validate(url);
}

// ---- open / close / focus trap -------------------------------------------
function trapFocus(e) {
  if (e.key !== 'Tab') return;
  const focusables = refs.dialog.querySelectorAll(
    'button, [href], input, [tabindex]:not([tabindex="-1"])',
  );
  const list = Array.from(focusables).filter((el) => !el.disabled && el.offsetParent !== null);
  if (list.length === 0) return;
  const first = list[0];
  const last = list[list.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    e.preventDefault();
    close();
    return;
  }
  if ((e.key === 'v' || e.key === 'V') && (e.ctrlKey || e.metaKey)) {
    // Let the native paste fill the input, then validate.
    setTimeout(() => validate(refs.input.value), 0);
  }
  trapFocus(e);
}

export function open() {
  lastFocused = document.activeElement;
  const root = document.getElementById('modalRoot');
  root.innerHTML = TEMPLATE;
  hydrateIcons(root);

  const q = (sel) => root.querySelector(sel);
  refs = {
    backdrop: q('[data-backdrop]'),
    dialog: q('[role="dialog"]'),
    input: q('#urlInput'),
    hint: q('[data-hint]'),
    dropzone: q('[data-dropzone]'),
    preview: q('[data-preview]'),
    prevImg: q('[data-prev-img]'),
    prevShimmer: q('[data-prev-shimmer]'),
    prevBadge: q('[data-prev-badge]'),
    prevMeta: q('[data-prev-meta]'),
    confirm: q('[data-confirm]'),
  };
  candidate = null;

  root.querySelectorAll('[data-close]').forEach((b) =>
    b.addEventListener('click', close),
  );
  refs.backdrop.addEventListener('mousedown', (e) => {
    if (e.target === refs.backdrop) close();
  });
  refs.confirm.addEventListener('click', confirmAdd);
  q('[data-paste]').addEventListener('click', pasteFromClipboard);
  refs.input.addEventListener('input', runPreview);
  refs.input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !refs.confirm.disabled) {
      e.preventDefault();
      confirmAdd();
    }
  });
  refs.dropzone.addEventListener('dragover', onDragOver);
  refs.dropzone.addEventListener('dragleave', onDragLeave);
  refs.dropzone.addEventListener('drop', onDrop);
  refs.dropzone.addEventListener('click', () => refs.input.focus());
  document.addEventListener('keydown', onKeydown);

  requestAnimationFrame(() => refs.input.focus());
}

export function close() {
  document.removeEventListener('keydown', onKeydown);
  const root = document.getElementById('modalRoot');
  root.innerHTML = '';
  refs = null;
  candidate = null;
  if (lastFocused && lastFocused.focus) lastFocused.focus();
}

export function initModal(callbacks = {}) {
  hooks = { ...hooks, ...callbacks };
}
