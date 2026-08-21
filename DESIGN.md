---
version: 1.7.0
name: PromptForge-design-system
description: >
  A high-performance, IDE-inspired design language for an AI Prompt Engineering
  application. The aesthetic blends the cinematic restraint of professional
  creative tools with the ultra-fast, precision-driven feel of modern developer
  environments. Strict light/dark semantic color system, seamless text
  streaming, mandatory glassmorphism for overlays, and accessibility as a
  non-negotiable baseline rather than an afterthought.
---

## Overview

PromptForge is an Integrated Development Environment (IDE) for prompt
engineers. The UI is strictly functional, optimizing for reading density and
rapid interaction. It avoids heavy shadows and excessive color in favor of a
precise, high-contrast monochrome base paired with a small set of semantic
accents.

**Key characteristics:**

- **Developer-centric typography** — UI chrome uses `Geist` (sans-serif); generated
  prompts and quality scores use `JetBrains Mono` / `Geist Mono` to read like data,
  not prose.
- **Motion & speed** — the UI must feel instantaneous: streaming text for
  outputs, skeletons for pending data, no spinners.
- **Flat depth, glass overlays** — cards are flat with thin borders. Elevation
  is communicated exclusively through glassmorphism + a strict z-index scale,
  never through drop shadows on resting surfaces.
- **Accessible by default** — every rule below assumes the result must be
  usable with a keyboard and a screen reader.
  This is not optional polish; treat it as a build requirement same as TypeScript
  passing.

---

## 0. Component Selection Priority

Every UI pattern is implemented by the **first layer in this order that covers
it**. Lower layers are fallbacks, not free choices — reach for them only when
the higher layers genuinely don't fit.

| Tier | Source | Covers | Never used for |
|---|---|---|---|
| 1 | **shadcn/ui** — Radix primitives, `src/components/ui/` | Interactive patterns: buttons, dialogs, dropdowns, selects, comboboxes, tooltips, switches, tabs, scroll areas — anything with ARIA/focus/keyboard requirements (§5.1) | Decorative animation |
| 2 | **React Bits** — `@react-bits` registry, TS + Tailwind variants, vendored flat files in `src/components/animations/` (e.g. `AnimatedContent.tsx`, `SpotlightCard.tsx`) | Animation-forward components shadcn doesn't ship: text entrances (`SplitText`, `RotatingText`, `TextType`, `ShinyText`), entrance wrappers (`AnimatedContent`, `FadeContent`), backgrounds (`Aurora`), decorative cards (`SpotlightCard`), grain (`Noise`), counters (`CountUp`) | Interactive primitives — never as a replacement for a shadcn control |
| 3 | **Framer Motion** — `motion/react` | Custom motion composed from primitives: layout animations, `AnimatePresence`, the Skeleton shimmer (§6.17), press feedback beyond `btn-press` | Patterns with a ready React Bits component |
| 4 | **Custom Tailwind/CSS** — `src/index.css` | What tiers 1–3 don't cover or need deep token theming: glassmorphism utilities (§4), scrollbar styling (§6.11), keyframes (`slide-up-fade`, `btn-press`, §1.4), the static grain fallback (§6.15) | Anything a higher tier already provides |

**Rules:**

1. **shadcn first, always.** Interactive pattern → shadcn primitive. No
   exceptions; see §5.1.
2. **Search React Bits before writing animation code.** If a React Bits
   component covers the effect, add it through the registry — never
   copy-paste from the website: `npx shadcn@latest add @react-bits/<Name>-TS-TW`
   (the `@react-bits` registry is configured in `components.json`).
3. **React Bits files are vendored read-only.** The only permitted edits are
   lint fixes and a **one-time token alignment at adoption**: hardcoded
   non-token defaults (e.g. `bg-neutral-900`, white `spotlightColor`,
   `rounded-3xl` in `SpotlightCard`) may be replaced with this system's
   semantic tokens so the component matches both themes. Afterwards the file
   is read-only — theme React Bits components through their `className`/props
   with this system's semantic tokens, never fork a file for a color change.
4. **Framer Motion for the gaps.** When React Bits has no matching component
   and the motion is custom-composed (layout animation, gesture, streaming
   shimmer), use Framer Motion with the §1.4 duration/easing guidance.
5. **Custom CSS is the last resort.** New CSS lives in `src/index.css` only
   when tiers 1–3 have no fit — e.g. scrollbar pseudo-elements (§6.11) can't
   come from any library. When custom code duplicates a tier-2 component's
   behavior, prefer the component.

---

## 1. Design Tokens

### 1.1 Color — semantic roles

Never reference a color by its role's *value*. Reference it by *role*. The
table below is the contract between design and code; the actual hex values
live in §2 so they can change without anyone hunting through components.

| Token | Used for |
|---|---|
| `brand-primary` | Primary actions, active states, focus ring, links |
| `brand-primary-hover` | Hover/active state of primary actions |
| `brand-success` | Copy-success, valid states, positive deltas |
| `brand-warning` | Non-blocking warnings (e.g. "similar to a recent prompt") |
| `brand-danger` | Errors, destructive actions, invalid form state |
| `text-on-brand` | Text/icons placed on top of any filled brand-* surface |
| `bg-app` | Outermost page background |
| `bg-surface` | Cards, panels, inputs |
| `bg-surface-hover` | Hover state of interactive surfaces |
| `bg-overlay` | Glass background for dropdowns/modals/toasts (see §4) |
| `text-primary` | Default body/heading text |
| `text-secondary` | De-emphasized text (labels, helper text) |
| `text-muted` | Placeholder, disabled, timestamps |
| `border-subtle` | Default card/input borders |
| `border-strong` | Overlay rings, dividers that must read clearly |
| `border-danger` | Invalid input border |

> `brand-danger` and `text-on-brand` fill a gap from v1.0 — the previous version had
> no error color and no explicit rule for text-on-color, which is why error
> states in the generator form were inconsistent.

### 1.2 Typography

| Role | Family | Size | Weight | Line-height | Tracking |
|---|---|---|---|---|---|
| `display` | Geist | 36px | 800 | 1.15 | -0.03em |
| `heading` | Geist | 20px | 600 | 1.3 | -0.015em |
| `body` | Geist | 15px | 400 | 1.5 | — |
| `label` | Geist | 13px | 500 | 1.4 | — |
| `caption` | Geist | 12px | 500 | 1.4 | 0.01em |
| `body-mono` | JetBrains Mono / Geist Mono | 14px | 400 | 1.6 | 0 |
| `metric-score` | JetBrains Mono / Geist Mono | 24px | 600 | 1.0 | -0.02em |

`caption` — use it for timestamps, item counts, and metadata in
`HistoryList`, instead of reusing `label` at a smaller size.

**Font features:** Geist OpenType features are enabled via
`font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11'` for refined
typographic control. **Font smoothing** is applied globally:
`-webkit-font-smoothing: antialiased` and `-moz-osx-font-smoothing: grayscale`.

### 1.3 Spacing, radius, elevation

| Spacing | xs | sm | md | lg | xl | xxl |
|---|---|---|---|---|---|---|
| px | 4 | 8 | 16 | 24 | 32 | 48 |

| Radius | none | sm | md | lg | xl | full |
|---|---|---|---|---|---|---|
| px | 0 | 6 | 8 | 12 | 16 | 9999 |

| Z-index layer | Value | Used for |
|---|---|---|
| `z-grain` | 1 | Grain/noise overlay (below all content) |
| `z-base` | 0 | Default page content |
| `z-sticky` | 10 | Sticky headers/toolbars |
| `z-dropdown` | 20 | Select menus, popovers |
| `z-drawer` | 30 | Mobile sidebar drawer |
| `z-modal` | 40 | Dialogs |
| `z-toast` | 50 | Toast notifications (see §6.18) |

| Layout dimension token | Value | Used for |
|---|---|---|
| `--height-header` | `3.5rem` (56px) | Header height; single source for every drawer offset (`top-(--height-header)`) and full-height calc (`calc(100dvh - var(--height-header))`) — never hardcode `3.5rem` in components |

The grain overlay (`z-grain: 1`) is a fixed-position texture layer that renders
above the background (`z-base` defaults to 0 via stacking context) but below
all interactive content (`z-sticky` and above). This ensures it never visually
interferes with dropdowns, modals, or toasts.

Every floating element gets its z-index from this table — no ad hoc `z-[999]`
in component code. This avoids the classic bug where a toast renders behind a
modal.

### 1.4 Motion

Durations are fixed guidance, not CSS tokens — implementations may hardcode
them (Tailwind `duration-*` classes or Framer Motion transition values):

| Duration | Easing | Use |
|---|---|---|
| 120ms | `ease-out` | Hover/active feedback, icon swaps |
| 200ms | `cubic-bezier(0.4, 0, 0.2, 1)` | Panel open/close, accordion |
| 320ms | `cubic-bezier(0.4, 0, 0.2, 1)` | Drawer slide-in, modal entrance |
| n/a | per-character, no easing | Text streaming (see §6.2) — content appears as chunks arrive, no reveal animation |

