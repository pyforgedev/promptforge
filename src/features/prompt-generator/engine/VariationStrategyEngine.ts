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

import type { VariationStrategy, VariationPivot, GeneratorInput } from '../types'

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
  const { batchSize } = input
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
      anchoredDimensions: buildAnchoredDimensions(pivot, i),
    })
  }

  return strategies
}

function buildAnchoredDimensions(
  pivot: VariationPivot,
  index: number
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
