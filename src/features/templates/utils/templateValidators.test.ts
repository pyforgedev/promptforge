import { describe, expect, it } from 'vitest'
import {
  createTemplateSchema,
  normalizeNameKey,
  templateGeneratorSettingsSchema,
  updateTemplateSchema,
} from './templateValidators'

const validTemplate = {
  name: 'Editorial Landscape',
  content: 'A detailed landscape prompt',
  category: 'nature',
  tags: ['landscape'],
}

describe('normalizeNameKey', () => {
  it('applies NFKC before trimming and normalizes case', () => {
    // NFKC converts both the ideographic spaces and full-width letters.
    expect(normalizeNameKey('\u3000ＦＯＯ Bar\u3000')).toBe('foo bar')
    expect(normalizeNameKey('  Mixed CASE  ')).toBe('mixed case')
  })
})

describe('template schemas', () => {
  it('normalizes names and tags while deduplicating tags by normalized key', () => {
    const result = createTemplateSchema.parse({
      ...validTemplate,
      name: '\u3000Ｆｕｌｌ Width\u3000',
      tags: [' Nature ', 'ｎａｔｕｒｅ', 'Emoji 📷'],
    })

    expect(result.name).toBe('Full Width')
    expect(result.tags).toEqual(['Nature', 'Emoji 📷'])
  })

  it.each([
    ['', 'name'],
    ['x'.repeat(101), 'name'],
    ['bad\u0000name', 'name'],
    ['bad\nname', 'name'],
  ])('rejects an invalid %s value', (name) => {
    expect(createTemplateSchema.safeParse({ ...validTemplate, name }).success).toBe(false)
  })

  it('enforces content, category, and tag boundaries', () => {
    const invalidInputs = [
      { ...validTemplate, content: '   ' },
      { ...validTemplate, content: 'x'.repeat(10_001) },
      { ...validTemplate, category: 'not-a-category' },
      { ...validTemplate, tags: Array.from({ length: 11 }, (_, index) => `tag-${index}`) },
      { ...validTemplate, tags: ['x'.repeat(51)] },
      { ...validTemplate, tags: ['bad\u007ftag'] },
    ]

    for (const input of invalidInputs) {
      expect(createTemplateSchema.safeParse(input).success).toBe(false)
    }

    expect(createTemplateSchema.safeParse({
      ...validTemplate,
      name: 'n'.repeat(100),
      content: 'c'.repeat(10_000),
      tags: Array.from({ length: 10 }, (_, index) => `${index}${'t'.repeat(49)}`),
    }).success).toBe(true)
  })

  it('rejects unknown top-level and nested metadata fields', () => {
    expect(createTemplateSchema.safeParse({ ...validTemplate, unexpected: true }).success).toBe(false)
    expect(createTemplateSchema.safeParse({
      ...validTemplate,
      segments: {
        subject: '', composition: '', lighting: '', mood: '', style: '', technical: '', colorPalette: '', environment: '',
        adobeScore: 99,
      },
    }).success).toBe(false)
    expect(createTemplateSchema.safeParse({
      ...validTemplate,
      platformVariants: { dalle3: 'ok', otherPlatform: 'not allowed' },
    }).success).toBe(false)
  })

  it.each(['basePromptReference', 'batchSize', 'includeHistory', 'includeHistoryCount']) (
    'does not allow %s in persisted generator settings',
    (field) => {
      expect(templateGeneratorSettingsSchema.safeParse({ [field]: field === 'basePromptReference' ? 'reference' : 1 }).success).toBe(false)
      expect(createTemplateSchema.safeParse({
        ...validTemplate,
        generatorSettings: { [field]: field === 'basePromptReference' ? 'reference' : 1 },
      }).success).toBe(false)
    },
  )

  it('accepts valid partial generator settings but remains strict', () => {
    expect(templateGeneratorSettingsSchema.parse({ language: 'id', niche: 'Food photo' })).toMatchObject({
      language: 'id',
      niche: 'Food photo',
    })
    expect(templateGeneratorSettingsSchema.safeParse({ language: 'en', adobeScore: 80 }).success).toBe(false)
  })

  it('requires a bounded id and validates supplied update fields', () => {
    expect(updateTemplateSchema.safeParse({ id: '', content: 'valid' }).success).toBe(false)
    expect(updateTemplateSchema.safeParse({ id: 'id-1', content: '' }).success).toBe(false)
    expect(updateTemplateSchema.safeParse({ id: 'id-1', content: 'updated' }).success).toBe(true)
  })
})
