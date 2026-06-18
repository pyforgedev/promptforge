// PlatformAdapter — adapts GeneratedPrompt for DALL-E 3 and Nano Banana platforms.
// Phase 3.3.
// AGENT NOTE: Nano Banana Pro / Nano Banana 2 official prompt documentation was not
// found at the time of implementation. The nano_banana adapter uses conservative
// defaults (natural language, comma-separated negatives, 2000 char limit).
// TODO: Verify nano_banana maxPromptLength, negative prompt format, and weighted
// tag syntax against official Nano Banana documentation when available.

import type { GeneratedPrompt, ImagePlatform, PlatformVariants } from '../types'
import { PLATFORM_SPECS } from '../constants/platformSpecs'

const CAMERA_BRAND_PATTERN =
  /\b(canon|nikon|sony|fujifilm|leica|hasselblad|pentax|olympus|panasonic)\b/gi

function stripCameraBrands(text: string): string {
  return text.replace(CAMERA_BRAND_PATTERN, '')
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3).trimEnd() + '...'
}

function buildDalle3Prompt(prompt: GeneratedPrompt, negativePrompt: string): string {
  const spec = PLATFORM_SPECS['dalle3']

  const cleaned = stripCameraBrands(prompt.fullPrompt)

  const dalleNegative = negativePrompt.startsWith('Avoid:')
    ? negativePrompt
    : `Avoid: ${negativePrompt}`

  const assembled = `${cleaned.trimEnd()} ${dalleNegative}`.trim()

  return truncate(assembled, spec.maxPromptLength)
}

function buildNanaBananaPrompt(prompt: GeneratedPrompt): string {
  const spec = PLATFORM_SPECS['nano_banana']

  // TODO: If Nano Banana supports weighted tags (e.g., "term:1.5"), apply them here.
  // For now, use natural language identical to the full prompt.
  const base = prompt.fullPrompt.trim()

  // Nano Banana supports native negative prompts (separate field),
  // so we do NOT embed the negative into the positive prompt.
  // The negativePrompt string is stored on GeneratedPrompt.negativePrompt and callers
  // should send it to the platform's negative prompt field directly.
  // Here we just ensure the positive prompt is within spec length.

  return truncate(base, spec.maxPromptLength)
}

export function adaptForPlatform(
  prompt: GeneratedPrompt,
  _targetPlatform: ImagePlatform,
  negativePrompt: string,
): PlatformVariants {
  const dalle3 = buildDalle3Prompt(prompt, negativePrompt)
  const nano_banana = buildNanaBananaPrompt(prompt)

  return { dalle3, nano_banana }
}
