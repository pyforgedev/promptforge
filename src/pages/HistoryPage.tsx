import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2, Download } from 'lucide-react'
import { useHistoryStore } from '@/store/useHistoryStore'
import { HistoryList } from '@/features/history/components/HistoryList'
import { HistoryFiltersBar } from '@/features/history/components/HistoryFilters'
import { FolderSwitcher } from '@/features/history/components/FolderSwitcher'
import { FolderChips } from '@/features/history/components/FolderChips'
import { BulkActionBar } from '@/features/history/components/BulkActionBar'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/useToast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { bulkExport } from '@/services/export/historyExport'

export default function HistoryPage() {
  const { t } = useTranslation()
  const { showCopySuccess, showToast } = useToast()
  const {
    items,
    folders,
    loading,
    error,
    filters,
    setFilter,
    resetFilters,
    fetchHistory,
    fetchFolders,
    removeItem,
    removeAll
  } = useHistoryStore()

  const [deleteAllOpen, setDeleteAllOpen] = useState(false)

  useEffect(() => {
    fetchHistory()
    fetchFolders()
  }, [fetchHistory, fetchFolders])

  const handleDeleteAll = async () => {
    await removeAll()
    setDeleteAllOpen(false)
    showToast('success', 'History cleared')
  }

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      showCopySuccess()
    } catch {
      // fallback
    }
  }

  const handleExport = () => {
    bulkExport(items, 'txt')
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1 min-w-0">
          <h1 className="text-heading text-primary truncate">{t('history.pageTitle')}</h1>
          <p className="text-body-ui text-muted truncate">{t('history.pageDescription')}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={handleExport} disabled={items.length === 0} className="cursor-pointer">
            <Download className="mr-2 h-4 w-4" />
            {t('history.export')}
          </Button>
          <Button
            variant="outline"
            onClick={() => setDeleteAllOpen(true)}
            disabled={items.length === 0}
            className="cursor-pointer"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t('history.deleteAll')}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <FolderSwitcher className="w-full sm:w-64 shrink-0" />
        {folders.length > 0 && <FolderChips />}
      </div>

      <HistoryFiltersBar
        filters={filters}
        onFilterChange={setFilter}
        onReset={resetFilters}
      />

      <HistoryList
        items={items}
        loading={loading}
        error={error}
        onCopy={handleCopy}
        onDelete={removeItem}
      />

      <BulkActionBar />

      <AlertDialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('history.deleteAllTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('history.deleteAllConfirmation')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border-subtle bg-transparent hover:bg-surface-hover">{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAll}
              className="bg-brand-danger text-text-on-brand hover:bg-brand-danger/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}