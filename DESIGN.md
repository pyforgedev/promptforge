---
version: 1.1.0
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

- **Developer-centric typography** — UI chrome uses `Inter`; generated prompts
  and quality scores use `JetBrains Mono` / `Geist Mono` to read like data, not prose.
- **Motion & speed** — the UI must feel instantaneous: streaming text for
  outputs, skeletons for pending data, no spinners.
- **Flat depth, glass overlays** — cards are flat with thin borders. Elevation
  is communicated exclusively through glassmorphism + a strict z-index scale,
  never through drop shadows on resting surfaces.
- **Accessible by default** — every rule below assumes the result must be
  usable with a keyboard, a screen reader, and `prefers-reduced-motion: reduce`.
  This is not optional polish; treat it as a build requirement same as TypeScript
  passing.

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

> `brand-danger` and `text-on-brand` are new in v1.1 — the previous version had
> no error color and no explicit rule for text-on-color, which is why error
> states in the generator form were inconsistent.

### 1.2 Typography

| Role | Family | Size | Weight | Line-height | Tracking |
|---|---|---|---|---|---|
| `display` | Inter | 32px | 700 | 1.2 | -0.02em |
| `heading` | Inter | 20px | 600 | 1.3 | -0.01em |
| `body` | Inter | 15px | 400 | 1.5 | — |
| `label` | Inter | 13px | 500 | 1.4 | — |
| `caption` | Inter | 12px | 500 | 1.4 | 0.01em |
| `body-mono` | JetBrains Mono / Geist Mono | 14px | 400 | 1.6 | 0 |
| `metric-score` | JetBrains Mono / Geist Mono | 24px | 600 | 1.0 | -0.02em |

`caption` is new — use it for timestamps, item counts, and metadata in
`HistoryList`, instead of reusing `label` at a smaller size.

### 1.3 Spacing, radius, elevation

| Spacing | xs | sm | md | lg | xl | xxl |
|---|---|---|---|---|---|---|
| px | 4 | 8 | 16 | 24 | 32 | 48 |

| Radius | none | sm | md | lg | xl | full |
|---|---|---|---|---|---|---|
| px | 0 | 6 | 8 | 12 | 16 | 9999 |

| Z-index layer | Value | Used for |
|---|---|---|
| `z-base` | 0 | Default page content |
| `z-sticky` | 10 | Sticky headers/toolbars |
| `z-dropdown` | 20 | Select menus, popovers |
| `z-drawer` | 30 | Mobile sidebar drawer |
| `z-modal` | 40 | Dialogs |
| `z-toast` | 50 | Copy/duplicate-warning toasts |

Every floating element gets its z-index from this table — no ad hoc `z-[999]`
in component code. This avoids the classic bug where a toast renders behind a
modal.

### 1.4 Motion

| Token | Duration | Easing | Use |
|---|---|---|---|
| `motion-fast` | 120ms | `ease-out` | Hover/active feedback, icon swaps |
| `motion-base` | 200ms | `cubic-bezier(0.4, 0, 0.2, 1)` | Panel open/close, accordion |
| `motion-slow` | 320ms | `cubic-bezier(0.4, 0, 0.2, 1)` | Drawer slide-in, modal entrance |
| `motion-stream` | per-character, no easing | — | Text streaming (see §6.2) |

With Framer Motion:

```tsx
const baseTransition = { duration: 0.2, ease: [0.4, 0, 0.2, 1] };
```

**Reduced motion is mandatory, not optional:** wrap non-essential motion
(drawer slides, accordion expand, hover scale) in a check against
`prefers-reduced-motion`, and fall back to an opacity-only or instant
transition. Streaming text may keep appearing instantly (no animation) rather
than character-by-character when reduced motion is requested — the content
still needs to appear, just without the animated reveal.

```tsx
const shouldReduceMotion = useReducedMotion(); // from framer-motion
transition={shouldReduceMotion ? { duration: 0 } : baseTransition}
```

### 1.5 Breakpoints

| Token | Min-width | Notes |
|---|---|---|
| `sm` | 640px | — |
| `md` | 768px | Sidebar still collapsible |
| `lg` | 1024px | Sidebar becomes persistent (no drawer) |
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
5. **Test every new component in both themes before merging.** This was a rule
   in v1.0 and remains one — it's the cheapest bug class to prevent and the
   easiest to skip under deadline pressure.

---

