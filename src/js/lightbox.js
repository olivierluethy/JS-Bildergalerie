// Fullscreen lightbox: zoom (scroll / +/- / double-click), pan, keyboard nav
// (Esc / ← / →), and quick actions (open source, copy URL, delete).
import { iconSvg, hydrateIcons } from './icons.js';
import { toast } from './toast.js';
import { provTagHtml, formatBadgeHtml, applyTooltips } from './components.js';
import { escapeHtml, formatDay, formatTime } from './util.js';

let list = [];
let index = 0;
let scale = 1;
let tx = 0;
let ty = 0;
let dragging = false;
let dragStart = null;
let hooks = { onDelete: () => {} };
let refs = null;
let lastFocused = null;

const MIN = 1;
const MAX = 5;

const TEMPLATE = `
<div data-lb class="fixed inset-0 z-[55] flex flex-col bg-black/90 backdrop-blur-md animate-fade-in"
     role="dialog" aria-modal="true" aria-label="Image viewer">
  <!-- Top bar -->
  <div class="flex items-center gap-3 px-4 py-3 text-white">
    <div data-lb-prov class="min-w-0 flex-1 [&_.prov-tag]:text-white/80"></div>
    <div class="flex items-center gap-1">
      <button type="button" data-lb="zoomout" class="btn-icon text-white/80 hover:bg-white/10 hover:text-white" aria-label="Zoom out">${iconSvg(
        'zoom-out',
        { className: 'size-5' },
      )}</button>
      <span data-lb-zoom class="w-12 text-center font-mono text-micro text-white/70"></span>
      <button type="button" data-lb="zoomin" class="btn-icon text-white/80 hover:bg-white/10 hover:text-white" aria-label="Zoom in">${iconSvg(
        'zoom-in',
        { className: 'size-5' },
      )}</button>
      <span class="mx-1 h-5 w-px bg-white/15"></span>
      <button type="button" data-lb="source" class="btn-icon text-white/80 hover:bg-white/10 hover:text-white" aria-label="Open source">${iconSvg(
        'external-link',
        { className: 'size-5' },
      )}</button>
      <button type="button" data-lb="copy" class="btn-icon text-white/80 hover:bg-white/10 hover:text-white" aria-label="Copy URL">${iconSvg(
        'copy',
        { className: 'size-5' },
      )}</button>
      <button type="button" data-lb="delete" class="btn-icon text-white/80 hover:bg-white/10 hover:text-pin" aria-label="Delete">${iconSvg(
        'trash-2',
        { className: 'size-5' },
      )}</button>
      <span class="mx-1 h-5 w-px bg-white/15"></span>
      <button type="button" data-lb="close" class="btn-icon text-white/80 hover:bg-white/10 hover:text-white" aria-label="Close">${iconSvg(
        'x',
        { className: 'size-5' },
      )}</button>
    </div>
  </div>

  <!-- Stage -->
  <div data-lb-stage class="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4 select-none">
    <button type="button" data-lb="prev" aria-label="Previous image"
      class="absolute left-3 z-10 btn-icon size-11 bg-black/30 text-white hover:bg-black/50">${iconSvg(
        'chevron-left',
        { className: 'size-6' },
      )}</button>
    <img data-lb-img alt="" draggable="false"
      class="max-h-full max-w-full object-contain shadow-pop will-change-transform" />
    <button type="button" data-lb="next" aria-label="Next image"
      class="absolute right-3 z-10 btn-icon size-11 bg-black/30 text-white hover:bg-black/50">${iconSvg(
        'chevron-right',
        { className: 'size-6' },
      )}</button>
  </div>

  <!-- Bottom meta -->
  <div class="flex items-center justify-between gap-3 px-4 py-3 font-mono text-micro text-white/70">
    <span data-lb-cat></span>
    <span data-lb-count></span>
  </div>
</div>`;

function applyTransform() {
  refs.img.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  refs.img.style.cursor = scale > 1 ? (dragging ? 'grabbing' : 'grab') : 'zoom-in';
  refs.zoom.textContent = `${Math.round(scale * 100)}%`;
}

function resetZoom() {
  scale = 1;
  tx = 0;
  ty = 0;
  applyTransform();
}

function setZoom(next, cx, cy) {
  const clamped = Math.min(MAX, Math.max(MIN, next));
  if (clamped === scale) return;
  // Zoom toward the cursor when coordinates are provided.
  if (cx != null) {
    const rect = refs.stage.getBoundingClientRect();
    const ox = cx - rect.left - rect.width / 2;
    const oy = cy - rect.top - rect.height / 2;
    const ratio = clamped / scale;
    tx = ox - (ox - tx) * ratio;
    ty = oy - (oy - ty) * ratio;
  }
  scale = clamped;
  if (scale === 1) {
    tx = 0;
    ty = 0;
  }
  applyTransform();
}

