import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2, Download, Menu } from 'lucide-react'
import { useHistoryStore } from '@/store/useHistoryStore'
import { HistoryList } from '@/features/history/components/HistoryList'
import { HistoryFiltersBar } from '@/features/history/components/HistoryFilters'
import { FolderSidebar } from '@/features/history/components/FolderSidebar'
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

  const [sidebarOpen, setSidebarOpen] = useState(false)
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
    <div className="flex h-full overflow-hidden lg:-m-6 lg:h-[calc(100dvh-3.5rem)]">
      <FolderSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="relative flex flex-1 flex-col gap-4 overflow-y-auto p-4 sm:gap-6 sm:p-6 lg:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 shrink-0 cursor-pointer lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label={t('common.openNavigation', { defaultValue: 'Open navigation' })}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex flex-col gap-1 min-w-0">
              <h1 className="text-heading text-primary truncate">{t('history.pageTitle')}</h1>
              <p className="text-body-ui text-muted truncate">{t('history.pageDescription')}</p>
            </div>
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
    </div>
  )
}