## 4. 🚨 Critical Rule: Overlays & Transparency (Glassmorphism)

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
2. **Visible focus is mandatory.** Every interactive element gets a visible
   `focus-visible` ring using `brand-primary`, e.g.
   `focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2`.
   Never `outline-none` without a replacement focus style.
3. **Color is never the only signal.** An error state pairs `border-danger`
   with an icon and text, not just a red border — the duplicate-detection
   warning (see §6.4) follows this too: icon + text + color, not color alone.
4. **Respect `prefers-reduced-motion`** per §1.4 for every animation that
   isn't strictly necessary to convey state.
5. **Contrast is checked, not assumed.** Any new color value added to §2.1
   gets verified against the AA targets stated there before merging.
6. **Touch targets ≥ 40px** on interactive elements in mobile/drawer contexts
   (action bar icon buttons, close buttons).

---

## 6. Typography Strategy

- **UI labels & navigation:** `label` token (Inter, 13px, Medium) — keeps
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

- **Library:** `lucide-react` exclusively — don't mix in another icon set,
  stroke weights won't match.
- **Stroke width:** `1.75` as the project default (slightly heavier than
  Lucide's default `2` reads better at small UI sizes against this typeface).
- **Sizes:** `16px` inline with `label`/`body` text, `20px` in standalone
  buttons/action bars, `24px` for empty-state illustrations.
- **Color:** icons inherit `currentColor` — never hardcode an icon fill/stroke
  color separately from the text it sits beside.

## 6.2 Streaming Output Panel

- On "Generate", the output panel appears immediately with a blinking cursor.
- As `stream: true` data arrives, characters append in `body-mono`.
- **Skeleton loading:** while streaming, "AI Quality Score" shows a pulsing
  box (`animate-pulse bg-border-subtle`). The numeric score replaces it only
  once the stream completes.
- Under reduced motion, skip the pulse animation and show a static placeholder
  block instead.

## 6.3 Action Bars & Copy Buttons

- Hovering a generated prompt reveals a ghost-style action bar.
- **Copy:** icon → checkmark, text → `brand-success`, glass toast
  ("Prompt copied") at `z-toast`. Reverts after 2s.

## 6.4 Form Validation & Error States

New in v1.1 — directly addresses the missing-translation-key and error-handling
issues found in code review.

- **Invalid input:** `border-danger` border, `brand-danger` helper text below
  the field, plus a small danger-colored icon — never border color alone.
- **API/provider errors** (`generator.form.errors.*`): rendered as an inline
  banner using the `overlay-glass` background but with a `border-danger`
  accent edge (left border, 3px, `brand-danger`) — distinct enough from a
  generic glass dropdown that users register it as an error, not a menu.
- **Error copy** states what happened and what to do next in the interface's
  voice — e.g. "Couldn't reach the prompt provider. Check your connection and
  retry," not "PROVIDER_ERROR" or a bare exclamation mark.

## 6.5 Duplicate-Detection Warning (Badge & Banner)

New in v1.1 — UI spec for the feature being implemented separately; defined
here so it's built with existing tokens instead of one-off styles.

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

---

## 7. Layout & Spacing

- **Container:** max-width `1280px` (`xl` breakpoint, §1.5) for the main
  generator dashboard, so text lines stay readable.
- **Sidebar:** fixed `260px`. Below `lg` (§1.5), it collapses into a glass
  drawer at `z-drawer`, following the overlay rules in §4.
- **Spacing rhythm:** `lg` (24px) between major sections (e.g. Input Form →
  Output Results) so the interface has room to breathe.

---

## 8. Do's and Don'ts

### Do

- **Do** use `bg-app` for the outermost container, `bg-surface` for
  cards/panels.
- **Do** use `backdrop-blur-md` on dropdowns so underlying text never visually
  collides with menu items.
- **Do** reach for a Radix/Shadcn primitive before hand-rolling an interactive
  pattern (§5.1).
- **Do** test every new component in both `data-theme="light"` and
  `data-theme="dark"`, with keyboard-only navigation, before merging.

### Don't

- **Don't** use standard shadows (`shadow-md`) on flat resting cards — rely on
  `border-subtle`. Shadows are reserved for floating overlays at their `z-*`
  layer.
- **Don't** use loading spinners for text generation — streaming text and
  skeletons only.
- **Don't** use the monospace font for UI buttons or navigation — reserved
  for AI outputs, prompt syntax, and scores.
- **Don't** define a new color value without adding it to §2.1 and checking
  contrast — no inline one-off hex values, ever.
- **Don't** ship a custom dropdown/accordion/modal when a Radix/Shadcn
  primitive already covers the pattern.