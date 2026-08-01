import { describe, it, expect, beforeEach } from 'vitest'
import db from '@/services/storage/indexeddb'
import {
  parseRawText,
  parseCsvPreview,
  parseCsvWithColumn,
  detectDuplicates,
  detectAspectRatio,
  detectPromptType,
  applyQueueView,
  checkSanityLimit,
  createFormatterBatch,
  exportBatch,
  getActiveBatch,
  markItemCopied,
  markCopiedAndAdvance,
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

  it('extracts Prompt: from markdown bold list format', () => {
    const input = [
      '- **Judul/Tema Niche:** Labor Day Modern Corporate Sale Banner',
      '- **Type:** Image',
      '- **Commercial Rationale:** Ultra-high demand for US Labor Day retail',
      '- **Prompt:** A sleek modern promotional hero banner with abstract curved red panels',
    ].join('\n')
    const result = parseRawText(input)
    expect(result).toEqual([
      'A sleek modern promotional hero banner with abstract curved red panels',
    ])
  })

  it('extracts Prompt: from mixed markdown list (multiple prompts)', () => {
    const input = [
      '- **Prompt:** First prompt here',
      '- **Type:** Image',
      '- **Prompt:** Second prompt here',
    ].join('\n')
    const result = parseRawText(input)
    expect(result).toEqual(['First prompt here', 'Second prompt here'])
  })

  it('falls back to line-based split when no markdown Prompt found either', () => {
    const input = '- **Judul:** something\n- **Type:** image'
    const result = parseRawText(input)
    expect(result).toEqual(['- **Judul:** something', '- **Type:** image'])
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

describe('markCopiedAndAdvance', () => {
  it('marks item as copied and advances currentIndex atomically', async () => {
    await createFormatterBatch(['p1', 'p2', 'p3'], 'paste')
    const batchData = await getActiveBatch()
    const itemId = batchData!.items[0].id!

    await markCopiedAndAdvance(itemId, 1)

    const updated = await getActiveBatch()
    expect(updated!.items[0].status).toBe('copied')
    expect(updated!.items[0].copiedAt).toBeInstanceOf(Date)
    expect(updated!.items[1].status).toBe('pending')
    expect(updated!.batch.currentIndex).toBe(1)
  })

  it('does not change currentIndex when no active batch exists', async () => {
    const result = await markCopiedAndAdvance(999, 1)
    expect(result).toBeUndefined()
  })

  it('keeps currentIndex when advanced beyond last item', async () => {
    await createFormatterBatch(['p1', 'p2'], 'paste')
    const batchData = await getActiveBatch()
    const itemId = batchData!.items[1].id!

    await markCopiedAndAdvance(itemId, 1)

    const updated = await getActiveBatch()
    expect(updated!.items[1].status).toBe('copied')
    expect(updated!.batch.currentIndex).toBe(1)
  })

  it('does not advance currentIndex when the item no longer exists', async () => {
    await createFormatterBatch(['p1', 'p2'], 'paste')
    const batchData = await getActiveBatch()
    const itemId = batchData!.items[0].id!

    await createFormatterBatch(['replacement'], 'paste')

    await markCopiedAndAdvance(itemId, 1)

    const updated = await getActiveBatch()
    expect(updated!.items[0].promptText).toBe('replacement')
    expect(updated!.items[0].status).toBe('pending')
    expect(updated!.batch.currentIndex).toBe(0)
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

describe('detectPromptType', () => {
  it('detects video via --video flag', () => {
    expect(detectPromptType('cinematic shot --video')).toBe('video')
    expect(detectPromptType('slow motion close-up --video 1')).toBe('video')
  })

  it('detects video via the standalone video keyword', () => {
    expect(detectPromptType('a video of a cat')).toBe('video')
    expect(detectPromptType('create a short video about product launch')).toBe('video')
  })

  it('detects video via known video model keywords', () => {
    expect(detectPromptType('Veo 3 camera pan across the skyline')).toBe('video')
    expect(detectPromptType('Sora-style seamless loop')).toBe('video')
    expect(detectPromptType('Kling 1.6 realistic water splash')).toBe('video')
    expect(detectPromptType('runway gen-4 drone shot')).toBe('video')
    expect(detectPromptType('dream machine motion blur')).toBe('video')
    expect(detectPromptType('stable video diffusion timelapse')).toBe('video')
  })

  it('is case-insensitive', () => {
    expect(detectPromptType('A SORA GENERATED CLIP')).toBe('video')
    expect(detectPromptType('DREAM MACHINE loop')).toBe('video')
  })

  it('does not match partial words', () => {
    expect(detectPromptType('a videographer recording a scene')).toBe('image')
    expect(detectPromptType('videography tips')).toBe('image')
    expect(detectPromptType('videoed content')).toBe('image')
  })

  it('defaults to image for plain image prompts', () => {
    expect(detectPromptType('a cute chibi-style obelisk icon')).toBe('image')
    expect(detectPromptType('')).toBe('image')
  })
})

describe('applyQueueView', () => {
  const makeItem = (
    order: number,
    promptText: string,
    status: 'pending' | 'copied' = 'pending',
    detectedAspectRatio: string | null = null,
  ): import('@/services/storage/indexeddb').FormatterItem => ({
    id: order,
    order,
    promptText,
    status,
    copiedAt: status === 'copied' ? new Date() : null,
    detectedAspectRatio,
  })

  const items = [
    makeItem(0, 'first prompt --ar 16:9', 'copied', '16:9'),
    makeItem(1, 'plain second prompt', 'pending'),
    makeItem(2, 'third prompt --ar 1:1 --video', 'pending', '1:1'),
    makeItem(3, 'fourth prompt --ar 16:9', 'copied', '16:9'),
  ]

  const allOptions = {
    scope: 'all' as const,
    aspectRatio: null,
    type: 'all' as const,
    sort: 'order' as const,
  }

  it('returns all items in order with default options', () => {
    const result = applyQueueView(items, allOptions)
    expect(result.map((i) => i.order)).toEqual([0, 1, 2, 3])
  })

  it('filters by scope remaining', () => {
    const result = applyQueueView(items, { ...allOptions, scope: 'remaining' })
    expect(result.map((i) => i.order)).toEqual([1, 2])
  })

  it('filters by scope completed', () => {
    const result = applyQueueView(items, { ...allOptions, scope: 'completed' })
    expect(result.map((i) => i.order)).toEqual([0, 3])
  })

  it('filters by aspect ratio', () => {
    const result = applyQueueView(items, { ...allOptions, aspectRatio: '16:9' })
    expect(result.map((i) => i.order)).toEqual([0, 3])
  })

  it('filters by prompt type', () => {
    const result = applyQueueView(items, { ...allOptions, type: 'video' })
    expect(result.map((i) => i.order)).toEqual([2])
  })

  it('combines scope and aspect ratio filters', () => {
    const result = applyQueueView(items, { ...allOptions, scope: 'completed', aspectRatio: '16:9' })
    expect(result.map((i) => i.order)).toEqual([0, 3])
  })

  it('returns empty array when nothing matches', () => {
    const result = applyQueueView(items, { ...allOptions, scope: 'remaining', aspectRatio: '16:9' })
    expect(result).toEqual([])
  })

  it('sorts by aspectRatio grouping nulls last', () => {
    const result = applyQueueView(items, { ...allOptions, sort: 'aspectRatio' })
    const ratios = result.map((i) => i.detectedAspectRatio)
    expect(ratios).toEqual(['1:1', '16:9', '16:9', null])
  })

  it('sorts by status with pending first', () => {
    const result = applyQueueView(items, { ...allOptions, sort: 'status' })
    expect(result.map((i) => i.status)).toEqual(['pending', 'pending', 'copied', 'copied'])
  })

  it('sorts by length ascending', () => {
    const result = applyQueueView(items, { ...allOptions, sort: 'length' })
    expect(result.map((i) => i.promptText)).toEqual([
      'plain second prompt',
      'first prompt --ar 16:9',
      'fourth prompt --ar 16:9',
      'third prompt --ar 1:1 --video',
    ])
  })

  it('keeps original order for equal sort keys (stable sort)', () => {
    const result = applyQueueView(items, { ...allOptions, scope: 'completed', sort: 'status' })
    expect(result.map((i) => i.order)).toEqual([0, 3])
  })

  it('does not mutate the input array', () => {
    const snapshot = items.map((i) => i.order)
    applyQueueView(items, { ...allOptions, sort: 'length' })
    expect(items.map((i) => i.order)).toEqual(snapshot)
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
    const txt = exportBatch(batchData!.items, 'txt')

    expect(txt).toBe('prompt1\ncomma, prompt\npending item')
  })

  it('exports the exact items it receives (filters applied by caller)', async () => {
    const prompts = ['prompt --ar 16:9', 'plain prompt', 'aspect ratio 1:1']
    await createFormatterBatch(prompts, 'paste')
    const batchData = await getActiveBatch()

    const filtered169 = applyQueueView(batchData!.items, {
      scope: 'all',
      aspectRatio: '16:9',
      type: 'all',
      sort: 'order',
    })
    const txt169 = exportBatch(filtered169, 'txt')
    expect(txt169).toBe('prompt --ar 16:9')

    const filtered11 = applyQueueView(batchData!.items, {
      scope: 'all',
      aspectRatio: '1:1',
      type: 'all',
      sort: 'order',
    })
    const txt11 = exportBatch(filtered11, 'txt')
    expect(txt11).toBe('aspect ratio 1:1')
  })

  it('exportBatch receives combined scope and aspect ratio filtering from caller', async () => {
    const prompts = ['prompt --ar 16:9', 'plain prompt', 'aspect ratio 1:1']
    await createFormatterBatch(prompts, 'paste')
    const batchData = await getActiveBatch()

    const itemId = batchData!.items[0].id!
    await markItemCopied(itemId)

    const freshBatch = await getActiveBatch()
    const completed169 = exportBatch(
      applyQueueView(freshBatch!.items, {
        scope: 'completed',
        aspectRatio: '16:9',
        type: 'all',
        sort: 'order',
      }),
      'txt',
    )
    expect(completed169).toBe('prompt --ar 16:9')

    const remainingAll = exportBatch(
      applyQueueView(freshBatch!.items, {
        scope: 'remaining',
        aspectRatio: null,
        type: 'all',
        sort: 'order',
      }),
      'txt',
    )
    expect(remainingAll).toBe('plain prompt\naspect ratio 1:1')
  })

  it('csv format includes index,prompt,status columns with proper quoting', async () => {
    const batchData = await getActiveBatch()
    const csv = exportBatch(batchData!.items, 'csv')

    // Should have header row
    expect(csv).toContain('index,prompt,status')
    // Should quote the prompt containing comma
    expect(csv).toContain('"comma, prompt"')
  })

  it('csv format preserves item statuses', async () => {
    const batchData = await getActiveBatch()

    const remaining = exportBatch(
      applyQueueView(batchData!.items, {
        scope: 'remaining',
        aspectRatio: null,
        type: 'all',
        sort: 'order',
      }),
      'csv',
    )
    expect(remaining).toContain('pending')
    expect(remaining).not.toContain('copied')

    const completed = exportBatch(
      applyQueueView(batchData!.items, {
        scope: 'completed',
        aspectRatio: null,
        type: 'all',
        sort: 'order',
      }),
      'csv',
    )
    expect(completed).toContain('copied')
    expect(completed).not.toContain('pending')
  })

  it('json format exports array of objects', async () => {
    const batchData = await getActiveBatch()
    const json = exportBatch(batchData!.items, 'json')

    const parsed = JSON.parse(json)
    expect(parsed).toHaveLength(3)
    expect(parsed[0]).toHaveProperty('index')
    expect(parsed[0]).toHaveProperty('prompt')
    expect(parsed[0]).toHaveProperty('status')
  })
})
