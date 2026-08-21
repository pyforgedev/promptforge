import type { PromptTemplate } from '@/features/templates/types'
import { TEMPLATE_CATEGORIES } from '@/features/templates/types'

export function exportTemplatesToTxt(prompts: PromptTemplate[]): string {
  if (!prompts || prompts.length === 0) {
    throw new Error('No prompts to export')
  }

  return prompts
    .map((p) => {
      if (!p.name || !p.content) {
        throw new Error('Invalid prompt data')
      }

      const lines = [
        `Name: ${p.name.trim()}`,
        `Category: ${(TEMPLATE_CATEGORIES as readonly string[]).includes(p.category) ? p.category.trim() : 'other'}`,
        `Tags: ${p.tags.map(t => t.trim()).join(', ')}`,
        `---`,
        p.content.trim(),
        `==========`,
      ]
      return lines.join('\n')
    })
    .join('\n\n')
}

export function parseTemplatesFromTxt(content: string): unknown[] {
  if (!content || typeof content !== 'string') {
    throw new Error('Invalid content')
  }

  const blocks: string[] = []
  const delimiter = '=========='
  let cursor = 0
  while (cursor < content.length) {
    const next = content.indexOf(delimiter, cursor)
    const block = content.slice(cursor, next === -1 ? content.length : next).trim()
    if (block) {
      blocks.push(block)
      if (blocks.length > 500) throw new Error('Too many template records')
    }
    if (next === -1) break
    cursor = next + delimiter.length
  }
  if (blocks.length === 0) {
    throw new Error('No valid prompts found')
  }

  return blocks.map((block) => {
    const lines = block.trim().split(/\r?\n/)

    const name = lines.find((l) => l.startsWith('Name:'))?.replace('Name:', '').trim() || ''
    const category = lines.find((l) => l.startsWith('Category:'))?.replace('Category:', '').trim() || 'general'
    const tagsLine = lines.find((l) => l.startsWith('Tags:'))?.replace('Tags:', '').trim() || ''
    const tags = tagsLine ? tagsLine.split(',').map((t) => t.trim()).filter(Boolean) : []
    const contentStart = lines.findIndex((l) => l === '---')
    const content = contentStart >= 0
      ? lines.slice(contentStart + 1).join('\n').trim()
      : ''

    return { name, category, tags, content }
  })
}
