# Security Policy

## Reporting a Vulnerability

**Please do not open a public issue for security vulnerabilities.** Report them privately via [GitHub Private Vulnerability Reporting](https://github.com/pyforgedev/promptforge/security/advisories/new) (Security → Report a vulnerability).

You can expect:

- An acknowledgment within 48 hours.
- A timeline for the fix and disclosure, typically coordinated within 90 days.

## Important Security Context for Users

PromptForge is a **client-side only** application. **No data ever leaves your browser** except when you explicitly generate prompts against an AI provider you configure.

- **API keys are stored locally** in your browser's IndexedDB, encrypted with AES-GCM (Web Crypto). The encryption master key lives in `sessionStorage` and is cleared when the tab closes.
- **This is not a secure vault.** Any script running in the same origin (e.g., an XSS vulnerability) could read both the key and the encrypted data. See the security note in `src/lib/crypto.ts`.
- Prefer short-lived keys, and treat your configured providers as trusted endpoints. API keys are sent only to the provider you configure (OpenAI, Gemini, OpenRouter, or a custom endpoint) via HTTPS.

## Supported Versions

Only the latest release is actively supported. We do not backport security fixes to older versions.

| Version | Supported |
|---------|-----------|
| Latest release | ✅ |
| Older releases | ❌ |

## Security Guidelines for Contributors

- Never commit secrets, tokens, or `.env*` files (they are gitignored — keep it that way).
- Never log API keys, tokens, or prompt content to the console, even in DEV mode.
- All outbound requests must use HTTPS; new endpoints must be validated against the allowed-protocols check in `src/lib/`.
- User input (prompts, folder names, settings) must be rendered as text, never as HTML.
- Schema/version changes to IndexedDB must ship with a forward-compatible Dexie migration (see `src/services/storage/`).
