# Provenance Archive — Style Guide

The single source of truth for the visual system of **Provenance Archive** (formerly *JS-Bildergalerie*).
Every new feature, view, or component must look like it was always part of this product. When in doubt,
this file wins.

---

## 1. Concept

A **self-curated visual library that remembers where every image came from.** The app began as a
corkboard pinned with images; that heritage is preserved as *one* thread — the **pin**. Each source
domain is assigned a deterministic pin colour, and that colour is the connective tissue across every
view: a dot on the card, a node in the network map, a marker in the timeline.

The register is **archival / curatorial**: images are "specimens," their source URLs are "provenance,"
and the mono labels read like acquisition tags in a museum catalogue. Quiet, precise, tactile.

**Voice:** plain, active, curatorial. "Add image," "Open source," "Copy link." Empty and error states
give direction, never mood. No exclamation marks, sentence case everywhere.

---

## 2. Colour tokens

Defined as CSS custom properties on `:root` (light) and `.dark` (dark). Tailwind reads them via
`theme.extend.colors` using the `rgb(var(--token) / <alpha-value>)` pattern, so every colour supports
opacity utilities (`bg-brand/10`).

Tokens are stored as space-separated RGB channels.

### Light (`:root`)

| Token          | RGB           | Hex        | Role                                   |
|----------------|---------------|------------|----------------------------------------|
| `--bg`         | `232 234 228` | `#E8EAE4`  | App background (cool sage paper)        |
| `--surface`    | `251 251 248` | `#FBFBF8`  | Cards, modals, raised surfaces          |
| `--surface-2`  | `241 242 236` | `#F1F2EC`  | Insets, hovers, secondary fills         |
| `--ink`        | `24 36 32`    | `#182420`  | Primary text (near-black spruce)        |
| `--ink-soft`   | `88 97 88`    | `#586158`  | Secondary text, captions                |
| `--line`       | `211 215 205` | `#D3D7CD`  | Hairlines, borders, dividers            |
| `--brand`      | `14 110 106`  | `#0E6E6A`  | Structural brand (teal): links, focus   |
| `--brand-deep` | `10 79 76`    | `#0A4F4C`  | Brand hover / pressed                   |
| `--pin`        | `226 75 46`   | `#E24B2E`  | Accent (vermilion pin): primary actions |
| `--pin-deep`   | `193 58 32`   | `#C13A20`  | Accent hover / pressed                  |

### Dark (`.dark`)

| Token          | RGB           | Hex        | Role                          |
|----------------|---------------|------------|-------------------------------|
| `--bg`         | `14 21 18`    | `#0E1512`  | App background (spruce black)  |
| `--surface`    | `22 29 26`    | `#161D1A`  | Cards, modals                  |
| `--surface-2`  | `30 39 35`    | `#1E2723`  | Insets, hovers                 |
| `--ink`        | `232 236 230` | `#E8ECE6`  | Primary text                   |
| `--ink-soft`   | `147 160 153` | `#93A099`  | Secondary text                 |
| `--line`       | `42 51 46`    | `#2A332E`  | Hairlines, borders             |
| `--brand`      | `63 182 174`  | `#3FB6AE`  | Brand (lightened teal)         |
| `--brand-deep` | `92 200 192`  | `#5CC8C0`  | Brand hover                    |
| `--pin`        | `242 98 68`   | `#F26244`  | Accent (lightened pin)         |
| `--pin-deep`   | `255 122 92`  | `#FF7A5C`  | Accent hover                   |

### Domain pin palette (deterministic)

Every domain hashes to one of these hues (used for the pin-dot, network node, timeline marker). Chosen
to stay legible on both light and dark surfaces. Assigned by `hash(domain) % palette.length`.

`#E24B2E` · `#0E6E6A` · `#E0A526` · `#7A5AF8` · `#2E8B57` · `#D6336C` · `#3B82C4` · `#B5651D` ·
`#8AAE2B` · `#C74BB0`

Theme strategy: Tailwind `darkMode: 'class'`. The `.dark` class on `<html>` is toggled by the theme
button, persisted in `localStorage` under `pa:theme`, initialised from `prefers-color-scheme`.

---

## 3. Typography

Three roles, loaded from Google Fonts.

| Role        | Family              | Usage                                                        |
|-------------|---------------------|-------------------------------------------------------------|
| Display     | **Instrument Serif**| Wordmark, view titles, empty-state headlines, lightbox title|
| UI / Body   | **Familjen Grotesk**| Everything interactive and prose; the default `font-sans`   |
| Label / Data| **Space Mono**      | Provenance tags, domains, format badges, catalogue numbers, timestamps |

