<div align="center">
  <img src="assets/header-banner.png" alt="PromptForge Banner" width="100%" />
  <h1>PromptForge</h1>
  <p><strong>A high-performance, IDE-inspired design language and application for AI Prompt Engineering.</strong></p>
</div>

PromptForge is a professional-grade prompt engineering tool designed to generate high-quality stock-image prompts with minimum repetition and high variation. It blends the cinematic restraint of professional creative tools with the ultra-fast, precision-driven feel of modern developer environments.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://promptforge-woad.vercel.app/)

## Features

- **V1 Prompt Generator:** Configurable aspect ratios (1:1, 16:9, etc.), niche selection, style presets (Commercial, Lifestyle, etc.), batch generation (1/3/5/10), target platform selection (DALL-E 3 / Nano Banana / Both), negative prompts, and stock keywords toggling.
- **Prompt Quality Rating:** Scores prompts on Commercial Potential, Creativity, Clarity, Marketability, and Uniqueness.
- **Duplicate Detection:** Similarity analysis against prompt history to prevent repetitive generations.
- **Templates:** Save, edit, reset, import, and export custom templates.
- **History:** Local cache using IndexedDB (Dexie), featuring search/filter by aspect ratio, style, rating, date, and TXT export/import.
- **Theme:** Strict Light/Dark/System theme support via next-themes, utilizing a semantic color system and glassmorphism.
- **Internationalization (i18n):** Full support for English (en) and Bahasa Indonesia (id).
- **Toast Notifications:** Standardized user feedback using sonner for all data-modifying actions.

## Quick Start

> [!NOTE]
> Ensure you have [Node.js](https://nodejs.org/) installed before proceeding.

### 1. Clone the repository

```bash
git clone https://github.com/your-username/promptforge.git
cd promptforge
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the development server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

## Architecture and Tech Stack

PromptForge uses a modular, feature-based architecture structured into dedicated layers to enforce separation of concerns, scalability, and maintainability.

### Architecture Layers

- **Feature-Based Modules (`src/features/`):** Self-contained domains encapsulating components, hooks, schemas, state slices, and assets relevant to specific features (e.g., prompt generator, history, templates).
- **Services Layer (`src/services/`):** External integrations and core application business logic, including AI API clients, IndexedDB storage wrapper (Dexie), export utilities, and text similarity algorithms.
- **State Management (`src/store/`):** Zustand-powered stores managing global application state, including AI configuration, generator preferences, and historical logs.
- **Routing Layer (`src/app/`):** React Router DOM v7 utilizing `createBrowserRouter` for declarative, lazy-loaded routing, error boundaries, and nested layout structures.

### Core Technologies

- **Framework:** React 19 + TypeScript + Vite 8
- **Styling:** Tailwind CSS v4 (via `@tailwindcss/vite` plugin) + Shadcn UI (Radix UI primitives) + Framer Motion 12
- **State Management:** Zustand 5
- **Storage:** Dexie 4 (IndexedDB) + `dexie-react-hooks`
- **Form & Validation:** React Hook Form + Zod 4
- **Routing:** React Router DOM v7
- **Internationalization:** i18next 26 + `react-i18next` + `i18next-browser-languagedetector`
- **HTTP Client:** Axios
- **Analytics:** `@vercel/analytics`

## Project Structure

```
src/
├── main.tsx                          # Entry point
├── App.tsx                           # Root component (router, toaster, analytics)
├── index.css                         # Tailwind entry
├── theme.config.ts                   # Theme configuration
├── app/
│   ├── pages.tsx                     # Lazy-loaded page imports
│   ├── router.ts                     # Router creation
│   ├── routes.tsx                    # Route definitions
│   └── providers/                    # App providers
├── components/
│   ├── common/                       # AppLogo, EmptyState, LazyFallback, LoadingSpinner, PageHeader
│   ├── forms/                        # FormField
│   ├── layout/                       # Header, Layout, Sidebar
│   └── ui/                           # Shadcn UI primitives (button, card, dialog, select, etc.)
├── features/
│   ├── generator/                    # Legacy (empty)
│   ├── history/                      # Prompt history (components, hooks, types)
│   ├── prompt-generator/             # V2 prompt composer (components, engine, hooks, schemas, services, store, types, constants)
│   ├── prompts/                      # Prompt utilities (components, hooks, services, types, utils)
│   ├── settings/                     # Settings (hooks, services, types)
│   └── templates/                    # Default template definitions
├── hooks/                            # Shared hooks (useAppContext, useEffectiveTheme, useFavicon, useToast)
├── i18n/                             # i18next configuration
├── lib/                              # Utilities (constants, crypto, utils, validation)
├── pages/                            # Page components (Home, GeneratorPage, HistoryPage, TemplatesPage, Settings, ErrorPage)
├── services/
│   ├── ai/                           # AI service (API integration)
│   ├── export/                       # Export services (history, txt)
│   ├── similarity/                   # Duplicate detection service
│   └── storage/                      # IndexedDB storage layer (Dexie)
├── store/                            # Zustand stores (AIConfig, Generator, History)
├── test/                             # Test setup and utilities
└── types/                            # Shared TypeScript types
```

## Routes

- `/` → HomePage (landing page)
- `/dashboard` → Redirects automatically to `/templates`
- `/generator` → V2 Prompt Generator
- `/history` → Prompt history log
- `/templates` → Template management page
- `/settings` → Configuration page (AI config, theme, and locale)

## Design System

PromptForge implements a strict design system detailed in [`DESIGN.md`](./DESIGN.md). Key highlights include:

- **Semantic Colors:** Strict adherence to semantic variables (`bg-surface`, `text-primary`) rather than hardcoded hex values.
- **Glassmorphism:** Mandatory for all floating elements (overlays, dropdowns, modals) to maintain spatial hierarchy.
- **Typography:** Developer-centric typography utilizing `Inter` for UI elements and a monospace font (`JetBrains Mono` or `Geist Mono`) for outputs, prompts, and scores to convey precision.
- **Streaming UI:** Instantaneous feel with text streaming interfaces and skeleton loaders for pending data.

## Available Scripts

- `npm run dev`: Starts the development server with Vite.
- `npm run build`: Performs TypeScript validation and creates a production build.
- `npm run lint`: Performs lint checks via ESLint.
- `npm run preview`: Previews the local production build.
- `npm run test`: Runs the Vitest test suite in watch mode.
- `npm run test:run`: Runs the Vitest test suite once.

> [!TIP]
> The testing setup utilizes Vitest 4, `@testing-library/react`, `@testing-library/jest-dom`, and `fake-indexeddb` to execute tests under a simulated IndexedDB environment.

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
