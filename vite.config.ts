import { fileURLToPath } from 'node:url'
import { readFileSync } from 'fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
