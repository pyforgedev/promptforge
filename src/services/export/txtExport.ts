import type { Prompt } from '@/types'

export function exportPromptsToTxt(prompts: Prompt[]): string {
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
        `Category: ${p.category.trim()}`,
        `Tags: ${p.tags.map(t => t.trim()).join(', ')}`,
        `---`,
        p.content.trim(),
        `==========`,
      ]
      return lines.join('\n')
    })
    .join('\n\n')
}

export function downloadAsTxt(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function parsePromptsFromTxt(content: string): Partial<Prompt>[] {
  if (!content || typeof content !== 'string') {
    throw new Error('Invalid content')
  }

  const blocks = content.split('==========').filter(Boolean)
  if (blocks.length === 0) {
    throw new Error('No valid prompts found')
  }

  return blocks.map((block) => {
    const lines = block.trim().split('\n')
    if (lines.length < 5) {
      throw new Error('Invalid prompt format')
    }

    const name = lines.find((l) => l.startsWith('Name:'))?.replace('Name:', '').trim() || ''
    if (!name) {
      throw new Error('Missing prompt name')
    }

    const category = lines.find((l) => l.startsWith('Category:'))?.replace('Category:', '').trim() || 'general'
    const tagsLine = lines.find((l) => l.startsWith('Tags:'))?.replace('Tags:', '').trim() || ''
    const tags = tagsLine ? tagsLine.split(',').map((t) => t.trim()).filter(Boolean) : []
    const contentStart = lines.findIndex((l) => l === '---')
    const content = contentStart >= 0
      ? lines.slice(contentStart + 1).join('\n').trim()
      : ''

    if (!content) {
      throw new Error('Missing prompt content')
    }

    return { name, category, tags, content }
  })
}
