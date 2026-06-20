# Investigation Plan: Prompt Generator Load States & Batch Generation Failures

This plan outlines the diagnostics, root causes, and recommended solutions for the following issues:
1. **Skeleton loading state** only showing when prompt batch size is set to 10.
2. **Batch prompt generation** failing or being buggy when generating batch sizes of 3 and 5, while succeeding at 10.

---

## Goal
Diagnose and resolve the lack of skeleton loader feedback for batch sizes 1, 3, and 5, and resolve failure rates/bugs in generating batches of 3 and 5 prompts.

---

## Context
- **V2 Generator Feature**: Composed of `PromptComposerEngine`, `GenerationService`, `usePromptGeneratorStore`, `GeneratorForm`, and `PromptResultsDisplay`.
- **Loading Behavior**: Controlled by `isGenerating` and `batch` in `PromptResultsDisplay.tsx`.
- **Generation Logic**: Leverages `PromptComposerEngine` to construct a variation matrix, prompt the LLM, and parse JSON outputs containing prompt batches.

---

## Requirements Breakdown

### 1. Skeleton Loading Investigation
- **Must-have**: Identify why loading state is bypassed/invisible for batch sizes 1, 3, 5.
- **Should-have**: Ensure consistency across all batch sizes (1, 3, 5, 10).
- **Out-of-scope**: Rewriting the entire UI render loop of results.

### 2. Batch Prompt Generation Investigation
- **Must-have**: Pinpoint why LLM response parsing or request generation fails specifically for batch sizes 3 and 5.
- **Should-have**: Inspect Zod validation, token limits, parser robustness, and prompt instruction discrepancies.
- **Out-of-scope**: Rewriting the underlying AI service or mock APIs.

---

## Phases

### Phase 1: Diagnostics (Sequential)

#### Step 1.1: Loading State Tracing
- **Action**: Inspect `PromptResultsDisplay.tsx` line 87:
  ```typescript
  if (isGenerating && !batch) { ... }
  ```
- **Hypothesis**: When `generatePrompts` is called:
  - If a previous `batch` exists in the Zustand store (e.g. from hydration or a previous run), `!batch` evaluates to `false`, preventing the loading skeleton from displaying.
  - Why does it display for 10? If the batch of 10 succeeded, does it persist? Or does selecting 10 clear the batch first? Or is `batch` explicitly cleared/reset when selecting 10 but not when selecting other sizes?
  - Let's check `GeneratorForm.tsx` select handlers:
    ```typescript
    onValueChange={(v) => setInput({ batchSize: Number(v) as BatchSize })}
    ```
    Changing `batchSize` does not call `clearBatch()`.
  - Let's verify why it behaves differently specifically for 10. For instance, does batch size 10 fail or get parsed differently, leading to `batch` being `null` or cleared? If the generation of 10 succeeded, does the next generation display a skeleton?
- **Security Check**: No credentials or private tokens are accessed.

#### Step 1.2: Engine & LLM Response Inspection
- **Action**: Analyze `PromptComposerEngine.ts` output constraints and parsing logic:
  - Check how `maxTokens` is computed (line 53):
    ```typescript
    const maxTokens = Math.max(2048, batchSize * 800)
    ```
    For batch size 3: `3 * 800 = 2400` max tokens.
    For batch size 5: `5 * 800 = 4000` max tokens.
    For batch size 10: `10 * 800 = 8000` max tokens.
  - **Hypothesis**: The LLM prompt asks for exactly `input.batchSize` prompts, but the generated JSON output might exceed the `maxTokens` limit if the tokens per prompt exceed 800. If the output is truncated, the JSON parsing fails (`jsonEnd = raw.lastIndexOf('}')` will find an incomplete/mismatched bracket or fail entirely), causing `parseResponse` to return `null`.
  - **Why does 10 succeed?** 8000 tokens is a large context window. The LLM has ample room to output 10 prompts without truncation. However, for 3 or 5, the limit of 2400 or 4000 tokens may be too low if the LLM output is verbose, leading to truncation.
  - Another hypothesis: Variation matrix alignment or LLM instructions for batch sizes 3 and 5 are structured differently, or Zod validation fails. Let's check `VariationStrategyEngine.ts` and `MetaPromptBuilder.ts` to see if the engine produces structured schemas that fail Zod validation for 3 and 5.