**Stagger animations:** Use the `animate-stagger-*` utility classes for
sequential entry animations. Each class applies a `slide-up-fade` keyframe
animation with incremental delays:

| Class | Delay |
|---|---|
| `animate-stagger-1` | 0ms |
| `animate-stagger-2` | 60ms |
| `animate-stagger-3` | 120ms |
| `animate-stagger-4` | 180ms |

```css
@keyframes slide-up-fade {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-stagger-1 { animation: slide-up-fade 350ms cubic-bezier(0.4, 0, 0.2, 1) 0ms forwards; }
.animate-stagger-2 { animation: slide-up-fade 350ms cubic-bezier(0.4, 0, 0.2, 1) 60ms forwards; }
.animate-stagger-3 { animation: slide-up-fade 350ms cubic-bezier(0.4, 0, 0.2, 1) 120ms forwards; }
.animate-stagger-4 { animation: slide-up-fade 350ms cubic-bezier(0.4, 0, 0.2, 1) 180ms forwards; }
```

> **Tier check (§0):** these utilities are tier 4 (custom CSS). When an
> entrance needs direction, distance, or scroll-trigger control beyond a
> fixed stagger, use the React Bits `AnimatedContent` / `FadeContent`
> wrappers (tier 2) or Framer Motion variants (tier 3) instead of extending
> this table.

**Button press:** The `btn-press` class applies tactile feedback on `:active`:
`transform: scale(0.98) translateY(1px)`. Use on primary action buttons.

### 1.5 Breakpoints

| Token | Min-width | Notes |
|---|---|---|
| `sm` | 640px | — |
| `md` | 768px | Sidebar still collapsible (drawer) |
| `lg` | 1024px | Sidebar becomes persistent and resizable (no drawer) |
| `xl` | 1280px | Max content width reached |

These match Tailwind's defaults intentionally — don't override Tailwind's
breakpoint scale in `tailwind.config.js` unless there's a specific reason
documented here.

---

## 2. Color Values & Implementation

### 2.1 Reference hex values

These are the actual colors behind the tokens in §1.1. Both columns are
calibrated for **WCAG AA**: body text ≥ 4.5:1 against its background,
large/bold text and icons ≥ 3:1. If you change a value, re-check contrast —
don't eyeball it.

| Token | Light | Dark |
|---|---|---|
| `brand-primary` | `#2F6FE0` | `#5B8DF8` |
| `brand-primary-hover` | `#2558B8` | `#7AA3FA` |
| `brand-success` | `#15803D` | `#22C55E` |
| `brand-warning` | `#B45309` | `#F59E0B` |
| `brand-danger` | `#DC2626` | `#EF4444` |
| `text-on-brand` | `#FFFFFF` | `#FFFFFF` |
| `bg-app` | `#FAFAFA` | `#0B0D10` |
| `bg-surface` | `#FFFFFF` | `#15181C` |
| `bg-surface-hover` | `#F1F2F4` | `#1E2227` |
| `text-primary` | `#111317` | `#F3F4F6` |
| `text-secondary` | `#4B5563` | `#9CA3AF` |
| `text-muted` | `#9CA3AF` | `#6B7280` |
| `border-subtle` | `#E5E7EB` | `#2A2E34` |
| `border-strong` | `#D1D5DB` | `#3A3F46` |
| `border-danger` | `#FCA5A5` | `#7F1D1D` |

`brand-primary`, `brand-success`, and `brand-danger` are intentionally a shade
brighter in dark mode — the same hex value reads as duller against a near-black
background, which is why "accent consistency" in the old doc (same hex in
both modes) was technically wrong. Same *role*, calibrated value per mode.

### 2.2 CSS variables (required format)

Define variables as **raw RGB channels**, not hex strings. This is required
for Tailwind's `/<opacity>` modifier (e.g. `bg-surface/80`, already used for
`overlay-glass` in §4) to work — a hex string in a CSS variable cannot be
given an opacity modifier by Tailwind directly.

```css
/* globals.css */
:root {
  --brand-primary: 47 111 224;
  --brand-primary-hover: 37 88 184;
  --brand-success: 21 128 61;
  --brand-warning: 180 83 9;
  --brand-danger: 220 38 38;
  --text-on-brand: 255 255 255;

  --bg-app: 250 250 250;
  --bg-surface: 255 255 255;
  --bg-surface-hover: 241 242 244;
  --text-primary: 17 19 23;
  --text-secondary: 75 85 99;
  --text-muted: 156 163 175;
  --border-subtle: 229 231 235;
  --border-strong: 209 213 219;
  --border-danger: 252 165 165;
}

[data-theme="dark"] {
  --brand-primary: 91 141 248;
  --brand-primary-hover: 122 163 250;
  --brand-success: 34 197 94;
  --brand-warning: 245 158 11;
  --brand-danger: 239 68 68;

  --bg-app: 11 13 16;
  --bg-surface: 21 24 28;
  --bg-surface-hover: 30 34 39;
  --text-primary: 243 244 246;
  --text-secondary: 156 163 175;
  --text-muted: 107 114 128;
  --border-subtle: 42 46 52;
  --border-strong: 58 63 70;
  --border-danger: 127 29 29;
}
```

### 2.3 Tailwind config

```js
// tailwind.config.js
function withOpacity(variable) {
  return ({ opacityValue }) =>
    opacityValue === undefined
      ? `rgb(var(${variable}))`
      : `rgb(var(${variable}) / ${opacityValue})`;
}

module.exports = {
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        "brand-primary": withOpacity("--brand-primary"),
        "brand-primary-hover": withOpacity("--brand-primary-hover"),
        "brand-success": withOpacity("--brand-success"),
        "brand-warning": withOpacity("--brand-warning"),
        "brand-danger": withOpacity("--brand-danger"),
        "text-on-brand": withOpacity("--text-on-brand"),
        "bg-app": withOpacity("--bg-app"),
        "bg-surface": withOpacity("--bg-surface"),
        "bg-surface-hover": withOpacity("--bg-surface-hover"),
        "text-primary": withOpacity("--text-primary"),
        "text-secondary": withOpacity("--text-secondary"),
        "text-muted": withOpacity("--text-muted"),
        "border-subtle": withOpacity("--border-subtle"),
        "border-strong": withOpacity("--border-strong"),
        "border-danger": withOpacity("--border-danger"),
      },
    },
  },
};
```

This makes `bg-surface`, `bg-surface/80`, `text-danger`, `border-danger/50`,
etc. all work as plain Tailwind utilities — no custom CSS needed in
components, which is what rule §3.1 below depends on.

> If this project is on Tailwind v4, the equivalent is an `@theme` block in
> CSS using the same `rgb(var(--x) / <alpha-value>)` pattern — the token names
> and rgb-channel format stay identical, only the wiring location changes.

---

## 3. Light/Dark Theme Strict Rules

1. **Never hardcode hex or named colors** in components (`bg-[#111827]`,
   `text-white`, `text-gray-400`). Always use the semantic classes from §2.3.
2. **Root theme management** via `data-theme="dark" | "light"` on `<html>`.
   Variables invert automatically per §2.2 — components never branch on theme
   in JS to pick a color.
3. **Text on brand surfaces** always uses `text-on-brand` (`#FFFFFF` in both
   modes) — never `text-primary`, which inverts and would become unreadable
   on a colored button in dark mode.
4. **Border contrast must hold in both modes.** `border-subtle` is intentionally
   low-contrast (separates surfaces without visual noise); `border-strong` and
   `border-danger` must stay clearly visible against `bg-surface` in both modes
   — verify visually after any value change, don't assume the same ratio holds.
5. **Test every new component in both themes before merging.** — it's the
   cheapest bug class to prevent and the easiest to skip under deadline pressure.
6. **Never use `text-muted-foreground`** — it's not a DESIGN.md token. Use
   `text-muted` (which maps to the `text-muted` semantic token in §2.3).
   `text-muted-foreground` is a shadcn default that bypasses the project's
   semantic color system.

---

## 4. Overlays & Transparency (Glassmorphism)

Pure transparency on floating elements (dropdowns, modals, tooltips, sticky
headers) is forbidden — it causes background text to visually clash with
foreground content.

Every floating element uses the `overlay-glass` pattern:

- **Background:** `bg-surface/80` (80% opacity surface color — relies on the
  RGB-channel CSS variables in §2.2).
- **Blur:** `backdrop-blur-md` (`backdrop-filter: blur(12px)`).
- **Border:** `border border-strong` to define the edge against the blur.
- **Elevation:** the matching `z-*` token from §1.3 — not an arbitrary value.

```html
<div class="bg-surface/80 backdrop-blur-md border border-strong shadow-xl z-dropdown rounded-md">
```

---

## 5. Accessibility (Non-Negotiable Baseline)