function render() {
  const rec = list[index];
  if (!rec) return;
  resetZoom();
  refs.img.style.opacity = '0';
  refs.img.src = rec.url;
  refs.img.alt = rec.domain ? `Image from ${rec.domain}` : 'Saved image';
  refs.img.onload = () => {
    refs.img.style.transition = 'opacity .2s ease';
    refs.img.style.opacity = '1';
  };
  refs.prov.innerHTML = `${provTagHtml(rec)} ${formatBadgeHtml(rec)}`;
  refs.cat.textContent = `${formatDay(rec.addedAt)} · ${formatTime(rec.addedAt)}`;
  refs.count.textContent = `${index + 1} / ${list.length}`;
  const single = list.length <= 1;
  refs.root.querySelector('[data-lb="prev"]').style.display = single ? 'none' : '';
  refs.root.querySelector('[data-lb="next"]').style.display = single ? 'none' : '';
}

function go(delta) {
  if (list.length <= 1) return;
  index = (index + delta + list.length) % list.length;
  render();
}

function currentRecord() {
  return list[index];
}

function onKeydown(e) {
  switch (e.key) {
    case 'Escape':
      close();
      break;
    case 'ArrowLeft':
      go(-1);
      break;
    case 'ArrowRight':
      go(1);
      break;
    case '+':
    case '=':
      setZoom(scale + 0.4);
      break;
    case '-':
    case '_':
      setZoom(scale - 0.4);
      break;
    default:
      break;
  }
}

function onWheel(e) {
  e.preventDefault();
  setZoom(scale - Math.sign(e.deltaY) * 0.25, e.clientX, e.clientY);
}

function onPointerDown(e) {
  if (scale <= 1) return;
  dragging = true;
  dragStart = { x: e.clientX - tx, y: e.clientY - ty };
  refs.img.setPointerCapture?.(e.pointerId);
  applyTransform();
}
function onPointerMove(e) {
  if (!dragging) return;
  tx = e.clientX - dragStart.x;
  ty = e.clientY - dragStart.y;
  applyTransform();
}
function onPointerUp() {
  dragging = false;
  applyTransform();
}

function handleAction(action) {
  const rec = currentRecord();
  switch (action) {
    case 'close':
      close();
      break;
    case 'prev':
      go(-1);
      break;
    case 'next':
      go(1);
      break;
    case 'zoomin':
      setZoom(scale + 0.5);
      break;
    case 'zoomout':
      setZoom(scale - 0.5);
      break;
    case 'source': {
      const target = rec.url || rec.sourcePage;
      if (target) {
        const win = window.open(target, '_blank', 'noopener,noreferrer');
        if (!win)
          toast('Pop-up blocked — allow pop-ups to open the source', {
            variant: 'warn',
          });
      }
      break;
    }
    case 'copy':
      navigator.clipboard
        ?.writeText(rec.url)
        .then(() => toast('Link copied', { variant: 'success' }))
        .catch(() => toast('Couldn’t copy the link', { variant: 'warn' }));
      break;
    case 'delete': {
      const removed = rec;
      hooks.onDelete(removed.id);
      list = list.filter((r) => r.id !== removed.id);
      if (list.length === 0) {
        close();
      } else {
        index = Math.min(index, list.length - 1);
        render();
      }
      break;
    }
    default:
      break;
  }
}

export function openLightbox(records, startIndex = 0, callbacks = {}) {
  hooks = { ...hooks, ...callbacks };
  list = records.slice();
  index = Math.max(0, Math.min(startIndex, list.length - 1));
  lastFocused = document.activeElement;

  const root = document.getElementById('lightboxRoot');
  root.innerHTML = TEMPLATE;
  hydrateIcons(root);
  applyTooltips(root);

  refs = {
    root,
    el: root.querySelector('[data-lb]'),
    stage: root.querySelector('[data-lb-stage]'),
    img: root.querySelector('[data-lb-img]'),
    prov: root.querySelector('[data-lb-prov]'),
    zoom: root.querySelector('[data-lb-zoom]'),
    cat: root.querySelector('[data-lb-cat]'),
    count: root.querySelector('[data-lb-count]'),
  };

  root.querySelectorAll('[data-lb]').forEach((btn) => {
    const action = btn.getAttribute('data-lb');
    if (action === '') return;
    if (['prev', 'next', 'zoomin', 'zoomout', 'source', 'copy', 'delete', 'close'].includes(action)) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleAction(action);
      });
    }
  });

  refs.el.addEventListener('click', (e) => {
    if (e.target === refs.el || e.target === refs.stage) close();
  });
  refs.stage.addEventListener('wheel', onWheel, { passive: false });
  refs.img.addEventListener('dblclick', (e) => {
    if (scale > 1) resetZoom();
    else setZoom(2.5, e.clientX, e.clientY);
  });
  refs.img.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  document.addEventListener('keydown', onKeydown);

  render();
  requestAnimationFrame(() => refs.root.querySelector('[data-lb="close"]').focus());
}

export function close() {
  document.removeEventListener('keydown', onKeydown);
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', onPointerUp);
  const root = document.getElementById('lightboxRoot');
  if (root) root.innerHTML = '';
  refs = null;
  if (lastFocused && lastFocused.focus) lastFocused.focus();
}
