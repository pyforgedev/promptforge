# OpenCode Agent Instructions

## Tech Stack & Architecture
- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS + Shadcn UI (Radix UI) + Framer Motion
- **State Management**: Zustand
- **Storage**: Dexie (IndexedDB) for local persistence
- **Form & Validation**: React Hook Form + Zod
- **Routing**: React Router DOM v7
- **Internationalization**: i18next

### Structure Guidelines
- `src/app/`: Providers and global store
- `src/features/`: Domain-specific modules (generator, history, settings, templates, localization)
- `src/components/ui/`: Generic/Shadcn UI components
- `src/services/`: External integrations (AI, storage, export, similarity)
- **Rule**: Avoid large monolithic components. Extract reusable logic into hooks, services, or shared utilities.

## Commands
All development runs inside Docker. `node_modules` and `dist` are **never** stored locally — they only exist inside the Docker container.

### STRICT RULES — Docker Only, No Local npm
1. **NEVER run `npm`, `npx`, `node`, or any Node.js command directly on the host.** Always use `docker compose exec promptforge <command>`.
2. `node_modules` and `dist` are **ephemeral** — they live only inside the container. If you need to clear them, run: `docker compose exec promptforge rm -rf /app/node_modules /app/dist`
3. If you accidentally run `npm install` locally, immediately run `sudo rm -rf node_modules` to avoid permission conflicts with Docker.
4. **Allowed patterns:**
   - `docker compose exec promptforge npm install <pkg>`
   - `docker compose exec promptforge npm run build`
   - `docker compose exec promptforge npm run lint`
   - `docker compose exec promptforge npm run test:run`
   - `docker compose exec promptforge npx <command>`
5. **Forbidden patterns:**
   - `npm install`, `npm run`, `npx` — any Node.js tool without `docker compose exec promptforge`

- **Dev**: `docker compose up -d` — starts Vite dev server at `http://localhost:5173`

## Product Context: Premium Prompt Generator for Microstock Creators
**Goal**: Generate high-quality stock-image prompts with minimum repetition and high variation.

### Core Features (MVP)
- **Generator**: Configurable Aspect Ratio (1:1, 16:9, etc.), Niche generation, Style presets (Commercial, Lifestyle, etc.), Batch generation (1/3/5/10).
- **Prompt Quality Rating**: Score prompts on Commercial Potential, Creativity, Clarity, Marketability, Uniqueness.
- **Duplicate Detection**: Prevent repetitive prompt generation by analyzing prompt history for similarity.
- **Templates**: Save, edit, reset, import, export custom prompt templates.
- **History/Log**: Local cache (IndexedDB) with search/filter by aspect ratio, style, rating, date. Export/Import TXT.
- **Settings**: AI Config (API key, endpoint, model) stored as JSON. Light/Dark/System theme. Languages: English, Bahasa Indonesia.

## Development Workflows
- **Storage**: Use `dexie` for all persistence (Prompt History, API Presets, Custom Templates, User Preferences) to handle large history and scalability.
- **UI/UX**: Target a modern, premium dark mode design with light glassmorphism. Desktop-first productivity, but mobile-friendly. Ensure smooth animations.
- **Internationalization**: Always update all supported language files (English and Bahasa Indonesia) when adding or modifying UI strings. Ensure consistency across all locale resources.
- **Feedback**: Always implement toast notifications (using `sonner`) for all data-modifying actions (create, update, delete, move, copy) to provide immediate user feedback.
