// Timeline view: chronological, grouped by day, each entry showing the image,
// its source, and the time added. Day markers use the day's dominant pin colour.
import {
  provTagHtml,
  formatBadgeHtml,
  wireCardImage,
  applyTooltips,
} from '../components.js';
import { iconSvg } from '../icons.js';
import { dayKey, formatDay, formatTime, pinColor, escapeHtml } from '../util.js';

function dominantColor(records) {
  const counts = new Map();
  for (const r of records) counts.set(r.domain, (counts.get(r.domain) || 0) + 1);
  let best = '';
  let max = -1;
  for (const [domain, n] of counts) {
    if (n > max) {
      max = n;
      best = domain;
    }
  }
  return pinColor(best);
}

function entryHtml(rec) {
  return `<div class="group flex items-center gap-3 rounded-xl border border-line bg-surface p-2.5 shadow-card transition-colors hover:border-ink/20"
      data-card data-id="${rec.id}">
      <div class="relative size-16 shrink-0 overflow-hidden rounded-lg bg-surface-2">
        <div class="shimmer absolute inset-0" data-shimmer></div>
        <img src="${escapeHtml(rec.url)}" alt="Image from ${escapeHtml(rec.domain || 'unknown')}"
          loading="lazy" data-thumb data-action="open"
          class="relative z-[1] size-full cursor-zoom-in object-cover opacity-0 transition-opacity duration-300" />
        <div data-broken hidden class="absolute inset-0 z-[2] flex items-center justify-center bg-surface-2 text-ink-soft">
          ${iconSvg('image-off', { className: 'size-5' })}
        </div>
      </div>
      <div class="flex min-w-0 flex-1 items-center gap-2">
        ${provTagHtml(rec)}
        ${formatBadgeHtml(rec)}
      </div>
      <time class="shrink-0 font-mono text-label text-ink-soft">${formatTime(rec.addedAt)}</time>
      <div class="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <button type="button" data-action="source" class="btn-icon" aria-label="Open source">${iconSvg(
          'external-link',
          { className: 'size-4' },
        )}</button>
        <button type="button" data-action="copy" class="btn-icon" aria-label="Copy URL">${iconSvg(
          'copy',
          { className: 'size-4' },
        )}</button>
        <button type="button" data-action="delete" class="btn-icon hover:text-pin" aria-label="Delete">${iconSvg(
          'trash-2',
          { className: 'size-4' },
        )}</button>
      </div>
    </div>`;
}

export function renderTimeline(container, records, actions) {
  if (records.length === 0) {
    container.innerHTML = `<div class="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <span class="text-ink-soft">${iconSvg('calendar-clock', { className: 'size-8' })}</span>
        <h2 class="font-display text-3xl text-ink">Nothing on the timeline yet</h2>
        <p class="max-w-sm text-sm text-ink-soft">Images you add will appear here, grouped by the day you saved them.</p>
      </div>`;
    return;
  }

  // Group by local day (records already sorted newest-first).
  const groups = new Map();
  for (const rec of records) {
    const key = dayKey(rec.addedAt);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(rec);
  }

  const sections = [...groups.entries()]
    .map(([, recs]) => {
      const color = dominantColor(recs);
      return `<section class="relative pl-6">
          <div class="absolute left-[3px] top-2 size-2.5 rounded-full ring-2 ring-bg" style="background:${color}"></div>
          <div class="absolute bottom-0 left-[7px] top-6 w-px bg-line"></div>
          <header class="mb-3 flex items-baseline gap-3">
            <h3 class="font-display text-2xl text-ink">${formatDay(recs[0].addedAt)}</h3>
            <span class="font-mono text-micro uppercase tracking-[0.08em] text-ink-soft">${recs.length} ${
              recs.length === 1 ? 'image' : 'images'
            }</span>
          </header>
          <div class="mb-8 space-y-2">${recs.map(entryHtml).join('')}</div>
        </section>`;
    })
    .join('');

  container.innerHTML = `<div class="mx-auto max-w-3xl">${sections}</div>`;
  container.querySelectorAll('[data-card]').forEach(wireCardImage);
  applyTooltips(container);

  // Replace any handler from a previous render before attaching a new one.
  if (container._tlHandler) container.removeEventListener('click', container._tlHandler);
  container._tlHandler = onClick;
  container.addEventListener('click', onClick);

  function onClick(e) {
    const card = e.target.closest('[data-card]');
    if (!card) return;
    const id = card.dataset.id;
    const action = e.target.closest('[data-action]')?.dataset.action;
    e.preventDefault();
    if (action === 'delete') actions.delete(id, card);
    else if (action === 'source') actions.source(id);
    else if (action === 'copy') actions.copy(id);
    else actions.open(id);
  }
}
