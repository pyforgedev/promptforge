import { describe, it, expect, beforeEach } from 'vitest'
import db from '@/services/storage/indexeddb'
import {
  parseRawText,
  parseCsvPreview,
  parseCsvWithColumn,
  detectDuplicates,
  detectAspectRatio,
  checkSanityLimit,
  createFormatterBatch,
  exportBatch,
  getActiveBatch,
  markItemCopied,
  resetAllProgress,
  setCurrentIndex,
  getUniqueAspectRatios,
} from './formatterService'

describe('parseRawText', () => {
  it('normalizes CRLF to LF', () => {
    const input = 'line1\r\nline2\r\nline3'
    const result = parseRawText(input)
    expect(result).toEqual(['line1', 'line2', 'line3'])
  })

  it('trims whitespace from each line', () => {
    const input = '  prompt1  \n  prompt2  \n  prompt3  '
    const result = parseRawText(input)
    expect(result).toEqual(['prompt1', 'prompt2', 'prompt3'])
  })

  it('removes empty lines', () => {
    const input = 'prompt1\n\n\nprompt2\n\nprompt3'
    const result = parseRawText(input)
    expect(result).toEqual(['prompt1', 'prompt2', 'prompt3'])
  })

  it('handles mixed CRLF, empty lines, and whitespace', () => {
    const input = '  prompt1  \r\n  \r\n  prompt2  \r\n\r\n\r\n  prompt3  '
    const result = parseRawText(input)
    expect(result).toEqual(['prompt1', 'prompt2', 'prompt3'])
  })

  it('returns empty array for empty input', () => {
    expect(parseRawText('')).toEqual([])
    expect(parseRawText('   \n   \n   ')).toEqual([])
  })

  it('extracts only Prompt: lines from structured journal format', () => {
    const input = [
      'Judul/Tema Niche: Ikon Monumen',
      'Type: Image',
      'Prompt: A cute chibi-style obelisk icon',
      '',
      'Judul/Tema Niche: Animasi Confetti',
      'Type: Video',
      'Prompt: Seamless looping confetti animation',
      '',
      'Judul/Tema Niche: Ikon Alat Musik',
      'Type: Image',
      'Prompt: A cute bamboo instrument icon',
    ].join('\n')
    const result = parseRawText(input)
    expect(result).toEqual([
      'A cute chibi-style obelisk icon',
      'Seamless looping confetti animation',
      'A cute bamboo instrument icon',
    ])
  })

  it('extracts prompt values with extra whitespace', () => {
    const input = 'Prompt:    leading spaces here   \n\n\nPrompt:   another one   '
    const result = parseRawText(input)
    expect(result).toEqual(['leading spaces here', 'another one'])
  })

  it('falls back to line-based split when no Prompt: label found', () => {
    const input = 'command one\ncommand two\ncommand three'
    const result = parseRawText(input)
    expect(result).toEqual(['command one', 'command two', 'command three'])
  })
})

describe('parseCsvPreview', () => {
  it('detects column named "prompt"', () => {
    const csv = 'prompt,other\np1,o1\np2,o2'
    const result = parseCsvPreview(csv)
    expect(result.detectedColumn).toBe('prompt')
  })

  it('detects column named "full_prompt"', () => {
    const csv = 'full_prompt,name\np1,n1\np2,n2'
    const result = parseCsvPreview(csv)
    expect(result.detectedColumn).toBe('full_prompt')
  })

  it('detects column named "text"', () => {
    const csv = 'text,desc\np1,d1\np2,d2'
    const result = parseCsvPreview(csv)
    expect(result.detectedColumn).toBe('text')
  })

  it('auto-selects single column even with non-matching name', () => {
    const csv = 'content\np1\np2'
    const result = parseCsvPreview(csv)
    expect(result.detectedColumn).toBe('content')
  })

  it('returns null when multiple columns with no match', () => {
    const csv = 'col1,col2,col3\nv1,v2,v3\nv4,v5,v6'
    const result = parseCsvPreview(csv)
    expect(result.detectedColumn).toBeNull()
  })

  it('case-insensitive column detection', () => {
    const csv = 'PROMPT,desc\np1,d1\np2,d2'
    const result = parseCsvPreview(csv)
    expect(result.detectedColumn).toBe('PROMPT')
  })

  it('returns preview rows up to 5', () => {
    const csv = 'prompt\np1\np2\np3\np4\np5\np6\np7'
    const result = parseCsvPreview(csv)
    expect(result.previewRows.length).toBe(5)
  })

  it('handles empty CSV', () => {
    const csv = ''
    const result = parseCsvPreview(csv)
    expect(result.columns).toEqual([])
    expect(result.detectedColumn).toBeNull()
  })
})

