# PromptForge Brand Assets

Official brand deliverables for PromptForge. All files are in plain SVG (and
PNG where noted); each asset ships in the variants needed for light, dark,
and monochrome contexts.

## Inventory

### `marks/` — core icon marks

| File | Usage |
|---|---|
| `promptforge-main-mark.svg` | **Primary brand mark.** Use in-app on light surfaces; also the default favicon source. |
| `promptforge-main-mark-dark.svg` | Primary mark for dark surfaces. |
| `promptforge-main-mark-mono.svg` | Single-color mark for monochrome/print contexts. |
| `promptforge-secondary-mark.svg` | Supporting secondary icon (light). Use only as a supporting element, never as the primary mark. |
| `promptforge-secondary-mark-dark.svg` | Secondary icon for dark surfaces. |
| `promptforge-secondary-mark-mono.svg` | Secondary icon, monochrome. |

### `logos/` — lockups (mark + wordmark)

| File | Usage |
|---|---|
| `promptforge-logo-horizontal-light.svg` | Horizontal lockup for light backgrounds. |
| `promptforge-logo-horizontal-dark.svg` | Horizontal lockup for dark backgrounds. |
| `promptforge-logo-stacked-light.svg` | Stacked lockup for light backgrounds (e.g. narrow spaces). |
| `promptforge-logo-stacked-dark.svg` | Stacked lockup for dark backgrounds. |

### `favicons/` — browser favicons

| File | Usage |
|---|---|
| `favicon.svg` | **Primary favicon** (SVG, all sizes). |
| `favicon-dark.svg` | Dark-surface variant — swap with the primary when the app theme is dark. |
| `favicon-alt.svg` | Alternate/supporting favicon — only as a secondary option, never the default. |
| `favicon-alt-dark.svg` | Alternate favicon, dark variant. |
| `favicon-32.png` / `favicon-64.png` | Raster fallbacks for browsers without SVG favicon support. |

### `app/` — app tiles / PWA icons

| File | Usage |
|---|---|
| `promptforge-app-icon.svg` | Master app icon (512×512, light). Source for raster exports. |
| `promptforge-app-icon-192.png` / `-512.png` | Raster app icons for PWA manifest and `apple-touch-icon`. |
| `promptforge-app-icon-dark.svg` / `-dark-512.png` | Dark-surface variant (e.g. dark mode homescreens). |

## Usage rules

- **Always pair light/dark variants with the effective theme** — never serve a
  single static variant across themes.
- **Mark vs lockup:** use `marks/` for icon-only contexts (header, hero,
  favicon); use `logos/` when the wordmark should be included (banners, docs,
  marketing).
- **Primary vs secondary:** `main-mark` / `favicon.svg` is the brand —
  `secondary-mark` / `favicon-alt.svg` exists only as a supporting option.
- **Don't recolor or redraw** the artwork; use the shipped variants.
  Monochrome contexts should use the `-mono` variants, not custom colors.
- **Raster fallbacks:** keep PNGs in sync with the SVG masters when exporting.

## Brand colors

| Token | Light | Dark |
|---|---|---|
| Brand primary | `#2F6FE0` | `#5B8DF8` |
| Forge accent | `#F59E0B` | `#F59E0B` |
| Text | `#111317` | `#F3F4F6` |

## Where the app uses them

| Context | File(s) |
|---|---|
| In-app logo (header + landing hero) | `marks/promptforge-main-mark(-dark).svg` — `src/components/common/AppLogo.tsx` |
| Browser favicon (theme-aware) | `favicons/favicon.svg` / `favicon-dark.svg` — `src/hooks/useFavicon.ts`, `index.html` |
| Raster favicons + app tile | `favicons/favicon-32/64.png`, `app/promptforge-app-icon-192.png` — `index.html` |
| PWA manifest | `app/promptforge-app-icon-*` — `public/site.webmanifest` |