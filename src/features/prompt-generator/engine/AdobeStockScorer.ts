// AdobeStockScorer — scores GeneratedPrompt for Adobe Stock commercial compliance.
// Phase 3.2. Full algorithm per plan Section 8.

import type { GeneratedPrompt, AdobeStockScore, AdobeStockScoreBreakdown } from '../types'
import {
  PROHIBITED_CONTENT_KEYWORDS,
  CELEBRITY_SIGNALS,
} from '../constants/adobeStockGuidelines'

function buildAllText(prompt: GeneratedPrompt): string {
  return [
    prompt.fullPrompt,
    prompt.segments.subject,
    prompt.segments.composition,
    prompt.segments.lighting,
    prompt.segments.mood,
    prompt.segments.style,
    prompt.segments.technical,
    prompt.segments.colorPalette,
    prompt.segments.environment,
  ]
    .join(' ')
    .toLowerCase()
}

function scoreCommercialViability(prompt: GeneratedPrompt, allText: string): number {
  let score = 0

  const universalThemes = [
    'business', 'professional', 'lifestyle', 'wellness', 'technology',
    'nature', 'family', 'education', 'healthcare', 'food', 'travel', 'work', 'team',
  ]
  if (universalThemes.some((t) => allText.includes(t))) score += 10

  const hasProhibited = PROHIBITED_CONTENT_KEYWORDS.some((k) => allText.includes(k.toLowerCase()))
  if (!hasProhibited) score += 8

  if (
    prompt.generatorInput.allowTextSpace ||
    allText.includes('negative space') ||
    allText.includes('copy space')
  ) {
    score += 4
  }

  const trending = [
    'sustainability', 'remote work', 'mental health', 'diversity',
    'innovation', 'ai', 'climate',
  ]
  if (trending.some((t) => allText.includes(t))) score += 3

  return Math.min(score, 25)
}

function scoreTechnicalQuality(prompt: GeneratedPrompt): number {
  let score = 0

  const lightingQualityWords = [
    'softbox', 'golden hour', 'rembrandt', 'diffused', 'backlit',
    'side lighting', 'three-point', 'overcast', 'neon', 'candlelight', 'studio',
  ]
  if (lightingQualityWords.some((w) => prompt.segments.lighting.toLowerCase().includes(w))) {
    score += 8
  }

  if (prompt.segments.technical.length > 20) score += 7

  const namedCompositions = [
    'rule of thirds', 'symmetrical', 'leading lines', 'negative space',
    'golden ratio', 'overhead', 'flat lay', 'dutch angle', 'close-up', 'wide shot',
  ]
  if (namedCompositions.some((c) => prompt.segments.composition.toLowerCase().includes(c))) {
    score += 5
  }

  if (prompt.segments.colorPalette.length > 10) score += 5

  return Math.min(score, 25)
}

function scoreCompositionStrength(prompt: GeneratedPrompt): number {
  let score = 0

  const namedCompositions = [
    'rule of thirds', 'symmetrical', 'leading lines', 'negative space',
    'golden ratio', 'overhead', 'flat lay', 'dutch angle', 'framing', 'layered depth',
  ]
  if (namedCompositions.some((c) => prompt.segments.composition.toLowerCase().includes(c))) {
    score += 10
  }

  if (prompt.segments.environment.length > 15) score += 8

  if (prompt.segments.subject.split(' ').length > 5) score += 7

  return Math.min(score, 25)
}

function scoreMarketDiversity(prompt: GeneratedPrompt): number {
  let score = 0
  const text = [prompt.fullPrompt, prompt.segments.subject].join(' ').toLowerCase()

  const humanSignals = [
    'person', 'people', 'man', 'woman', 'team', 'professional', 'student',
    'family', 'group', 'individual', 'worker', 'entrepreneur',
  ]
  const hasHumans = humanSignals.some((s) => text.includes(s))

  if (hasHumans) {
    const diversitySignals = [
      'diverse', 'multicultural', 'multiethnic', 'inclusive', 'mixed',
      'various ages', 'different backgrounds', 'representation',
    ]
    if (diversitySignals.some((s) => text.includes(s))) score += 10

    if (!text.includes('businessman') && !text.includes('businesswoman')) score += 4
    else score += 2

    const ageSignals = ['young adult', 'middle-aged', 'senior', 'elderly', 'millennial', 'gen z']
    if (ageSignals.some((s) => text.includes(s))) score += 6

    const regionalSignals = ['american', 'european', 'asian', 'african', 'latin']
    if (!regionalSignals.some((s) => text.includes(s))) score += 5
    else score += 2
  } else {
    score += 25
  }

  return Math.min(score, 25)
}