describe('parseCsvWithColumn', () => {
  it('parses CSV and extracts specified column', () => {
    const csv = 'prompt,desc\np1,d1\np2,d2'
    const result = parseCsvWithColumn(csv, 'prompt')
    expect(result).toEqual(['p1', 'p2'])
  })

  it('applies parseRawText cleaning to column values', () => {
    const csv = 'prompt,desc\n  p1  ,d1\np2  ,d2\n'
    const result = parseCsvWithColumn(csv, 'prompt')
    expect(result).toEqual(['p1', 'p2'])
  })
})

describe('detectAspectRatio', () => {
  it('matches --ar flag', () => {
    expect(detectAspectRatio('beautiful landscape --ar 16:9')).toBe('16:9')
    expect(detectAspectRatio('--ar 1:1')).toBe('1:1')
    expect(detectAspectRatio('--ar 9:16')).toBe('9:16')
  })

  it('matches --aspect flag', () => {
    expect(detectAspectRatio('photo --aspect 4:3')).toBe('4:3')
    expect(detectAspectRatio('--aspect 21:9')).toBe('21:9')
  })

  it('matches aspect ratio natural language', () => {
    expect(detectAspectRatio('photo aspect ratio 16:9')).toBe('16:9')
    expect(detectAspectRatio('aspect-ratio: 1:1')).toBe('1:1')
    expect(detectAspectRatio('aspectratio 9:16')).toBe('9:16')
  })

  it('case-insensitive', () => {
    expect(detectAspectRatio('PHOTO --AR 4:3')).toBe('4:3')
    expect(detectAspectRatio('Aspect Ratio 16:9')).toBe('16:9')
  })

  it('returns null when no pattern found', () => {
    expect(detectAspectRatio('a beautiful clock showing 1:1 scale')).toBeNull()
    expect(detectAspectRatio('a simple 2:3 drawing')).toBeNull()
    expect(detectAspectRatio('no ratio here')).toBeNull()
  })

  it('does not match bare ratio without keyword', () => {
    expect(detectAspectRatio('(1:1)')).toBeNull()
    expect(detectAspectRatio('the ratio is 16:9')).toBeNull()
  })
})

describe('detectDuplicates', () => {
  it('returns an empty array for empty and single-item input', () => {
    expect(detectDuplicates([])).toEqual([])
    expect(detectDuplicates(['single prompt only'])).toEqual([])
  })

  it('returns pairwise matches with similarity scores from the similarity service', () => {
    const prompts = [
      'blue modern kitchen interior with soft morning sunlight',
      'blue modern kitchen interior with soft morning sunlight',
      'wild tiger walking through a jungle at dusk',
    ]

    const matches = detectDuplicates(prompts)

    expect(matches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          index: 0,
          similarToIndex: 1,
          score: expect.any(Number),
        }),
      ]),
    )
    expect(matches.find((match) => match.index === 0 && match.similarToIndex === 1)?.score).toBeGreaterThanOrEqual(0.7)
    expect(matches.some((match) => match.similarToIndex === 2)).toBe(false)
  })

  it('returns every pair for identical prompts', () => {
    const matches = detectDuplicates([
      'clean white studio portrait with soft light',
      'clean white studio portrait with soft light',
      'clean white studio portrait with soft light',
    ])

    expect(matches).toHaveLength(3)
    expect(matches).toEqual([
      { index: 0, similarToIndex: 1, score: 1 },
      { index: 0, similarToIndex: 2, score: 1 },
      { index: 1, similarToIndex: 2, score: 1 },
    ])
  })
})

describe('checkSanityLimit', () => {
  it('returns ok for count < 100', () => {
    expect(checkSanityLimit(0)).toBe('ok')
    expect(checkSanityLimit(99)).toBe('ok')
  })

  it('returns warning for count 100-299', () => {
    expect(checkSanityLimit(100)).toBe('warning')
    expect(checkSanityLimit(150)).toBe('warning')
    expect(checkSanityLimit(299)).toBe('warning')
  })

  it('returns warning_high for count 300-499', () => {
    expect(checkSanityLimit(300)).toBe('warning_high')
    expect(checkSanityLimit(350)).toBe('warning_high')
    expect(checkSanityLimit(499)).toBe('warning_high')
  })

  it('returns blocked for count >= 500', () => {
    expect(checkSanityLimit(500)).toBe('blocked')
    expect(checkSanityLimit(1000)).toBe('blocked')
  })
})

