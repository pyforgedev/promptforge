## Goal
Integrate target platform optimizations (`dalle3` / `nano_banana` / `both`) and conditional generation toggles (Negative Prompts and Stock Keywords) into the PromptForge generator pipeline and UI. Ensure these constraints restrict token consumption on the LLM request side and modify the output presentation on the UI side.

## Context
PromptForge runs a React + TypeScript frontend with a composer engine:
- `PromptComposerEngine.ts` maps input parameters, queries the LLM, and produces the generated prompts.
- `MetaPromptBuilder.ts` formats the LLM instructions.
- `PlatformAdapter.ts` maps the output formats for each platform variant.
- `GeneratorForm.tsx` controls the inputs and parameters.
- `PromptCard.tsx` manages variant display (tabs, labels, badges).
- Localization is supported via `translation.json` in English (`en`) and Indonesian (`id`).

Currently, the engine requests both DALL-E 3 and Nano Banana representations regardless of selection, and always generates negative prompts and keywords. The requested optimization will limit LLM instructions/generation to only the selected platform, bypass unnecessary formatting/adaptation, and skip negative prompts or stock keywords when toggled off.

## Requirements Breakdown

### 1. Target Platform Refinement
- **LLM request**: If `targetPlatform` is `dalle3` or `nano_banana`, update `MetaPromptBuilder.build()` to instruct the LLM to output only that specific platform's version inside the JSON schema (`full_prompt`). For `both`, keep the behavior of building/returning both formats.
- **Output Schema Validation**: Update `llmPromptOutputSchema` and custom types in `src/features/prompt-generator/types/index.ts` to allow empty or undefined values where applicable when only one platform is targetted.
- **Platform Adaptation**: Update `PlatformAdapter.ts` so `adaptForPlatform` only runs the processing steps for the selected platform (or both if `both` is chosen).
- **UI Display / Badge**:
  - Add a visible badge in `PromptCard.tsx` reading "Optimized for DALL-E" or "Optimized for Nano Banana" when the generator input targets only one platform.
  - Hide or restrict tabs when a specific platform is chosen, showing only the active target platform variant, while keeping tabs available for the `both` option.

### 2. Negative Prompts & Stock Keywords Toggle
- **UI Toggles**: Add two new toggles in `GeneratorForm.tsx` (using the `Switch` component):
  - "Include Negative Prompts" (maps to `includeNegativePrompts` boolean, default: true)
  - "Include Stock Keywords" (maps to `includeKeywords` boolean, default: true)
- **State Management**:
  - Update `GeneratorInput` interface in `types/index.ts` to include `includeNegativePrompts` and `includeKeywords`.
  - Update `generatorInputSchema` and `generatorInputDefaults` in `generatorInputSchema.ts` to reflect the new properties.
- **LLM Prompt Modification**:
  - If `includeNegativePrompts` is false: instruct the LLM in `MetaPromptBuilder.ts` to exclude negative prompt generation. Update `NegativePromptGenerator.ts` to skip processing and return an empty string.
  - If `includeKeywords` is false: instruct the LLM in `MetaPromptBuilder.ts` to omit stock keywords. Update `PromptComposerEngine.ts` mapping to handle missing/empty keyword arrays.
- **UI Updates**:
  - In `PromptCard.tsx`, hide the negative prompt panel and/or keywords panel entirely if they are absent or marked disabled in the generated output.
- **Localization**:
  - Add English and Bahasa Indonesia strings for the toggles and the target platform badges to `public/locales/en/translation.json` and `public/locales/id/translation.json`.

---

## Phases

### Phase 1: Data Model & Schema Updates (Sequential)
- Update `GeneratorInput` and related interfaces in `src/features/prompt-generator/types/index.ts`.
- Update `generatorInputSchema` and `generatorInputDefaults` in `src/features/prompt-generator/schemas/generatorInputSchema.ts`.
- Update JSON schema outputs and types in `src/features/prompt-generator/schemas/generatedPromptSchema.ts` (making `negative_prompt` and `commercial_keywords` optional/nullable).
- **Security Check**: Verify schema validation is strict enough to reject malformed LLM responses but handles missing fields gracefully when options are turned off.

