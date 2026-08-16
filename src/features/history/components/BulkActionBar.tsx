import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { useHistoryStore } from '@/store/useHistoryStore'
import { bulkExport } from '@/services/export/historyExport'
import { getErrorMessage } from '@/lib/sanitizeError'
import { useToast } from '@/hooks/useToast'
import { useTranslation } from 'react-i18next'
import { ExportMenu } from './ExportMenu'
import { MoveMenu } from './MoveMenu'

export const BulkActionBar = () => {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const { selectedIds, deselectAll, items, folders, bulkDelete, bulkMove } = useHistoryStore()
  const count = selectedIds.length
  const isVisible = count > 0

  const selectedItems = items.filter(item => selectedIds.includes(item.id))

  const handleExport = (format: 'txt' | 'json' | 'csv') => {
    bulkExport(selectedItems, format)
  }

  const handleBulkDelete = async () => {
    try {
      await bulkDelete()
      showToast('success', t('toast.itemsDeleted', { count }))
    } catch (err) {
      const errorMsg = import.meta.env.DEV ? getErrorMessage(err) : t('toast.error')
      showToast('error', errorMsg)
    }
  }

  const handleBulkMove = async (folderId: string | null) => {
    try {
      await bulkMove(folderId)
      const folderName = folderId 
        ? folders.find(f => f.id === folderId)?.name 
        : t('history.allPrompts')
      showToast('success', t('toast.itemsMoved', { count, folder: folderName }))
    } catch (err) {
      const errorMsg = import.meta.env.DEV ? getErrorMessage(err) : t('toast.error')
      showToast('error', errorMsg)
    }
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-toast"
        >
          <div className="overlay-glass flex items-center gap-4 rounded-full px-4 py-3 shadow-xl sm:px-6">
            <span className="text-label-ui font-medium text-primary">
              {count === 1 ? t('history.itemSelected') : t('history.itemsSelected', { count })}
            </span>
            
            <div className="h-4 w-px bg-border-strong" />
            
            <div className="flex items-center gap-1">
              <ExportMenu onExport={handleExport} />
              <MoveMenu folders={folders} onMove={handleBulkMove} />

              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 cursor-pointer text-muted hover:bg-brand-danger/10 hover:text-brand-danger"
                onClick={handleBulkDelete}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                {t('history.delete')}
              </Button>
            </div>

            <div className="h-4 w-px bg-border-strong" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 md:h-7 md:w-7 text-muted hover:text-primary hover:bg-surface-hover rounded-full cursor-pointer"
                  onClick={deselectAll}
                  aria-label={t('history.deselectAll')}
                >
                  <X className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('history.deselectAll')}</TooltipContent>
            </Tooltip>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