---

### Phase 2: Hypothesis Verification & Code Review

#### Case 1: Skeleton Loading Missing
1. **Verification**: Verify if `batch` is set to `null` on new generation calls.
   - Look at `promptGeneratorStore.ts` line 46:
     ```typescript
     generatePrompts: async () => {
       if (get().isGenerating) return
       set({ isGenerating: true, error: null })
       ...
     ```
     Notice that `set({ batch: data, error, isGenerating: false })` is called at the end, but the store **does not clear `batch`** at the beginning of `generatePrompts`.
     Thus, `batch` remains populated with the previous results while `isGenerating` is `true`.
   - In `PromptResultsDisplay.tsx` line 87:
     ```typescript
     if (isGenerating && !batch) { ... }
     ```
     Because `batch` is NOT null, the loading state is bypassed, and the old prompts remain on screen until the new ones arrive.
   - **Why did it show for 10?** If batch size 10 was selected and it succeeded, or if generation of 10 previously failed, `batch` became `null` (since a failure sets `batch` to `null` or raw error resets it, or `removePromptsFromBatch` cleared it). If the previous run failed (e.g. timeout/parse failure), `batch` was `null`, so the skeleton loader displayed. If it succeeded, subsequent generations of size 10 also would not show the skeleton.
   - **Recommendation**: Set `batch: null` at the start of `generatePrompts` (or conditionally clear it if changing search parameters) to guarantee the loader displays on every generation attempt.

#### Case 2: Batch Generation Failures for 3 and 5
1. **Verification**: Verify LLM response truncation and parsing errors.
   - Check if `maxTokens` calculations for 3 (2400 tokens) and 5 (4000 tokens) are insufficient to output the complex JSON containing all segments, negative prompts, commercial keywords, and compliance notes.
   - A single prompt contains:
     - `subject` (vivid)
     - `composition`
     - `lighting`
     - `mood`
     - `style`
     - `technical`
     - `color_palette`
     - `environment`
     - `negative_prompt`
     - `full_prompt` (minimum 60 words)
     - `commercial_keywords` (10-15 keywords)
     - `adobe_compliance_notes`
     - JSON wrapping (braces, keys, quotes)
   - Estimated token size per prompt: ~400–600 tokens. With reasoning overhead or verbosity from certain models, 3 prompts can easily approach 2000+ tokens, causing truncation at 2400. 5 prompts can exceed 3000+ tokens, causing truncation at 4000.
   - **Why does 10 succeed?** 8000 tokens is generous enough to prevent truncation.
   - **Recommendation**: Increase the baseline token limit or scale token limits more conservatively (e.g., `Math.max(4000, batchSize * 1000)`).

---

## Risks & Mitigations
- **Risk**: Clearing the batch on load might disrupt UX if the user wanted to keep seeing the old prompts until the new ones were ready.
  - *Mitigation*: If we want to keep the old prompts visible, we should display a spinner overlay on top of the old results or disable the submit button with a progress bar, instead of showing a skeleton. However, the design specification asks for the skeleton loading state to display. Therefore, clearing `batch` at the start of generation is the direct fix for the skeleton.
- **Risk**: Increasing `maxTokens` too high might incur higher latency or cost.
  - *Mitigation*: Optimize the system prompt instructions to demand concise JSON properties where appropriate, or set a safer, balanced default like `4096` tokens minimum.

---

## Success Criteria
1. The skeleton loading state is consistently displayed when generating prompts, regardless of the chosen batch size (1, 3, 5, or 10).
2. Prompt generation for batch sizes of 3 and 5 successfully completes and parses without Zod parsing failures or JSON truncation errors.
