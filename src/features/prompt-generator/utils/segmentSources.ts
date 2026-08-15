import type { DualModeField, GeneratorInput, PromptSegments } from '../types'

export type SegmentSource = 'user' | 'ai'
export type SegmentSources = Record<keyof PromptSegments, SegmentSource>

function preferenceSource(field: DualModeField<string>): SegmentSource {
  return field.mode === 'user' && field.value !== 'none' ? 'user' : 'ai'
}

export function deriveSegmentSources(input: GeneratorInput): SegmentSources {
  return {
    subject: preferenceSource(input.humanModel),
    composition: 'ai',
    lighting: 'ai',
    mood: preferenceSource(input.mood),
    style: preferenceSource(input.artStyle),
    technical: 'ai',
    colorPalette: preferenceSource(input.colorPalette),
    environment: preferenceSource(input.background),
  }
}
