import { fileURLToPath } from 'node:url'
import { readFileSync } from 'fs'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

/**
 * Deterministic CSP injection for index.html (independent of any .env file,
 * which is gitignored). Production builds get the strict policy:
 * `script-src 'self'` (no unsafe-inline). Dev needs 'unsafe-inline' for the
 * React-refresh preamble and `ws://` for the HMR websocket.
 *
 * Placeholder names intentionally do NOT start with VITE_ so Vite's built-in
 * HTML env replacement does not warn about them — this plugin owns them.
 *
 * connect-src allows ALL HTTPS origins (`https:`): the product is a
 * bring-your-own-endpoint app (OpenAI, Gemini, OpenRouter, or any custom
 * HTTPS endpoint/tunnel the user configures), so a static host allowlist
 * would break the core feature. script-src remains the strict first line of
 * defense against XSS. See SECURITY.md for the threat model.
 */
function cspEnvPlugin(): Plugin {
  return {
    name: 'promptforge-csp-env',
    transformIndexHtml(html, ctx) {
      const isDev = ctx.server !== undefined
      const scriptSrcExtra = isDev ? " 'unsafe-inline'" : ''
      // Dev-only relaxations: HMR websocket + local LLM proxies (mixed content
      // blocks plain http:// to non-local hosts, hence localhost only)
      const connectSrcExtra = isDev
        ? ' ws://localhost:* ws://127.0.0.1:* http://localhost:* http://127.0.0.1:*'
        : ''
      return html
        .replaceAll('%CSP_SCRIPT_SRC%', scriptSrcExtra)
        .replaceAll('%CSP_CONNECT_SRC%', connectSrcExtra)
    },
  }
}

export default defineConfig({
  plugins: [cspEnvPlugin(), react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'vendor-react',
              test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/,
            },
            {
              name: 'vendor-state',
              test: /node_modules[\\/](zustand|dexie|dexie-react-hooks|p-limit)[\\/]/,
            },
            {
              name: 'vendor-motion',
              test: /node_modules[\\/]framer-motion[\\/]/,
            },
            {
              name: 'vendor-i18n',
              test: /node_modules[\\/](i18next|react-i18next|i18next-browser-languagedetector)[\\/]/,
            },
            {
              name: 'vendor-http',
              test: /node_modules[\\/](axios|@vercel[\\/]analytics)[\\/]/,
            },
          ],
        },
      },
    },
  },
})