Instrument Serif ships one weight (400) + italic; use size and italic for hierarchy, never faux-bold.

### Scale

| Token / class     | Size / line-height | Weight | Face            | Use                          |
|-------------------|--------------------|--------|-----------------|------------------------------|
| `text-display`    | 2.5rem / 1.05      | 400    | Instrument Serif| Page/view title              |
| `text-display-lg` | 3.75rem / 1.0      | 400    | Instrument Serif| Empty-state hero             |
| `text-xl`         | 1.25rem / 1.3      | 500    | Familjen Grotesk| Section heads, modal title   |
| `text-base`       | 1rem / 1.5         | 400    | Familjen Grotesk| Body                         |
| `text-sm`         | 0.875rem / 1.45    | 400/500| Familjen Grotesk| Secondary UI                 |
| `text-label`      | 0.75rem / 1.3      | 400    | Space Mono      | Tags, badges, meta; `tracking-wide`, often `uppercase` |
| `text-micro`      | 0.6875rem / 1.2    | 400    | Space Mono      | Catalogue numbers, fine print|

Mono labels: `uppercase` + `tracking-[0.08em]` for badges/eyebrows; domains stay lowercase.

---

## 4. Spacing, radii, borders, shadows

- **Spacing:** Tailwind default 4px scale. Card padding `p-3`/`p-4`; view gutters `px-4 md:px-8`;
  section rhythm `gap-6` / `gap-8`.
- **Radii:** `--radius` = `0.75rem` (`rounded-xl`) for cards/modals; `rounded-lg` (0.5rem) for buttons
  and inputs; `rounded-full` for pins, avatars, icon buttons, chips. No sharp 0-radius surfaces.
- **Borders:** default `1px solid rgb(var(--line))`. Hairlines carry structure — prefer a border over a
  heavy shadow. Cards: 1px line + subtle shadow.
- **Shadows** (soft, low, cool — never harsh):
  - `shadow-card`: `0 1px 2px rgb(0 0 0 / 0.04), 0 4px 16px rgb(0 0 0 / 0.06)`
  - `shadow-pop`: `0 8px 40px rgb(0 0 0 / 0.16)` (modals, lightbox, popovers)
  - Dark mode: shadows are near-invisible; the `--line` border does the separating work.

---

## 5. Components

### Buttons
- **Primary** (`.btn-primary` via `@apply`): `bg-pin text-white`, `rounded-lg`, `px-4 py-2`, mono-free
  Familjen label, `hover:bg-pin-deep`, `active:scale-[0.98]`, `focus-visible:ring-2 ring-pin`.
- **Secondary** (`.btn-secondary`): `bg-surface-2 text-ink border border-line`, `hover:border-ink/30`.
- **Ghost / icon** (`.btn-icon`): square `rounded-full` `size-9`, `hover:bg-surface-2`, centred Lucide
  icon at `size-[18px]`, `stroke-[1.75]`.
- All buttons: `cursor-pointer`, `transition` (150ms), visible `focus-visible` ring.

### Specimen card (Gallery)
- `bg-surface` `rounded-xl` `border border-line` `shadow-card`, `overflow-hidden`.
- Image area: fixed aspect (`aspect-[4/3]`), `object-cover`, `bg-surface-2` while loading.
- Footer strip: provenance tag (favicon + pin-dot + mono domain) on the left, format badge on the right.
- Hover: card lifts (`-translate-y-0.5`), shadow deepens; an action bar (enlarge / open source / copy /
  delete as Lucide icon buttons) fades in over the image top-right.
