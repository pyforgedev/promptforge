# Security Policy

## Reporting a Vulnerability

**Please do not open a public issue for security vulnerabilities.** Report them privately via [GitHub Private Vulnerability Reporting](https://github.com/pyforgedev/promptforge/security/advisories/new) (Security → Report a vulnerability).

You can expect:

- An acknowledgment within 48 hours.
- A timeline for the fix and disclosure, typically coordinated within 90 days.

## Important Security Context for Users

PromptForge is a **client-side only** application. **No data ever leaves your browser** except when you explicitly generate prompts against an AI provider you configure.

- **API keys are stored locally** in your browser's IndexedDB, encrypted with AES-GCM 256 (Web Crypto). The encryption master key is a WebCrypto `CryptoKey` with `extractable: false`, also persisted in IndexedDB — key material cannot be exported, so a copy of your browser profile does not directly reveal the key. This is *encrypted-at-rest*, **not zero-leak**.
- **This is not a secure vault.** Any script running in the same origin (e.g., an XSS vulnerability or a compromised extension) can read the key object from IndexedDB and decrypt your data in-page. `extractable: false` only blocks offline extraction of the key bytes, not in-page decryption. A strict Content Security Policy is the remaining first line of defense against XSS.
- **CSP posture:** `script-src` is strict (`'self'` — no inline scripts, no external script hosts except Vercel Analytics). `connect-src` allows **any HTTPS origin** by design: PromptForge is a bring-your-own-endpoint app (OpenAI, Gemini, OpenRouter, or any custom HTTPS endpoint/tunnel you configure), and a static host allowlist would break that feature. Plain `http://` is blocked (mixed content) except localhost in development. Note that this means a successful script injection could exfiltrate data to any HTTPS host — the strict `script-src` is the control that matters.
- IndexedDB is **not synced to the cloud** by browsers (unlike localStorage), so cloud-sync leakage does not apply. However, a device thief who can run JavaScript in your profile could still decrypt.
- The **only true zero-leak option** is the *"Don't remember API key between sessions"* setting on the Settings page: with it enabled, the API key is never written to disk — it lives only in memory for the current session. Endpoint and model are still remembered.
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
