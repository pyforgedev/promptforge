import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2, Download } from 'lucide-react'
import { useHistoryStore } from '@/store/useHistoryStore'
import { HistoryList } from '@/features/history/components/HistoryList'
import { HistoryFiltersBar } from '@/features/history/components/HistoryFilters'
import { FolderSidebar } from '@/features/history/components/FolderSidebar'
import { BulkActionBar } from '@/features/history/components/BulkActionBar'
import { PageHeader } from '@/components/common/PageHeader'
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
  const { showCopySuccess } = useToast()
  const {
    items,
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
    <div className="flex h-[calc(100vh-100px)] -m-6 overflow-hidden">
      <FolderSidebar />
      
      <div className="flex-1 flex flex-col gap-6 p-6 overflow-y-auto relative">
        <PageHeader
          title={t('history.pageTitle')}
          description={t('history.pageDescription')}
          action={
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExport} disabled={items.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                {t('history.export')}
              </Button>
              <Button
                variant="outline"
                onClick={() => setDeleteAllOpen(true)}
                disabled={items.length === 0}
              >
                <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                {t('history.deleteAll')}
              </Button>
            </div>
          }
        />

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
          <AlertDialogContent className="bg-black/90 backdrop-blur-xl border-white/10">
            <AlertDialogHeader>
              <AlertDialogTitle>{t('history.deleteAllTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('history.deleteAllConfirmation')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10">{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAll}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {t('common.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
