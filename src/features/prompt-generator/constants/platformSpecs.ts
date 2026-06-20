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
    maxPromptLength: 2000,
    supportsNegativePrompt: true,
    negativePromptFormat: 'separate_field',
    promptStyle: 'natural_language',
    notes: 'Optimize for Nano Banana. Max 2000 characters, supports separate negative prompt.',
  },
}
