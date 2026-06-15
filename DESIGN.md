---
version: 1.0.0
name: PromptForge-design-system
description: A high-performance, IDE-inspired design language for an AI Prompt Engineering application. The aesthetic blends the cinematic restraint of professional creative tools with the ultra-fast, precision-driven feel of modern developer environments. It features a strict light/dark semantic color system, seamless text streaming interfaces, and mandatory glassmorphism for overlays to maintain spatial hierarchy without visual clutter.

colors:
  # Brand & Accents
  brand-primary: "var(--brand-primary)" # #3B82F6 (Blue)
  brand-primary-hover: "var(--brand-primary-hover)" # #2563EB
  brand-success: "var(--brand-success)" # #10B981 (For "Copied!" and high scores)
  brand-warning: "var(--brand-warning)" # #F59E0B (For mid/low scores)
  
  # Semantic Backgrounds (Switches based on theme)
  bg-app: "var(--bg-app)" # Dark: #0B0F19 | Light: #F3F4F6
  bg-surface: "var(--bg-surface)" # Dark: #111827 | Light: #FFFFFF
  bg-surface-hover: "var(--bg-surface-hover)" # Dark: #1F2937 | Light: #F9FAFB
  bg-overlay: "var(--bg-overlay)" # Dark: rgba(17,24,39,0.8) | Light: rgba(255,255,255,0.8)
  
  # Semantic Text & Borders
  text-primary: "var(--text-primary)" # Dark: #F9FAFB | Light: #111827
  text-secondary: "var(--text-secondary)" # Dark: #9CA3AF | Light: #4B5563
  text-muted: "var(--text-muted)" # Dark: #4B5563 | Light: #9CA3AF
  border-subtle: "var(--border-subtle)" # Dark: #374151 | Light: #E5E7EB
  border-strong: "var(--border-strong)" # Dark: #4B5563 | Light: #D1D5DB

typography:
  fontFamily: "'Inter', sans-serif"
  fontFamilyMono: "'JetBrains Mono', 'Geist Mono', monospace"
  
  display:
    fontFamily: "{typography.fontFamily}"
    fontSize: 32px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: -0.02em
  heading:
    fontFamily: "{typography.fontFamily}"
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: -0.01em
  body:
    fontFamily: "{typography.fontFamily}"
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.5
  body-mono:
    fontFamily: "{typography.fontFamilyMono}"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0
  label:
    fontFamily: "{typography.fontFamily}"
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.4
  metric-score:
    fontFamily: "{typography.fontFamilyMono}"
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1
    letterSpacing: -0.02em

rounded:
  none: 0px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  full: 9999px

spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px

components:
  button-primary:
    backgroundColor: "{colors.brand-primary}"
    textColor: "#FFFFFF" # Always white regardless of theme
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
    transition: "background-color 0.2s ease"
  
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-primary}"
    border: "1px solid {colors.border-subtle}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  
  surface-card:
    backgroundColor: "{colors.bg-surface}"
    border: "1px solid {colors.border-subtle}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
    shadow: "none" # Flat aesthetic, depth is created by borders
  
  overlay-glass:
    backgroundColor: "{colors.bg-overlay}"
    backdropFilter: "blur(12px)" # CRITICAL: Mandatory for all overlays
    border: "1px solid {colors.border-strong}"
    rounded: "{rounded.md}"
    shadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)"
  
  prompt-output-panel:
    backgroundColor: "{colors.bg-app}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body-mono}"
    border: "1px solid {colors.border-subtle}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
---

## Overview

PromptForge is designed as an Integrated Development Environment (IDE) for prompt engineers. The UI is strictly functional, optimizing for reading density and rapid interaction. It eschews heavy shadows and excessive colors in favor of a precise, high-contrast monochrome base paired with a singular energetic accent (Brand Primary). 

**Key Characteristics:**
- **Developer-Centric Typography:** UI elements use a clean sans-serif (`Inter`), but the actual generated prompts and AI Quality Scores use a monospace font (`JetBrains Mono` or `Geist Mono`) to convey precision and data-readiness.
- **Motion & Speed:** The UI must feel instantaneous. We use streaming text effects for outputs and skeleton loaders for pending data.
- **Flat Depth, Glass Overlays:** Standard cards and layouts are completely flat with thin borders. Depth (Z-index) is strictly communicated through **Glassmorphism (Backdrop Blur)**.

## Light/Dark Theme Strict Rules

