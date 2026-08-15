# Provenance Archive

A self-curated visual library that **remembers where every image came from.**
Add images by URL, browse them beautifully, and map the relationships between
your images and the websites they came from.

Formerly *JS-Bildergalerie* — a corkboard of pinned images. That heritage lives
on as one thread: every source domain gets a deterministic **pin colour** that
ties the Gallery, Timeline, and Map views together.

> Static, client-only, framework-free. Vanilla JS (ES modules) · Tailwind CSS ·
> Lucide icons · D3 (`d3-force`). All state lives in `localStorage`.

## Features

- **Add by URL only** — type a link, use the **Paste** button (`Ctrl/⌘+V`), or
  **drag a link** onto the dropzone. Live preview before you confirm. Dragging an
  actual image/file is rejected with a hint. No local file uploads.
- **Provenance** — each image stores its source domain, origin page, format, and
  when it was added; a favicon + pin-dot tag shows the source everywhere.
- **Duplicate-proof** — dedupes by normalized URL; a duplicate is refused and the
  existing image is highlighted.
- **Formats** — png, jpg/jpeg, webp, gif, svg, avif, bmp, with a per-image format
  badge and a graceful broken-image state.
- **Three views** — **Gallery** (card grid), **Timeline** (grouped by day), and
  **Map** (D3 force-directed graph of domains ↔ images).
- **Lightbox** — fullscreen with zoom (scroll / ± / double-click), pan, and
  keyboard nav (`Esc` / `←` / `→`).
- **Light & dark** theme, persisted and system-aware.

## Getting started

Requires Node.js (for the Tailwind build only — the app itself is static).

```bash
npm install          # install Tailwind (dev) + lucide/d3-force (vendored)
npm run build:css    # compile src/styles/input.css → dist/app.css (minified)
```

Then serve the folder as static files (ES modules require http://, not file://):

```bash
npm run serve        # serves the project at http://localhost:5173
# or: python3 -m http.server 5173
```

Open the served URL and start adding images.

### Development

```bash
npm run watch:css    # rebuild dist/app.css on change
```

Tailwind is the **only** styling — utilities and an `@apply` component layer in
`src/styles/input.css` compile to the single `dist/app.css`. There is no
hand-written stylesheet.

## Testing

Browser tests use **Playwright** (Chromium). Fixtures under `tests/fixtures/` are
local images, so the tests need no external network.

```bash
npx playwright install chromium   # one-time
npm run test:e2e                  # standard Playwright runner
```

`npm run verify:browser` runs the same checks through Playwright's Chromium
**in-process** — useful in restricted sandboxes/CI where the full runner can't
spawn its browser worker. It covers the regression that made an added image show
only after opening the lightbox: a cached image can report `complete === true`
while `naturalWidth` is still `0` mid-decode, so visibility must be decided by
`img.decode()` / the load event, never by a synchronous width guess.

## Project structure

```
index.html              App shell (chrome, view mounts)
dist/app.css            Compiled Tailwind output (single stylesheet)
src/styles/input.css    Tailwind source: tokens + @apply components
src/js/
  app.js                Orchestrator: chrome, view switching, actions
  store.js              Versioned localStorage store, migration, dedupe
  util.js               URL/provenance/format helpers, pin palette
  components.js         Provenance tag, badges, card
  modal.js              Add-image modal (type / paste / drag) + preview
  lightbox.js           Fullscreen viewer with zoom + keyboard nav
  theme.js  toast.js  icons.js
  views/{gallery,timeline,network}.js
vendor/                 Lucide + d3-force (self-contained ESM bundles)
docs/STYLEGUIDE.md      The visual system — single source of truth
```

## Data & migration

State is stored under `pa:gallery` (schema v2). Each record:

```jsonc
{ "id", "url", "normalized", "sourcePage", "domain", "format", "addedAt" }
```

On first load, any legacy `toDos` / `toDo_*` data from the original gallery is
migrated automatically (timestamps recovered from the old ids) — no data is lost.
The theme preference is stored under `pa:theme`.
