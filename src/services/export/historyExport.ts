import type { PromptHistoryRecord } from '@/services/storage/indexeddb'
import { toast } from 'sonner'

export function exportToTxt(items: PromptHistoryRecord[]): string {
  return items
    .map((item, i) => [
      `Prompt #${i + 1}`,
      `Niche: ${item.niche}`,
      `Category: ${item.category}`,
      `Score: ${item.adobeScore?.total ?? 'N/A'}/100`,
      `Date: ${new Date(item.createdAt).toLocaleString()}`,
      `---`,
      item.fullPrompt,
      `==========`,
    ].join('\n'))
    .join('\n\n')
}

export function exportToJson(items: PromptHistoryRecord[]): string {
  return JSON.stringify(items, null, 2)
}

export function exportToCsv(items: PromptHistoryRecord[]): string {
  const headers = ['id', 'content', 'niche', 'category', 'score', 'createdAt']
  const rows = items.map(item => [
    item.id,
    `"${item.fullPrompt.replace(/"/g, '""')}"`,
    item.niche,
    item.category,
    item.adobeScore?.total?.toString() ?? '',
    new Date(item.createdAt).toISOString()
  ])
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function bulkExport(items: PromptHistoryRecord[], format: 'txt' | 'json' | 'csv') {
  const promise = new Promise((resolve) => {
    setTimeout(() => {
      let content = ''
      let filename = `promptforge_export_${Date.now()}`
      let mimeType = ''

      switch (format) {
        case 'txt':
          content = exportToTxt(items)
          filename += '.txt'
          mimeType = 'text/plain'
          break
        case 'json':
          content = exportToJson(items)
          filename += '.json'
          mimeType = 'application/json'
          break
        case 'csv':
          content = exportToCsv(items)
          filename += '.csv'
          mimeType = 'text/csv'
          break
      }

      downloadFile(content, filename, mimeType)
      resolve(true)
    }, 1000)
  })

  toast.promise(promise, {
    loading: `Preparing ${items.length} prompts for export...`,
    success: 'Exported',
    error: 'Export failed.',
  })
}