To ensure a bug-free experience when toggling between Light and Dark modes, developers must strictly adhere to the following rules:

1. **Never Hardcode Hex Values:** Do not use utility classes like `bg-[#111827]` or `text-white` in components. **Always** use semantic CSS variables mapped to Tailwind/UI classes (e.g., `bg-surface`, `text-primary`).
2. **Root Theme Management:** The theme must be controlled via a `data-theme="dark"` or `data-theme="light"` attribute on the `<html>` or `<body>` tag. CSS variables will invert automatically based on this selector.
3. **Accent Consistency:** The `brand-primary` (Blue) and `brand-success` (Green) remain the same across both themes. However, text inside a `brand-primary` button must **always remain `#FFFFFF`**, even in light mode.
4. **Border Contrast:** Borders in dark mode (`#374151`) are intentionally subtle. When switching to light mode, borders must be distinct enough (`#E5E7EB`) to separate surfaces without looking heavy.

## 🚨 CRITICAL RULE: Overlays & Transparency (Glassmorphism)

To prevent visual clashes between background text and foreground elements (Dropdowns, Modals, Tooltips, Sticky Headers), **pure transparency is strictly forbidden.**

Any floating element must use the `overlay-glass` component architecture:
* **Background:** Uses `bg-overlay` (an 80% opacity version of the surface color).
* **Blur:** Must apply `backdrop-filter: blur(12px)` (e.g., Tailwind's `backdrop-blur-md`).
* **Border:** Must have a `border-strong` ring to clearly define its edges against the blurred background.
* *Example Implementation (Tailwind):* `bg-surface/80 backdrop-blur-md border border-gray-600 shadow-xl`

## Typography Strategy

* **UI Labels & Navigation:** Uses `{typography.label}` (Inter, 13px, Medium). Keeps the interface chrome minimal and out of the way.
* **The "Prompt" Text:** This is the most important element on the screen. It uses `{typography.body-mono}`. The monospace font gives it a "code block" feel, making it easier for users to scan for specific keywords or syntax (like `--v 6.0` or `--ar 16:9`).
* **Quality Score:** Uses `{typography.metric-score}`. Large, bold monospace numbers to make the AI's evaluation feel like an exact computation.

## Component States & Streaming UI

### 1. Multi-line Idea Input (Textarea)
* **State Default:** `bg-surface` with `border-subtle`.
* **State Focused:** Border changes to `brand-primary` with a subtle focus ring. Must auto-resize vertically based on user input length.

### 2. Streaming Output Panel
* When the user clicks "Generate", the output panel immediately appears with a blinking cursor.
* As the `stream: true` data arrives from the backend, characters are appended seamlessly in `{typography.body-mono}`.
* **Skeleton Loading:** While the prompt is streaming, the "AI Quality Score" section must display a pulsing grey box (`animate-pulse bg-border-subtle`). The actual numeric score only replaces the skeleton once the entire stream is complete.

### 3. Action Bars & Copy Buttons
* Hovering over a generated prompt reveals a ghost-style action bar.
* **"Copy" action:** Upon clicking, the icon turns into a checkmark, the text turns `{colors.brand-success}`, and a small glassmorphism toast notification appears saying "Prompt Copied". Reverts to normal after 2 seconds.

## Layout & Spacing

* **Container:** Maximum width of `1280px` for the main generator dashboard to ensure text lines don't get too long and difficult to read.
* **Sidebar:** Fixed width (e.g., `260px`). In mobile view, it collapses into a glassmorphism drawer (must follow the Overlay Glass rules).
* **Spacing Rhythm:** Uses `{spacing.lg}` (24px) between major sections (e.g., between the Input Form and the Output Results) to allow the interface to breathe.

## Do's and Don'ts

### Do
* **Do** use `bg-app` for the outermost container and `bg-surface` for cards/panels holding content.
* **Do** use `backdrop-blur-md` on dropdown menus (like the Aspect Ratio or Theme selector) so the text underneath doesn't collide with the menu items.
* **Do** test every new component in both `data-theme="light"` and `data-theme="dark"` before merging code.

### Don't
* **Don't** use standard shadows (`shadow-md`) on flat cards. Rely on borders (`border-subtle`). Shadows are exclusively reserved for floating overlays (modals/dropdowns).
* **Don't** use loading spinners for text generation. Always use streaming text and skeleton loaders to make the app feel faster.
* **Don't** use the monospace font for standard UI buttons or navigation. Reserve monospace strictly for AI outputs, prompt syntax, and scores.