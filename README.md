<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./public/assets/logos/promptforge-logo-horizontal-dark.svg">
    <img src="./public/assets/logos/promptforge-logo-horizontal-light.svg" alt="PromptForge prompt engineering workspace" width="420">
  </picture>

  <p><strong>A browser-first, client-side prompt engineering workspace for producing varied, stock-ready image prompts.</strong></p>

  <p>
    <a href="https://promptforge.pyforgedev.web.id/"><strong>Live App</strong></a> ·
    <a href="#quick-start">Quick Start</a> ·
    <a href="./docs/supported-format-paste.md">Paste Formats</a> ·
    <a href="./CONTRIBUTING.md">Contributing</a>
  </p>

  <p>
    <a href="https://github.com/pyforgedev/promptforge/actions/workflows/ci.yml"><img src="https://github.com/pyforgedev/promptforge/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI status"></a>
    <a href="https://promptforge.pyforgedev.web.id/"><img src="https://img.shields.io/badge/Deployed_on-Vercel-000000?logo=vercel&amp;logoColor=white" alt="Deployed on Vercel"></a>
    <a href="https://github.com/pyforgedev/promptforge/releases/latest"><img src="https://img.shields.io/github/v/release/pyforgedev/promptforge?display_name=tag" alt="Latest release"></a>
    <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="MIT License"></a>
  </p>
</div>

PromptForge helps creators compose, evaluate, organize, and export image prompts without requiring a PromptForge account or application backend. Connect your own AI provider when generating content; the rest of the workspace runs locally in the browser.

## Highlights

- **Stock-focused generator:** Control niche, style, aspect ratio, negative prompts, keywords, target platform, and batches of 1–10 variants.
- **Platform-ready variants:** Produce prompts for DALL-E 3 / GPT Image 2, Nano Banana Pro / Nano Banana 2, or both.
- **Quality and originality checks:** Score commercial potential, creativity, clarity, marketability, and uniqueness, then compare against history for likely duplicates.
- **Reactive templates:** Create, edit, search, filter, import, export, and reuse a local template library with validated metadata and built-in reset behavior.
- **Bounded, filterable history:** Search and sort saved generations; filter by folder, aspect ratio, art style, score, or date; import or export TXT records.
- **Batch formatter:** Process pasted text or CSV uploads through a managed queue, then download TXT, CSV, or JSON. See [supported paste formats](./docs/supported-format-paste.md).
- **Personalized interface:** Choose light, dark, or system theme and work in English or Indonesian.
- **Local-first data:** Store workspace data in IndexedDB and encrypt sensitive settings at rest.

## How it works

1. Configure OpenAI, Google Gemini, OpenRouter, or a custom HTTPS-compatible endpoint in Settings.
2. Generate prompt variants and review their platform formatting, quality scores, and similarity results.
3. Save useful results, organize history, and turn successful prompts into reusable templates.
4. Export individual collections or format batches for downstream stock workflows.

## Quick Start

**Prerequisite:** [Node.js](https://nodejs.org/) 24 or newer.

```bash
git clone https://github.com/pyforgedev/promptforge.git
cd promptforge
npm install
npm run dev
```

Open `http://localhost:5173`. A PromptForge account or separate backend is not required.

## Architecture and Tech Stack

PromptForge is a client-side React application organized by feature. IndexedDB provides durable browser storage, while provider requests are the only normal path for prompt data to leave the browser.

### Layers

- **Application (`src/app/`, `src/pages/`):** Routing, lazy-loaded pages, providers, layouts, and error boundaries.
- **Features (`src/features/`):** Generator, formatter, history, settings, and templates, including their UI and domain logic.
- **Services (`src/services/`):** AI clients, Dexie storage, exports, formatting, and similarity analysis.
- **Shared foundation (`src/components/`, `src/hooks/`, `src/lib/`, `src/store/`):** Reusable UI, cross-feature utilities, hooks, and Zustand state.

### Core stack

| Area | Technology |
| --- | --- |
| Application | React 19, TypeScript 6, Vite 8 |
| Styling and UI | Tailwind CSS 4, Radix UI, shadcn/ui, Framer Motion |
| State and storage | Zustand 5, Dexie 4, IndexedDB |
| Routing and validation | React Router 7, React Hook Form, Zod 4 |
| Internationalization | i18next, react-i18next |
| Testing | Vitest 4, Testing Library, fake-indexeddb |

### Project map

```text
src/
├── app/              # Router, route definitions, and providers
├── components/       # Shared UI, layout, and animation components
├── features/         # Product domains and feature-specific logic
├── pages/            # Route-level page components
├── services/         # AI, storage, export, formatter, and similarity services
├── store/            # Shared Zustand stores
└── test/             # Test setup and utilities
public/
├── assets/           # Official brand, favicon, and application assets
└── locales/          # English and Indonesian translations
docs/                 # Maintainer guides and focused documentation
```

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Home workspace |
| `/dashboard` | Redirects to `/templates` |
| `/formatter` | Batch prompt formatter |
| `/generator` | Prompt generator |
| `/history` | Saved prompt history |
| `/templates` | Template library |
| `/settings` | Provider, theme, and locale settings |
| `*` | Fallback 404 page |

## Development

| Command | Use |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run lint` | Run ESLint |
| `npx vitest run <file-or-files>` | Run only tests that cover the current change |
| `npm run test` | Run Vitest in watch mode |
| `npm run preview` | Preview an existing production build |
| `npm run test:run` | Run the full suite; reserve for CI, releases, or explicit requests |
| `npm run build` | Type-check and build; reserve for CI, releases, or explicit approval |

Routine verification should use lint and scoped test files rather than the full suite or a production build. Maintainers should follow the [release runbook](./docs/RELEASE.md); releases and production deployments use its documented release-it workflow rather than manual steps.

## Design and Brand Assets

Implementation guidance for components, semantic colors, typography, motion, accessibility, and themed surfaces lives in [`DESIGN.md`](./DESIGN.md).

Official marks, logos, favicons, and app icons live in [`public/assets`](./public/assets/README.txt). Use the provided light and dark variants that match the surface; do not recolor or redraw the artwork.

## Security

PromptForge is client-side only: data leaves the browser only for AI provider requests that you initiate. Sensitive settings, including configured API keys, are encrypted at rest with AES-GCM 256 in IndexedDB using a non-extractable Web Crypto key stored in the same database. This is encrypted-at-rest, not a zero-leak vault. The **Don't remember API key between sessions** option keeps the API key in memory only.

Read [`SECURITY.md`](./SECURITY.md) for the threat model, endpoint policy, security guidance, and private vulnerability reporting process.

## Contributing

Contributions are welcome. Read [`CONTRIBUTING.md`](./CONTRIBUTING.md) before opening a change and follow the [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md). Report vulnerabilities through the private process in [`SECURITY.md`](./SECURITY.md).

## License

PromptForge is available under the [MIT License](./LICENSE).
