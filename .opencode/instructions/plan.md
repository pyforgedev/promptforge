# PromptForge — Image Prompt Generator Refactor Plan

> **Version**: 2.0  
> **Status**: READY FOR IMPLEMENTATION  
> **License**: MIT  
> **Scope**: Total generator engine refactor — preserve non-generator features  
> **Target Platforms**: DALL-E 3 / GPT Image 2 · Nano Banana Pro / Nano Banana 2  
> **Prepared for**: `pyforgedev/promptforge`

---

## AGENT INSTRUCTIONS — READ BEFORE WRITING ANY CODE

This document is a self-contained implementation plan for an AI coding agent operating in OpenCode. Treat it as the single source of truth.

**Mandatory pre-flight rules:**
1. Read this entire document before touching any file
2. Execute phases in strict order: Phase 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7
3. Before starting each phase, output a short summary of what you found in the codebase relevant to that phase
4. When encountering a conflict between this plan and the existing codebase, **prefer preservation over deletion** — note the conflict in a comment and continue
5. Never use `any` types. Never add `@ts-ignore` without a code comment explaining exactly why
6. All user-facing strings must go through i18n keys. Never hardcode display text
7. If a file is not mentioned in a given phase, do not touch it in that phase

**Decision rule for ambiguity:** If the plan says "refactor", preserve the existing file path and component name. If the plan says "replace" or "remove", the old implementation is explicitly superseded.

---

## Table of Contents

