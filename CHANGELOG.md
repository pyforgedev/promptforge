# Changelog

## [0.6.0](https://github.com/pyforgedev/promptforge/compare/v0.5.0...v0.6.0) (2026-08-17)

### Features

* **formatter:** Replace queue overview with AnimatedList ([defc1aa](https://github.com/pyforgedev/promptforge/commit/defc1aa967ddd4ac47f58d2637b8d8528963bf14))
* **formatter:** Support "--- Prompt N ---" section paste format ([5650498](https://github.com/pyforgedev/promptforge/commit/5650498fd74e185534acbd01a5336e0319310dc7))
* **prompt-generator:** Refine composer controls ([211c544](https://github.com/pyforgedev/promptforge/commit/211c544b0220ff13d2ace3d7cde3b98ce62d3ebb))
* **prompt-generator:** Synchronize style preferences ([17bfa0c](https://github.com/pyforgedev/promptforge/commit/17bfa0c83b36044d95f949c14bf0fcaf9391ca3e))
* **ui:** Add 404 page with catch-all route ([e87db01](https://github.com/pyforgedev/promptforge/commit/e87db016721f8bd5ba8a7186d16f3a80223ceefb))
* **ui:** Add React Bits components and integrate into Home and QuickStats ([96fd979](https://github.com/pyforgedev/promptforge/commit/96fd97955d053f5a56e4623737144ab385d5b97b))
* **ui:** Add resizable full-height sidebar with panel toggle ([f489c34](https://github.com/pyforgedev/promptforge/commit/f489c3472656107fab5606f925a16f4d20d1cd5a))
* **ui:** Integrate official PromptForge brand assets ([e7839e6](https://github.com/pyforgedev/promptforge/commit/e7839e61577664c74072f66f790e280c6b026b09)), references [#2F6FE0](https://github.com/pyforgedev/promptforge/issues/2F6FE0) [#5B8DF8](https://github.com/pyforgedev/promptforge/issues/5B8DF8)
* **ui:** Remove reduced-motion restrictions ([ffa06f6](https://github.com/pyforgedev/promptforge/commit/ffa06f645bfa2ad7f4ddb674291bd53bd967ee94))

### Bug Fixes

* **security:** Redact secrets in error messages ([a13143c](https://github.com/pyforgedev/promptforge/commit/a13143ccd139d0eece7afafdd66f1ee3ebc1e464))
* **storage:** persist master key in IndexedDB so settings survive refresh ([575f71d](https://github.com/pyforgedev/promptforge/commit/575f71dc8fecf1cd3504e54672fd432928b91299))
* **templates:** Make page header action toolbar responsive ([d68f67e](https://github.com/pyforgedev/promptforge/commit/d68f67e3a9bb0830a934c35c43b49120b530eff4))
* **ui:** Animate mobile drawer slide and backdrop fade ([957bd3e](https://github.com/pyforgedev/promptforge/commit/957bd3ea49bbcf124e0361cfc6aee8d321c477f8))
* **ui:** Remove phantom scrollbar flash on generator page ([9b1a9b4](https://github.com/pyforgedev/promptforge/commit/9b1a9b4f3e43b0de70b0c84aaa09844b1ad13201))
* **ui:** Restore page scrollbar while Radix Select is open ([2600f04](https://github.com/pyforgedev/promptforge/commit/2600f040bd210304fed5b8681cbcf71d65b542e4))

## [0.5.0](https://github.com/pyforgedev/promptforge/compare/v0.4.0...v0.5.0) (2026-08-05)

### Features

* **ci:** Add CI pipeline and OSS governance files ([2995b05](https://github.com/pyforgedev/promptforge/commit/2995b0555edb8e2a573cae89d7f1bc625e46aa66))
* **formatter:** Add paste format help dialog with docs link ([2c5c616](https://github.com/pyforgedev/promptforge/commit/2c5c61616becbeceae3277d324a7674077d02f00))
* **formatter:** Show image/video type badge on queue card ([20dbf04](https://github.com/pyforgedev/promptforge/commit/20dbf0421aae4a6ba6a6c90992d13b21e9589330))

### Bug Fixes

* **history:** Stabilize loading state and prevent search focus loss ([6cc7e9d](https://github.com/pyforgedev/promptforge/commit/6cc7e9ded40cd6399dda8e70de5a5513c0264f56))
* **scroll:** Reset window scroll on route change and contain overview auto-follow ([957ce69](https://github.com/pyforgedev/promptforge/commit/957ce6940bd0f3e69b6d5fe27cca02668985bdcb))
* **templates:** Prevent scrollbar FOUC on reset and refetch ([a1c9064](https://github.com/pyforgedev/promptforge/commit/a1c906490a48d193b4427c0f0442ea87c823bbd5))

### Performance Improvements

* **build:** Split vendor chunks with Rolldown codeSplitting ([b8bcce6](https://github.com/pyforgedev/promptforge/commit/b8bcce635b6dbc41743c025bd746b5ae6f8ec60d))

## [0.4.0](https://github.com/pyforgedev/promptforge/compare/v0.3.0...v0.4.0) (2026-08-01)

### Features

* add duration option to toast hook ([8384eb9](https://github.com/pyforgedev/promptforge/commit/8384eb9f46ebad0a726f2ef272b0da7a4a5074f8))
* add queue filters for aspect ratio, type, and sorting ([284d45e](https://github.com/pyforgedev/promptforge/commit/284d45eb1d1d5d62ed54117566317172a4c55d1f))
* make formatter copy flow optimistic ([5de7ff8](https://github.com/pyforgedev/promptforge/commit/5de7ff851c5fd092fbcdd7b4490ae77e1d43512d))

### Bug Fixes

* eliminate FOUC and add consistent skeleton loading across all pages ([8f592ce](https://github.com/pyforgedev/promptforge/commit/8f592ce0005df33b4aa80881950dfa0d49c3900e))
* restore encrypted settings storage ([a88a269](https://github.com/pyforgedev/promptforge/commit/a88a2695499efb44f25c46abab6bb7a4226fdc55))

## [0.3.0](https://github.com/pyforgedev/promptforge/compare/v0.2.0...v0.3.0) (2026-07-30)

### Features

* add clear queue button to formatter ([18a06f0](https://github.com/pyforgedev/promptforge/commit/18a06f05ab008b6c51a088af99729c72c9015321))

## [0.2.0](https://github.com/pyforgedev/promptforge/compare/v0.1.3...v0.2.0) (2026-07-30)

### Features

* add browser language detection with localStorage ([817e25f](https://github.com/pyforgedev/promptforge/commit/817e25fe1ce3e3a1281cc822d13b1c1ef16b57db))
* add clear button to paste input area ([4e04612](https://github.com/pyforgedev/promptforge/commit/4e04612ec5ab50ab5ed2326f865ce2886ea6c401))
* add markdown bold list prompt extraction to formatter ([d50245a](https://github.com/pyforgedev/promptforge/commit/d50245a4e8f76485c2792ff5e6d61903d4fad2e1))

## [0.1.3](https://github.com/pyforgedev/promptforge/compare/v0.1.2...v0.1.3) (2026-07-29)

## [0.1.2](https://github.com/pyforgedev/promptforge/compare/v0.1.1...v0.1.2) (2026-07-29)

### Bug Fixes

* keep process summary visible for active batch in formatter ([f4f3084](https://github.com/pyforgedev/promptforge/commit/f4f308452e099cbc37926c7e1823b72b5b1e0f86))

All notable changes to this project will be documented in this file. See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.1.1](https://github.com/pyforgedev/promptforge/compare/v0.1.0...v0.1.1) (2026-07-29)

### Bug Fixes

* add rewrites for SPA routing on Vercel ([004c9b1](https://github.com/pyforgedev/promptforge/commit/004c9b1))
* disable overscroll behavior on all scroll containers ([686d9d8](https://github.com/pyforgedev/promptforge/commit/686d9d8))
* keep process summary visible for active batch in formatter ([f4f3084](https://github.com/pyforgedev/promptforge/commit/f4f3084))

### Features

* add flag icons to language selector with consistent sizing and tooltips ([dd64a31](https://github.com/pyforgedev/promptforge/commit/dd64a31))
* **ui:** add shimmer skeleton loading states across app ([519d925](https://github.com/pyforgedev/promptforge/commit/519d925))

## [0.1.0](https://github.com/pyforgedev/promptforge/compare/v0.0.3...v0.1.0) (2026-07-29)

### Features

* integrate formatter page with full i18n coverage, storage, and routing ([8614c38](https://github.com/pyforgedev/promptforge/commit/8614c38))
* add ToggleTheme component with demo page ([1a3c991](https://github.com/pyforgedev/promptforge/commit/1a3c991))
* enhance GeneratorForm styling and integrate Tooltip in SegmentsPanel ([bbdb63a](https://github.com/pyforgedev/promptforge/commit/bbdb63a))
* enhance HistoryList validation and improve AIService error handling ([b3ea47f](https://github.com/pyforgedev/promptforge/commit/b3ea47f))
* add GenerationService tests and implement error handling ([b6bc60d](https://github.com/pyforgedev/promptforge/commit/b6bc60d))
* **formatter:** add dynamic aspect ratio filter to batch download ([96a9b5b](https://github.com/pyforgedev/promptforge/commit/96a9b5b))

### Bug Fixes

* update header banner image path and add missing image file ([f2b864c](https://github.com/pyforgedev/promptforge/commit/f2b864c))
* history page crash on Vercel with schema error recovery ([ca7d25f](https://github.com/pyforgedev/promptforge/commit/ca7d25f))

## [0.0.3](https://github.com/pyforgedev/promptforge/compare/v0.0.2...v0.0.3) (2026-07-28)

### Features

* initial release with V2 prompt generator, history, templates, and settings

### Bug Fixes

* various UI and stability improvements