- States: **loading** (shimmer on `surface-2`), **broken** (centered `image-off` icon + "Image didn't
  load" + retry/open-source), **empty gallery** (Instrument Serif headline + one primary CTA).

### Provenance tag (SIGNATURE)
The element the product is remembered by. A mono acquisition label:
`[favicon 14px] ● domain.tld` where `●` is the domain's deterministic pin colour (`size-2 rounded-full`).
Appears on every card, in the lightbox meta, and as the label in timeline/network. `text-label`,
`text-ink-soft`, favicon `rounded-sm`. Missing favicon falls back to the pin-dot alone.

### Format badge
`text-micro uppercase` mono chip, `bg-surface-2 border border-line rounded-full px-2 py-0.5`, e.g. `PNG`,
`SVG`, `WEBP`. Sits top-left over the image or in the card footer.

### Modal (Add image)
Centered, `bg-surface` `rounded-xl` `shadow-pop`, max-width `32rem`, backdrop `bg-ink/40 backdrop-blur-sm`.
Contains: title (Instrument Serif), URL input, **Paste** button, drag-link **dropzone**, live **preview**
panel with derived provenance + format, and Cancel / **Add image** actions. Opens with a short
fade+scale; respects `prefers-reduced-motion`.

### Dropzone
Dashed `border-2 border-dashed border-line rounded-xl`, `bg-surface-2/50`. On valid drag-over:
`border-brand bg-brand/5`. On file/image payload: `border-pin` + reject toast.

### Toast
Bottom-center stack. `bg-ink text-bg` (inverted), `rounded-lg` `shadow-pop`, Lucide status icon, `px-4
py-3`, auto-dismiss ~3.5s, slide-up in / fade out. Variants keyed by left icon+accent: info (brand),
success (green), warn/reject (pin). Toasts state fact + direction: "Drag the image's link, not the file."

### Top chrome
Slim sticky header, `bg-bg/80 backdrop-blur border-b border-line`. Left: wordmark (Instrument Serif
"Provenance Archive") + item count in mono. Center/left: **view switcher** (Gallery · Timeline · Map) as
a segmented control (`bg-surface-2` inset, active segment `bg-surface shadow-card text-ink`). Right:
domain **search** input (mono placeholder), **theme toggle**, primary **Add image** button.

### View switcher segments
`rounded-lg` container `p-1`; segments `px-3 py-1.5 rounded-md text-sm`, active gets raised surface +
`text-ink`, inactive `text-ink-soft hover:text-ink`.

### Timeline
Left rail with a vertical hairline; each **day group** headed by an Instrument Serif date + mono count.
Entries: thumbnail, provenance tag, mono time-added, quick actions. Day marker dot uses… the day's most
common domain pin colour.

### Network map
Full-bleed canvas/SVG on `bg-bg`. **Domain nodes**: larger, filled with the domain pin colour, mono
label. **Image nodes**: small circular thumbnails ringed in `--line`. Links: thin `--line` strokes.
Hover highlights a node's neighbourhood (others dim to ~25%); click a domain filters the gallery, click
an image opens the lightbox. Legend + zoom/reset control bottom-right.

### Lightbox
Full-screen `bg-ink/90 backdrop-blur`. Centered image with zoom (scroll / +/− / double-click to toggle),
prev/next chevrons, `Esc` to close, `←/→` to navigate. Top bar: provenance tag + title (Instrument
Serif) + actions (open source, copy URL, delete). Bottom: catalogue number + format + addedAt in mono.

---

## 6. Interaction & motion

- Every interactive element: `cursor-pointer`, a visible hover state, `focus-visible:ring-2
  ring-brand ring-offset-2 ring-offset-bg`, and a `transition` (150–200ms, `ease-out`).
- Hover affordances are consistent: buttons change fill/border, cards lift, nodes highlight.
- Motion is purposeful and small: card lift, modal fade+scale, toast slide, network settle. No parallax,
  no decorative loops.
- **Reduced motion:** under `prefers-reduced-motion: reduce`, disable transforms/animation, keep opacity
  fades only; the network graph settles instantly.

---

## 7. Accessibility floor

- Colour contrast ≥ 4.5:1 for text (`--ink`/`--ink-soft` on `--bg`/`--surface` verified).
- All icon-only buttons carry `aria-label`. Modal/lightbox are focus-trapped, `Esc`-closable, restore
  focus on close. Toasts use `aria-live="polite"` (rejections `assertive`).
- Full keyboard operability: view switch, add flow, lightbox nav, delete. Visible focus everywhere.
- Images carry meaningful `alt` (source domain); decorative pins/dots are `aria-hidden`.

---

## 8. Iconography

**Lucide** only, via the ES module. Default `size-[18px]`, `stroke-[1.75]`, `currentColor`. Canonical
set: `plus` (add), `clipboard-paste` (paste), `link` (url/source), `external-link` (open source), `copy`
(copy url), `trash-2` (delete), `maximize-2` / `zoom-in` (enlarge), `x` (close), `chevron-left/right`
(nav), `sun`/`moon` (theme), `search`, `layout-grid` (gallery), `calendar-clock` (timeline), `share-2`
(network), `image-off` (broken), `check`/`info`/`triangle-alert` (toasts).