1. [Project Context](#1-project-context)
2. [Goals & Success Criteria](#2-goals--success-criteria)
3. [Current State Audit — Phase 0](#3-current-state-audit--phase-0)
4. [New System Architecture](#4-new-system-architecture)
5. [Data Schemas & Types](#5-data-schemas--types)
6. [Implementation Phases](#6-implementation-phases)
   - [Phase 1 — Foundation & Type System](#phase-1--foundation--type-system)
   - [Phase 2 — PromptComposerEngine (Core)](#phase-2--promptcomposerengine-core)
   - [Phase 3 — Specialization Modules](#phase-3--specialization-modules)
   - [Phase 4 — Enhanced Input UX](#phase-4--enhanced-input-ux)
   - [Phase 5 — Output & Display Refactor](#phase-5--output--display-refactor)
   - [Phase 6 — History, Favorites & Export](#phase-6--history-favorites--export)
   - [Phase 7 — Integration, QA & Cleanup](#phase-7--integration-qa--cleanup)
7. [Meta-Prompt Design Specification](#7-meta-prompt-design-specification)
8. [Adobe Stock Compliance Specification](#8-adobe-stock-compliance-specification)
9. [Variation Strategy Specification](#9-variation-strategy-specification)
10. [Testing Strategy](#10-testing-strategy)
11. [Constraints & Notes](#11-constraints--notes)
12. [Out of Scope (v1)](#12-out-of-scope-v1)

---

## 1. Project Context

PromptForge is an MIT-licensed, open-source stock image prompt generator targeted at microstokers — primarily contributors to Adobe Stock, which has strict content acceptance criteria. The tool helps creators generate high-quality, commercially viable AI image prompts from a simple niche/idea input.

**The core problem being solved in this refactor:**  
The current generator uses rigid, pre-defined template strings embedded in the backend service layer. These templates produce prompts that are structurally identical, lack creative divergence, miss critical photography dimensions (lighting, composition, mood, technical feel), and have no awareness of Adobe Stock's commercial requirements. The result is batches of 5 or 10 prompts that are minor variations of the same basic description — unusable for serious stock contributors who need genuine variety.

**Tech Stack (do not change these dependencies):**
- React 19 + TypeScript + Vite
- Tailwind CSS + Shadcn UI (Radix UI) + Framer Motion
- Zustand (state management)
- Dexie (IndexedDB — local persistence)
- React Hook Form + Zod
- React Router DOM v7
- i18next (internationalization)
- Provider-agnostic LLM backend (user-configurable)

---

## 2. Goals & Success Criteria

### Primary Goal

Replace the rigid template-based generator with a dynamic, LLM-orchestrated **PromptComposerEngine** that produces genuinely diverse, commercially valuable image prompts — each one targeting a different creative angle — while remaining aligned with Adobe Stock's acceptance standards and formatted for DALL-E 3 / Nano Banana prompt syntax.

### Success Criteria

| # | Criterion | How to Verify |
|---|-----------|---------------|
| 1 | No two prompts in a batch share the same primary creative pivot | Code: `VariationStrategyEngine` guarantees unique pivots per batch |
| 2 | Every prompt covers all 8 photography dimensions | Schema validation: `segments` object fully populated |
| 3 | Negative prompt auto-generated per prompt, context-aware | Present on every `GeneratedPrompt`, differs across batch |
| 4 | Adobe Stock compliance score displayed with breakdown | Score 0–100 with 4 sub-scores and warnings list |
| 5 | Platform-specific variants generated (DALL-E 3 + Nano Banana) | `platformVariants.dalle3` and `platformVariants.nano_banana` both populated |
| 6 | CSV and JSON export functional | Downloads trigger correctly, data matches schema |
| 7 | History and favorites preserved and migrated | Existing Dexie records readable, no data loss |
| 8 | No regression on existing features outside generator | Manual smoke test of all non-generator features |

---

## 3. Current State Audit — Phase 0

**Phase 0 is not optional.** Before writing a single line of new code, the agent MUST complete this audit and output its findings.

### Audit Tasks

```
AUDIT CHECKLIST — complete each item and log findings:

[ ] 1. List all files matching these patterns under src/:
        - **/prompt*  (generator service, constants, types)
        - **/template* (template strings)
        - **/generator* (any generator logic)
        - **/history*  (history feature)
        - **/favorite* (favorites feature)
        - **/export*   (export feature)
        - **/store*    (Zustand stores)
        - **/db*       (Dexie setup)

[ ] 2. Open and read each matched file. Document:
        - File path
        - Its current purpose in one sentence
        - Whether it is KEEP / REFACTOR / REPLACE per this plan
        - Any existing logic that may conflict with the new architecture

[ ] 3. Locate the current template strings. Document their structure.
        If they are hardcoded, note exactly where.

[ ] 4. Locate the Zustand store(s) for generator state.
        Document the current state shape.

[ ] 5. Locate Dexie schema initialization.
        Document: current version number, table names, indexes.

[ ] 6. Locate the existing LLM provider adapter.
        Document: interface/method signature used to call LLM,
        how it is imported/injected into features.

[ ] 7. Locate i18n config. Document: namespace structure,
        locale file paths, existing key naming pattern.

[ ] 8. Note any existing unit/integration tests for the generator.
        These must not regress.
```

### Known State (from project owner)

| Aspect | Current State |
|--------|--------------|
| Input | Single `<textarea>` for niche/idea + category preset selector |
| Batch sizes | Selector: 1, 3, 5, 10 prompts |
| Generation | Template strings defined directly in service/backend, LLM fills in gaps |
| Output | N prompts following same structural template — little divergence |
| History | Exists via Dexie |
| Favorites | Exists (possibly in same Dexie table as history) |
| Export | Some form exists (may be CSV or clipboard-only) |
| Negative prompts | Not present |
| Adobe Stock awareness | Not present |
| Platform variants | Not present |

### Keep / Refactor / Replace Decision Matrix

| Feature / File | Decision | Reason |
|----------------|----------|--------|
| LLM provider adapter | **KEEP** | Do not touch — engine integrates with it |
| Dexie instance & config | **REFACTOR** | Increment version, add migration, new tables |
| Zustand generator store | **REFACTOR** | Extend state shape — preserve actions that still apply |
| React Router setup | **KEEP** | No changes |
| i18n config | **REFACTOR** | Add new keys, do not remove existing ones |
| Old template strings | **REPLACE** | Core of the problem — fully superseded |
| Old generator service logic | **REPLACE** | Replaced by PromptComposerEngine |
| History UI component | **REFACTOR** | Must handle new GeneratedPrompt schema + legacy records |
| Favorites UI component | **REFACTOR** | Same as above |
| Export service | **REFACTOR** | Extend with new schema columns |
| Generator form component | **REFACTOR** | Extend with new fields, preserve existing fields |
| Current PromptCard/output display | **REPLACE** | New structured PromptCard v2 |

---

## 4. New System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INPUT LAYER                         │
│                                                                 │
│   GeneratorFormV2                                               │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │  [Niche/Idea textarea]              [Category selector]  │  │
│   │  [Batch size: 1 · 3 · 5 · 10]      [Platform: ▼]       │  │
│   │  [Usage Context: ▼]                [Diversity: ✓]       │  │
│   │  ▼ Advanced Options (Framer Motion collapse)            │  │
│   │    [Target Market: ▼]  [Mood Preference: ______]       │  │
│   │    [Copy Space: ✓]                                      │  │
│   └─────────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │  GeneratorInput (Zod-validated)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PROMPTCOMPOSERENGINE                         │
│                                                                 │
│  Step 1: VariationStrategyEngine                                │
│          └─ generateVariationMatrix(niche, batchSize)           │
│             → N divergent VariationStrategy objects             │
│                                                                 │
│  Step 2: MetaPromptBuilder                                      │
│          └─ build(input, variationMatrix, platformSpecs)        │
│             → { systemPrompt, userPrompt }                      │
│                                                                 │
│  Step 3: LLM Call (provider-agnostic adapter)                   │
│          └─ callLLM(systemPrompt, userPrompt)                   │
│             → raw JSON string                                   │
│                                                                 │
│  Step 4: parseAndValidate(rawResponse)                          │
│          └─ Zod validation against GeneratedPromptLLMOutput     │
│             → On failure: retry once with correction prompt     │
│                                                                 │
│  Step 5: NegativePromptGenerator                                │
│          └─ generateNegativePrompt(prompt, platform)            │
│             → context-aware negative string per prompt          │
│                                                                 │
│  Step 6: AdobeStockScorer                                       │
│          └─ scorePrompt(prompt)                                 │
│             → AdobeStockScore { total, breakdown, warnings }    │
│                                                                 │
│  Step 7: PlatformAdapter                                        │
│          └─ adaptForPlatform(prompt, targetPlatform)            │
│             → PlatformVariants { dalle3, nano_banana }          │
│                                                                 │
│  → Returns: GeneratedPromptBatch                                │
└───────────────────────────┬─────────────────────────────────────┘
                            │  GeneratedPromptBatch
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                       OUTPUT LAYER                              │
│                                                                 │
│  BatchActionBar                                                 │
│  "Generated 5 prompts for: [niche]"                            │
│  [Export CSV]  [Export JSON]  [Save All to History]            │
│                                                                 │
│  PromptCard v2  (rendered per prompt in batch)                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  Variant #1                    [Adobe Score: ●87/100]    │ │
│  │  ─────────────────────────────────────────────────────── │ │
│  │  Platform: [DALL-E 3 ▼]  [Nano Banana]                  │ │
│  │  ─────────────────────────────────────────────────────── │ │
│  │  <full prompt text for selected platform>                │ │
│  │                                             [Copy ✓]    │ │
│  │  ─────────────────────────────────────────────────────── │ │
│  │  [▼ Segments]  [▼ Negative Prompt]  [▼ Keywords]        │ │
│  │  ─────────────────────────────────────────────────────── │ │
│  │  [♡ Favorite]          [↺ Regenerate This Variant]      │ │
│  └───────────────────────────────────────────────────────────┘ │
└───────────────────────────┬─────────────────────────────────────┘
                            │  persist
                            ▼
                    Dexie (IndexedDB)
                    ├── prompt_batches
                    └── prompt_history  (migrated + new schema)
```

### Folder Structure (target state)

```
src/
└── features/
    └── prompt-generator/
        ├── engine/
        │   ├── PromptComposerEngine.ts       ← orchestrator (NEW)
        │   ├── VariationStrategyEngine.ts    ← variation logic (NEW)
        │   ├── MetaPromptBuilder.ts          ← LLM prompt construction (NEW)
        │   ├── NegativePromptGenerator.ts    ← context-aware negatives (NEW)
        │   ├── AdobeStockScorer.ts           ← compliance scoring (NEW)
        │   └── PlatformAdapter.ts            ← DALL-E / Nano Banana (NEW)
        ├── constants/
        │   ├── photographyDimensions.ts      ← dimension arrays (NEW)
        │   ├── platformSpecs.ts              ← platform constraints (NEW)
        │   └── adobeStockGuidelines.ts       ← compliance rules (NEW)
        ├── schemas/
        │   ├── generatorInputSchema.ts       ← Zod: input validation (NEW/REFACTOR)
        │   └── generatedPromptSchema.ts      ← Zod: LLM output validation (NEW)
        ├── hooks/
        │   ├── usePromptGenerator.ts         ← REFACTOR: use new engine
        │   ├── usePromptHistory.ts           ← REFACTOR: new schema support
        │   └── usePromptExport.ts            ← REFACTOR or NEW
        ├── components/
        │   ├── GeneratorForm/               ← REFACTOR: new fields
        │   ├── PromptCard/                  ← REPLACE: new v2 design
        │   ├── AdobeScoreDisplay/           ← NEW: score breakdown UI
        │   ├── NegativePromptPanel/         ← NEW: collapsible panel
        │   ├── BatchActionBar/              ← NEW or REFACTOR existing
        │   └── SegmentsPanel/              ← NEW: photography segments
        ├── services/
        │   └── exportService.ts             ← REFACTOR: new columns
        ├── store/
        │   └── promptGeneratorStore.ts      ← REFACTOR: extended state
        └── types/
            └── index.ts                     ← NEW: all interfaces
```

---

## 5. Data Schemas & Types

### 5.1 Core Type Definitions

Create `src/features/prompt-generator/types/index.ts` with the following. These are the canonical types for the entire feature — all other files import from here.

```typescript
// ─── Input Types ────────────────────────────────────────────────────────────

export type UsageContext = 'commercial' | 'editorial' | 'conceptual' | 'abstract'

export type TargetMarket = 'global' | 'us' | 'eu' | 'asia' | 'latin_america'

export type ImagePlatform = 'dalle3' | 'nano_banana' | 'both'

export type BatchSize = 1 | 3 | 5 | 10

export type NicheCategory =
  | 'technology'
  | 'business'
  | 'nature'
  | 'lifestyle'
  | 'healthcare'
  | 'food'
  | 'travel'
  | 'education'
  | 'abstract'
  | 'people'
  | 'architecture'
  | 'other'

export interface GeneratorInput {
  niche: string                  // Required. Free-form idea/niche text.
  category?: NicheCategory       // Optional category hint.
  batchSize: BatchSize           // Default: 5
  usageContext: UsageContext     // Default: 'commercial'
  targetMarket: TargetMarket     // Default: 'global'
  targetPlatform: ImagePlatform  // Default: 'both'
  includeDiversity: boolean      // Default: true
  moodPreference?: string        // Optional. e.g. 'calm', 'dramatic', 'energetic'
  allowTextSpace: boolean        // Default: false. Reserve copy space in composition.
}

// ─── Output Types ───────────────────────────────────────────────────────────

export interface PromptSegments {
  subject: string        // Main subject — who/what is in the image
  composition: string    // Framing, angle, perspective, rule of thirds etc.
  lighting: string       // Light source, quality, direction, color temperature
  mood: string           // Emotional tone and atmosphere
  style: string          // Photographic style/genre (editorial, commercial, candid…)
  technical: string      // Camera feel, depth of field, lens type, rendering style
  colorPalette: string   // Color grading direction and palette
  environment: string    // Setting, background, context
}

export interface PlatformVariants {
  dalle3: string         // Prompt optimized for DALL-E 3 / GPT Image 2
  nano_banana: string    // Prompt optimized for Nano Banana Pro / Nano Banana 2
}

export interface AdobeStockScoreBreakdown {
  commercialViability: number    // 0–25
  technicalQuality: number       // 0–25
  compositionStrength: number    // 0–25
  marketDiversity: number        // 0–25
}

export interface AdobeStockScore {
  total: number                      // 0–100 (sum of breakdown)
  breakdown: AdobeStockScoreBreakdown
  warnings: string[]                 // Issues that lower the score or risk rejection
  suggestions: string[]              // Actionable improvements
}

export interface VariationAnchors {
  primaryVariation: string    // Which dimension is the "star" pivot for this variant
  compositionStyle: string    // The anchored composition approach
  lightingType: string        // The anchored lighting type
  directionHint: string       // Overall creative direction hint (e.g. 'dramatic', 'minimal')
}

export interface GeneratedPrompt {
  id: string                        // UUID v4
  variantIndex: number              // Position in batch (1-based)
  batchId: string                   // UUID linking all prompts from same generation
  segments: PromptSegments
  negativePrompt: string            // Auto-generated, context-aware, platform-formatted
  platformVariants: PlatformVariants
  fullPrompt: string                // Default full prompt (dalle3 variant by default)
  commercialKeywords: string[]      // Suggested Adobe Stock keywords (10–15)
  adobeScore: AdobeStockScore
  variationAnchors: VariationAnchors
  generatorInput: GeneratorInput    // Input reference — stored with prompt
  createdAt: Date
  isFavorite: boolean               // Default: false
  userNotes?: string                // Optional user annotation
  legacy?: boolean                  // true = migrated from old schema (no segments/score)
}

export interface GeneratedPromptBatch {
  batchId: string
  prompts: GeneratedPrompt[]
  generatorInput: GeneratorInput
  generatedAt: Date
}

// ─── Engine Internal Types ───────────────────────────────────────────────────

export type VariationPivot =
  | 'lighting'
  | 'composition'
  | 'mood_atmosphere'
  | 'technical_feel'
  | 'environment'
  | 'color_palette'

export interface VariationStrategy {
  index: number              // Prompt's position in batch
  primaryPivot: VariationPivot
  directionHint: string      // Creative direction adjective
  anchoredDimensions: Partial<Record<VariationPivot, string>>
}

export interface PromptGeneratorError {
  code: 'LLM_TIMEOUT' | 'PARSE_FAILURE' | 'PARTIAL_BATCH' | 'PROVIDER_ERROR'
  message: string
  rawResponse?: string       // For PARSE_FAILURE — attach raw LLM output
  partialPrompts?: GeneratedPrompt[]  // For PARTIAL_BATCH
}

// ─── Platform Spec Type ──────────────────────────────────────────────────────

export interface PlatformSpec {
  id: ImagePlatform
  displayName: string
  maxPromptLength: number
  supportsNegativePrompt: boolean
  negativePromptFormat: 'inline' | 'separate_field' | 'none'
  promptStyle: 'natural_language' | 'weighted_tags' | 'hybrid'
  notes: string
}
```

### 5.2 Zod Validation Schemas

Create `src/features/prompt-generator/schemas/generatorInputSchema.ts`:

```typescript
import { z } from 'zod'
import type { GeneratorInput } from '../types'

export const generatorInputSchema = z.object({
  niche: z.string()
    .min(3, 'Niche must be at least 3 characters')
    .max(300, 'Niche must be under 300 characters'),
  category: z.enum([
    'technology', 'business', 'nature', 'lifestyle', 'healthcare',
    'food', 'travel', 'education', 'abstract', 'people', 'architecture', 'other'
  ]).optional(),
  batchSize: z.union([z.literal(1), z.literal(3), z.literal(5), z.literal(10)]),
  usageContext: z.enum(['commercial', 'editorial', 'conceptual', 'abstract']),
  targetMarket: z.enum(['global', 'us', 'eu', 'asia', 'latin_america']),
  targetPlatform: z.enum(['dalle3', 'nano_banana', 'both']),
  includeDiversity: z.boolean(),
  moodPreference: z.string().max(100).optional(),
  allowTextSpace: z.boolean(),
}) satisfies z.ZodType<GeneratorInput>

export const generatorInputDefaults: GeneratorInput = {
  niche: '',
  category: undefined,
  batchSize: 5,
  usageContext: 'commercial',
  targetMarket: 'global',
  targetPlatform: 'both',
  includeDiversity: true,
  moodPreference: undefined,
  allowTextSpace: false,
}
```

Create `src/features/prompt-generator/schemas/generatedPromptSchema.ts`:

```typescript
// This schema validates the raw JSON object returned by the LLM.
// It is intentionally more lenient than GeneratedPrompt — the engine
// does post-processing to fill in computed fields (id, batchId, scores, etc.)

import { z } from 'zod'

export const llmPromptOutputSchema = z.object({
  variant_id: z.number().int().positive(),
  variation_anchors: z.object({
    primary_variation: z.string(),
    composition_style: z.string(),
    lighting_type: z.string(),
  }),
  subject: z.string().min(10),
  composition: z.string().min(5),
  lighting: z.string().min(5),
  mood: z.string().min(5),
  style: z.string().min(5),
  technical: z.string().min(5),
  color_palette: z.string().min(5),
  environment: z.string().min(5),
  negative_prompt: z.string().min(10),
  full_prompt: z.string().min(30),
  commercial_keywords: z.array(z.string()).min(5).max(20),
  adobe_compliance_notes: z.string(),
})

export const llmBatchOutputSchema = z.object({
  prompts: z.array(llmPromptOutputSchema),
})

export type LLMPromptOutput = z.infer<typeof llmPromptOutputSchema>
export type LLMBatchOutput = z.infer<typeof llmBatchOutputSchema>
```

### 5.3 Dexie Schema Migration

Locate the existing Dexie initialization file (found during Phase 0 audit). Apply these changes:

```typescript
// MIGRATION RULES:
//
// 1. Increment the Dexie version number
// 2. Add new table 'prompt_batches' if it does not exist:
//    prompt_batches: '++id, batchId, niche, generatedAt'
// 3. Alter 'prompt_history' (or equivalent existing table) to add indexes:
//    '++id, batchId, createdAt, isFavorite, legacy'
// 4. Write an upgrade() function that:
//    a. Reads all existing records from the history table
//    b. For each old record (identified by absence of 'batchId' field):
//       - Generates a new batchId (UUID)
//       - Maps old prompt string to: fullPrompt, dalle3 variant
//       - Sets legacy: true
//       - Sets isFavorite: false (or migrates existing favorite flag)
//       - Sets adobeScore: null (will show as 'Unscored' in UI)
//       - Sets segments: null (will show as 'Legacy — no segments' in UI)
//    c. Updates records in place
//
// CRITICAL: Do NOT drop or truncate the existing table.
// All old user data must be preserved and remain readable.
```

---

## 6. Implementation Phases

---

### Phase 1 — Foundation & Type System

**Scope**: 6–8 files created, 0 files modified (except possibly adding new type exports)  
**Dependencies**: Phase 0 audit complete  
**Goal**: Establish the type system, schemas, and constants that all subsequent phases depend on.

#### Tasks

**1.1** Create `src/features/prompt-generator/types/index.ts`  
→ Copy the full type definitions from Section 5.1 exactly as specified.

**1.2** Create `src/features/prompt-generator/schemas/generatorInputSchema.ts`  
→ Implement as specified in Section 5.2.

**1.3** Create `src/features/prompt-generator/schemas/generatedPromptSchema.ts`  
→ Implement as specified in Section 5.2.

**1.4** Create `src/features/prompt-generator/constants/photographyDimensions.ts`

This file is the creative dimension library that powers variation. Populate each array with real, distinct, professionally descriptive values:

```typescript
export const COMPOSITION_STYLES = [
  'rule of thirds with subject left-anchored',
  'symmetrical centered composition',
  'leading lines drawing eye to subject',
  'negative space right side — copy-ready',
  'layered depth with foreground blur',
  'overhead flat lay bird\'s eye view',
  'dutch angle for dynamic tension',
  'frame within a frame compositional device',
  'extreme close-up macro detail',
  'wide establishing environmental shot',
  'diagonal dynamic composition',
  'spiral golden ratio framing',
] as const

export const LIGHTING_TYPES = [
  'warm golden hour backlit glow',
  'cool overcast diffused natural light',
  'dramatic rembrandt side lighting',
  'clean three-point studio softbox',
  'moody low-key single source spotlight',
  'high-key bright even commercial lighting',
  'neon accent mixed with ambient darkness',
  'harsh midday directional sunlight with shadows',
  'soft window light lifestyle feel',
  'colored gel creative studio lighting',
  'twilight blue hour ambient',
  'candle or firelight intimate warmth',
] as const

export const MOOD_DESCRIPTORS = [
  'energetic and dynamic — optimistic forward motion',
  'calm and serene — meditative stillness',
  'professional and authoritative — trustworthy',
  'warm and intimate — personal connection',
  'bold and editorial — high-fashion tension',
  'minimal and clean — Scandinavian restraint',
  'nostalgic and emotive — soft memory',
  'adventurous and expansive — freedom',
  'luxurious and aspirational — quiet wealth',
  'raw and authentic — documentary candor',
  'playful and lighthearted — approachable joy',
  'dramatic and cinematic — narrative weight',
] as const

export const TECHNICAL_STYLES = [
  'shallow depth of field — subject isolated with bokeh',
  'deep focus — every plane sharp',
  'long exposure motion blur — silky movement',
  'high-key overexposed editorial',
  'cinematic 2.39:1 widescreen aspect',
  'tilt-shift miniature effect',
  'medium format film emulation — rich grain',
  'hyperreal digital sharpness — no grain',
  'drone aerial perspective',
  'fisheye wide angle distortion',
  'anamorphic lens flare character',
  'macro photography extreme detail',
] as const

export const COLOR_PALETTES = [
  'warm neutrals — cream, taupe, terracotta',
  'cool grays and slate blues',
  'vibrant saturated primaries — high contrast',
  'muted desaturated — faded film',
  'earth tones — ochre, sienna, forest',
  'monochromatic blue tonality',
  'pastel soft — millennial pink and mint',
  'high contrast black and white',
  'jewel tones — emerald, sapphire, burgundy',
  'golden analog film warmth',
  'neon brights on dark background',
  'duotone two-color stylized',
] as const

export const ENVIRONMENTS = [
  'minimalist white studio infinite backdrop',
  'outdoor urban street with city texture',
  'lush green natural outdoor setting',
  'modern open-plan office environment',
  'cozy residential interior — lived-in warmth',
  'industrial warehouse raw concrete and steel',
  'luxury hotel lobby or suite',
  'outdoor café patio — European street',
  'forest path dappled natural light',
  'abstract blurred bokeh background',
  'beachfront coastal golden hour',
  'mountain landscape panoramic',
  'night city skyline — bokeh lights',
  'home kitchen — lifestyle cooking context',
  'medical or clinical clean environment',
] as const

export const PHOTOGRAPHIC_STYLES = [
  'commercial lifestyle photography',
  'editorial magazine photography',
  'documentary candid photography',
  'minimalist product photography',
  'fashion editorial photography',
  'architectural photography',
  'portrait photography — environmental',
  'aerial / drone photography',
  'macro detail photography',
  'reportage journalism photography',
  'fine art photography',
  'food and beverage photography',
] as const

export type CompositionStyle = typeof COMPOSITION_STYLES[number]
export type LightingType = typeof LIGHTING_TYPES[number]
export type MoodDescriptor = typeof MOOD_DESCRIPTORS[number]
export type TechnicalStyle = typeof TECHNICAL_STYLES[number]
export type ColorPalette = typeof COLOR_PALETTES[number]
export type Environment = typeof ENVIRONMENTS[number]
export type PhotographicStyle = typeof PHOTOGRAPHIC_STYLES[number]
```

**1.5** Create `src/features/prompt-generator/constants/platformSpecs.ts`

```typescript
import type { PlatformSpec } from '../types'

// AGENT NOTE: Before implementing this file, search for official Nano Banana
// Pro / Nano Banana 2 documentation to verify:
//   a. Maximum prompt length (chars or tokens)
//   b. Whether weighted terms are supported (e.g., term:1.5)
//   c. Whether negative prompts go in a separate field or inline
//   d. Any platform-specific syntax requirements or best practices
// Fill in accurate values below based on your research.
// If documentation cannot be found, use the conservative defaults shown
// and add a // TODO comment noting what needs verification.

export const PLATFORM_SPECS: Record<string, PlatformSpec> = {
  dalle3: {
    id: 'dalle3',
    displayName: 'DALL-E 3 / GPT Image 2',
    maxPromptLength: 4000,
    supportsNegativePrompt: false,
    negativePromptFormat: 'none',
    promptStyle: 'natural_language',
    notes: [
      'Use natural descriptive language. Do not use comma-separated tag lists.',
      'DALL-E 3 internally handles photographic quality — focus on scene description.',
      'Avoid camera brand names (Canon, Nikon) — use lens/technical feel descriptions instead.',
      'Negative prompts are not supported natively. The NegativePromptGenerator',
      'will attach negatives as a "do not include" postfix sentence for DALL-E.',
    ].join(' '),
  },
  nano_banana: {
    id: 'nano_banana',
    displayName: 'Nano Banana Pro / Nano Banana 2',
    maxPromptLength: 2000,   // TODO: Verify against official docs
    supportsNegativePrompt: true, // TODO: Verify — update format below
    negativePromptFormat: 'separate_field', // TODO: Verify
    promptStyle: 'natural_language', // TODO: Verify if weighted tags are supported
    notes: 'TODO: Add accurate notes after verifying official Nano Banana prompt documentation.',
  },
}
```

**1.6** Create `src/features/prompt-generator/constants/adobeStockGuidelines.ts`

```typescript
// Adobe Stock content guidelines reference.
// Source: https://helpx.adobe.com/stock/contributor/help/content-guidelines.html
// These rules directly inform AdobeStockScorer logic.

export const PROHIBITED_CONTENT_KEYWORDS = [
  // Brand names
  'nike', 'adidas', 'apple', 'google', 'microsoft', 'coca-cola', 'pepsi',
  'mcdonalds', 'starbucks', 'amazon', 'facebook', 'instagram', 'twitter',
  // Would add 50+ more in real implementation
]

export const CELEBRITY_SIGNALS = [
  // Signals that a prompt may be requesting a recognizable person
  // Used to trigger a warning in the scorer
  'famous', 'celebrity', 'president', 'politician', 'ceo of',
]

export const COMMERCIAL_APPEAL_BOOSTERS = [
  'universal workplace scenario',
  'diverse representation',
  'copy space for text',
  'clean background',
  'aspirational lifestyle',
  'seasonal theme',
  'conceptual business',
  'health and wellness',
  'technology and innovation',
  'sustainability and environment',
] as const

export const SCORING_WEIGHTS = {
  commercialViability: 25,
  technicalQuality: 25,
  compositionStrength: 25,
  marketDiversity: 25,
} as const

export const COMMON_REJECTION_REASONS = [
  'Brand logos or trademarks visible in image',
  'Recognizable person without model release',
  'Technically poor quality (blur, noise, artifacts)',
  'Limited commercial use case — too niche or regional',
  'Copyrighted character or artwork',
  'Offensive or discriminatory content',
  'Misleading or factually incorrect depiction',
] as const

export const SCORE_THRESHOLDS = {
  high: 80,    // Green badge — strong commercial prospect
  medium: 60,  // Yellow badge — acceptable, improvements suggested
  low: 0,      // Red badge — significant concerns
} as const
```

#### Phase 1 Acceptance Criteria

```
[ ] All TypeScript files compile with zero errors
[ ] All Zod schemas validate correctly against mock data matching their types
[ ] All constants files export correctly and are importable
[ ] No 'any' types anywhere in Phase 1 files
[ ] photographyDimensions.ts: each array has the minimum required entries
[ ] platformSpecs.ts: nano_banana entry has TODO comments where research is needed
[ ] types/index.ts: all interfaces are complete per Section 5.1
```

---

### Phase 2 — PromptComposerEngine (Core)

**Scope**: 3 new files in `engine/`  
**Dependencies**: Phase 1 complete  
**Goal**: The functioning brain of the new generator. By end of this phase, given a `GeneratorInput`, the engine can produce a `GeneratedPromptBatch` from an LLM (minus scoring and platform adaptation, added in Phase 3).

#### Tasks

**2.1** Create `src/features/prompt-generator/engine/VariationStrategyEngine.ts`

```typescript
// PURPOSE:
// Generates N VariationStrategy objects ensuring genuine creative divergence
// across a prompt batch. Each strategy is assigned a unique primary pivot
// dimension, so no two prompts in the batch will share the same creative anchor.
//
// ALGORITHM:
// 1. Define the ordered pivot pool (6 pivots — see Section 9)
// 2. For batch of N:
//    - If N <= 6: assign pivots in order, no repeats
//    - If N > 6: cycle through pivots and invert directionHint on second cycle
// 3. For each strategy, select directionHint based on pivot + niche context
// 4. For each strategy, define anchored dimensions (what stays fixed)
//    so the LLM knows what to lean into vs what to vary
// 5. Strategies are deterministic: same niche + same batchSize = same strategies
//    (use a simple hash of niche string as a seed for directionHint selection)
//
// IMPORTANT: The niche should influence directionHint selection so that
// a "technology" niche gets appropriate direction hints (not "cottagecore"),
// while still being varied within that niche's creative space.

import type { VariationStrategy, VariationPivot, BatchSize, GeneratorInput } from '../types'

const PIVOT_POOL: VariationPivot[] = [
  'lighting',
  'composition',
  'mood_atmosphere',
  'technical_feel',
  'environment',
  'color_palette',
]

// Direction hints per pivot — varied based on batch position
const DIRECTION_HINTS: Record<VariationPivot, [string, string]> = {
  lighting:       ['dramatic and directional', 'soft and diffused'],
  composition:    ['wide establishing environmental', 'intimate close-up detail'],
  mood_atmosphere:['energetic and dynamic', 'calm and contemplative'],
  technical_feel: ['cinematic shallow depth of field', 'sharp deep-focus documentary'],
  environment:    ['clean minimal studio', 'rich textured real-world location'],
  color_palette:  ['warm saturated vibrant', 'cool muted desaturated'],
}

export function generateVariationMatrix(
  input: GeneratorInput
): VariationStrategy[] {
  const { niche, batchSize } = input
  const strategies: VariationStrategy[] = []

  for (let i = 0; i < batchSize; i++) {
    const pivotIndex = i % PIVOT_POOL.length
    const pivot = PIVOT_POOL[pivotIndex]
    const isSecondCycle = i >= PIVOT_POOL.length
    const directionIndex = isSecondCycle ? 1 : 0

    strategies.push({
      index: i + 1,
      primaryPivot: pivot,
      directionHint: DIRECTION_HINTS[pivot][directionIndex],
      anchoredDimensions: buildAnchoredDimensions(pivot, i, niche),
    })
  }

  return strategies
}

function buildAnchoredDimensions(
  pivot: VariationPivot,
  index: number,
  _niche: string
): VariationStrategy['anchoredDimensions'] {
  // When a pivot is the star, anchor the OTHER dimensions to provide stability.
  // This prevents the LLM from varying everything at once (which produces chaos)
  // while allowing the pivot dimension to take bold creative risks.

  const anchors: VariationStrategy['anchoredDimensions'] = {}

  if (pivot !== 'composition') {
    // Rotate through a few stable composition anchors
    const compositionAnchors = ['rule of thirds', 'centered symmetrical', 'wide establishing', 'negative space left']
    anchors.composition = compositionAnchors[index % compositionAnchors.length]
  }

  if (pivot !== 'lighting') {
    const lightingAnchors = ['natural daylight', 'studio softbox', 'golden hour', 'overcast diffused']
    anchors.lighting = lightingAnchors[index % lightingAnchors.length]
  }

  return anchors
}
```

**2.2** Create `src/features/prompt-generator/engine/MetaPromptBuilder.ts`

This file constructs the exact prompt sent to the LLM. Follow Section 7 (Meta-Prompt Design Specification) precisely. The output must be `{ systemPrompt: string, userPrompt: string }`.

Key implementation requirements:
- The system prompt establishes the LLM's role as a commercial photography expert (see Section 7.1)
- The user prompt includes: niche, variation matrix (serialized), photography dimensions reference, platform notes, diversity/text-space flags, output JSON schema (see Section 7.2)
- Platform notes are pulled from `platformSpecs.ts`
- JSON schema in prompt must exactly match `LLMBatchOutput` from `generatedPromptSchema.ts`
- The builder must produce different prompts based on `targetPlatform` value

**2.3** Create `src/features/prompt-generator/engine/PromptComposerEngine.ts`

This is the orchestrator. It wires all engine components into a single callable function.

```typescript
// INTERFACE:
export interface PromptComposerEngineOptions {
  llmClient: LLMClientInterface  // Inject the existing provider adapter — do not import directly
}

export class PromptComposerEngine {
  constructor(private options: PromptComposerEngineOptions) {}

  async generate(input: GeneratorInput): Promise<GeneratedPromptBatch> {
    // Step 1: Validate input
    const parsed = generatorInputSchema.safeParse(input)
    if (!parsed.success) throw new Error('Invalid generator input: ' + parsed.error.message)

    // Step 2: Generate variation matrix
    const variationMatrix = generateVariationMatrix(parsed.data)

    // Step 3: Build meta-prompt
    const { systemPrompt, userPrompt } = MetaPromptBuilder.build(parsed.data, variationMatrix)

    // Step 4: Call LLM
    let rawResponse: string
    try {
      rawResponse = await this.options.llmClient.complete(systemPrompt, userPrompt)
    } catch (err) {
      throw this.wrapError('PROVIDER_ERROR', err)
    }

    // Step 5: Parse and validate
    let llmBatch = this.parseResponse(rawResponse)
    if (!llmBatch) {
      // Retry once with correction prompt
      const retryPrompt = MetaPromptBuilder.buildRetryPrompt(rawResponse, parsed.data)
      const retryResponse = await this.options.llmClient.complete(systemPrompt, retryPrompt)
      llmBatch = this.parseResponse(retryResponse)
      if (!llmBatch) {
        throw { code: 'PARSE_FAILURE', message: 'LLM output could not be parsed after retry', rawResponse }
      }
    }

    // Step 6: Map LLM output to GeneratedPrompt[] (scoring, platform adaptation in Phase 3)
    const batchId = crypto.randomUUID()
    const prompts: GeneratedPrompt[] = llmBatch.prompts.map((p, i) => this.mapLLMOutput(p, i, batchId, parsed.data))

    return {
      batchId,
      prompts,
      generatorInput: parsed.data,
      generatedAt: new Date(),
    }
  }

  private parseResponse(raw: string): LLMBatchOutput | null {
    try {
      // Strip markdown code blocks if present
      const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
      const parsed = JSON.parse(cleaned)
      const validated = llmBatchOutputSchema.safeParse(parsed)
      return validated.success ? validated.data : null
    } catch {
      return null
    }
  }

  // ... mapLLMOutput, wrapError implementations
}
```

**Error handling requirements:**
- `LLM_TIMEOUT`: catch timeout, throw typed `PromptGeneratorError`
- `PARSE_FAILURE`: thrown after second failed parse attempt
- `PARTIAL_BATCH`: if LLM returns fewer prompts than requested, return the valid ones with `code: 'PARTIAL_BATCH'` and `partialPrompts`
- Never throw untyped errors from this module

#### Phase 2 Acceptance Criteria

```
[ ] VariationStrategyEngine: batch of 5 returns 5 strategies with 5 distinct primaryPivots
[ ] VariationStrategyEngine: batch of 10 returns strategies where all 6 pivots appear
[ ] VariationStrategyEngine: deterministic — same inputs produce same output every time
[ ] MetaPromptBuilder: produces non-empty systemPrompt and userPrompt for all input combinations
[ ] MetaPromptBuilder: output JSON schema in userPrompt matches LLMBatchOutput exactly
[ ] PromptComposerEngine: retry logic fires on simulated parse failure
[ ] PromptComposerEngine: returns GeneratedPromptBatch with batchId on all prompts
[ ] All error conditions produce typed PromptGeneratorError, not untyped exceptions
```

---

### Phase 3 — Specialization Modules

**Scope**: 3 new files in `engine/`  
**Dependencies**: Phase 1, Phase 2  
**Goal**: Add the three capabilities that turn raw LLM output into Adobe Stock-grade prompts.

#### Tasks

**3.1** Create `src/features/prompt-generator/engine/NegativePromptGenerator.ts`

```typescript
// ALGORITHM:
//
// Layer 1 — Universal negatives (always included for all contexts):
const UNIVERSAL_NEGATIVES = [
  'blurry', 'out of focus', 'watermark', 'text overlay', 'signature',
  'logo', 'low quality', 'pixelated', 'noise', 'heavy grain',
  'oversaturated', 'overexposed', 'underexposed', 'distorted',
  'deformed', 'jpeg artifacts', 'compression artifacts',
].join(', ')

// Layer 2 — Style-specific negatives (detect from segments.style):
const STYLE_NEGATIVES: Record<string, string> = {
  portrait: 'bad anatomy, extra fingers, face distortion, asymmetrical eyes, skin artifacts, uncanny valley',
  architecture: 'distorted perspective, impossible geometry, leaning buildings, warped lines',
  nature: 'artificial looking, over-processed HDR, fake colors, plastic textures, over-sharpened',
  food: 'unappetizing presentation, wilted food, unnatural colors, dirty surfaces',
  technology: 'unrealistic screens, wrong text on displays, broken interfaces',
}

// Layer 3 — Commercial negatives (always for commercial usageContext):
const COMMERCIAL_NEGATIVES = 'visible brand logos, brand names, trademarks, copyrighted symbols, celebrity faces'

// Platform formatting:
// - DALL-E: Natural language sentence: "Do not include: [negatives]"
//   (DALL-E 3 doesn't have a native negative field — embed in prompt as instruction)
// - Nano Banana: Format as per platform spec (comma-separated or per platform docs)

export function generateNegativePrompt(
  prompt: GeneratedPrompt,
  platform: ImagePlatform
): string {
  // 1. Detect style category from prompt.segments.style
  // 2. Build layered negatives
  // 3. Format for platform
}
```

**3.2** Create `src/features/prompt-generator/engine/AdobeStockScorer.ts`

Implement the full scoring algorithm specified in Section 8 of this plan. The function signature:

```typescript
export function scorePrompt(prompt: GeneratedPrompt): AdobeStockScore
```

Scoring algorithm summary (full detail in Section 8):
- `commercialViability` (0–25): universal appeal, no prohibited content, copy space potential, trending category
- `technicalQuality` (0–25): lighting specificity, technical descriptor, composition clarity, color palette present
- `compositionStrength` (0–25): named composition technique, environment defined, subject specificity
- `marketDiversity` (0–25): inclusive language when people depicted, global/neutral references, demographic diversity signals

Warning triggers (auto-detect from prompt text):
- Brand/trademark names in `PROHIBITED_CONTENT_KEYWORDS` → `'Potential brand name detected — review before submission'`
- Celebrity signals → `'Possible celebrity reference — verify licensing'`
- `negativePrompt` length < 20 chars → `'Negative prompt too brief'`
- `fullPrompt` word count < 40 → `'Prompt lacks detail — may produce generic images'`
- No lighting descriptor in `segments.lighting` → `'Missing lighting specification'`

**3.3** Create `src/features/prompt-generator/engine/PlatformAdapter.ts`

```typescript
// PURPOSE:
// Takes a GeneratedPrompt and produces optimized text for each target platform.
// The full_prompt from LLM is the starting point — adapt, do not rewrite entirely.

export function adaptForPlatform(
  prompt: GeneratedPrompt,
  targetPlatform: ImagePlatform,
  negativePrompt: string
): PlatformVariants {

  // DALL-E 3 adaptation:
  // - Natural language, flowing prose
  // - Embed negatives as "Avoid: [negatives]." at the end (DALL-E has no native neg field)
  // - Remove camera brand names if present
  // - Ensure prompt is under DALL_E_SPEC.maxPromptLength
  // - Structure: [subject + composition] + [environment] + [lighting] + [mood/style] + [technical] + Avoid: [negatives]

  // Nano Banana adaptation:
  // - Follow platformSpecs.nano_banana format (research-verified in Phase 1)
  // - Adjust syntax if platform supports weighted terms
  // - Negative prompt as separate string (if supportsNegativePrompt: true)
  // - Ensure under maxPromptLength

  return {
    dalle3: buildDalle3Prompt(prompt, negativePrompt),
    nano_banana: buildNanaBananaPrompt(prompt, negativePrompt),
  }
}
```

**Integrate Phase 3 modules into PromptComposerEngine:**

After Phase 3 is complete, update `PromptComposerEngine.ts` to call the specialization modules in steps 5–7 of the `generate()` method (after LLM parsing, before returning batch).

#### Phase 3 Acceptance Criteria

```
[ ] NegativePromptGenerator: portrait context includes anatomy negatives
[ ] NegativePromptGenerator: commercial context always includes brand/logo negatives
[ ] NegativePromptGenerator: nature context includes over-processing negatives
[ ] NegativePromptGenerator: DALL-E format starts with 'Avoid:' or similar natural language
[ ] AdobeStockScorer: score breakdown fields sum to total (±1 for rounding)
[ ] AdobeStockScorer: prompt with brand name triggers warning
[ ] AdobeStockScorer: prompt with all segments filled scores > 60
[ ] AdobeStockScorer: prompt with empty lighting field triggers warning
[ ] PlatformAdapter: both dalle3 and nano_banana variants populated
[ ] PlatformAdapter: dalle3 variant is under 4000 chars
[ ] PlatformAdapter: DALL-E variant contains negatives embedded in natural language
[ ] PromptComposerEngine: GeneratedPromptBatch.prompts[n].adobeScore is populated
[ ] PromptComposerEngine: GeneratedPromptBatch.prompts[n].platformVariants is populated
[ ] PromptComposerEngine: GeneratedPromptBatch.prompts[n].negativePrompt is populated
```

---

### Phase 4 — Enhanced Input UX

**Scope**: 2–3 files modified  
**Dependencies**: Phase 1  
**Goal**: Extend the generator form with new control fields while preserving all existing form behavior.

#### Tasks

**4.1** Refactor the existing Generator Form component (path found in Phase 0 audit).

The following fields MUST be added to the form. The existing `niche textarea`, `category selector`, and `batch size selector` must be preserved without behavioral change.

New fields to add:

| Field | Component | Default | i18n key namespace |
|-------|-----------|---------|-------------------|
| `usageContext` | `<Select>` (Shadcn) | `'commercial'` | `generator.form.usageContext` |
| `targetPlatform` | `<Select>` (Shadcn) | `'both'` | `generator.form.targetPlatform` |
| `includeDiversity` | `<Switch>` (Shadcn) | `true` | `generator.form.includeDiversity` |
| `allowTextSpace` | `<Switch>` (Shadcn) | `false` | `generator.form.allowTextSpace` |
| `targetMarket` *(advanced)* | `<Select>` (Shadcn) | `'global'` | `generator.form.targetMarket` |
| `moodPreference` *(advanced)* | `<Input>` (Shadcn) | `undefined` | `generator.form.moodPreference` |

**Advanced Options Panel (Framer Motion):**
- `targetMarket` and `moodPreference` go inside a collapsible panel
- Panel toggle: `<button>` with label from `generator.form.advancedOptions` i18n key
- Animation: use `AnimatePresence` + `motion.div` with `height: 0 → 'auto'` and `opacity: 0 → 1`
- Panel is closed by default

**Form validation:**  
Connect all new fields to the existing React Hook Form setup using `generatorInputSchema` from Phase 1.

**4.2** Update the Zustand generator store (path found in Phase 0 audit) to accept the new `GeneratorInput` shape.

The store must hold:
```typescript
interface GeneratorStoreState {
  input: GeneratorInput                    // Extends from current input state
  batch: GeneratedPromptBatch | null       // Current generated batch
  isGenerating: boolean
  error: PromptGeneratorError | null
  // ... preserve all existing state fields that are still relevant
}
```

**4.3** Add all new i18n keys to every locale file found in the project.

```
Keys to add (use existing locale file format):
generator.form.usageContext.label
generator.form.usageContext.options.commercial
generator.form.usageContext.options.editorial
generator.form.usageContext.options.conceptual
generator.form.usageContext.options.abstract
generator.form.targetPlatform.label
generator.form.targetPlatform.options.both
generator.form.targetPlatform.options.dalle3
generator.form.targetPlatform.options.nano_banana
generator.form.includeDiversity.label
generator.form.includeDiversity.description
generator.form.allowTextSpace.label
generator.form.allowTextSpace.description
generator.form.advancedOptions.toggle
generator.form.targetMarket.label
generator.form.targetMarket.options.global
generator.form.targetMarket.options.us
generator.form.targetMarket.options.eu
generator.form.targetMarket.options.asia
generator.form.targetMarket.options.latin_america
generator.form.moodPreference.label
generator.form.moodPreference.placeholder
```

For non-primary locales where translations are unavailable, use the English text and add `// TODO: translate` comment.

#### Phase 4 Acceptance Criteria

```
[ ] All new form fields render without errors
[ ] Advanced Options panel animates open/close using Framer Motion
[ ] Form validation fires on all new required fields
[ ] Submitting form produces valid GeneratorInput object (verified via console.log or test)
[ ] Batch size selector, niche textarea, category selector still work exactly as before
[ ] All new labels have corresponding i18n keys
[ ] Default values match specification exactly
[ ] Zustand store reflects new input shape
```

---

### Phase 5 — Output & Display Refactor

**Scope**: 4–6 files created/modified  
**Dependencies**: Phases 1, 2, 3, 4  
**Goal**: Replace the old prompt output display with a structured, information-rich PromptCard v2 that makes the quality of each generated prompt immediately legible.

#### Tasks

**5.1** Replace the existing PromptCard component with PromptCard v2.

The v2 card must implement this layout (adapt styling to match existing Tailwind/Shadcn patterns in the project):

```
┌─────────────────────────────────────────────────────────────────┐
│ HEADER ROW                                                       │
│  "Variant 1 of 5"                   [●87] Adobe Score           │
├─────────────────────────────────────────────────────────────────┤
│ PLATFORM TABS                                                    │
│  [DALL-E 3]  [Nano Banana]   ← toggles which fullPrompt shows   │
├─────────────────────────────────────────────────────────────────┤
│ PROMPT TEXT AREA                                                 │
│  <selected platform's full prompt text>                         │
│  Line height generous. Selectable text. No truncation.          │
│                                              [Copy to Clipboard]│
├─────────────────────────────────────────────────────────────────┤
│ COLLAPSIBLE PANELS (Framer Motion, closed by default)           │
│  [▼ Photography Segments]                                        │
│  [▼ Negative Prompt]                                             │
│  [▼ Stock Keywords]                                              │
├─────────────────────────────────────────────────────────────────┤
│ ACTION ROW                                                       │
│  [♡ Favorite]              [↺ Regenerate This Variant]          │
└─────────────────────────────────────────────────────────────────┘
```

**Photography Segments panel content:**

Render each of the 8 `PromptSegments` fields as a labeled row:
```
Subject:       <value>
Composition:   <value>
Lighting:      <value>
Mood:          <value>
Style:         <value>
Technical:     <value>
Color Palette: <value>
Environment:   <value>
```

**Adobe Score badge behavior:**
- Green: `score >= 80`  
- Yellow: `score >= 60 && score < 80`  
- Red: `score < 60`  
- Clicking the badge opens an `AdobeScoreDisplay` popover/dialog (task 5.2)

**Regenerate This Variant:**
- Calls the engine with the same `GeneratorInput` but requests only 1 prompt
- Uses the same `VariationStrategy` as this variant's original index
- Replaces this card's prompt in the batch (does not regenerate the whole batch)
- Shows a loading spinner on the card while regenerating

**5.2** Create `AdobeScoreDisplay` component.

A `Popover` (Shadcn) or `Dialog` containing:
- Total score as large number
- 4 progress bars (one per breakdown dimension), each labeled
- Warnings list (shown in destructive/red variant if non-empty)
- Suggestions list (shown in info/blue variant)

**5.3** Create `SegmentsPanel` component.

Collapsible panel showing all 8 `PromptSegments` as labeled rows. Each row has an individual copy button.

**5.4** Create `NegativePromptPanel` component.

Collapsible panel showing the `negativePrompt` string. Copy button. Brief explanation: "These descriptors are sent to the AI generator to suppress unwanted visual elements."

**5.5** Create `BatchActionBar` component (or refactor existing).

```
┌─────────────────────────────────────────────────────────────────┐
│  "5 prompts generated for: {niche}"                             │
│  [Export CSV]  [Export JSON]  [♡ Save All to History]          │
└─────────────────────────────────────────────────────────────────┘
```

This component appears above the prompt cards, after generation completes.

**5.6** Handle legacy prompts in display.

If a `GeneratedPrompt` has `legacy: true`:
- Show a `"Legacy"` badge on the card header
- Show "Segments not available for this prompt" in the Segments panel
- Show "Score not available for legacy prompts" where the Adobe Score badge would be
- Still show the `fullPrompt` text

#### Phase 5 Acceptance Criteria

```
[ ] PromptCard v2 renders without errors for a full GeneratedPromptBatch
[ ] Platform tabs correctly switch between dalle3 and nano_banana variants
[ ] Copy button copies the currently selected platform variant
[ ] Segments panel shows all 8 dimensions
[ ] Adobe Score badge color matches score range
[ ] AdobeScoreDisplay popover shows all 4 breakdown dimensions + warnings + suggestions
[ ] Negative prompt panel shows correct content with copy button
[ ] Keywords panel shows commercialKeywords as copyable chips
[ ] Regenerate This Variant triggers single-prompt regeneration
[ ] Favorite toggle updates isFavorite and persists to Dexie
[ ] BatchActionBar shows correct niche and prompt count
[ ] Legacy prompts display gracefully without crashing
[ ] All new UI text uses i18n keys
```

---

### Phase 6 — History, Favorites & Export

**Scope**: 2–4 files modified  
**Dependencies**: Phases 1, 5  
**Goal**: Migrate existing persistence layer to new schema, extend export with new fields, ensure history/favorites UI handles both legacy and new records.

#### Tasks

**6.1** Dexie schema migration.

Locate the Dexie initialization file (from Phase 0 audit) and apply:
1. Increment version number by 1
2. Add new table schema for `prompt_batches` if it doesn't exist
3. Write `upgrade()` function per the migration rules in Section 5.3
4. Test: existing data reads without error after migration

**6.2** Refactor `usePromptHistory` hook (path from Phase 0 audit).

New capabilities required:
- Load prompts paginated (by `createdAt` desc, 20 per page)
- Filter: `isFavorite: true` (favorites view)
- Filter: by `niche` text search (if not already present)
- Delete: single `GeneratedPrompt` by id
- Delete: entire batch by `batchId`
- Toggle favorite: update `isFavorite` in Dexie
- Handle legacy records: return them alongside new records, marked clearly

**6.3** Refactor/create `exportService.ts`.

```typescript
// If an export service already exists, extend it.
// If not, create: src/features/prompt-generator/services/exportService.ts

export function exportBatchToCSV(batch: GeneratedPromptBatch): void {
  // Columns (in order):
  // variant_id, batch_id, niche, usage_context, target_platform,
  // full_prompt, dalle3_prompt, nano_banana_prompt,
  // negative_prompt, adobe_score_total,
  // commercial_viability, technical_quality, composition_strength, market_diversity,
  // adobe_warnings, commercial_keywords,
  // subject, composition, lighting, mood, style, technical, color_palette, environment,
  // created_at

  // Implementation:
  // 1. Build header row
  // 2. Build data rows (one per GeneratedPrompt)
  // 3. Escape CSV special characters (commas, quotes, newlines in fields)
  // 4. Trigger browser download: new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
  // 5. URL.createObjectURL → anchor click → URL.revokeObjectURL
  // 6. Filename format: 'promptforge-{niche-slug}-{date}.csv'
}

export function exportBatchToJSON(batch: GeneratedPromptBatch): void {
  // 1. JSON.stringify(batch, null, 2)
  // 2. Trigger browser download: Blob type 'application/json'
  // 3. Filename format: 'promptforge-{niche-slug}-{date}.json'
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)
}
```

**6.4** Verify History & Favorites UI handles new schema.

If the existing history/favorites page components load and display `GeneratedPrompt` objects:
- Update them to show new fields (Adobe score badge, platform indicator)
- Ensure legacy records show the "Legacy" badge and degrade gracefully
- Patch, do not rewrite, unless the existing component is fundamentally incompatible

#### Phase 6 Acceptance Criteria

```
[ ] Dexie upgrade runs without throwing on first launch
[ ] Old prompt records are readable after migration (as legacy records)
[ ] Legacy records show 'Legacy' badge in history view
[ ] New records show all fields in history view
[ ] Favorite toggle in history view persists correctly
[ ] Delete single prompt works
[ ] Delete batch works
[ ] CSV export: file downloads, opens in spreadsheet, all columns present
[ ] CSV export: no broken encoding on fields containing commas or quotes
[ ] JSON export: file downloads, JSON.parse() succeeds on output
[ ] JSON export: output matches GeneratedPromptBatch schema
[ ] Filename includes niche slug and date
```

---

### Phase 7 — Integration, QA & Cleanup

**Scope**: Multiple files  
**Dependencies**: All phases complete  
**Goal**: Wire everything together, verify end-to-end flow, clean up deprecated code, write tests, finalize documentation.

#### Tasks

**7.1** End-to-end integration.

Wire the complete pipeline in `usePromptGenerator.ts`:

```
form submit
  → validate GeneratorInput (Zod)
  → set isGenerating: true in store
  → show N skeleton loading cards (SkeletonPromptCard component)
  → call PromptComposerEngine.generate(input)
  → on success: update store.batch, set isGenerating: false
  → on PromptGeneratorError:
    - 'PARTIAL_BATCH': show prompts received + banner warning
    - 'LLM_TIMEOUT': show error state + retry button
    - 'PARSE_FAILURE': show error state + retry button + show raw response in collapsible debug panel
    - 'PROVIDER_ERROR': show error state with provider-specific message
  → auto-save batch to Dexie prompt_history
```

Loading state: Create `SkeletonPromptCard` component — animated pulse skeleton matching PromptCard v2 dimensions.

**7.2** Remove deprecated code.

After confirming Phase 7.1 works end-to-end:
1. Delete old template string definitions
2. Delete old generator service logic that is fully superseded
3. Remove unused imports across affected files
4. Run TypeScript compiler — resolve any errors
5. Add an entry to `CHANGELOG.md` (create if it doesn't exist) documenting:
   - What was removed
   - What replaces it
   - Breaking changes (if any for downstream forks)

**7.3** Write unit tests (Vitest).

Create test files alongside or adjacent to each engine file:

```
src/features/prompt-generator/engine/__tests__/
├── VariationStrategyEngine.test.ts
├── AdobeStockScorer.test.ts
├── NegativePromptGenerator.test.ts
├── PlatformAdapter.test.ts
└── exportService.test.ts
```

See Section 10 for the full test case specification.

**7.4** i18n audit.

Run a search for any hardcoded UI strings introduced during Phases 4 and 5. Add missing i18n keys. Every locale file must have the same key set (values may be English placeholders for non-primary locales, with `// TODO: translate`).

**7.5** Code quality pass.

```
[ ] All public functions have TSDoc comments (/** ... */)
[ ] No console.log() in production code paths
[ ] No 'any' types
[ ] No @ts-ignore without explanatory comment
[ ] ESLint: zero new warnings vs. pre-refactor baseline
[ ] All unused imports removed
[ ] File headers include a one-line description comment
```

**7.6** Update `README.md`.

Add a section documenting:
- The new generator features (what changed)
- New input fields and their purpose
- Export functionality usage
- Adobe Stock scoring — brief methodology note
- How to contribute to the photography dimension constants (for open-source contributors)
- Platform-specific notes for DALL-E 3 and Nano Banana

#### Phase 7 Acceptance Criteria

```
[ ] Full pipeline works end-to-end in development mode (pnpm dev / npm run dev)
[ ] Loading skeletons appear immediately on generation start
[ ] Error states display correctly for each PromptGeneratorError code
[ ] Batch auto-saves to Dexie on successful generation
[ ] All unit tests pass (vitest run)
[ ] TypeScript: zero compilation errors
[ ] ESLint: zero new errors, zero new warnings
[ ] README updated with new features
[ ] CHANGELOG.md updated
[ ] No regressions on non-generator features (manual smoke test)
```

---

## 7. Meta-Prompt Design Specification

The quality of generated prompts is entirely determined by the meta-prompt sent to the LLM. This section specifies exactly what `MetaPromptBuilder.ts` must produce. This is the most critical IP of the new system.

### 7.1 System Prompt

```
You are a senior stock photography art director and AI image prompt engineer with 
10+ years of experience creating commercially successful images for Adobe Stock, 
Getty Images, and Shutterstock.

Your specialty is crafting precise image generation prompts that:
- Produce technically excellent, commercially viable photographs
- Achieve high acceptance rates on premium stock platforms (80%+ acceptance rate)
- Represent diverse humanity authentically without tokenism
- Balance strong artistic vision with broad market appeal and licensing value

You think like a photo buyer: you know what editorial teams, marketing departments, 
and creative agencies search for. You know that an image with generic composition 
and unspecified lighting will never sell. You know that the difference between 
a stock photo that earns $0.25 and one that earns $250 is specificity, story, 
and commercial intentionality.

When generating prompts, you always:
1. Specify lighting with professional precision (not just 'good light' — name the setup)
2. Name the compositional approach (not just 'nice framing' — rule of thirds? leading lines?)
3. Define the technical feel (shallow DOF? deep focus? film grain? cinematic widescreen?)
4. Establish emotional atmosphere with specific adjectives
5. Avoid anything that would cause platform rejection (brand names, celebrity likenesses, 
   controversial symbols, explicit content)
6. Think about who would buy this image and why
```

### 7.2 User Prompt Template

The user prompt is built dynamically by `MetaPromptBuilder.build()`. Implement using template literals:

```
Generate exactly {batchSize} UNIQUE and DIVERGENT stock image prompts for:

CONCEPT: {niche}
CATEGORY HINT: {category ?? 'Not specified — infer from concept'}
USAGE CONTEXT: {usageContext}
TARGET MARKET: {targetMarket}
{moodPreference ? `MOOD PREFERENCE: ${moodPreference}` : ''}
{allowTextSpace ? `COPY SPACE REQUIREMENT: At least one dimension of the composition must include significant negative space suitable for text overlay. Note this in the composition segment.` : ''}
{includeDiversity ? `DIVERSITY REQUIREMENT: When human subjects are depicted, ensure meaningful diversity across the batch in terms of age, ethnicity, and gender. Avoid tokenism — diversity should feel natural to the scene, not forced.` : ''}

TARGET PLATFORM: {targetPlatformDescription}
{platformNotes}

VARIATION MATRIX — each prompt MUST follow its assigned strategy:
{JSON.stringify(variationMatrix, null, 2)}

PHOTOGRAPHY DIMENSION REFERENCE (use these as vocabulary):
{JSON.stringify(photographyDimensions, null, 2)}

CRITICAL RULES:
1. Each prompt uses a DISTINCT primary variation pivot as assigned in the matrix
2. No two prompts should feel like minor rewrites of each other — they should represent 
   genuinely different creative approaches to the same concept
3. Every prompt MUST specify all 8 dimensions: subject, composition, lighting, mood, 
   style, technical, color_palette, environment
4. Never include: brand names, trademark symbols, celebrity likenesses, copyrighted 
   characters, explicit content, hate symbols
5. Think about the end buyer: who licenses this image, and for what purpose?
6. The commercial_keywords array should contain 10–15 precise, searchable terms that 
   a stock photo buyer would actually type

OUTPUT REQUIREMENTS:
- Respond ONLY with valid JSON
- No markdown formatting, no code blocks, no backtick fences
- No preamble or explanation before or after the JSON
- Start your response with { and end with }
- The JSON must exactly match this schema:

{
  "prompts": [
    {
      "variant_id": <integer, 1-based>,
      "variation_anchors": {
        "primary_variation": "<the pivot dimension for this variant>",
        "composition_style": "<the anchored or varied composition approach>",
        "lighting_type": "<the anchored or varied lighting type>"
      },
      "subject": "<specific, vivid subject description — who or what, in detail>",
      "composition": "<framing, angle, perspective, named compositional technique>",
      "lighting": "<lighting source, quality, direction, color temperature, intensity>",
      "mood": "<emotional tone, atmosphere, energy level, psychological feel>",
      "style": "<photographic genre and style — editorial, commercial, documentary, etc.>",
      "technical": "<camera/lens feel, depth of field, motion, rendering aesthetic>",
      "color_palette": "<color grading direction, dominant palette, temperature>",
      "environment": "<setting, background, location context, time of day if relevant>",
      "negative_prompt": "<specific elements to suppress for this variant — be precise>",
      "full_prompt": "<complete assembled prompt, optimized for {primaryPlatform}, minimum 60 words>",
      "commercial_keywords": ["<keyword1>", "<keyword2>", ...],
      "adobe_compliance_notes": "<one sentence self-assessment of commercial viability>"
    }
  ]
}
```

### 7.3 Retry Prompt

On parse failure, `MetaPromptBuilder.buildRetryPrompt()` returns:

```
Your previous response could not be parsed as valid JSON.

Parse error: {parseError.message}

Rules:
- Start your response with { and end with }
- No markdown, no backtick code blocks, no explanatory text
- Every string value must use standard JSON double-quoted strings
- Arrays use [] brackets
- Do not add trailing commas

Generate the same {batchSize} prompts for concept: "{niche}"

Use the exact same JSON schema as before. Output only the JSON object.
```

### 7.4 Platform Description Strings

Used in the user prompt as `{targetPlatformDescription}`:

```typescript
const TARGET_PLATFORM_DESCRIPTIONS: Record<ImagePlatform, string> = {
  dalle3: 'DALL-E 3 / GPT Image 2 — natural language, flowing descriptive prose, no tag syntax',
  nano_banana: 'Nano Banana Pro / Nano Banana 2 — [fill in per platform research in Phase 1]',
  both: 'DALL-E 3 and Nano Banana Pro — write the full_prompt in natural language (DALL-E optimized), the platform adapter will handle Nano Banana formatting separately',
}
```

---

## 8. Adobe Stock Compliance Specification

### 8.1 Scoring Algorithm — Full Detail

```typescript
function scorePrompt(prompt: GeneratedPrompt): AdobeStockScore {
  const breakdown = {
    commercialViability: scoreCommercialViability(prompt),
    technicalQuality:    scoreTechnicalQuality(prompt),
    compositionStrength: scoreCompositionStrength(prompt),
    marketDiversity:     scoreMarketDiversity(prompt),
  }

  const total = Object.values(breakdown).reduce((a, b) => a + b, 0)
  const warnings = detectWarnings(prompt)
  const suggestions = generateSuggestions(prompt, breakdown, warnings)

  return { total, breakdown, warnings, suggestions }
}

// ── Commercial Viability (0–25) ──────────────────────────────────────────────
function scoreCommercialViability(prompt: GeneratedPrompt): number {
  let score = 0
  const text = [prompt.fullPrompt, ...Object.values(prompt.segments)].join(' ').toLowerCase()

  // Universal appeal theme (check for broad commercial scenarios)
  const universalThemes = ['business', 'professional', 'lifestyle', 'wellness', 'technology',
    'nature', 'family', 'education', 'healthcare', 'food', 'travel', 'work', 'team']
  if (universalThemes.some(t => text.includes(t))) score += 10

  // No prohibited content detected
  const hasProhibited = PROHIBITED_CONTENT_KEYWORDS.some(k => text.includes(k.toLowerCase()))
  if (!hasProhibited) score += 8

  // Copy space potential (allowTextSpace was true or composition mentions negative space)
  if (prompt.generatorInput.allowTextSpace || text.includes('negative space') || text.includes('copy space')) score += 4

  // Trending or seasonal context
  const trending = ['sustainability', 'remote work', 'mental health', 'diversity', 'innovation', 'ai', 'climate']
  if (trending.some(t => text.includes(t))) score += 3

  return Math.min(score, 25)
}

// ── Technical Quality (0–25) ─────────────────────────────────────────────────
function scoreTechnicalQuality(prompt: GeneratedPrompt): number {
  let score = 0

  // Lighting descriptor has meaningful specificity (not just 'light' or 'bright')
  const lightingQualityWords = ['softbox', 'golden hour', 'rembrandt', 'diffused', 'backlit',
    'side lighting', 'three-point', 'overcast', 'neon', 'candlelight', 'studio']
  if (lightingQualityWords.some(w => prompt.segments.lighting.toLowerCase().includes(w))) score += 8

  // Technical descriptor is present and specific
  if (prompt.segments.technical.length > 20) score += 7

  // Composition named (not generic)
  const namedCompositions = ['rule of thirds', 'symmetrical', 'leading lines', 'negative space',
    'golden ratio', 'overhead', 'flat lay', 'dutch angle', 'close-up', 'wide shot']
  if (namedCompositions.some(c => prompt.segments.composition.toLowerCase().includes(c))) score += 5

  // Color palette is defined
  if (prompt.segments.colorPalette.length > 10) score += 5

  return Math.min(score, 25)
}

// ── Composition Strength (0–25) ──────────────────────────────────────────────
function scoreCompositionStrength(prompt: GeneratedPrompt): number {
  let score = 0

  // Named composition technique present
  const namedCompositions = ['rule of thirds', 'symmetrical', 'leading lines', 'negative space',
    'golden ratio', 'overhead', 'flat lay', 'dutch angle', 'framing', 'layered depth']
  if (namedCompositions.some(c => prompt.segments.composition.toLowerCase().includes(c))) score += 10

  // Environment is contextually defined (not just 'outdoors')
  if (prompt.segments.environment.length > 15) score += 8

  // Subject is specific (more than 5 words)
  if (prompt.segments.subject.split(' ').length > 5) score += 7

  return Math.min(score, 25)
}

// ── Market Diversity (0–25) ──────────────────────────────────────────────────
function scoreMarketDiversity(prompt: GeneratedPrompt): number {
  let score = 0
  const text = [prompt.fullPrompt, prompt.segments.subject].join(' ').toLowerCase()

  // Check if prompt involves human subjects
  const humanSignals = ['person', 'people', 'man', 'woman', 'team', 'professional', 'student',
    'family', 'group', 'individual', 'worker', 'entrepreneur']
  const hasHumans = humanSignals.some(s => text.includes(s))

  if (hasHumans) {
    // Inclusive language signals
    const diversitySignals = ['diverse', 'multicultural', 'multiethnic', 'inclusive', 'mixed',
      'various ages', 'different backgrounds', 'representation']
    if (diversitySignals.some(s => text.includes(s))) score += 10

    // Non-gendered or gender-inclusive
    if (!text.includes('businessman') && !text.includes('businesswoman')) score += 4
    else score += 2

    // Age diversity signals
    if (['young adult', 'middle-aged', 'senior', 'elderly', 'millennial', 'gen z'].some(s => text.includes(s))) score += 6

    // Global/neutral cultural context (no strong regional specificity unless intentional)
    const regionalSignals = ['american', 'european', 'asian', 'african', 'latin']
    if (!regionalSignals.some(s => text.includes(s))) score += 5
    else score += 2 // Regional is ok — just slightly less universal
  } else {
    // Non-human subjects get full diversity score (no diversity concerns)
    score += 25
  }

  return Math.min(score, 25)
}
```

### 8.2 Warnings Detection

```typescript
function detectWarnings(prompt: GeneratedPrompt): string[] {
  const warnings: string[] = []
  const allText = [prompt.fullPrompt, ...Object.values(prompt.segments)].join(' ').toLowerCase()

  // Brand name detection
  if (PROHIBITED_CONTENT_KEYWORDS.some(k => allText.includes(k.toLowerCase()))) {
    warnings.push('Potential brand name detected — review before Adobe Stock submission')
  }

  // Celebrity/famous person signal
  if (CELEBRITY_SIGNALS.some(s => allText.includes(s))) {
    warnings.push('Possible reference to a recognizable person — verify model release requirements')
  }

  // Prompt detail check
  const wordCount = prompt.fullPrompt.split(' ').length
  if (wordCount < 40) {
    warnings.push(`Prompt is brief (${wordCount} words) — more detail typically produces better stock images`)
  }

  // Lighting specificity
  if (prompt.segments.lighting.length < 15) {
    warnings.push('Lighting specification is vague — add specific light source and quality descriptors')
  }

  // Negative prompt check
  if (prompt.negativePrompt.length < 20) {
    warnings.push('Negative prompt is very short — add more suppression terms for cleaner results')
  }

  return warnings
}
```

---

## 9. Variation Strategy Specification

### 9.1 The 6 Pivot Dimensions

Each pivot dimension, when it is the "primary variation" for a prompt, must push that dimension to a creative extreme relative to the other prompts in the batch. "Extreme" means: if other prompts use soft window light, the lighting-pivot prompt might use harsh neon or dramatic rembrandt. Not random — intentional creative contrast.

| Pivot | What it changes | Example contrast |
|-------|----------------|-----------------|
| `lighting` | Light source, quality, direction | Golden hour vs. studio vs. neon night |
| `composition` | Framing, angle, perspective | Wide establishing vs. extreme close-up macro |
| `mood_atmosphere` | Emotional tone, energy | Energetic dynamic vs. meditative still |
| `technical_feel` | Camera feel, depth of field | Shallow bokeh vs. deep documentary focus |
| `environment` | Setting, location, context | Studio white void vs. rich urban location |
| `color_palette` | Color grading direction | Warm vibrant vs. cool muted monochromatic |

### 9.2 Batch Strategy Examples

**Batch of 1:** No variation needed. Use balanced defaults for all dimensions.

**Batch of 3:**
```javascript
[
  { index: 1, primaryPivot: 'lighting',      directionHint: 'dramatic and directional' },
  { index: 2, primaryPivot: 'composition',   directionHint: 'wide establishing environmental' },
  { index: 3, primaryPivot: 'environment',   directionHint: 'abstract minimal studio' },
]
```

**Batch of 5:**
```javascript
[
  { index: 1, primaryPivot: 'lighting',         directionHint: 'dramatic and directional' },
  { index: 2, primaryPivot: 'composition',      directionHint: 'intimate close-up detail' },
  { index: 3, primaryPivot: 'mood_atmosphere',  directionHint: 'energetic and dynamic' },
  { index: 4, primaryPivot: 'environment',      directionHint: 'abstract minimal' },
  { index: 5, primaryPivot: 'technical_feel',   directionHint: 'cinematic shallow depth of field' },
]
```

**Batch of 10:**
```javascript
// First 6: one per pivot, first direction hint
// Next 4: restart from pivot index 0, inverted direction hint
[
  { index: 1,  primaryPivot: 'lighting',         directionHint: 'dramatic and directional' },
  { index: 2,  primaryPivot: 'composition',      directionHint: 'wide establishing environmental' },
  { index: 3,  primaryPivot: 'mood_atmosphere',  directionHint: 'energetic and dynamic' },
  { index: 4,  primaryPivot: 'technical_feel',   directionHint: 'cinematic shallow depth of field' },
  { index: 5,  primaryPivot: 'environment',      directionHint: 'rich textured real-world location' },
  { index: 6,  primaryPivot: 'color_palette',    directionHint: 'warm saturated vibrant' },
  { index: 7,  primaryPivot: 'lighting',         directionHint: 'soft and diffused' },          // inverted
  { index: 8,  primaryPivot: 'composition',      directionHint: 'intimate close-up detail' },   // inverted
  { index: 9,  primaryPivot: 'mood_atmosphere',  directionHint: 'calm and contemplative' },     // inverted
  { index: 10, primaryPivot: 'technical_feel',   directionHint: 'sharp deep-focus documentary' }, // inverted
]
```

---

## 10. Testing Strategy

All tests use **Vitest** (standard for Vite projects). Create test files in `__tests__/` directories adjacent to the files being tested.

### Test Cases — Full Specification

```typescript
// VariationStrategyEngine.test.ts
describe('VariationStrategyEngine', () => {
  test('batch of 1 returns exactly 1 strategy', () => { ... })
  test('batch of 3 returns 3 strategies with 3 distinct primaryPivots', () => { ... })
  test('batch of 5 returns 5 strategies with 5 distinct primaryPivots', () => { ... })
  test('batch of 10: all 6 pivots appear at least once', () => { ... })
  test('batch of 10: first 6 and second 4 have inverted directionHints', () => { ... })
  test('deterministic: same niche + batchSize always produces same output', () => { ... })
  test('each strategy has all required fields: index, primaryPivot, directionHint, anchoredDimensions', () => { ... })
})

// AdobeStockScorer.test.ts
describe('AdobeStockScorer', () => {
  test('score breakdown fields sum to total (allow ±1 rounding)', () => { ... })
  test('prompt with brand name in PROHIBITED list triggers warning', () => { ... })
  test('prompt with empty lighting field triggers "Missing lighting" warning', () => { ... })
  test('prompt with <40 word fullPrompt triggers "brief prompt" warning', () => { ... })
  test('prompt with all segments filled and no prohibited content scores > 60', () => { ... })
  test('total score is always 0–100 (never exceeds bounds)', () => { ... })
  test('non-human subject prompt gets full diversity score (25)', () => { ... })
  test('suggestions array is non-empty when score < 80', () => { ... })
})

// NegativePromptGenerator.test.ts
describe('NegativePromptGenerator', () => {
  test('all outputs include universal negatives (blurry, watermark, etc.)', () => { ... })
  test('portrait style context includes anatomy negatives', () => { ... })
  test('architecture style includes perspective negatives', () => { ... })
  test('nature style includes over-processing negatives', () => { ... })
  test('commercial usageContext includes brand/logo negatives in all outputs', () => { ... })
  test('DALL-E platform output is natural language (contains "Avoid:" or similar)', () => { ... })
  test('Nano Banana platform output matches expected format per platform spec', () => { ... })
})

// PlatformAdapter.test.ts
describe('PlatformAdapter', () => {
  test('returns both dalle3 and nano_banana fields', () => { ... })
  test('dalle3 variant length is under 4000 chars', () => { ... })
  test('dalle3 variant contains embedded negative (no native neg support)', () => { ... })
  test('nano_banana variant respects platform max length', () => { ... })
  test('platform: "both" generates both variants', () => { ... })
  test('platform: "dalle3" still populates nano_banana field (fallback to dalle3)', () => { ... })
})

// exportService.test.ts
describe('exportService', () => {
  test('exportBatchToCSV: output contains all required column headers', () => {
    // Required headers: variant_id, batch_id, niche, usage_context, target_platform,
    // full_prompt, dalle3_prompt, nano_banana_prompt, negative_prompt, adobe_score_total,
    // commercial_viability, technical_quality, composition_strength, market_diversity,
    // adobe_warnings, commercial_keywords, subject, composition, lighting, mood,
    // style, technical, color_palette, environment, created_at
  })
  test('exportBatchToCSV: row count equals batch.prompts.length + 1 (header)', () => { ... })
  test('exportBatchToCSV: fields containing commas are properly quoted', () => { ... })
  test('exportBatchToJSON: JSON.parse succeeds on output', () => { ... })
  test('exportBatchToJSON: parsed object has prompts array matching batch size', () => { ... })
  test('filename contains niche slug and date', () => { ... })
})
```

---

## 11. Constraints & Notes

### LLM Provider Agnosticism — Non-Negotiable

The `PromptComposerEngine` MUST receive the LLM client as a constructor parameter or via a hook/context. Never import or instantiate a specific LLM provider inside the engine. The existing provider adapter is already in the codebase — find it during Phase 0 and use its existing interface. If the existing interface needs a small extension (e.g., a `systemPrompt` parameter), extend it in a backward-compatible way.

### Performance & UX

- LLM generation for 10 prompts typically takes 15–45 seconds depending on provider and model
- Skeleton loading cards MUST appear immediately when generation starts (before the LLM call resolves)
- The UI must remain interactive during generation (user can browse history, etc.)
- Do not use blocking synchronous operations anywhere in the generation pipeline

### Error Resilience

- If LLM returns 8 valid prompts out of 10, return all 8 with a `PARTIAL_BATCH` warning displayed in the UI — do not throw
- Never crash the application on LLM failure — always show a graceful error state with a "Try Again" button
- Log errors with context (batchId, niche, error code) for debugging

### Feature Preservation

Any feature not mentioned in this plan that currently exists in the codebase must be preserved exactly as-is. If an existing feature's code is touched during refactoring and the agent is uncertain whether a change is safe, the agent should add a `// AGENT NOTE: modified for compatibility with new generator schema` comment and preserve the original behavior.

### TypeScript Strictness

Maintain the existing `tsconfig.json` strict settings. No new `@ts-ignore` or `@ts-expect-error` without a code comment immediately above it explaining exactly why it is necessary and when it should be removed.

### i18n

All user-facing strings (labels, descriptions, error messages, empty states, button text) must use i18n keys via the project's existing i18next setup. Follow the existing namespace and key naming convention found in the project.

### Nano Banana Research Requirement

`platformSpecs.ts` contains `// TODO` markers for Nano Banana platform details. The agent MUST research official Nano Banana Pro / Nano Banana 2 prompt documentation before implementing `PlatformAdapter.ts`. Search for: "Nano Banana Pro prompt guide", "Nano Banana 2 prompt syntax", "Nano Banana negative prompt". Fill in accurate specs or document inability to find authoritative sources.

---

## 12. Out of Scope (v1)

The following items are explicitly excluded from this refactor. They should be documented in the backlog but not implemented:

- Real-time streaming output from LLM (shows words as they generate)
- Server-side rendering (SSR) mode
- Multiple concurrent generation sessions
- Collaborative or shared prompt collections
- Custom model fine-tuning or LORA support
- Prompt A/B testing framework
- Advanced analytics dashboard (prompt performance over time)
- API endpoint for programmatic access
- Plugin system for custom scoring rules
- Integration with Adobe Stock API (auto-upload)
- Prompt translation for non-English stock markets
- Image preview generation (call the image API and show a preview thumbnail)

---

---

## Appendix A — LLMClientInterface Specification

The `PromptComposerEngine` depends on an LLM client injected at construction time. The agent must locate the existing provider adapter during Phase 0 and verify it satisfies this interface. If it does not, extend it in a backward-compatible way (add the missing method without breaking existing callers).

### Required Interface

```typescript
// src/features/prompt-generator/engine/LLMClientInterface.ts  (NEW — thin adapter interface)

export interface LLMClientInterface {
  /**
   * Send a two-part prompt (system + user) to the configured LLM provider.
   * Returns the raw text response as a string.
   *
   * @param systemPrompt  — Role/context instruction for the LLM
   * @param userPrompt    — The actual task/request
   * @param options       — Optional per-call overrides
   * @throws              — Reject with { code: 'LLM_TIMEOUT' | 'PROVIDER_ERROR', message: string }
   *                        on network failure, timeout, or provider error
   */
  complete(
    systemPrompt: string,
    userPrompt: string,
    options?: LLMCallOptions
  ): Promise<string>
}

export interface LLMCallOptions {
  temperature?: number     // Default: 0.9 for creative generation
  maxTokens?: number       // Default: 4096
  timeout?: number         // Default: 60000ms (60 seconds)
}
```

### Integration with Existing Adapter

```typescript
// AGENT: During Phase 0, find the existing LLM provider adapter.
//
// If the existing adapter has a method like:
//   callLLM(prompt: string): Promise<string>          ← single-string call
//   generate(messages: Message[]): Promise<string>    ← messages array call
//   complete(userPrompt: string): Promise<string>     ← user-only call
//
// Create a thin wrapper that maps it to LLMClientInterface:

export class LLMClientAdapter implements LLMClientInterface {
  constructor(private existingAdapter: ExistingAdapterType) {}

  async complete(
    systemPrompt: string,
    userPrompt: string,
    options?: LLMCallOptions
  ): Promise<string> {
    // Map to existing adapter's call pattern found during Phase 0
    // Preserve all existing behavior — only ADD the system prompt capability
    // Example mappings:
    //
    //   Single-string adapter:
    //     return this.existingAdapter.callLLM(`${systemPrompt}\n\n${userPrompt}`)
    //
    //   Messages-array adapter:
    //     return this.existingAdapter.generate([
    //       { role: 'system', content: systemPrompt },
    //       { role: 'user', content: userPrompt }
    //     ])
    //
    // Use whichever pattern matches the existing adapter.
    // Do NOT modify the existing adapter file itself.
  }
}
```

### Usage in PromptComposerEngine

```typescript
// The engine receives the client via constructor injection.
// It is wired up in usePromptGenerator.ts (Phase 7.1), not in the engine itself.

// In usePromptGenerator.ts:
const existingAdapter = useLLMProvider()  // existing hook — do not change
const llmClient = useMemo(() => new LLMClientAdapter(existingAdapter), [existingAdapter])
const engine = useMemo(() => new PromptComposerEngine({ llmClient }), [llmClient])
```

---

## Appendix B — PromptComposerEngine: mapLLMOutput & wrapError

The Phase 2 spec shows `// ... mapLLMOutput, wrapError implementations` as a placeholder. This appendix provides the full specification for both private methods.

### mapLLMOutput

```typescript
// Inside PromptComposerEngine class:

private mapLLMOutput(
  raw: LLMPromptOutput,
  index: number,
  batchId: string,
  input: GeneratorInput
): GeneratedPrompt {
  // Map snake_case LLM output to camelCase GeneratedPrompt interface.
  // At this stage (Phase 2), scoring and platform adaptation are NOT yet applied —
  // those are added in Phase 3 by calling the specialization modules.
  // Phase 2 returns prompts with placeholder/empty values for those fields,
  // which Phase 3 then fills in.

  return {
    id: crypto.randomUUID(),
    variantIndex: index + 1,
    batchId,
    segments: {
      subject:      raw.subject,
      composition:  raw.composition,
      lighting:     raw.lighting,
      mood:         raw.mood,
      style:        raw.style,
      technical:    raw.technical,
      colorPalette: raw.color_palette,
      environment:  raw.environment,
    },
    negativePrompt: raw.negative_prompt,   // LLM-provided initial value; Phase 3 enhances this
    platformVariants: {
      dalle3:       raw.full_prompt,        // Phase 3 will adapt this properly
      nano_banana:  raw.full_prompt,        // Phase 3 will adapt this properly
    },
    fullPrompt:         raw.full_prompt,
    commercialKeywords: raw.commercial_keywords,
    adobeScore: {                           // Phase 3 will replace this with real score
      total: 0,
      breakdown: { commercialViability: 0, technicalQuality: 0, compositionStrength: 0, marketDiversity: 0 },
      warnings: [],
      suggestions: [],
    },
    variationAnchors: {
      primaryVariation: raw.variation_anchors.primary_variation,
      compositionStyle:  raw.variation_anchors.composition_style,
      lightingType:      raw.variation_anchors.lighting_type,
      directionHint:     '',  // Phase 2 can leave empty; VariationStrategyEngine has this context
    },
    generatorInput: input,
    createdAt:    new Date(),
    isFavorite:   false,
    userNotes:    undefined,
    legacy:       false,
  }
}
```

### wrapError

```typescript
private wrapError(
  code: PromptGeneratorError['code'],
  cause: unknown
): PromptGeneratorError {
  const message = cause instanceof Error
    ? cause.message
    : typeof cause === 'string'
      ? cause
      : 'Unknown error'

  return { code, message }
}
```

### Phase 3 Integration: post-mapLLMOutput pipeline

After Phase 3 modules exist, update the `generate()` method to run the enrichment pipeline on each mapped prompt:

```typescript
// In PromptComposerEngine.generate(), after Step 6 (mapLLMOutput loop):

// Step 7: Enrich each prompt with Phase 3 modules
const enrichedPrompts = prompts.map(prompt => {
  // 7a. Enhance negative prompt (platform-aware)
  const negativePrompt = generateNegativePrompt(prompt, input.targetPlatform)

  // 7b. Score for Adobe Stock compliance
  const adobeScore = scorePrompt({ ...prompt, negativePrompt })

  // 7c. Adapt for target platform
  const platformVariants = adaptForPlatform(
    { ...prompt, negativePrompt, adobeScore },
    input.targetPlatform,
    negativePrompt
  )

  return {
    ...prompt,
    negativePrompt,
    adobeScore,
    platformVariants,
    fullPrompt: platformVariants.dalle3,  // Default to DALL-E as fullPrompt
  }
})

return {
  batchId,
  prompts: enrichedPrompts,
  generatorInput: parsed.data,
  generatedAt: new Date(),
}
```

---

## Appendix C — AdobeStockScorer: generateSuggestions Specification

Section 8 defines `detectWarnings()` but leaves `generateSuggestions()` unspecified. This is the function that generates actionable improvement text shown in the `AdobeScoreDisplay` UI.

```typescript
function generateSuggestions(
  prompt: GeneratedPrompt,
  breakdown: AdobeStockScoreBreakdown,
  warnings: string[]
): string[] {
  const suggestions: string[] = []

  // Suggestion logic: keyed to low sub-scores and detected warnings

  // ── Commercial Viability ─────────────────────────────────────────────────
  if (breakdown.commercialViability < 15) {
    suggestions.push(
      'Consider broadening the subject to a more universally recognizable scenario ' +
      '(e.g., "professional in a modern office" rather than a highly specific regional context).'
    )
  }
  if (!prompt.generatorInput.allowTextSpace) {
    suggestions.push(
      'Enable "Reserve copy space" to prompt for negative space — images with copy room ' +
      'command premium licensing fees from editorial and marketing buyers.'
    )
  }

  // ── Technical Quality ────────────────────────────────────────────────────
  if (breakdown.technicalQuality < 15) {
    suggestions.push(
      'Add a specific lighting setup to the prompt (e.g., "soft three-point studio lighting" ' +
      'or "warm golden hour backlight"). Lighting specificity is one of the strongest ' +
      'predictors of stock image technical quality.'
    )
  }
  if (prompt.segments.technical.length < 20) {
    suggestions.push(
      'Enrich the technical descriptor: specify depth of field (shallow vs. deep focus), ' +
      'rendering feel (cinematic, documentary, editorial), and lens character.'
    )
  }

  // ── Composition Strength ─────────────────────────────────────────────────
  if (breakdown.compositionStrength < 15) {
    suggestions.push(
      'Name a specific compositional technique (rule of thirds, leading lines, symmetry, ' +
      'negative space). Buyers and AI generators both respond better to named compositions.'
    )
  }
  if (prompt.segments.environment.length < 20) {
    suggestions.push(
      'Define the environment more precisely. "Modern open-plan office with city view" ' +
      'generates more consistent results than "office".'
    )
  }

  // ── Market Diversity ─────────────────────────────────────────────────────
  if (breakdown.marketDiversity < 15 && prompt.segments.subject.toLowerCase().match(
    /person|people|man|woman|team|professional|student|worker/
  )) {
    suggestions.push(
      'When depicting people, Adobe Stock buyers actively search for diverse representation. ' +
      'Consider adding age range, ethnicity diversity, or inclusive framing to the subject description.'
    )
  }

  // ── Warning-based suggestions ────────────────────────────────────────────
  if (warnings.some(w => w.includes('brand name'))) {
    suggestions.push(
      'Remove any brand-specific references from the prompt. Adobe Stock rejects images ' +
      'with visible trademarked content. Use generic descriptors instead ' +
      '(e.g., "smartphone" instead of a brand name).'
    )
  }

  if (warnings.some(w => w.includes('brief'))) {
    suggestions.push(
      'Expand the prompt with at least 2–3 more descriptive details across ' +
      'lighting, mood, and environment. Richer prompts produce more consistent, ' +
      'commercially viable image results.'
    )
  }

  // Cap at 4 suggestions — more than this becomes overwhelming in the UI
  return suggestions.slice(0, 4)
}
```

---

## Appendix D — SkeletonPromptCard & Error State UI Specification

These components are required by Phase 7.1 but were not specified in Phase 5. Implement them alongside or after Phase 5.

### SkeletonPromptCard

```typescript
// src/features/prompt-generator/components/PromptCard/SkeletonPromptCard.tsx
//
// Rendered immediately when generation starts, before LLM responds.
// Quantity: render exactly N skeletons matching the requested batchSize.
// Use Shadcn's Skeleton component (or equivalent animated pulse).
//
// Layout mirrors PromptCard v2 proportions:

/*
┌─────────────────────────────────────────────────────────────────┐
│ [████████████]              [████]                              │  ← header skeleton
├─────────────────────────────────────────────────────────────────┤
│ [██████]  [████████]                                            │  ← platform tabs skeleton
├─────────────────────────────────────────────────────────────────┤
│ [████████████████████████████████████████████████]             │
│ [███████████████████████████████████████]                      │  ← prompt text skeleton
│ [████████████████████████]                                      │
├─────────────────────────────────────────────────────────────────┤
│ [███████████████]  [█████████████████]  [████████████]         │  ← panel toggles skeleton
├─────────────────────────────────────────────────────────────────┤
│ [████████]                    [██████████████████]             │  ← action row skeleton
└─────────────────────────────────────────────────────────────────┘
*/

// Animation: Tailwind animate-pulse on each skeleton block.
// The entire card should have the same min-height as a real PromptCard
// to prevent layout shift when results arrive.
```

### GeneratorErrorState

```typescript
// src/features/prompt-generator/components/GeneratorErrorState/index.tsx
//
// Displayed below the form when PromptComposerEngine throws a PromptGeneratorError.
// Replaces the skeleton cards.

interface GeneratorErrorStateProps {
  error: PromptGeneratorError
  onRetry: () => void         // Re-runs the last generation with same input
}

// Layout:
/*
┌─────────────────────────────────────────────────────────────────┐
│  ⚠  [error.code translated to human-readable label]            │
│                                                                 │
│  [error message — human-readable, from i18n based on code]     │
│                                                                 │
│  [▼ Debug info]  ← collapsible, shows raw error for dev mode   │
│                                                                 │
│                              [Try Again]                        │
└─────────────────────────────────────────────────────────────────┘
*/

// Error code → human-readable i18n key mapping:
// 'LLM_TIMEOUT'    → generator.error.timeout
// 'PARSE_FAILURE'  → generator.error.parseFailed
// 'PARTIAL_BATCH'  → generator.error.partialBatch  (warning, not error — show prompts too)
// 'PROVIDER_ERROR' → generator.error.providerError
```

### PartialBatchWarning

```typescript
// For PARTIAL_BATCH errors specifically:
// Do NOT show the error state. Instead show a Banner above the prompt cards:

/*
┌─────────────────────────────────────────────────────────────────┐
│  ⚠  Received {n} of {requested} prompts — some were invalid.   │
│     The valid prompts are shown below. [Try Again] for a full   │
│     batch.                                                      │
└─────────────────────────────────────────────────────────────────┘
*/

// i18n key: generator.error.partialBatchBanner
// Props: received: number, requested: number, onRetry: () => void
```

---

## Appendix E — Complete i18n Key Reference

This is the exhaustive list of all new i18n keys introduced in this refactor. All keys must be present in every locale file. Non-primary locales may use English text with a `// TODO: translate` comment.

### Form keys (Phase 4)

```
generator.form.usageContext.label             = "Usage Context"
generator.form.usageContext.description       = "How these images will be licensed"
generator.form.usageContext.options.commercial = "Commercial"
generator.form.usageContext.options.editorial  = "Editorial"
generator.form.usageContext.options.conceptual = "Conceptual / Abstract"
generator.form.usageContext.options.abstract   = "Pure Abstract"

generator.form.targetPlatform.label            = "Target Generator"
generator.form.targetPlatform.options.both      = "Both Platforms"
generator.form.targetPlatform.options.dalle3    = "DALL-E 3 / GPT Image 2"
generator.form.targetPlatform.options.nano_banana = "Nano Banana Pro / 2"

generator.form.includeDiversity.label         = "Diverse Representation"
generator.form.includeDiversity.description   = "Encourage age, ethnicity, and gender diversity in human subjects"

generator.form.allowTextSpace.label           = "Reserve Copy Space"
generator.form.allowTextSpace.description     = "Leave negative space suitable for text overlay — increases commercial value"

generator.form.advancedOptions.toggle         = "Advanced Options"
generator.form.advancedOptions.toggleClose    = "Hide Advanced Options"

generator.form.targetMarket.label             = "Target Market"
generator.form.targetMarket.options.global     = "Global (Universal)"
generator.form.targetMarket.options.us         = "North America"
generator.form.targetMarket.options.eu         = "Europe"
generator.form.targetMarket.options.asia       = "Asia Pacific"
generator.form.targetMarket.options.latin_america = "Latin America"

generator.form.moodPreference.label           = "Mood Preference (optional)"
generator.form.moodPreference.placeholder     = "e.g. calm, dramatic, energetic, playful…"
```

### Output / PromptCard keys (Phase 5)

```
generator.output.variantLabel                 = "Variant {{index}} of {{total}}"
generator.output.platform.dalle3              = "DALL-E 3"
generator.output.platform.nano_banana         = "Nano Banana"
generator.output.copyPrompt                   = "Copy Prompt"
generator.output.copied                       = "Copied!"
generator.output.favorite                     = "Favorite"
generator.output.unfavorite                   = "Remove Favorite"
generator.output.regenerateVariant            = "Regenerate This Variant"
generator.output.regenerating                 = "Regenerating…"

generator.output.segments.toggle              = "Photography Segments"
generator.output.segments.subject             = "Subject"
generator.output.segments.composition         = "Composition"
generator.output.segments.lighting            = "Lighting"
generator.output.segments.mood                = "Mood"
generator.output.segments.style               = "Style"
generator.output.segments.technical           = "Technical"
generator.output.segments.colorPalette        = "Color Palette"
generator.output.segments.environment         = "Environment"
generator.output.segments.copySegment         = "Copy"
generator.output.segments.legacyNotice        = "Segments not available for legacy prompts"

generator.output.negativePrompt.toggle        = "Negative Prompt"
generator.output.negativePrompt.copy          = "Copy"
generator.output.negativePrompt.explanation   = "These descriptors are sent to the AI generator to suppress unwanted visual elements"

generator.output.keywords.toggle              = "Stock Keywords"
generator.output.keywords.copy                = "Copy All Keywords"
generator.output.keywords.copyOne             = "Copy"

generator.output.adobeScore.badge             = "Adobe Score"
generator.output.adobeScore.badgeLegacy       = "Unscored"
generator.output.adobeScore.total             = "{{score}}/100"
generator.output.adobeScore.breakdown.commercialViability  = "Commercial Viability"
generator.output.adobeScore.breakdown.technicalQuality     = "Technical Quality"
generator.output.adobeScore.breakdown.compositionStrength  = "Composition Strength"
generator.output.adobeScore.breakdown.marketDiversity      = "Market Diversity"
generator.output.adobeScore.warnings.title    = "Compliance Warnings"
generator.output.adobeScore.suggestions.title = "Improvement Suggestions"
generator.output.adobeScore.legacyNotice      = "Score not available for legacy prompts"

generator.output.legacy.badge                 = "Legacy"
```

### Batch action keys (Phase 5)

```
generator.batch.summary                       = "{{count}} prompt generated for: {{niche}}"
generator.batch.summary_plural                = "{{count}} prompts generated for: {{niche}}"
generator.batch.exportCSV                     = "Export CSV"
generator.batch.exportJSON                    = "Export JSON"
generator.batch.saveAll                       = "Save All to History"
generator.batch.saved                         = "Saved to History"
```

### Error & loading state keys (Appendix D)

```
generator.loading.generating                  = "Generating {{count}} prompt…"
generator.loading.generating_plural           = "Generating {{count}} prompts…"

generator.error.timeout.title                 = "Request Timed Out"
generator.error.timeout.message               = "The AI provider took too long to respond. Check your connection and try again."

generator.error.parseFailed.title             = "Unexpected Response"
generator.error.parseFailed.message           = "The AI returned an unreadable response. This sometimes happens with complex prompts — try again or simplify your niche."
generator.error.parseFailed.debugToggle       = "Show raw response (debug)"

generator.error.partialBatch.title            = "Partial Result"
generator.error.partialBatch.message          = "Received {{received}} of {{requested}} prompts — some were invalid. Valid prompts are shown below."

generator.error.providerError.title           = "Provider Error"
generator.error.providerError.message         = "Your AI provider returned an error. Verify your API key and provider settings."

generator.error.retryButton                   = "Try Again"
```

### History & export keys (Phase 6)

```
generator.history.legacyBadge                 = "Legacy"
generator.history.legacyTooltip               = "This prompt was generated before v2 — some details are unavailable"
generator.history.empty                       = "No prompts yet. Generate your first batch above."
generator.history.favoritesEmpty              = "No favorites yet. Heart any prompt to save it here."
generator.history.deletePrompt               = "Delete Prompt"
generator.history.deleteBatch                = "Delete Entire Batch"
generator.history.confirmDelete              = "Are you sure? This cannot be undone."

generator.export.csvFilename                 = "promptforge-{{niche}}-{{date}}.csv"
generator.export.jsonFilename                = "promptforge-{{niche}}-{{date}}.json"
generator.export.success                     = "Export downloaded successfully"
```

---

## Appendix F — Phase Dependency Graph

```
Phase 0 (Audit)
    │
    ├──→ Phase 1 (Foundation)
    │         │
    │         ├──→ Phase 2 (Core Engine)
    │         │         │
    │         │         └──→ Phase 3 (Specialization Modules)
    │         │                   │
    │         └──→ Phase 4 (Input UX)
    │                             │
    │                             └──→ Phase 5 (Output UI)
    │                                       │
    │                                       └──→ Phase 6 (History & Export)
    │                                                 │
    └─────────────────────────────────────────────────┴──→ Phase 7 (Integration & QA)
```

Phases 3 and 4 can be worked in parallel if two agents are available. All others are sequential.

---

*Plan version: 2.0 (complete)*  
*Repository: `pyforgedev/promptforge`*  
*License: MIT*  
*Last updated: 2026-06-18*  
*Prepared by: Claude Sonnet 4.6 (Anthropic)*

> **For contributors**: This plan is the authoritative implementation reference for the v2 generator refactor. If you are picking up a phase, start by reading Sections 1–5 in full, then read only the phase you are implementing. Check the Phase 0 audit notes (committed by the first agent) before making any structural changes.