describe('createFormatterBatch', () => {
  it('creates batch and items successfully', async () => {
    const prompts = ['prompt1', 'prompt2', 'prompt3']
    await createFormatterBatch(prompts, 'paste')

    const batchData = await getActiveBatch()
    expect(batchData).not.toBeNull()
    expect(batchData!.batch.totalCount).toBe(3)
    expect(batchData!.items.length).toBe(3)
    expect(batchData!.items[0].promptText).toBe('prompt1')
    expect(batchData!.items[0].status).toBe('pending')
  })

  it('clears previous batch when called again', async () => {
    const prompts1 = ['old1', 'old2']
    await createFormatterBatch(prompts1, 'paste')

    const prompts2 = ['new1', 'new2', 'new3']
    await createFormatterBatch(prompts2, 'file', 'test.csv')

    const batchData = await getActiveBatch()
    expect(batchData).not.toBeNull()
    expect(batchData!.batch.totalCount).toBe(3)
    expect(batchData!.batch.sourceType).toBe('file')
    expect(batchData!.batch.originalFileName).toBe('test.csv')
    expect(batchData!.items.length).toBe(3)
    expect(batchData!.items[0].promptText).toBe('new1')
    expect(await db.formatter_batch.count()).toBe(1)
    expect(await db.formatter_items.count()).toBe(3)
  })

  it('throws and does not insert when count >= 500', async () => {
    const prompts = Array(500).fill('prompt')
    await expect(createFormatterBatch(prompts, 'paste')).rejects.toThrow(
      'Batch terlalu besar (500 prompt, maksimal 500)'
    )

    const batchData = await getActiveBatch()
    expect(batchData).toBeNull()
    expect(await db.formatter_batch.count()).toBe(0)
    expect(await db.formatter_items.count()).toBe(0)
  })

  it('detects aspect ratio for each item', async () => {
    const prompts = ['prompt --ar 16:9', 'plain prompt', 'aspect ratio 1:1']
    await createFormatterBatch(prompts, 'paste')

    const batchData = await getActiveBatch()
    expect(batchData!.items[0].detectedAspectRatio).toBe('16:9')
    expect(batchData!.items[1].detectedAspectRatio).toBeNull()
    expect(batchData!.items[2].detectedAspectRatio).toBe('1:1')
  })

  it('getUniqueAspectRatios returns unique sorted ratios', async () => {
    const prompts = ['prompt --ar 16:9', 'plain prompt', 'aspect ratio 1:1', 'another --ar 16:9']
    await createFormatterBatch(prompts, 'paste')
    const batchData = await getActiveBatch()
    
    const ratios = getUniqueAspectRatios(batchData!.items)
    expect(ratios).toHaveLength(2)
    expect(ratios).toContain('16:9')
    expect(ratios).toContain('1:1')
  })

  it('getUniqueAspectRatios returns empty array when no ratios detected', async () => {
    const prompts = ['plain prompt', 'another plain prompt']
    await createFormatterBatch(prompts, 'paste')
    const batchData = await getActiveBatch()
    
    const ratios = getUniqueAspectRatios(batchData!.items)
    expect(ratios).toEqual([])
  })

  it('preserves order field correctly', async () => {
    const prompts = ['first', 'second', 'third']
    await createFormatterBatch(prompts, 'paste')

    const batchData = await getActiveBatch()
    expect(batchData!.items[0].order).toBe(0)
    expect(batchData!.items[1].order).toBe(1)
    expect(batchData!.items[2].order).toBe(2)
  })
})

describe('getActiveBatch', () => {
  it('returns null when no batch exists', async () => {
    const result = await getActiveBatch()
    expect(result).toBeNull()
  })

  it('returns batch with items', async () => {
    await createFormatterBatch(['p1', 'p2'], 'paste')
    const result = await getActiveBatch()

    expect(result).not.toBeNull()
    expect(result!.batch).toBeDefined()
    expect(result!.items.length).toBe(2)
  })
})