### Phase 2: Engine & Builder Updates (Sequential)
- Modify `src/features/prompt-generator/engine/MetaPromptBuilder.ts`:
  - Dynamically alter instructions in the `SYSTEM_PROMPT` or `userPrompt` construction based on the flags: `includeNegativePrompts`, `includeKeywords`, and `targetPlatform`.
  - If target is a single platform, instruct LLM to output only that variant.
  - If toggles are off, instruct LLM to return empty arrays/strings for those properties.
- Modify `src/features/prompt-generator/engine/PromptComposerEngine.ts`:
  - Condition `generateNegativePrompt()` execution on `validInput.includeNegativePrompts`. If false, bypass and assign empty string.
  - Clean up double initialization of `platformVariants` highlighted in the audit (`mapLLMOutput` redundant properties).
- Modify `src/features/prompt-generator/engine/PlatformAdapter.ts`:
  - Update `adaptForPlatform` to return empty representations for the non-targeted platform, avoiding processing brand names/limits on non-selected targets.

### Phase 3: Localization (Parallel)
- Add entries for:
  - English: `generator.form.includeNegativePrompts.label`, `generator.form.includeNegativePrompts.description`, `generator.form.includeKeywords.label`, `generator.form.includeKeywords.description`, `promptCard.optimizedFor`
  - Indonesian: `generator.form.includeNegativePrompts.label`, `generator.form.includeNegativePrompts.description`, `generator.form.includeKeywords.label`, `generator.form.includeKeywords.description`, `promptCard.optimizedFor`
- Files:
  - `public/locales/en/translation.json`
  - `public/locales/id/translation.json`

### Phase 4: UI Refinement (Sequential)
- Modify `src/features/prompt-generator/components/GeneratorForm.tsx`:
  - Inject the two new switches into the form component.
  - Bind switches to `usePromptGeneratorStore` inputs.
- Modify `src/features/prompt-generator/components/PromptCard.tsx`:
  - Conditionally render the negative prompts panel if `negativePrompt` is present and was requested.
  - Conditionally render the keywords panel if `commercialKeywords` is present, not empty, and was requested.
  - If `targetPlatform` is specific (`dalle3` or `nano_banana`), render a badge "Optimized for [Platform]" next to the variant indices and disable the platform selector tab switcher (only render the selected one).

---

## Risks & Mitigations
- **Risk**: LLM output parsing fails when schema shape changes depending on toggles (e.g. omitting keywords).
  - *Mitigation*: Schema parser (`llmPromptOutputSchema`) should use `.catch()` or default to empty values (e.g., empty array `[]` or empty string `""`) so JSON validations do not break the engine.
- **Risk**: User switches target platform, but stored templates/history miss properties.
  - *Mitigation*: Ensure fallback checks exist in UI (`PromptCard.tsx`) so old prompts lacking certain platforms/properties render safely.

---

## Open Questions
- *None.* The audit files and request provide clear structural directions.

---

## Success Criteria
1. Selecting `dalle3` only calls/saves/displays DALL-E 3 variants. The UI card shows the "Optimized for DALL-E" badge and suppresses platform selection tabs.
2. Selecting `nano_banana` only calls/saves/displays Nano Banana variants. The UI card shows the "Optimized for Nano Banana" badge and suppresses platform selection tabs.
3. Turning off "Negative Prompts" excludes them from LLM instructions, avoids formatting, and hides the panel in the UI.
4. Turning off "Stock Keywords" excludes them from LLM instructions, maps safely in schema, and hides the keywords panel in the UI.
5. All localized texts correctly display in English and Indonesian.
