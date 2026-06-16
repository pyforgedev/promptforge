<div align="center">
  <img src="public/favicon.svg" alt="PromptForge Logo" width="120" height="120" />
  <h1>PromptForge</h1>
  <p><strong>A high-performance, IDE-inspired design language and application for AI Prompt Engineering.</strong></p>
</div>

PromptForge is a professional-grade prompt engineering tool designed to generate high-quality stock-image prompts with minimum repetition and high variation. It blends the cinematic restraint of professional creative tools with the ultra-fast, precision-driven feel of modern developer environments.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://promptforge-woad.vercel.app/)

## ✨ Features

- **Advanced Generator:** Configurable aspect ratios (1:1, 16:9, etc.), niche selection, style presets (Commercial, Lifestyle, etc.), and batch generation (1/3/5/10).
- **Prompt Quality Rating:** Scores prompts on Commercial Potential, Creativity, Clarity, Marketability, and Uniqueness.
- **Duplicate Detection:** Prevents repetitive prompt generation by analyzing prompt history for similarity.
- **Templates Management:** Save, edit, reset, import, and export custom prompt templates.
- **Local History/Log:** Caches generated prompts locally using IndexedDB (Dexie). Search and filter by aspect ratio, style, rating, or date. Export/Import functionality included.
- **Theme Support:** Strict Light/Dark/System theme support with a meticulously crafted semantic color system and glassmorphism UI elements.
- **Internationalization (i18n):** Supports English and Bahasa Indonesia.

## 🚀 Quick Start

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

## 🏗️ Architecture & Tech Stack

- **Framework:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS + Shadcn UI (Radix UI) + Framer Motion
- **State Management:** Zustand
- **Storage:** Dexie (IndexedDB) for local persistence
- **Form & Validation:** React Hook Form + Zod
- **Routing:** React Router DOM v7
- **Internationalization:** i18next

## 🎨 Design System

PromptForge implements a strict design system detailed in [`DESIGN.md`](./DESIGN.md). Key highlights include:

- **Semantic Colors:** Strict adherence to semantic variables (`bg-surface`, `text-primary`) rather than hardcoded hex values.
- **Glassmorphism:** Mandatory for all floating elements (overlays, dropdowns, modals) to maintain spatial hierarchy.
- **Typography:** Developer-centric typography utilizing `Inter` for UI elements and a monospace font (`JetBrains Mono` or `Geist Mono`) for outputs, prompts, and scores to convey precision.
- **Streaming UI:** Instantaneous feel with text streaming interfaces and skeleton loaders for pending data.

## 🛠️ Available Scripts

- `npm run dev`: Starts the development server.
- `npm run build`: Builds the app for production.
- `npm run lint`: Runs ESLint to catch code issues.
- `npm run preview`: Previews the production build locally.

> [!TIP]
> Testing scripts (e.g., `test_eval.ts`) exist at the root level as ad-hoc scripts. Running them directly via `npx tsx` may require specific configuration due to Vite/tsconfig path alias resolution.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
