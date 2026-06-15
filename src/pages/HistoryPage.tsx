import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2, Download } from 'lucide-react'
import { useHistory } from '@/features/history/hooks/useHistory'
import { HistoryList } from '@/features/history/components/HistoryList'
import { HistoryFiltersBar } from '@/features/history/components/HistoryFilters'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
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
import { downloadAsTxt } from '@/services/export/txtExport'

export default function HistoryPage() {
  const { t } = useTranslation()
  const {
    filteredItems,
    loading,
    error,
    filters,
    setFilter,
    resetFilters,
    remove,
    removeAll,
    exportText,
  } = useHistory()

  const [deleteAllOpen, setDeleteAllOpen] = useState(false)

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
    } catch {
      // fallback
    }
  }

  const handleExport = () => {
    const txt = exportText()
    downloadAsTxt(txt, 'promptforge-history.txt')
  }

  const handleDeleteAll = async () => {
    await removeAll()
    setDeleteAllOpen(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('history.pageTitle')}
        description={t('history.pageDescription')}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport} disabled={filteredItems.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              {t('history.export')}
            </Button>
            <Button
              variant="outline"
              onClick={() => setDeleteAllOpen(true)}
              disabled={filteredItems.length === 0}
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
        items={filteredItems}
        loading={loading}
        error={error}
        onCopy={handleCopy}
        onDelete={remove}
      />

      <AlertDialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('history.deleteAllTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('history.deleteAllConfirmation')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
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
  )
}