These were missing in v1.0 and are the most common source of real bugs (the
raw-`<button>` accordion in `GeneratorForm.tsx` losing ARIA semantics is a
direct example of what this section prevents going forward).

1. **Use Radix/Shadcn primitives for interactive patterns** (`Accordion`,
   `Dialog`, `Popover`, `Select`, `Tooltip`) instead of hand-rolled
   `<div onClick>` or raw `<button>` toggles. They ship correct ARIA roles,
   focus trapping, and keyboard handling for free — don't reimplement it.
   (Component tier 1, §0.)
2. **Visible focus is mandatory.** Every interactive element gets a visible
   `focus-visible` ring using `brand-primary`, e.g.
   `focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2`.
   Never `outline-none` without a replacement focus style.
3. **Color is never the only signal.** An error state pairs `border-danger`
   with an icon and text, not just a red border — this applies to all
   warning and error patterns throughout the app.
4. **Contrast is checked, not assumed.** Any new color value added to §2.1
   gets verified against the AA targets stated there before merging.
5. **Touch targets ≥ 40px** on interactive elements in mobile/drawer contexts
   (action bar icon buttons, close buttons).
6. **Every icon-only button needs two labels.** `aria-label` for screen readers
   & touch devices (they don't see tooltips), plus a `<Tooltip>` for sighted
   mouse/keyboard users (they can't see `aria-label`). Both are required per
   §6.8.

---

## 6. UI Component Patterns

- **UI labels & navigation:** `label` token (Geist, 13px, Medium) — keeps
  interface chrome minimal and out of the way.
- **The "Prompt" text:** the most important element on screen, uses
  `body-mono`. Monospace gives it a code-block feel, making syntax like
  `--v 6.0` or `--ar 16:9` easy to scan.
- **Quality Score:** `metric-score` — large, bold monospace numbers, so the
  evaluation reads as an exact computation rather than a soft opinion.
- **Metadata/timestamps:** `caption` (§1.2), never reuse `label` at a smaller
  font-size override.

---

## 6.1 Iconography

- **Primary library:** `lucide-react` — used for all UI/chrome icons (actions,
  indicators, navigation). Don't mix in another general-purpose icon set;
  stroke weights won't match.
- **Brand icons:** `@icons-pack/react-simple-icons` — used exclusively for
  third-party brand logos (GitHub, etc.). These are imported as `Si*`
  components and sized identically to lucide icons at the same context
  (`size-3.5` inline with text, `size-4` in nav bars).
  - **Native tooltip suppression:** every `Si*` component renders a `<title>`
    element inside its SVG by default (e.g. `SiGithub` → `<title>GitHub</title>`),
    which creates a native browser tooltip. When the icon is wrapped in a
    `<Tooltip>` (per §6.8), this produces a double tooltip. Pass `title=""` to
    every `Si*` usage to suppress the native SVG tooltip. This is mandatory,
    not optional — treat it the same as `aria-label` on icon-only buttons.
    ```tsx
    // ✅ CORRECT — native title suppressed
    <SiGithub className="h-4 w-4" title="" />

    // ❌ WRONG — native tooltip + Radix tooltip = double
    <SiGithub className="h-4 w-4" />
    ```
- **Stroke width:** `1.75` as the project default for lucide icons (slightly
  heavier than Lucide's default `2` reads better at small UI sizes against
  this typeface). Simple-icons use their native SVG geometry — no stroke-width
  override.
- **Sizes:** `16px` inline with `label`/`body` text, `20px` in standalone
  buttons/action bars, `24px` for empty-state illustrations. Brand icons match
  the adjacent lucide icon size at each context.
- **Color:** all icons inherit `currentColor` — never hardcode an icon
  fill/stroke color separately from the text it sits beside.
- **Sidebar navigation:** nav items use `tracking-tight` for tighter label
  spacing alongside the icon.
- **Brand assets:** live in `public/assets/` as the official PromptForge pack
  (`marks/` for in-app mark usage, `logos/` for lockups, `favicons/` for site
  favicons, `app/` for app tiles/PWA) — full usage guide in
  `public/assets/README.txt`. Always pair the light/dark variant with
  the effective theme — never use a single static variant. Brand palette:
  primary light `#2F6FE0` / dark `#5B8DF8` (identical to `brand-primary`
  tokens), forge accent `#F59E0B`.

## 6.2 Streaming Output Panel

- On "Generate", the output panel appears immediately with a blinking cursor.
- As `stream: true` data arrives, characters append in `body-mono`.
- **Skeleton loading:** while streaming, "AI Quality Score" shows a `<Skeleton />`
  block (see §6.17 — uses a Framer Motion shimmer).
  The numeric score replaces it only once the stream completes.

## 6.3 Action Bars & Copy Buttons

- Hovering a generated prompt reveals a ghost-style action bar.
- **Copy:** icon → checkmark, text → `brand-success`, glass toast
  ("Prompt copied") at `z-toast`. Reverts after 2s.

## 6.4 Form Validation & Error States

Directly addresses the missing-translation-key and error-handling issues found
in code review.

- **Invalid input:** `border-danger` border, `brand-danger` helper text below
  the field, plus a small danger-colored icon — never border color alone.
- **API/provider errors** (`generator.form.errors.*`): rendered as an inline
  banner using the `overlay-glass` background but with a `border-danger`
  accent edge (left border, 3px, `brand-danger`) — distinct enough from a
  generic glass dropdown that users register it as an error, not a menu.
- **Error copy** states what happened and what to do next in the interface's
  voice — e.g. "Couldn't reach the prompt provider. Check your connection and
  retry," not "PROVIDER_ERROR" or a bare exclamation mark.
- **Success confirmation** uses confident language without exclamation marks:
  "Configuration applied" not "Configuration applied!"

## 6.5 Duplicate-Detection Warning (Badge & Banner)

UI spec for a feature being implemented separately; defined here so it's built
with existing tokens instead of one-off styles.

- **Badge** (on a result that's flagged similar): pill shape (`rounded-full`),
  `brand-warning` text on `brand-warning/10` background, `12px` icon + caption
  text, e.g. "Similar to a recent prompt."
- **Banner** (if surfaced more prominently): same `overlay-glass` + left-accent
  pattern as §6.4 but with `brand-warning` instead of `brand-danger`, since
  this is a non-blocking warning, not an error.
- Always pair the badge/banner with an action ("Regenerate" or "Keep anyway")
  — per §5.3, color/icon alone is not sufficient, and an unfollowable warning
  is worse than no warning.

## 6.6 Empty States

- An empty `HistoryList` is an invitation to act, not just a blank panel:
  state what's missing and what to do — e.g. "No prompts yet. Generate your
  first one to see it here," with a button that returns focus to the
  generator input, not a static illustration with no path forward.

## 6.7 Switch / Toggle

This pattern previously shipped with no spec, which led to a real bug: toggles
rendered with the unstyled primitive default (plain white when on, bare outline
when off) instead of the project's actual `brand-primary`, making on/off states
nearly impossible to tell apart at a glance. The rules below exist specifically
to prevent that regression.

- **On (checked):** track filled `brand-primary` (the project's blue accent
  — see §2.1; never a generic white/light fill), knob `text-on-brand` for
  guaranteed contrast against the filled track.
- **Off (unchecked):** track `bg-surface-hover` with a visible `border-subtle`
  edge — not fully transparent — knob filled `text-secondary` (a solid
  circle, not just an outline) so it stays visible against a dark `bg-app`.
- **Position is a secondary signal, not the primary one.** Knob position
  (left/right) reinforces state but color is what should register first —
  per §5.3, never rely on position alone the way the unstyled version did.
- **Disabled:** track and knob both drop to 50% opacity (`opacity-50`),
  `cursor-not-allowed` — keep the same on/off color logic underneath so the
  state is still legible, just muted.
- **Focus:** `focus-visible:ring-2 focus-visible:ring-brand-primary
  focus-visible:ring-offset-2`, per §5.2 — toggles are keyboard-operable
  controls, not decorative switches.
- **Implementation:** use the Radix/Shadcn `Switch` primitive (per §5.1) and
  override its default `checked`/`unchecked` classes to the tokens above —
  don't hand-roll a custom switch, and don't leave the primitive's default
  (un-themed) colors in place.

```tsx
<Switch
  className="data-[state=checked]:bg-brand-primary data-[state=unchecked]:bg-surface-hover data-[state=unchecked]:border data-[state=unchecked]:border-subtle"
/>
```

## 6.8 Tooltip — Icon-Only Buttons

Icon-only buttons without text labels are the most common accessibility gap
in the app. Every one MUST carry **both** a visual tooltip (for sighted
mouse/keyboard users) AND an `aria-label` (for screen readers and touch
devices).

### 6.8.1 The Rule (Non-Negotiable)

> **Every icon-only button MUST have a `<Tooltip>` wrapping AND an
> `aria-label` on the trigger. Neither is a substitute for the other.**

Rationale:
- **Screen readers don't read tooltips** — `aria-label` is the only way a
  blind user knows what the button does.
- **Tooltips don't appear on touch devices** — there is no hover state on
  mobile. The `aria-label` is the only label, and AssistiveTouch / VoiceOver
  reads it.
- **Tooltips don't appear on keyboard focus by default** — the Radix
  `Tooltip` primitive shows on focus, but a hand-rolled
  `onMouseEnter`-only implementation misses this entirely. Always use the
  Radix/Shadcn `Tooltip` (per §5.1).
- **Sighted mouse users can't see `aria-label`** — the tooltip provides the
  visual label they need.

### 6.8.2 Implementation

**Primitive:** `Tooltip` from `@/components/ui/tooltip` (Radix/Shadcn).
**Icon button sizing:**

| Context | Size | Button Class | Icon Class |
|---|---|---|---|
| Standalone (toolbar, header) | 32×32 | `h-8 w-8` | `h-4 w-4` |
| Compact (action bar, list item) | 28×28 | `h-7 w-7` | `h-3.5 w-3.5` |
| Inline (tag, chip) | 20×20 | `h-5 w-5` | `h-3 w-3` |
| Mobile-safe (touch target ≥ 44px) | 44×44 | `min-h-[44px] min-w-[44px]` | `h-5 w-5` |

**TooltipContent text MUST match the `aria-label` verbatim** —
inconsistent labels (e.g. `aria-label="Copy"` + tooltip "Copy to clipboard")
confuse users who rely on both. Use the same translation key for both.

```tsx
// ✅ CORRECT — Tooltip + aria-label, text matches, glassmorphism
<Tooltip>
  <TooltipTrigger asChild>
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      aria-label={t('common.delete')}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  </TooltipTrigger>
  <TooltipContent>
    {t('common.delete')}
  </TooltipContent>
</Tooltip>

// ✅ CORRECT — compact size for list item action bar
<Tooltip>
  <TooltipTrigger asChild>
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7"
      aria-label={t('common.edit')}
    >
      <Pencil className="h-3.5 w-3.5" />
    </Button>
  </TooltipTrigger>
  <TooltipContent>{t('common.edit')}</TooltipContent>
</Tooltip>
```

**TooltipProvider** goes at the app root (`src/main.tsx`) with
`delayDuration={300}` — do not repeat it in every component.

```tsx
// src/main.tsx — single instance at root
<TooltipProvider delayDuration={300}>
  <App />
</TooltipProvider>
```

### 6.8.3 Glassmorphism (Required)

Tooltips are floating elements — per §4, they MUST use the `overlay-glass`
pattern. The shadcn default ships `TooltipContent` as a solid `bg-primary`
block; override it:

```tsx
<TooltipContent className="bg-surface/80 backdrop-blur-md border border-strong text-primary text-caption-ui px-2.5 py-1.5">
  {t('common.delete')}
</TooltipContent>
```

Default styling in `src/components/ui/tooltip.tsx` already applies this —
verify after any shadcn upgrade that the override hasn't been reverted.

### 6.8.4 When to Skip the Tooltip

A tooltip is NOT needed when the button already has visible text:

```tsx
// ✅ NO tooltip needed — text label is visible
<Button variant="outline">
  <Download className="mr-2 h-4 w-4" />
  {t('history.export')}
</Button>

// ✅ Tooltip NOT needed — DropdownMenuTrigger has its own accessible pattern
<DropdownMenuTrigger asChild>
  <Button variant="ghost" size="icon" aria-label={t('common.options')}>
    <MoreVertical className="h-4 w-4" />
  </Button>
</DropdownMenuTrigger>
```

A tooltip MAY be omitted for **inline remove buttons inside tags** (tiny
`<button>` chips where a tooltip would be distracting), but `aria-label` is
still REQUIRED:

```tsx
// ⚠️ Exception: tiny inline remove button — aria-label required, tooltip optional
<button
  onClick={() => handleRemove(m)}
  className="rounded p-0.5 text-muted hover:text-primary"
  aria-label={`Remove ${m}`}
>
  <X className="h-3 w-3" />
</button>
```

### 6.8.5 Enforcement Checklist

Every icon-only button in a PR diff MUST pass all of these:

| # | Check | How |
|---|---|---|
| 1 | `aria-label` present | `grep 'aria-label'` on new/changed files |
| 2 | `<Tooltip>` wraps the trigger | Visual scan or `grep -B5 'aria-label'` |
| 3 | Text matches `aria-label` | `grep -A1 'aria-label'` and check TooltipContent |
| 4 | Glassmorphism on TooltipContent | No solid background — verify `bg-surface/80 backdrop-blur-md` or equivalent |
| 5 | Radix/Shadcn `Tooltip` primitive | No hand-rolled `onMouseEnter/onMouseLeave` |
| 6 | Reduced motion respected | Radix handles this — no custom animation overrides |
| 7 | Touch target ≥ 44px on mobile | `min-h-[44px] min-w-[44px]` or `lg:` override for mobile buttons |
| 8 | TooltipProvider at root | Single instance in `main.tsx`, not duplicated per component |

## 6.9 Dual-Mode Select

A specialized pattern for fields that can be either **User** (explicitly pinned)
or **AI** (Compose Engine determines all preferences). The visible labels are
"User" and "AI" — not "User Defined" / "System Defined."

- **Structure:** Two segmented buttons ("User" / "AI") as a toggle, followed
  by a conditional combobox that appears only when "User" is selected.
- **Segmented buttons:** `SegmentGroup` or two `Toggle` buttons grouped together.
  Active segment uses `brand-primary` background with `text-on-brand`; inactive
  uses `bg-surface-hover` with `text-secondary`. The segments are separated by a
  thin `border-subtle` divider, not spaced apart.
- **Combobox conditional:** When "User" is active, show a `Combobox`
  (Radix/Shadcn) below the segmented control. When "AI" is active, hide the
  combobox — the Compose Engine determines the value.
- **Per-field AI fallback in User mode:** Within User mode, the combobox for
  each field can also be set to "AI" (the first option). Selecting "AI" on a
  specific field delegates that single field to the Compose Engine while the
  remaining fields stay user-pinned. This is the per-field fallback that
  replaces the old "None" value.
- **AI option visual indicator:** The "AI" option prepended to each per-field
  combobox is marked with a subtle `Sparkles` icon (`text-brand-primary`,
  `h-3.5 w-3.5`) that pulses via `motion-safe:animate-pulse`, giving users an
  at-a-glance signal that the field is delegated to the Compose Engine.
- **Generic None is no longer visible:** There is no "None" option in the
  combobox. The old behavior of selecting "None" to mean "let the engine pick"
  is now expressed by the "AI" option on each field (in User mode) or by
  switching the global mode to "AI" (which delegates all fields at once).
- **AI mode is authoritative:** When the global mode is "AI," all style fields
  (mood, color palette, art style, background) and human presence are
  recomputed by the Compose Engine. Any stale per-field User values are
  discarded during `resolveInputPreferences` — AI mode overrides everything.
- **No People remains explicit exclusion:** "No People" is still a direct
  selection in the human model combobox (User mode). It emits an authoritative
  "No People" constraint that forbids any human presence in the subject,
  environment, or full prompt. This is not an AI fallback — it is an explicit
  user constraint, just like selecting "Peaceful" for mood.
- **Focus:** `focus-visible:ring-2 focus-visible:ring-brand-primary
  focus-visible:ring-offset-2` on both the segmented buttons and the combobox
  trigger.
- **Prompt Breakdown source indicators:** In `SegmentsPanel`, each segment row
  now displays a source badge — "USER" (brand-primary accent) when the value was
  user-pinned, or "AI" (neutral surface) when determined by the Compose Engine.
  The badge uses `brand-primary/10` for USER and `bg-surface-hover` for AI, with
  `border border-border-subtle` and `text-[10px] font-semibold` text. The
  `SegmentSources` type (`Record<keyof PromptSegments, SegmentSource>`) maps each
  segment key to its source.
- **Implementation:** Use Radix/Shadcn `ToggleGroup` for the mode selector and
  `Combobox` for the value selector. Wire the conditional visibility to the mode
  state — show the combobox only when `mode === 'user'`. Prepend an "AI" option
  to each field's combobox options so users can delegate individual fields
  without switching the global mode.

```tsx
<FieldRow label="Mood" htmlFor="mood-mode">
  <ToggleGroup
    type="single"
    value={field.mode}
    onValueChange={(val) => field.onChange({ ...field, mode: val as 'user' | 'system' })}
    className="flex gap-0"
  >
    <ToggleGroupItem
      value="user"
      className="data-[state=on]:bg-brand-primary data-[state=on]:text-on-brand rounded-r-none border border-r-0 border-border-subtle"
    >
      User
    </ToggleGroupItem>
    <ToggleGroupItem
      value="system"
      className="data-[state=on]:bg-brand-primary data-[state=on]:text-on-brand rounded-l-none border border-border-subtle"
    >
      AI
    </ToggleGroupItem>
  </ToggleGroup>
  {field.mode === 'user' && (
    <Combobox
      options={[aiOption, ...MOOD_OPTIONS.map((v) => ({ value: v, label: OPTION_LABELS[v] }))]}
      value={field.mode === 'user' ? field.value : 'ai'}
      onChange={(val) => handleStyleValueChange(key, val)}
    />
  )}
</FieldRow>
```

## 6.10 Composer Input Controls

- **Category and language:** Category uses the searchable `Combobox` because it
  contains a longer taxonomy; Language uses the ordinary Radix `Select` because
  it has only two choices. Labels must be connected to their triggers by `id`.
- **Custom Instructions:** Use `maxLength={500}` and show a live character
  counter. The textarea may resize vertically, but is capped at `max-h-48` with
  vertical scrolling so it cannot expand the Composer indefinitely.
- **Variation Context:** The history slider spans 5–50 and pairs its segmented
  track color with persistent explanatory text: 5–15 uses success/low, 16–35
  uses warning/moderate, and 36–50 uses danger/high. Tier changes use a subtle
  120ms opacity/translate transition, respect reduced motion, and announce from
  a persistent `aria-live="polite"` wrapper.

## 6.11 Scrollbar

Previously the app relied entirely on the browser's native scrollbar styling,
which varied across platforms and ignored the project's semantic color tokens.
The rules below apply to both the native page scrollbar (controlled via global
CSS) and the custom Radix `ScrollArea` component.

- **Thumb color:** `border-strong` token (see §1.1, §2.1) — the same token used
  for overlay borders. In light mode this resolves to `#D1D5DB`; in dark mode
  to `#3A3F46`. The value updates dynamically with the theme because it
  references `var(--color-border-strong)`, which itself chains through
  `rgb(var(--border-strong))` — never a hardcoded hex.
- **Track:** transparent. The scrollbar should feel like it materialises only
  when scrolling, not occupy permanent visual space.
- **Width:** slim — `6px` for the native scrollbar (via `scrollbar-width: thin`
  in Firefox and `width: 6px` in WebKit), `w-1.5` for the Radix `ScrollBar`
  component. This is intentionally thinner than the standard platform default
  (~12–16px) to match the IDE-like density of the UI (§Overview).
- **Thumb hover:** `secondary` token (`#E2E8F0` light / `#334155` dark) — a
  slight brightening in both modes so the thumb gives hover feedback without
  requiring a separate hover color variable.
- **Radix ScrollArea** (`src/components/ui/scroll-area.tsx`) wraps content in a
  `ScrollAreaPrimitive.Viewport` and renders its own `ScrollBar` with the thumb
  coloured by `bg-border-strong`. Kept as a primitive for panels with fixed
  scroll areas; overflow rows (e.g. the folder chips bar) use native
  `overflow-x-auto` plus the `.chips-scrollbar` class, which applies the same
  thin-token styling to a nested horizontal scrollbar — deliberately always
  visible, because default overlay scrollbars hide while the pointer is
  outside the row (e.g. over an open kebab dropdown menu, which is portaled to
  the body) and read as a disappearing scrollbar.
- **Native page scrollbar** (`src/index.css`) is styled globally with
  `scrollbar-color` / `scrollbar-width` for Firefox and `::-webkit-scrollbar`
  pseudo-elements for Chromium browsers. These rules are scoped to `<html>` so
  they affect only the document-level scroll, not third-party widgets or nested
  scrollable containers.
- **Dropdown scroll-lock restore:** Radix `Select` and `DropdownMenu` are
  modal by default, so `react-remove-scroll` locks the page scroll
  (`body[data-scroll-locked]` → `overflow: hidden`) while open, hiding the page
  scrollbar. A pure-CSS `:has()` override restores it for these two controls
  only (Dialog/AlertDialog keep their lock) — see the rule in `src/index.css`
  next to §6.11.

```css
/* Firefox */
html {
  scrollbar-color: var(--color-border-strong) transparent;
  scrollbar-width: thin;
}

/* Chromium (Chrome, Safari, Edge) */
html::-webkit-scrollbar { width: 6px; height: 6px; }
html::-webkit-scrollbar-track { background: transparent; }
html::-webkit-scrollbar-thumb {
  background: var(--color-border-strong);
  border-radius: 9999px;
}
html::-webkit-scrollbar-thumb:hover {
  background: var(--color-secondary);
}
```

```tsx
// Radix ScrollArea — src/components/ui/scroll-area.tsx
<ScrollAreaPrimitive.ScrollAreaThumb
  className="relative flex-1 rounded-full bg-border-strong"
/>
```

## 6.12 Form Field Layout

Formalizes the label+input pairing pattern that was previously undefined,
leading to inconsistent spacing and alignment across forms.

- **Layout:** Labels sit left of their input on a shared row, right-aligned
  mentally but implemented as a flex row with `justify-between`. The input
  group is constrained to `max-w-sm` so fields don't stretch edge-to-edge.
- **Label token:** always `text-label-ui text-primary` (Geist, 13px, Medium,
  §1.2). Never use `text-body-ui` for a label — it creates visual confusion
  between the label and the field value.
- **Input token:** use the `Input` or `SelectTrigger` components directly.
  They already apply `bg-surface`, `border-border-subtle`, and
  `focus-visible:ring-brand-primary` per the system.
- **Grouping:** related fields are wrapped in a `SectionGroup` — a container
  with a small icon + `text-caption-ui text-secondary` header label, then
  fields indented with `pl-5` to establish visual hierarchy without relying
  on borders or background changes.
- **Section dividers:** between unrelated field groups, use a thin
  `border-t border-border-subtle` rule. This is the only horizontal divider
  in the system — never use `<hr>` (hard to style consistently across
  themes) or background color shifts to separate sections.
- **Inline errors:** `border-danger` on the input + `text-brand-danger` helper
  below the field (per §6.4). The helper text is `text-caption-ui`.
- **Disabled fields:** `opacity-50 cursor-not-allowed` is handled by the
  Input/Select components. Never add a separate disabled label.
- **Skeleton fields:** use `<Skeleton className="h-10 w-full rounded-lg" />`
  (matching the `h-10` input height) when a form field is loading. Use the
  `FormSkeleton` composed variant (§6.17.2) for entire form loading states.
- **Enter to submit:** fields that trigger an action (preset name, custom model
  name) respond to Enter via `onKeyDown` — don't require the user to click a
  button if they're already typing in a single-field form.

```tsx
// FieldRow — the standard label + input pairing
function FieldRow({ label, htmlFor, children }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label htmlFor={htmlFor} className="shrink-0 text-label-ui text-primary">
        {label}
      </label>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}

// SectionGroup — groups related fields under a shared header
function SectionGroup({ icon: Icon, title, children }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-muted" />
        <span className="text-caption-ui text-secondary font-semibold">{title}</span>
      </div>
      <div className="flex flex-col gap-4 pl-5">{children}</div>
    </div>
  )
}
```

## 6.13 Settings Page Layout

Settings pages follow a different layout from the main generator dashboard.
Avoid reusing the generator's dense card layout in settings — settings need
more whitespace and clearer section boundaries.

- **Container width:** `max-w-3xl` (768px) instead of `xl` (1280px). Settings
  forms with long text inputs feel stretched at 1280px; 768px keeps line
  lengths readable while being wider than `max-w-2xl` (672px) which feels
  cramped for field+label rows.
- **Bottom padding:** `pb-12` on the page container. Apply/import/export
  actions at the bottom of a tall settings card need breathing room before
  the page end — `pb-6` is insufficient here.
- **Card header icons:** every settings card gets a `CardHeader` with an
  8×8 icon container (`.rounded-lg bg-brand-primary/10`) + icon. This gives
  each card a visual anchor that distinguishes it by glance:
  - Preferences → `Palette`
  - AI Config → `Cpu`
- **SectionGroup** (§6.12) replaces sub-cards for field grouping within a
  settings card. Do not nest `Card` components — use `SectionGroup` +
  `SectionDivider` instead.
- **Action buttons:** group primary actions (Apply, Test Connection) with
  the fields they act on, not at the very bottom of a long card. Place them
  after the last related field group, before saved presets.
- **List items** (presets, saved configs) use the `group` pattern (§6.14)
  with actions revealed on hover. Never show delete/load buttons at full
  opacity on every item — it creates visual clutter.
- **Empty state:** use the `EmptyState` component (§6.6), not a dashed-border
  div. The empty state is an invitation to act, so include an action button.
- **Import:** use a hidden `<input type="file">` triggered by a `<label>` or
  button click (never a raw `<input>` visible on the page). Read the file as
  text and open the import dialog with pre-filled content.

## 6.14 List Items (Presets, Saved Items)

- **Container:** `rounded-lg border border-border-subtle bg-surface px-4 py-3`.
  The item starts with a subtle border and flat surface — elevation comes from
  interaction, not resting state.
- **Resting state:** title in `text-label-ui text-primary`, metadata in
  `text-caption-ui text-muted`. Two distinct text roles in one item.
- **Hover state:** `hover:border-border-strong hover:bg-surface-hover` with
  `transition-all`. The border strengthens and the background shifts to signal
  interactivity.
- **Action reveal:** action buttons inside a `div` with
  `opacity-0 transition-opacity group-hover:opacity-100`. Actions are visible
  on hover (desktop) and always visible in the item's focused/active state.
  On touch devices, the items reveal actions on first tap or show them
  persistently via a "more" button — test both.
- **Destructive action:** the delete button uses `text-muted hover:text-brand-danger`
  instead of showing red at rest. Color-coded danger appears only on hover to
  avoid alarming the user during normal browsing.
- **No icon-only buttons without aria-label:** per §6.8, every icon button
  gets an `aria-label`. Tooltip is not a substitute.

```tsx
<div className="group flex items-center justify-between rounded-lg border border-border-subtle bg-surface px-4 py-3 transition-all hover:border-border-strong hover:bg-surface-hover">
  <div className="flex flex-col gap-0.5">
    <span className="text-label-ui text-primary">{name}</span>
    <span className="text-caption-ui text-muted">{metadata}</span>
  </div>
  <div className="flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
    <Button variant="outline" size="sm" className="h-8 gap-1.5 px-2.5 text-caption-ui">
      {action}
    </Button>
    <Button
      variant="ghost"
      size="sm"
      className="h-8 w-8 p-0 text-muted hover:text-brand-danger"
      aria-label="Delete"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  </div>
</div>
```

## 6.15 Grain Overlay & Texture

A subtle noise texture overlays the entire application to add visual depth
without distracting from content.

- **Implementation tier (§0):** tier 2 — the React Bits `Noise` component
  (`src/components/animations/Noise.tsx`, props: `patternSize`, `patternScaleX/Y`,
  `patternRefreshInterval`, `patternAlpha`) is the animated option when the
  grain must refresh continuously. The `body::before` data-URI approach below
  is the tier-4 fallback: zero JS, one static pass — use it for the app-wide
  overlay where animation adds nothing. Opacity targets below apply to the
  CSS variant; `Noise` controls density via `patternAlpha` instead (default
  15).

- **Position:** fixed-position pseudo-element on `body::before`, covering the
  full viewport.
- **Z-index:** `1` (see §1.3), rendering above the background but below all
  interactive content (dropdowns, modals, toasts at `z-sticky` and above).
- **Pointer events:** `none` — the overlay is purely visual and must not
  interfere with clicking through to underlying elements.
- **Opacity:** `0.028` in light mode, `0.04` in dark mode — subtle enough to
  be perceptible only on close inspection, sufficient to break up color
  banding.
- **Implementation:** a data-URI SVG using `feTurbulence` with `type="fractalNoise"`,
  `baseFrequency="0.8"`, `numOctaves="4"`, applied as a `background-size: 256px`
  repeating pattern.

```css
/* Light mode */
body::before {
  content: "";
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,...");
  background-size: 256px;
  opacity: 0.028;
  z-index: 1;
  pointer-events: none;
}

/* Dark mode override */
[data-theme="dark"] body::before {
  opacity: 0.04;
}
```

## 6.16 Card Spotlight Border

Interactive cards gain a luminous border effect that follows the cursor
position, providing visual feedback on hover.

- **Implementation tier (§0):** tier 2 — the React Bits `SpotlightCard`
  component (`src/components/animations/SpotlightCard.tsx`) is the standard
  implementation for card-shaped surfaces. Home feature tiles render it
  directly (defaults token-aligned on adoption per §0 rule 3). The
  `.card-spotlight` + `useSpotlightBorder`
  spec below remains the fallback for containers where SpotlightCard's
  wrapper chrome (border, radius, padding) doesn't fit — e.g. list-item
  rows that must keep their own layout, or surfaces already carrying
  hover-shift behavior (`GeneratorPromptCard`, `GeneratorForm`, Settings
  cards).

- **Utility class:** `.card-spotlight` applies to any interactive card component.
- **Effect:** a `::after` pseudo-element with a `radial-gradient` centered at
  `--mouse-x`/`--mouse-y` CSS custom properties, using `brand-primary/6` color,
  fading to transparent at 40% radius.
- **States:** opacity `0` at rest, `1` on hover — smooth transition via
  `transition-opacity`.
- **Pointer events:** `none` — the effect is purely decorative.
- **Hook:** `useSpotlightBorder` in `src/hooks/useSpotlightBorder.ts` listens to
  `document mousemove`, throttles via `requestAnimationFrame`, and sets
  `--mouse-x`/`--mouse-y` on each `.card-spotlight` element relative to its
  bounding rect.
- **Applied to:** `GeneratorForm` card, `PromptCard`, `HistoryList` item cards,
  `QuickStats` metric tiles, `RecentPrompts` prompt tiles, and Home page
  feature cards.

```tsx
// Hook usage in component
const spotlightRef = useSpotlightBorder();

<div ref={spotlightRef} className="card-spotlight rounded-xl border ...">
  {/* content */}
</div>
```

---

## 6.17 Skeleton Loading System

A centralized skeleton system built with Framer Motion (tier 3, §0),
replacing all ad-hoc `LoadingSpinner` and inline pulse divs. Skeletons are
the only loading state pattern in the app (per §1.4).

### 6.17.1 Base Skeleton

`src/components/ui/skeleton.tsx` exports a `Skeleton` component that renders a
`bg-border-subtle` block with an animated shimmer overlay.

- **Shimmer effect:** a `linear-gradient` overlay sweeps left-to-right across
  the skeleton block using Framer Motion. The gradient uses `--shimmer` CSS
  variable:
  - Light mode: `rgba(255,255,255,0.5)` — a bright highlight that creates
    visible contrast against `border-subtle` (`#E5E7EB`).
  - Dark mode: `rgba(255,255,255,0.08)` — a subtle glow on the dark
    `border-subtle` (`#2A2E34`).
  - `mix-blend-mode: overlay` ensures the shimmer reads correctly across both
    themes without separate gradient definitions.
- **Accessibility:** every skeleton container gets `aria-hidden="true"` (the
  skeleton is decorative, not content). Parent containers wrapping multiple
  skeletons use `role="status" aria-live="polite"` so assistive technology
  announces "loading" once, not on every skeleton element.
- **Prop:** `withShimmer` (default `true`) allows opting out on a per-instance
  basis if shimmer feels distracting in a specific context (e.g., tiny
  skeleton elements where the sweep is barely visible).

```tsx
import { Skeleton } from '@/components/ui/skeleton'

// Basic usage
<Skeleton className="h-4 w-32" />

// Without shimmer (for tiny elements)
<Skeleton className="h-3 w-12" withShimmer={false} />
```

### 6.17.2 Composed Skeleton Variants

Six pre-composed skeleton layouts match the dimensions and structure of their
real content counterparts. Each uses the same `border border-border-subtle
bg-surface` container as the real component so the transition from skeleton
to content is seamless.

| Variant | File | Matches | Used In |
|---|---|---|---|
| `CardSkeleton` | `skeleton.tsx` | `PromptCard` (generator output) | `PromptList.tsx`, `PromptResultsDisplay.tsx` |
| `HistoryCardSkeleton` | `skeleton.tsx` | History list items | `HistoryList.tsx` |
| `MetricTileSkeleton` | `skeleton.tsx` | `QuickStats` metric tiles | `QuickStats.tsx` |
| `RecentPromptItemSkeleton` | `skeleton.tsx` | Recent prompt items | `RecentPrompts.tsx` |
| `PageSkeleton` | `skeleton.tsx` | Generic page layout | `LazyFallback.tsx` (Suspense) |
| `FormSkeleton` | `skeleton.tsx` | Form with fields | Reserved for future use |

**CardSkeleton layout** (mirrors `PromptCard`):
```
┌─────────────────────────────────────┐
│ [━━━━━━━━━━━]              [━━━━━━] │  ← header + badge
├─────────────────────────────────────┤
│ [━━━━]    [━━━━━━━━━━]              │  ← platform tabs
├─────────────────────────────────────┤
│ [━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━] │
│ [━━━━━━━━━━━━━━━━━━━━━━━━━━]       │  ← prompt text lines
│ [━━━━━━━━━━━━━━━━━━━━]             │
│ [━━━━━━━━━━━]                      │
├─────────────────────────────────────┤
│ [button] [button]     [button]     │  ← action bar
└─────────────────────────────────────┘
```

### 6.17.3 Where Skeletons Appear

| Page / Component | Loading Trigger | Skeleton Used | Previous State |
|---|---|---|---|
| **Home** — QuickStats | `useLiveQuery` returns `undefined` | 2× `MetricTileSkeleton` | Rendered `0` / `0.0` |
| **Home** — RecentPrompts | `useLiveQuery` returns `undefined` | 2× `RecentPromptItemSkeleton` | Showed empty state immediately |
| **Generator** — form hydration | Zustand `_hasHydrated === false` | `Skeleton` blocks (existing) | Same, now with shimmer |
| **Generator** — generating | `isGenerating && !batch` | `CardSkeleton` × batchSize | Inline pulse divs |
| **Generator** — regenerating | `isRegenerating` (per card) | `<Skeleton />` lines | Inline `animate-pulse` divs |
| **History** — initial load | `loading && items.length === 0` | 5× `HistoryCardSkeleton` | `LoadingSpinner` |
| **Templates** — initial load | `loading` | 6× `CardSkeleton` in grid | `LoadingSpinner` |
| **Settings** — custom models | `customModelsLoading` | `<Skeleton />` tags | Same, now with shimmer |
| **Settings** — master prompt | `!masterPromptLoaded` | `<Skeleton />` textarea | Same, now with shimmer |
| **All pages** (Suspense) | Lazy-loading chunk | `PageSkeleton` | `LoadingSpinner` (3 dots) |

### 6.17.4 Do's and Don'ts

- **Do** use composed variants (`CardSkeleton`, `HistoryCardSkeleton`) whenever
  the loading state replaces a known content shape — they match real layout
  dimensions, making the transition invisible.
- **Do** wrap skeleton groups in `role="status" aria-live="polite"` so screen
  readers announce loading state once.
- **Don't** use `LoadingSpinner` anywhere. It has been fully replaced by
  skeleton loading. The component file remains only for backwards compatibility
  and will be removed in a future version.
- **Don't** use inline `animate-pulse bg-border-subtle` divs — always use the
  `<Skeleton />` component or one of its composed variants. Inline pulse divs
  bypass the shimmer effect.
- **Don't** render a skeleton and the real content at the same time — the
  loading condition must be mutually exclusive with the content condition.
  Use early returns (e.g., `if (loading) return <Skeleton />`).

---

## 6.18 Toast Notifications (Sonner)

Toasts use the **Neutral Surface + Status Accents** pattern: a single neutral
card surface in both themes, with status communicated exclusively through
subtle colored borders, colored icons, tinted titles, and a soft colored glow.
Full solid status backgrounds are **forbidden** (this includes Sonner's
`richColors` prop) — they strain the eye in dark mode and break the monochrome
hierarchy defined in §1.

### 6.18.1 Surface

| Mode | Background | Border (resting) |
|---|---|---|
| Light | `bg-surface` (`#FFFFFF`) | `border-strong` |
| Dark | `bg-surface` (`#15181C`) | `border-strong` |

- Toasts are the **one deliberate exception** to the `overlay-glass` rule in §4:
  they use a solid `bg-surface` instead of `bg-surface/80 + blur` so body text
  stays crisp and scannable over busy content. Dropdowns, modals, and tooltips
  still follow §4.
- Radius `radius-md` (8px), `label` typography for the title (13px/500),
  `caption`-scale body for the description. Icons are `16px` lucide (stroke
  1.75 per §6.1).
- Elevation is a 1px ring + soft ambient shadow — never a heavy drop shadow.

### 6.18.2 Status Accents

Borders use the status color at 35% alpha; icons use full status color; titles
are tinted with the full status color (AA-verified in both modes, §5.5); the
glow is a 0.15 alpha 1px ring plus a 28px ambient shadow at 0.3 alpha.

| Status | Border | Icon / Title | Glow |
|---|---|---|---|
| Success | `brand-success` / 35% | `brand-success` | green |
| Error | `brand-danger` / 35% | `brand-danger` | red |
| Warning | `brand-warning` / 35% | `brand-warning` | amber |
| Info | `brand-primary` / 35% | `brand-primary` | blue |
| Loading | `brand-primary` / 35% | `brand-primary` spinner | blue |
| Default (`toast()`) | `border-strong` | icon `text-secondary`, title `text-primary` | neutral |

Description text stays neutral `text-secondary` in both modes — the colored
title, icon, and border carry the status so users never have to read the body
to register it (§5.3: color is never the only signal — here icon **and** border
and title all agree).

### 6.18.3 Positioning, Duration & Stacking

- **Position:** top-right, `offset: { top: 64 }` (clears the sticky header).
  Mobile: top offset 64, full-width with side margins.
- **Stacking:** `visibleToasts: 3`, `expand: false` — later toasts stack behind
  the front one with Sonner's lift effect.
- **Durations:** copy confirmations 3000ms; standard success/info/warning
  4000ms; errors 8000ms (long enough to read and act on, but never persistent);
  `toast.promise` phases resolve when the promise settles.
- **Animation:** Sonner's built-in 400ms translate + fade; swipe-to-dismiss on
  all toasts.
- **Z-index:** `z-toast` (50) per §1.3 — toasts render above modals (40) and
  below nothing else.

### 6.18.4 Usage Rules

1. Use typed helpers only: `toast.success()`, `toast.error()`,
   `toast.warning()`, `toast.info()`, `toast.promise()`. Never render custom
   JSX/markup inside a raw `toast()` call, and never pass per-call
   `style`/`classNames` overrides — theming lives in `index.css` §6.18 rules.
2. The `<Toaster />` in `src/components/ui/sonner.tsx` is the single source of
   config: theme (from `useAppContext`, honoring `system`), position, duration,
   icons, and the `containerAriaLabel`. No other `<Toaster />` may be mounted.
3. React components route through `useToast()` (`showToast(type, message,
   description?)`); non-React code (services like `historyExport.ts`) calls the
   same helpers through the `i18n` instance directly so strings stay translated.
4. Error toasts state what happened and what to do next (§6.4 voice); success
   copy is confident, no exclamation marks.

### 6.19 Page Header Action Toolbar

`PageHeader`'s `action` slot (Templates page: Import / Export / Reset Default /
Create Template) progressively reveals labels as space becomes available while
keeping one control per action.

- **Toolbar container:** `flex flex-wrap items-center gap-2` at every
  breakpoint. Retain `flex-wrap`: the resizable sidebar reduces content width,
  and both EN and ID labels can require another line.
- **Progressive labels:** all four actions are icon-only below `sm`; reveal
  Create at `sm+`, Import at `md+`, Export at `lg+`, and Reset Default at
  `xl+`. At `xl+`, all four buttons show their full labels.
- **One responsive control:** render one `Button` per action. Use CSS breakpoint
  variants on that button and label; never duplicate mobile/desktop controls or
  use JavaScript `matchMedia`.
- **Sizing:** each button starts with `size="icon"` (`h-10 w-10`, 40×40px).
  At its label breakpoint, switch to `w-auto px-4`; keep the label
  `hidden` until the matching breakpoint's `inline` variant. Icons remain
  `h-4 w-4` through the Button base.
- **Icon-only accessibility:** every icon-only state has both an `aria-label`
  and a Radix/shadcn `Tooltip`. The accessible name, tooltip text, and visible
  label use the same i18n value. Hide each `TooltipContent` at the inverse label
  breakpoint (`sm:hidden`, `md:hidden`, `lg:hidden`, or `xl:hidden`). Keep the
  single `TooltipProvider` at the application root; do not add one per action.
- **Action wrapper (`PageHeader`):** `min-w-0 max-w-full` — never
  `shrink-0`. The wrapper must be allowed to shrink so the inner `flex-wrap`
  can engage; with `shrink-0` the action row overflows the viewport instead
  of wrapping.
- **Hidden file input:** keep exactly one Import input (`type="file"`,
  `className="hidden"`) inside the toolbar. The Import button triggers it via
  a ref.

---

## 7. Layout & Spacing

- **App shell (two columns):** on `lg+` the layout is a flex row: the sidebar
  is a full-height sticky column on the left, and the right column (header on
  top, main below) takes the remaining `flex-1` width. Main content must never
  offset itself with a hardcoded left margin — the sidebar pushes it via the
  flex layout.
- **Sidebar:** resizable on `lg+`. Width range **220–400 px**, default
  **260 px**, persisted in `localStorage` (only the last valid width — the
  hidden state is not persisted). A drag handle sits on the sidebar's right
  edge (Pointer Events, `touch-action: none`, `cursor-col-resize`, ARIA
  separator semantics, keyboard resizing, double-click resets to 260 px).
  Dragging below 220 px collapses the sidebar completely; the header hamburger
  (visible on `lg+` only while collapsed) reopens it at the last valid width.
  Below `lg` (§1.5), the sidebar is an off-canvas glass drawer at `z-drawer`
  (fixed 260 px, overlay, follows the overlay rules in §4) — the persisted
  desktop width never applies to the drawer.
- **Header:** spans only the right column (not the sidebar) — `sticky top-0`,
  `h-(--height-header)` (§1.3), `z-sticky`, brand-free: the logo and the close toggle live in the
  sidebar. Mobile hamburger (`<lg`) opens the drawer; on `lg+` an open
  button appears in the header only while the desktop sidebar is hidden —
  and only *after* the close slide has finished (200ms, `SIDEBAR_TRANSITION_MS`),
  fading in via `animate-in` so it never flashes beside the collapsing
  sidebar (reduced-motion users get it instantly, delay 0).
- **Container:** max-width `1280px` (`xl` breakpoint, §1.5) for the main
  generator dashboard, so text lines stay readable.
- **Spacing rhythm:** `lg` (24px) between major sections (e.g. Input Form →
  Output Results) so the interface has room to breathe.
- **Settings container:** `max-w-3xl` (768px) — wider than the default
  `max-w-2xl` to accommodate label+input field rows without wrapping, but
  narrower than the dashboard `xl` to maintain readability on longer fields.
- **Card header icons:** always pair a card title with a semantic icon in an
  8×8 rounded box at `bg-brand-primary/10`. This visually separates cards
  in a multi-card layout without relying on background color changes.

**Layout refinements:**

- **Viewport height:** `min-h-dvh` on the main layout container to fix iOS
  Safari's viewport jump on address bar hide/show.
- **Main content padding:** `p-4 md:p-6` (tightened from `p-6`) for denser
  information density.
- **Header:** `h-(--height-header)`. Background is `bg-surface/80 backdrop-blur-md`.
- **Sidebar:** sidebar-top brand block holds the logo mark (light/dark pair,
  theme-aware) plus the app name (`text-label-ui font-semibold tracking-tight`)
  inside `gap-2.5 px-3`, fixed at exactly `h-(--height-header)` so its bottom `border-b` sits
  on the same line as the header's bottom border (the two lines connect
  across the shell). The desktop close toggle (`MenuButton`, close variant)
  sits at the right end of the brand row (`ml-auto`) and collapses the
  sidebar; it renders only while the sidebar is visible. Open/close animates
  on `lg+` with a 200ms ease-out
  `transition-[width,translate,visibility]` (Tailwind v4 maps `translate-x-*`
  to the CSS `translate` property — custom transition lists must name
  `translate`, not `transform`):
  the sidebar slides out (`-translate-x-full`), width eases to 0 so the main
  column follows, and `visibility` stays visible through the slide-out then
  flips to hidden (collapsed content is unfocusable and out of the
  accessibility tree). While the resize handle is dragged, the transition is
  suspended (`lg:transition-none`) so the width tracks the pointer 1:1, and
  `motion-reduce:transition-none` makes open/close instant for reduced-motion
  users. Navigation
  container uses `gap-0.5` and `p-3`. Nav items use
  `rounded-lg` (was `rounded-md`). Active items get a left accent bar
  (`absolute left-0 h-5 w-0.5 rounded-full bg-brand-primary`). Icons transition
  to `text-brand-primary` when active, `text-muted group-hover:text-primary`
  when inactive. Mobile overlay uses `bg-black/60 backdrop-blur-sm`.
  Background: `bg-surface/95 backdrop-blur-md`.
- **Mobile drawer:** below `lg` the same `<aside>` is an off-canvas drawer
  (fixed 260px, `z-drawer`) that slides with the same 200ms ease-out — the
  slide state uses `max-lg:` variants (`max-lg:translate-x-0` ↔
  `max-lg:-translate-x-full max-lg:invisible`) so closed-drawer content is
  unfocusable and out of the a11y tree, and never bleeds into the `lg+`
  persistent state. The backdrop is always mounted (for the fade) with
  `transition-opacity duration-200` and `opacity-0 pointer-events-none` when
  closed, so it never pops in/out; both honor `motion-reduce:transition-none`.
- **History page folder nav:** folder navigation no longer uses a page-level
  sidebar/drawer — it is a toolbar row under the page header: a folder
  `Combobox` (`FolderSwitcher.tsx`) plus a horizontally scrollable chip row
  (`FolderChips.tsx`, native `overflow-x-auto` + `.chips-scrollbar` thin
  always-visible scrollbar, `scrollbar-gutter:stable`).
  Chips are `rounded-full` pills: active folder gets `border-brand-primary
  bg-brand-primary/10 text-brand-primary`, inactive `border-border-subtle
  bg-surface`; each chip carries a count badge (`tabular-nums`) and a kebab
  `DropdownMenu` for rename/delete. Counts come from the `folderId` index via
  `getHistoryCounts()` (`db.prompt_history.orderBy('folderId').keys()` + one
  `count()`), so the badge never loads full records. Folder creation is capped
  at `MAX_FOLDERS = 10` (enforced in `useHistoryStore.createFolder`, throws
  `FolderLimitError`); the switcher surfaces it as a warning toast
  (`toast.folderLimitReached`).
- **History page shell:** the page is a plain column inside the layout
  `<main>` (whose `p-4 md:p-6` provides the gutter) — no full-height row, no
  `md:-m-6` compensation, no drawer offset tokens.
- **Touch-target override point:** compact button sizes (`h-7` etc.) and
  `min-h/min-w` resets apply only at `lg+` (`lg:h-7 lg:min-h-0 ...`) — the
  drawer era below `lg` keeps ≥40px (ideally 44px) touch targets, per the
  accessibility table in §2.

---

## Appendix: Change History

| Version | Changes |
|---|---|
| v1.0 | Initial design system |
| v1.1 | Added `brand-danger`, `text-on-brand` tokens, form validation, duplicate-detection warning, switch/toggle spec, tooltip rule, scrollbar styling |
| v1.2 | Added dual-mode select pattern, form field layout spec, settings page layout |
| v1.3 | Added grain overlay, card spotlight border, layout refinements |
| v1.4 | Added centralized skeleton loading system, strengthened tooltip rule |
| v1.5 | Added native tooltip suppression rule for simple-icons (title="") to prevent double tooltips |
| v1.6 | Added toast notification spec (§6.18): neutral surface + status accents (no richColors), status borders/icons/titles/glows, durations, stacking, z-index, usage rules; theme tokens drive Sonner theming in `index.css` |
| v1.7 | Added component selection priority (§0): shadcn/ui → React Bits → Framer Motion → custom Tailwind/CSS. React Bits registry (`@react-bits`, components.json) is the tier-2 source for animation-forward components; aligned §1.4 (stagger), §6.15 (Noise), §6.16 (SpotlightCard), §6.17 (Skeleton) with tier references |
| v1.8 | Responsive audit against Tailwind default breakpoints (§1.5): touch targets keep ≥40px until `lg` (drawer era) — compact `md:` overrides in FolderSidebar/BulkActionBar moved to `lg:`; history page padding parity at `md` (`md:-m-6` compensation, single `sm:p-6`); added `--height-header` layout token (single source for header/drawer offsets); generator output grid graduates `md:grid-cols-2 lg:grid-cols-3`; removed dead `sm:grid-cols-1` |
| v1.9 | Mobile drawer animation: slide state moved to `max-lg:` variants with `translate` in the custom transition list (Tailwind v4 maps `translate-x-*` to the CSS `translate` property — `transition-[width,transform,...]` never animated it, so the mobile drawer popped instead of sliding); closed drawer now `max-lg:invisible` (unfocusable, a11y parity with desktop); backdrops (app + folder drawer) always mounted with 200ms `opacity` fade and `pointer-events-none` when closed instead of instant mount/unmount |
| v1.10 | Page header action toolbar (Templates: Import/Export/Reset/Create) made responsive: toolbar is a deterministic 2×2 grid below `sm` (`grid grid-cols-2 gap-2`) and a wrapping flex row at `sm+` (`sm:flex sm:flex-wrap`); the `PageHeader` action wrapper may shrink (`min-w-0 max-w-full`, was `shrink-0`) — the 4-button row can no longer stay one line and break the viewport edge; new §6.19 documents the pattern |
| v1.11 | History folder nav moved out of the page-level sidebar/drawer into a toolbar row: `FolderSwitcher` (Combobox with footer-action pattern + per-option count badges) + `FolderChips` (rounded-full pills, kebab menu, count badges via `getHistoryCounts()`); `FolderSidebar.tsx` and the drawer (backdrop, `top-(--height-header)` offset) removed; History page is now a plain column in `<main>` (no `md:-m-6` compensation, no `calc(100dvh - …)` shell); combobox gained optional `badge` + `footer` props; folder creation capped at `MAX_FOLDERS = 10` (`FolderLimitError` + warning toast); scrollbar fix: dropdown-menu scroll-lock restore extended from Select to `DropdownMenu` (§6.11 `:has` rule) + `.chips-scrollbar` (styled thin nested scrollbar so it no longer hides while the kebab menu is open) |
| v1.12 | Page header action toolbar now uses progressive icon collapse (§6.19): all actions are icon-only below `sm`, then Create, Import, Export, and Reset Default reveal labels at `sm`, `md`, `lg`, and `xl`; one wrapping flex toolbar and one accessible, tooltip-backed Button per action replace the historical base 2×2 grid |
