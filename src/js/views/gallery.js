// Gallery view: responsive card grid with loading/broken/empty states.
import { cardHtml, wireCardImage } from '../components.js';
import { iconSvg } from '../icons.js';

function emptyStateHtml(filtered) {
  if (filtered) {
    return `<div class="col-span-full flex flex-col items-center justify-center gap-3 py-24 text-center">
        <span class="text-ink-soft">${iconSvg('search', { className: 'size-8' })}</span>
        <h2 class="font-display text-3xl text-ink">No matches</h2>
        <p class="max-w-sm text-sm text-ink-soft">No images from that domain yet. Clear the filter to see the whole collection.</p>
      </div>`;
  }
  return `<div class="col-span-full flex flex-col items-center justify-center gap-4 py-24 text-center">
      <span aria-hidden="true">
        <svg viewBox="0 0 24 24" class="size-12"><circle cx="12" cy="9" r="6" class="fill-pin"/><rect x="11" y="9" width="2" height="12" rx="1" class="fill-ink"/></svg>
      </span>
      <h2 class="font-display text-display text-ink">Your archive is empty</h2>
      <p class="max-w-md text-base text-ink-soft">Add an image by its link and we'll remember the domain it came from, its format, and when you saved it.</p>
      <button type="button" data-empty-add class="btn-primary mt-1">
        ${iconSvg('plus', { className: 'size-[18px]' })} Add your first image
      </button>
    </div>`;
}

export function renderGallery(container, records, actions, { filtered = false } = {}) {
  container.className = '';
  if (records.length === 0) {
    container.innerHTML = `<div class="grid grid-cols-1">${emptyStateHtml(filtered)}</div>`;
    container
      .querySelector('[data-empty-add]')
      ?.addEventListener('click', () => actions.add());
    return;
  }

  container.innerHTML = `
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5"
         data-grid>
      ${records.map(cardHtml).join('')}
    </div>`;

  const grid = container.querySelector('[data-grid]');
  grid.querySelectorAll('[data-card]').forEach(wireCardImage);

  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    const card = e.target.closest('[data-card]');
    if (!card) return;
    const id = card.dataset.id;
    const action = btn?.dataset.action;
    if (!action || action === 'retry') return;
    e.preventDefault();
    if (action === 'delete') actions.delete(id, card);
    else if (action === 'source') actions.source(id);
    else if (action === 'copy') actions.copy(id);
    else actions.open(id); // 'open' or clicking the thumb
  });
}

/** Briefly highlight a card and scroll it into view (duplicate feedback). */
export function highlightCard(container, id) {
  const card = container.querySelector(`[data-card][data-id="${id}"]`);
  if (!card) return;
  card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  card.classList.add('ring-2', 'ring-pin', 'ring-offset-2', 'ring-offset-bg');
  setTimeout(() => {
    card.classList.remove('ring-2', 'ring-pin', 'ring-offset-2', 'ring-offset-bg');
  }, 1800);
}
