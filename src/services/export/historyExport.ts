import type { PromptHistoryRecord } from '@/services/storage/indexeddb'
import i18n from '@/i18n'
import { toast } from 'sonner'
import { downloadFile } from '@/lib/download'
import { toCsvRow } from '@/lib/csv'

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
  const rows = items.map(item => toCsvRow([
    item.id,
    item.fullPrompt,
    item.niche,
    item.category,
    item.adobeScore?.total?.toString() ?? '',
    new Date(item.createdAt).toISOString(),
  ]))
  return [headers.join(','), ...rows].join('\n')
}

export async function bulkExport(items: PromptHistoryRecord[], format: 'txt' | 'json' | 'csv') {
  const promise = new Promise<void>((resolve, reject) => {
    try {
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
      resolve()
    } catch (err) {
      reject(err)
    }
  })

  toast.promise(promise, {
    loading: i18n.t('toast.exportPreparing', {
      count: items.length,
      defaultValue: `Preparing ${items.length} prompts for export...`,
    }),
    success: i18n.t('toast.exportComplete', { defaultValue: 'Prompts exported' }),
    error: i18n.t('toast.exportFailed', { defaultValue: 'Export failed' }),
  })
}
