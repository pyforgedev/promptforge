import { describe, expect, it } from 'vitest'
import { createTemplateSchema } from '@/features/templates/utils/templateValidators'
import type { PromptTemplate } from '@/features/templates/types'
import { exportTemplatesToTxt, parseTemplatesFromTxt } from './txtExport'

function template(overrides: Partial<PromptTemplate> = {}): PromptTemplate {
  return {
    id: 'template-1',
    name: 'Coastal Morning',
    content: 'A quiet coast at sunrise.',
    category: 'travel',
    tags: ['coast', 'sunrise'],
    source: 'manual',
    createdAt: 1,
    updatedAt: 2,
    ...overrides,
  }
}

describe('template TXT import/export', () => {
  it('round-trips basic template fields', () => {
    const original = template()
    const [parsed] = parseTemplatesFromTxt(exportTemplatesToTxt([original]))

    expect(parsed).toEqual({
      name: original.name,
      content: original.content,
      category: original.category,
      tags: original.tags,
    })
    expect(createTemplateSchema.safeParse(parsed).success).toBe(true)
  })

  it('exports a legacy category as canonical other so the record remains importable', () => {
    const [parsed] = parseTemplatesFromTxt(
      exportTemplatesToTxt([template({ category: 'legacy-custom-category' })]),
    ) as Array<Record<string, unknown>>

    expect(parsed.category).toBe('other')
    expect(createTemplateSchema.safeParse(parsed).success).toBe(true)
  })

  it('parses CRLF records and preserves multiline prompt content', () => {
    const [parsed] = parseTemplatesFromTxt(
      'Name: Windows Record\r\nCategory: nature\r\nTags: trees, green\r\n---\r\nFirst line\r\nSecond line\r\n==========',
    ) as Array<Record<string, unknown>>

    expect(parsed).toEqual({
      name: 'Windows Record',
      category: 'nature',
      tags: ['trees', 'green'],
      content: 'First line\nSecond line',
    })
  })

  it('returns malformed records as invalid candidates instead of silently dropping them', () => {
    const records = parseTemplatesFromTxt('Category: nature\nTags: incomplete\n==========')

    expect(records).toHaveLength(1)
    expect(createTemplateSchema.safeParse(records[0]).success).toBe(false)
  })

  it('rejects files containing more than 500 records', () => {
    const content = Array.from(
      { length: 501 },
      (_, index) => `Name: Record ${index}\nCategory: general\nTags:\n---\nPrompt ${index}\n==========`,
    ).join('\n')

    expect(() => parseTemplatesFromTxt(content)).toThrow('Too many template records')
  })

  it('rejects empty exports and templates missing required export fields', () => {
    expect(() => exportTemplatesToTxt([])).toThrow('No prompts to export')
    expect(() => exportTemplatesToTxt([template({ content: '' })])).toThrow('Invalid prompt data')
  })
})
