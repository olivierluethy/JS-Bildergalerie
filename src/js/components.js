// Shared, stateless render helpers so the provenance tag, badges and cards
// look identical across Gallery, Timeline, Lightbox and Network.
import { iconSvg } from './icons.js';
import { pinColor, faviconUrl, escapeHtml, relativeTime } from './util.js';

/** The signature provenance tag: favicon + domain-keyed pin dot + domain. */
export function provTagHtml(record, { showFavicon = true } = {}) {
  const domain = record.domain || 'unknown source';
  const color = pinColor(record.domain);
  const fav =
    showFavicon && record.domain
      ? `<img src="${escapeHtml(faviconUrl(record.domain))}" alt="" width="14" height="14"
            class="size-3.5 shrink-0 rounded-sm"
            onerror="this.style.display='none'" />`
      : '';
  return `<span class="prov-tag" title="${escapeHtml(record.sourcePage || domain)}">
      ${fav}
      <span class="prov-dot" style="background:${color}" aria-hidden="true"></span>
      <span class="truncate">${escapeHtml(domain)}</span>
    </span>`;
}

/** Format badge chip, e.g. PNG / SVG. Hidden when the format is unknown. */
export function formatBadgeHtml(record, extraClass = '') {
  if (!record.format) return '';
  return `<span class="badge ${extraClass}">${escapeHtml(record.format)}</span>`;
}

/** A round icon action button used on cards and toolbars. */
export function actionBtnHtml(action, name, label, extra = '') {
  return `<button type="button" data-action="${action}" aria-label="${escapeHtml(
    label,
  )}" data-tip="${escapeHtml(label)}"
      class="btn-icon tip bg-bg/70 backdrop-blur hover:bg-bg ${extra}">
      ${iconSvg(name, { className: 'size-[17px]' })}
    </button>`;
}

/** Give every icon-only button under `root` a styled hover tooltip. */
export function applyTooltips(root) {
  root
    .querySelectorAll('button[aria-label]:not([data-tip])')
    .forEach((b) => {
      b.classList.add('tip');
      b.setAttribute('data-tip', b.getAttribute('aria-label'));
    });
}

/** Full gallery card markup for one record. */
export function cardHtml(record) {
  const alt = record.domain
    ? `Image from ${escapeHtml(record.domain)}`
    : 'Saved image';
  return `<article
      class="group relative flex flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-pop"
      data-card data-id="${record.id}">

      <div class="relative aspect-[4/3] overflow-hidden bg-surface-2">
        <div class="shimmer absolute inset-0 z-0" data-shimmer></div>
        <img
          src="${escapeHtml(record.url)}"
          alt="${alt}"
          decoding="async"
          class="relative z-[1] size-full cursor-zoom-in object-cover"
          data-thumb data-action="open" />

        <!-- Broken state -->
        <div data-broken hidden
          class="absolute inset-0 z-[2] flex flex-col items-center justify-center gap-2 bg-surface-2 px-4 text-center text-ink-soft">
          ${iconSvg('image-off', { className: 'size-6' })}
          <p class="text-sm">Image didn't load</p>
          <button type="button" data-action="retry"
            class="font-mono text-label text-brand underline-offset-2 hover:underline cursor-pointer">
            Retry
          </button>
        </div>

        <!-- Format badge -->
        <div class="absolute left-2 top-2 z-[3]">${formatBadgeHtml(record)}</div>

        <!-- Hover action bar -->
        <div class="absolute right-2 top-2 z-[3] flex gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100">
          ${actionBtnHtml('open', 'maximize-2', 'Enlarge')}
          ${actionBtnHtml('source', 'external-link', 'Open source')}
          ${actionBtnHtml('copy', 'copy', 'Copy URL')}
          ${actionBtnHtml('delete', 'trash-2', 'Delete', 'hover:text-pin')}
        </div>
      </div>

      <div class="flex items-center justify-between gap-2 border-t border-line px-3 py-2.5">
        ${provTagHtml(record)}
        <time class="shrink-0 font-mono text-micro text-ink-soft" datetime="${new Date(
          record.addedAt,
        ).toISOString()}" title="${new Date(record.addedAt).toLocaleString()}">
          ${relativeTime(record.addedAt)}
        </time>
      </div>
    </article>`;
}

/** Wire the shimmer/opacity + broken-state behaviour for one card's img. */
export function wireCardImage(card) {
  const img = card.querySelector('[data-thumb]');
  const shimmer = card.querySelector('[data-shimmer]');
  const broken = card.querySelector('[data-broken]');
  if (!img) return;

  // The image is visible by default (like any <img>); the shimmer sits behind
  // it and shows through until pixels arrive. JS only removes the shimmer on
  // load and toggles the broken overlay on error — it never gates visibility.
  // A later successful load clears a previous error (self-healing).
  const reveal = () => {
    img.style.display = '';
    if (broken) broken.hidden = true;
    shimmer?.remove();
    img.classList.add('animate-fade-in');
  };
  const fail = () => {
    shimmer?.remove();
    img.style.display = 'none';
    if (broken) broken.hidden = false;
  };

  // The load/error events are authoritative — keep listening even after a
  // failure (never { once }) so a later success self-heals a stale error.
  img.addEventListener('load', reveal);
  img.addEventListener('error', fail);

  // If the image finished before we attached listeners (e.g. it was cached by
  // the modal's preview), those events won't fire again. Crucially, do NOT
  // guess from naturalWidth here: a cached image is often `complete` while its
  // width is still 0 mid-decode — the old `else fail()` wrongly hid it, which
  // is why it only appeared in the lightbox. Let decode() decide instead.
  if (img.complete) {
    if (img.naturalWidth > 0) {
      reveal();
    } else if (typeof img.decode === 'function') {
      img.decode().then(reveal, fail);
    }
    // No decode() support → the load/error listeners remain the fallback.
  }

  const retry = card.querySelector('[data-action="retry"]');
  retry?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (broken) broken.hidden = true;
    img.style.display = '';
    img.style.opacity = '0';
    // Cache-bust with a query param (fragments don't force a refetch).
    const base = img.getAttribute('src').split('#')[0].replace(/([?&])_r=\d+/, '$1');
    const sep = base.includes('?') ? '&' : '?';
    img.src = `${base}${sep}_r=${Date.now()}`;
  });
}