function detectWarnings(prompt: GeneratedPrompt, allText: string): string[] {
  const warnings: string[] = []

  if (PROHIBITED_CONTENT_KEYWORDS.some((k) => allText.includes(k.toLowerCase()))) {
    warnings.push('Potential brand name detected — review before Adobe Stock submission')
  }

  if (CELEBRITY_SIGNALS.some((s) => allText.includes(s))) {
    warnings.push('Possible reference to a recognizable person — verify model release requirements')
  }

  const wordCount = prompt.fullPrompt.split(' ').length
  if (wordCount < 40) {
    warnings.push(`Prompt is brief (${wordCount} words) — more detail typically produces better stock images`)
  }

  if (prompt.segments.lighting.length < 15) {
    warnings.push('Lighting specification is vague — add specific light source and quality descriptors')
  }

  if (prompt.negativePrompt.length < 20) {
    warnings.push('Negative prompt is very short — add more suppression terms for cleaner results')
  }

  return warnings
}

function generateSuggestions(
  prompt: GeneratedPrompt,
  breakdown: AdobeStockScoreBreakdown,
  warnings: string[],
): string[] {
  const suggestions: string[] = []

  if (breakdown.commercialViability < 15) {
    suggestions.push(
      'Consider broadening the subject to a more universally recognizable scenario ' +
        '(e.g., "professional in a modern office" rather than a highly specific regional context).',
    )
  }
  if (!prompt.generatorInput.allowTextSpace) {
    suggestions.push(
      'Enable "Reserve copy space" to prompt for negative space — images with copy room ' +
        'command premium licensing fees from editorial and marketing buyers.',
    )
  }

  if (breakdown.technicalQuality < 15) {
    suggestions.push(
      'Add a specific lighting setup to the prompt (e.g., "soft three-point studio lighting" ' +
        'or "warm golden hour backlight"). Lighting specificity is one of the strongest ' +
        'predictors of stock image technical quality.',
    )
  }
  if (prompt.segments.technical.length < 20) {
    suggestions.push(
      'Enrich the technical descriptor: specify depth of field (shallow vs. deep focus), ' +
        'rendering feel (cinematic, documentary, editorial), and lens character.',
    )
  }

  if (breakdown.compositionStrength < 15) {
    suggestions.push(
      'Name a specific compositional technique (rule of thirds, leading lines, symmetry, ' +
        'negative space). Buyers and AI generators both respond better to named compositions.',
    )
  }
  if (prompt.segments.environment.length < 20) {
    suggestions.push(
      'Define the environment more precisely. "Modern open-plan office with city view" ' +
        'generates more consistent results than "office".',
    )
  }

  if (
    breakdown.marketDiversity < 15 &&
    prompt.segments.subject.toLowerCase().match(/person|people|man|woman|team|professional|student|worker/)
  ) {
    suggestions.push(
      'When depicting people, Adobe Stock buyers actively search for diverse representation. ' +
        'Consider adding age range, ethnicity diversity, or inclusive framing to the subject description.',
    )
  }

  if (warnings.some((w) => w.includes('brand name'))) {
    suggestions.push(
      'Remove any brand-specific references from the prompt. Adobe Stock rejects images ' +
        'with visible trademarked content. Use generic descriptors instead ' +
        '(e.g., "smartphone" instead of a brand name).',
    )
  }

  if (warnings.some((w) => w.includes('brief'))) {
    suggestions.push(
      'Expand the prompt with at least 2–3 more descriptive details across ' +
        'lighting, mood, and environment. Richer prompts produce more consistent, ' +
        'commercially viable image results.',
    )
  }

  return suggestions.slice(0, 4)
}

export function scorePrompt(prompt: GeneratedPrompt): AdobeStockScore {
  const allText = buildAllText(prompt)

  const breakdown: AdobeStockScoreBreakdown = {
    commercialViability: scoreCommercialViability(prompt, allText),
    technicalQuality: scoreTechnicalQuality(prompt),
    compositionStrength: scoreCompositionStrength(prompt),
    marketDiversity: scoreMarketDiversity(prompt),
  }

  const total = Object.values(breakdown).reduce((a, b) => a + b, 0)
  const warnings = detectWarnings(prompt, allText)
  const suggestions = generateSuggestions(prompt, breakdown, warnings)

  return { total, breakdown, warnings, suggestions }
}
