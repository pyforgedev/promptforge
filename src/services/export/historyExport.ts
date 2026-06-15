import type { HistoryItem } from '@/features/history/types'
import { toast } from 'sonner'

export function exportToTxt(items: HistoryItem[]): string {
  return items
    .map((item, i) => [
      `Prompt #${i + 1}`,
      `Aspect Ratio: ${item.aspectRatio}`,
      `Niche: ${item.niche}`,
      `Style: ${item.stylePreset}`,
      `Score: ${item.qualityScore?.overall ?? 'N/A'}/10`,
      `Date: ${new Date(item.savedAt).toLocaleString()}`,
      `---`,
      item.content,
      `==========`,
    ].join('\n'))
    .join('\n\n')
}

export function exportToJson(items: HistoryItem[]): string {
  return JSON.stringify(items, null, 2)
}

export function exportToCsv(items: HistoryItem[]): string {
  const headers = ['id', 'content', 'aspectRatio', 'niche', 'stylePreset', 'qualityScore', 'savedAt']
  const rows = items.map(item => [
    item.id,
    `"${item.content.replace(/"/g, '""')}"`,
    item.aspectRatio,
    item.niche,
    item.stylePreset,
    item.qualityScore?.overall ?? '',
    new Date(item.savedAt).toISOString()
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

export async function bulkExport(items: HistoryItem[], format: 'txt' | 'json' | 'csv') {
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
    success: 'Export successful!',
    error: 'Export failed.',
  })
}
