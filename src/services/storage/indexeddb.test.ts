import { describe, it, expect, vi, beforeEach } from 'vitest'
import db, {
  withRetry,
  getPrompt,
  savePrompt,
  deletePrompt,
  getSetting,
  saveSetting,
  saveGeneratedPromptBatch,
  getHistoryItems,
  deleteHistoryItem,
  togglePromptFavorite,
  getFolders,
  saveFolder,
  deleteFolder
} from './indexeddb'
import type { Prompt } from '@/types'

describe('withRetry utility', () => {
  it('resolves immediately if the function succeeds on first try', async () => {
    const fn = vi.fn().mockResolvedValue('success')
    const result = await withRetry(fn)
    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries if the function fails and eventually succeeds', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValueOnce('success')

    const result = await withRetry(fn, 3, 1)
    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('throws error if all retries fail', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fail'))

    await expect(withRetry(fn, 2, 1)).rejects.toThrow('always fail')
    expect(fn).toHaveBeenCalledTimes(3) // 1 initial + 2 retries
  })
})

describe('Dexie Storage Service CRUD', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('performs CRUD operations for prompt custom templates', async () => {
    const prompt: Prompt = {
      id: 'p1',
      name: 'Test Prompt',
      category: 'lifestyle',
      createdAt: new Date(),
      content: 'commercial photography of a cup',
      aspectRatio: '16:9',
      stylePreset: 'Commercial',
      niche: 'commercial',
      tags: ['cup', 'commercial']
    }

    // Save/Create
    await savePrompt(prompt)

    // Read
    const saved = await getPrompt('p1')
    expect(saved).toBeDefined()
    expect(saved?.name).toBe('Test Prompt')
    expect(saved?.category).toBe('lifestyle')

    // Delete
    await deletePrompt('p1')
    const deleted = await getPrompt('p1')
    expect(deleted).toBeUndefined()
  })

  it('encrypts settings that contain sensitive config keys and decrypts them', async () => {
    const sensitiveVal = { apiKey: 'sensitive-secret-token' }
    await saveSetting('api_key_config', sensitiveVal)

    // Verify raw db value is encrypted string
    const rawVal = await db.settings.get('api_key_config')
    expect(rawVal).toBeDefined()
    expect(typeof rawVal?.value).toBe('string')
    expect(rawVal?.value).not.toContain('sensitive-secret-token')

    // Read via helper decrypter
    const decrypted = await getSetting('api_key_config')
    expect(decrypted).toEqual(sensitiveVal)
  })

  it('does not encrypt non-sensitive settings keys', async () => {
    await saveSetting('theme', 'dark')

    const rawVal = await db.settings.get('theme')
    expect(rawVal?.value).toBe('dark')

    const readVal = await getSetting('theme')
    expect(readVal).toBe('dark')
  })

  it('saves batch generated prompts and retrieves history items', async () => {
    const batch = {
      batchId: 'b1',
      generatorInput: {
        niche: 'Nature',
        category: 'landscape',
        batchSize: 1,
        usageContext: 'commercial',
        targetMarket: 'global',
        targetPlatform: 'midjourney',
        includeDiversity: true,
        allowTextSpace: false
      },
      generatedAt: new Date(),
      prompts: [
        {
          id: 'h1',
          variantIndex: 1,
          batchId: 'b1',
          segments: { subject: 'tree', composition: '', lighting: '', mood: '', style: '', technical: '', colorPalette: '', environment: '' },
          negativePrompt: '',
          platformVariants: { midjourney: 'beautiful green tree' },
          fullPrompt: 'beautiful green tree',
          commercialKeywords: ['nature', 'tree'],
          adobeScore: { total: 85, breakdown: { commercialViability: 20, technicalQuality: 20, compositionStrength: 25, marketDiversity: 20 }, warnings: [], suggestions: [] },
          variationAnchors: { primaryVariation: '', compositionStyle: '', lightingType: '', directionHint: '' },
          createdAt: new Date(),
          isFavorite: false
        }
      ]
    }

    await saveGeneratedPromptBatch(batch)

    const history = await getHistoryItems()
    expect(history.length).toBe(1)
    expect(history[0].id).toBe('h1')
    expect(history[0].niche).toBe('Nature')

    // Toggle favorite
    const fav = await togglePromptFavorite('h1')
    expect(fav).toBe(true)
    const updatedHistory = await getHistoryItems()
    expect(updatedHistory[0].isFavorite).toBe(true)

    // Delete item
    await deleteHistoryItem('h1')
    const finalHistory = await getHistoryItems()
    expect(finalHistory.length).toBe(0)
  })

  it('creates and lists folders', async () => {
    const folder = {
      id: 'f1',
      name: 'Nature Prompts',
      createdAt: new Date(),
      parentId: null
    }

    await saveFolder(folder)

    const folders = await getFolders()
    expect(folders.length).toBe(1)
    expect(folders[0].name).toBe('Nature Prompts')

    await deleteFolder('f1')
    const finalFolders = await getFolders()
    expect(finalFolders.length).toBe(0)
  })
})