describe('markItemCopied', () => {
  it('marks item status as copied', async () => {
    await createFormatterBatch(['p1', 'p2'], 'paste')
    const batchData = await getActiveBatch()
    const itemId = batchData!.items[0].id!

    await markItemCopied(itemId)

    const updated = await getActiveBatch()
    expect(updated!.items[0].status).toBe('copied')
    expect(updated!.items[0].copiedAt).toBeInstanceOf(Date)
    expect(updated!.items[1].status).toBe('pending')
  })
})

describe('resetAllProgress', () => {
  it('resets all items to pending and currentIndex to 0', async () => {
    await createFormatterBatch(['p1', 'p2'], 'paste')
    const batchData = await getActiveBatch()
    const itemId = batchData!.items[0].id!

    await markItemCopied(itemId)
    const afterCopy = await getActiveBatch()
    expect(afterCopy!.items[0].status).toBe('copied')

    await resetAllProgress()

    const reset = await getActiveBatch()
    expect(reset!.items[0].status).toBe('pending')
    expect(reset!.items[0].copiedAt).toBeNull()
    expect(reset!.items[1].status).toBe('pending')
    expect(reset!.batch.currentIndex).toBe(0)
  })
})

describe('setCurrentIndex', () => {
  it('updates currentIndex on the active batch', async () => {
    await createFormatterBatch(['p1', 'p2', 'p3'], 'paste')

    await setCurrentIndex(2)

    const updated = await getActiveBatch()
    expect(updated!.batch.currentIndex).toBe(2)
  })
})

describe('exportBatch', () => {
  beforeEach(async () => {
    await createFormatterBatch(['prompt1', 'comma, prompt', 'pending item'], 'paste')
    const batchData = await getActiveBatch()
    if (batchData?.items[1]?.id) {
      await markItemCopied(batchData.items[1].id)
    }
  })

  it('txt format exports plain prompts without metadata', async () => {
    const batchData = await getActiveBatch()
    const txt = exportBatch(batchData!.items, 'txt', 'all')

    expect(txt).toBe('prompt1\ncomma, prompt\npending item')
  })

  it('exportBatch filters by aspect ratio', async () => {
    const prompts = ['prompt --ar 16:9', 'plain prompt', 'aspect ratio 1:1']
    await createFormatterBatch(prompts, 'paste')
    const batchData = await getActiveBatch()

    const txt169 = exportBatch(batchData!.items, 'txt', 'all', '16:9')
    expect(txt169).toBe('prompt --ar 16:9')

    const txt11 = exportBatch(batchData!.items, 'txt', 'all', '1:1')
    expect(txt11).toBe('aspect ratio 1:1')

    const txtNone = exportBatch(batchData!.items, 'txt', 'all', null)
    expect(txtNone).toBe('prompt --ar 16:9\nplain prompt\naspect ratio 1:1')
  })

  it('exportBatch combines scope and aspect ratio filters', async () => {
    const prompts = ['prompt --ar 16:9', 'plain prompt', 'aspect ratio 1:1']
    await createFormatterBatch(prompts, 'paste')
    const batchData = await getActiveBatch()
    
    const itemId = batchData!.items[0].id!
    await markItemCopied(itemId)

    const freshBatch = await getActiveBatch()
    const completed169 = exportBatch(freshBatch!.items, 'txt', 'completed', '16:9')
    expect(completed169).toBe('prompt --ar 16:9')

    const remainingAll = exportBatch(freshBatch!.items, 'txt', 'remaining', null)
    expect(remainingAll).toBe('plain prompt\naspect ratio 1:1')
  })

  it('csv format includes index,prompt,status columns with proper quoting', async () => {
    const batchData = await getActiveBatch()
    const csv = exportBatch(batchData!.items, 'csv', 'all')

    // Should have header row
    expect(csv).toContain('index,prompt,status')
    // Should quote the prompt containing comma
    expect(csv).toContain('"comma, prompt"')
  })

  it('csv format filters by scope', async () => {
    const batchData = await getActiveBatch()

    const remaining = exportBatch(batchData!.items, 'csv', 'remaining')
    expect(remaining).toContain('pending')

    const completed = exportBatch(batchData!.items, 'csv', 'completed')
    expect(completed).toContain('copied')
  })

  it('json format exports array of objects', async () => {
    const batchData = await getActiveBatch()
    const json = exportBatch(batchData!.items, 'json', 'all')

    const parsed = JSON.parse(json)
    expect(parsed).toHaveLength(3)
    expect(parsed[0]).toHaveProperty('index')
    expect(parsed[0]).toHaveProperty('prompt')
    expect(parsed[0]).toHaveProperty('status')
  })
})
