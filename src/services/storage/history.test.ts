import { describe, expect, it } from 'vitest'
import db from './db'
import { getHistoryCounts, type PromptHistoryRecord } from './history'

function historyRecord(id: string, folderId: string | null): PromptHistoryRecord {
  return {
    id,
    variantIndex: 1,
    batchId: 'batch-1',
    segments: {
      subject: id,
      composition: '',
      lighting: '',
      mood: '',
      style: '',
      technical: '',
      colorPalette: '',
      environment: '',
    },
    negativePrompt: '',
    platformVariants: { dalle3: id, nano_banana: id },
    fullPrompt: id,
    commercialKeywords: [],
    adobeScore: {
      total: 0,
      breakdown: {
        commercialViability: 0,
        technicalQuality: 0,
        compositionStrength: 0,
        marketDiversity: 0,
      },
      warnings: [],
      suggestions: [],
    },
    variationAnchors: {
      primaryVariation: '',
      compositionStyle: '',
      lightingType: '',
      directionHint: '',
    },
    createdAt: new Date(),
    isFavorite: false,
    folderId,
    niche: 'Test',
    category: 'other',
  }
}

describe('getHistoryCounts', () => {
  it('counts all history records and tallies only assigned folder ids', async () => {
    await db.prompt_history.bulkPut([
      historyRecord('unfiled-1', null),
      historyRecord('travel-1', 'folder-travel'),
      historyRecord('travel-2', 'folder-travel'),
      historyRecord('food-1', 'folder-food'),
    ])

    await expect(getHistoryCounts()).resolves.toEqual({
      total: 4,
      byFolder: {
        'folder-food': 1,
        'folder-travel': 2,
      },
    })
  })
})
