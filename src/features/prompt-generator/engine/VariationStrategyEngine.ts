import type { GeneratorInput, DualModeField } from '../types'
import { MOOD_OPTIONS, COLOR_PALETTE_OPTIONS, BACKGROUND_OPTIONS } from '../types'

export type DimensionStatus = 'pinned' | 'excluded' | 'free'

export type PoolDimension =
  | 'lighting'
  | 'camera_angle'
  | 'composition'
  | 'background'
  | 'color_palette'
  | 'mood'
  | 'technical'
  | 'subject_pose'

const FULL_POOL: PoolDimension[] = [
  'lighting',
  'camera_angle',
  'composition',
  'background',
  'color_palette',
  'mood',
  'technical',
  'subject_pose',
]

export function resolveStatus(field: DualModeField<string>): DimensionStatus {
  if (field.mode === 'system') return 'free'
  const f = field as { mode: 'user'; value: string }
  if (f.value === 'none' || f.value === 'no_people') return 'excluded'
  return 'pinned'
}

export interface VariationPlan {
  availablePool: PoolDimension[]
  dimensionsToVary: PoolDimension[]
  numToVary: number
  moodStatus: DimensionStatus
  colorPaletteStatus: DimensionStatus
  backgroundStatus: DimensionStatus
  artStyleStatus: DimensionStatus
}

export function buildVariationPlan(input: GeneratorInput): VariationPlan {
  const moodStatus = resolveStatus(input.mood)
  const colorPaletteStatus = resolveStatus(input.colorPalette)
  const backgroundStatus = resolveStatus(input.background)
  const artStyleStatus = resolveStatus(input.artStyle)

  const availablePool = FULL_POOL.filter((dim) => {
    if (dim === 'background' && backgroundStatus !== 'free') return false
    if (dim === 'color_palette' && colorPaletteStatus !== 'free') return false
    if (dim === 'mood' && moodStatus !== 'free') return false
    return true
  })

  const level = Math.max(1, Math.min(5, input.variationLevel))
  const numToVary = Math.max(1, Math.ceil((level / 5) * availablePool.length))
  const dimensionsToVary = availablePool.slice(0, numToVary)

  return {
    availablePool,
    dimensionsToVary,
    numToVary,
    moodStatus,
    colorPaletteStatus,
    backgroundStatus,
    artStyleStatus,
  }
}

export function pickRandom<T>(arr: readonly T[], seed: number): T {
  return arr[seed % arr.length]
}

export { MOOD_OPTIONS, COLOR_PALETTE_OPTIONS, BACKGROUND_OPTIONS }
