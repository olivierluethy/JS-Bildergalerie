// Application entry: wires chrome (view switch, search, theme, add), keeps the
// active view in sync with the store, and routes card actions.
import * as store from './store.js';
import { hydrateIcons } from './icons.js';
import { initTheme, mountThemeToggle } from './theme.js';
import { toast } from './toast.js';
import * as modal from './modal.js';
import { openLightbox } from './lightbox.js';
import { renderGallery, highlightCard } from './views/gallery.js';
import { renderTimeline } from './views/timeline.js';
import { renderNetwork, teardown as teardownNetwork } from './views/network.js';
import { debounce } from './util.js';

initTheme();

const els = {
  count: document.getElementById('itemCount'),
  search: document.getElementById('search'),
  addBtn: document.getElementById('addBtn'),
  themeToggle: document.getElementById('themeToggle'),
  tabs: Array.from(document.querySelectorAll('[role="tab"]')),
  panels: {
    gallery: document.getElementById('view-gallery'),
    timeline: document.getElementById('view-timeline'),
    network: document.getElementById('view-network'),
  },
};

let activeView = 'gallery';
let filterDomain = '';

hydrateIcons(document);
mountThemeToggle(els.themeToggle);

// ---- Data access ----------------------------------------------------------
function filteredRecords() {
  const all = store.getAll();
  if (!filterDomain) return all;
  const q = filterDomain.toLowerCase();
  return all.filter((r) => r.domain.includes(q));
}

function updateCount() {
  const n = store.count();
  els.count.textContent = n === 0 ? 'empty' : `${n} ${n === 1 ? 'image' : 'images'}`;
}

// Open an image's source in a new tab. Uses the actual image URL (always a
// real resource) and warns if the browser blocks the pop-up.
function openSource(rec) {
  const target = rec?.url || rec?.sourcePage;
  if (!target) return;
  const win = window.open(target, '_blank', 'noopener,noreferrer');
  if (!win) {
    toast('Pop-up blocked — allow pop-ups to open the source', { variant: 'warn' });
  }
}

// ---- Card actions (shared by gallery + timeline) --------------------------
const actions = {
  add: () => modal.open(),
  open: (id) => {
    const list = filteredRecords();
    const idx = list.findIndex((r) => r.id === id);
    if (idx < 0) return;
    openLightbox(list, idx, {
      onDelete: (delId) => store.remove(delId),
    });
  },
  source: (id) => {
    const rec = store.getById(id);
    if (rec) openSource(rec);
  },
  copy: (id) => {
    const rec = store.getById(id);
    if (!rec) return;
    navigator.clipboard
      ?.writeText(rec.url)
      .then(() => toast('Link copied', { variant: 'success' }))
      .catch(() => toast('Couldn’t copy the link', { variant: 'warn' }));
  },
  delete: (id, cardEl) => {
    const rec = store.getById(id);
    store.remove(id);
    toast('Image removed', {
      variant: 'info',
      action: {
        label: 'Undo',
        onClick: () => {
          if (rec) store.add(rec.url, { addedAt: rec.addedAt, id: rec.id });
        },
      },
    });
  },
  filterDomain: (domain) => {
    filterDomain = domain;
    els.search.value = domain;
    switchView('gallery');
    render();
    toast(`Filtered to ${domain}`, {
      variant: 'info',
      action: { label: 'Clear', onClick: clearFilter },
    });
  },
};

function clearFilter() {
  filterDomain = '';
  els.search.value = '';
  render();
}

// ---- Rendering ------------------------------------------------------------
function render() {
  updateCount();
  const records = filteredRecords();
  const isFiltered = Boolean(filterDomain);

  if (activeView !== 'network') teardownNetwork();

  if (activeView === 'gallery') {
    renderGallery(els.panels.gallery, records, actions, { filtered: isFiltered });
  } else if (activeView === 'timeline') {
    renderTimeline(els.panels.timeline, records, actions);
  } else if (activeView === 'network') {
    renderNetwork(els.panels.network, records, actions);
  }
}

// ---- View switching -------------------------------------------------------
function switchView(view) {
  if (view === activeView) return;
  if (activeView === 'network') teardownNetwork();
  activeView = view;
  els.tabs.forEach((tab) => {
    const selected = tab.dataset.view === view;
    tab.setAttribute('aria-selected', String(selected));
  });
  for (const [name, panel] of Object.entries(els.panels)) {
    panel.hidden = name !== view;
  }
  render();
}

els.tabs.forEach((tab) => {
  tab.addEventListener('click', () => switchView(tab.dataset.view));
});

// ---- Search ---------------------------------------------------------------
els.search.addEventListener(
  'input',
  debounce((e) => {
    filterDomain = e.target.value.trim();
    render();
  }, 180),
);

// ---- Add button + modal ---------------------------------------------------
els.addBtn.addEventListener('click', () => modal.open());
modal.initModal({
  onAdded: (record) => {
    // The store subscription already re-rendered; just highlight the new card.
    if (activeView === 'gallery') {
      requestAnimationFrame(() => highlightCard(els.panels.gallery, record.id));
    }
  },
  onDuplicate: (existing) => {
    if (activeView !== 'gallery') switchView('gallery');
    // Clear any filter that would hide the existing card.
    if (filterDomain && !existing.domain.includes(filterDomain.toLowerCase())) {
      clearFilter();
    } else {
      render();
    }
    requestAnimationFrame(() => highlightCard(els.panels.gallery, existing.id));
  },
});

// Global paste: when not typing in a field, Ctrl/Cmd+V opens the add modal.
document.addEventListener('paste', (e) => {
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  if (document.getElementById('modalRoot').children.length) return;
  const text = e.clipboardData?.getData('text');
  if (text && /https?:\/\//i.test(text)) {
    modal.open();
    requestAnimationFrame(() => {
      const input = document.getElementById('urlInput');
      if (input) {
        input.value = text.trim();
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  }
});

// Re-render network on resize (debounced) so the graph refits.
window.addEventListener(
  'resize',
  debounce(() => {
    if (activeView === 'network') render();
  }, 250),
);

// React to external store changes (e.g. lightbox delete).
store.subscribe(() => render());

// ---- Boot -----------------------------------------------------------------
store.load();
render();
