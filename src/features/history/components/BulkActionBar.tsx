import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, FolderInput, Download, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useHistoryStore } from '@/store/useHistoryStore'
import { bulkExport } from '@/services/export/historyExport'
import { useToast } from '@/hooks/useToast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTranslation } from 'react-i18next'

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
    } catch {
      showToast('error', t('toast.error'))
    }
  }

  const handleBulkMove = async (folderId: string | null) => {
    try {
      await bulkMove(folderId)
      const folderName = folderId 
        ? folders.find(f => f.id === folderId)?.name 
        : t('history.allPrompts')
      showToast('success', t('toast.itemsMoved', { count, folder: folderName }))
    } catch {
      showToast('error', t('toast.error'))
    }
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="flex items-center gap-4 px-6 py-3 rounded-full border border-white/10 bg-black/40 backdrop-blur-md shadow-2xl ring-1 ring-white/20">
            <span className="text-sm font-medium text-white/90">
              {count === 1 ? t('history.itemSelected') : t('history.itemsSelected', { count })}
            </span>
            
            <div className="h-4 w-px bg-white/10" />
            
            <div className="flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
                  >
                    <Download className="mr-2 h-3.5 w-3.5" />
                    {t('history.export')}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-black/90 backdrop-blur-xl border-white/10">
                  <DropdownMenuItem onClick={() => handleExport('txt')} className="cursor-pointer">TXT</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('json')} className="cursor-pointer">JSON</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('csv')} className="cursor-pointer">CSV</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
                  >
                    <FolderInput className="mr-2 h-3.5 w-3.5" />
                    {t('history.move')}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-black/90 backdrop-blur-xl border-white/10">
                  <DropdownMenuItem onClick={() => handleBulkMove(null)} className="cursor-pointer">
                    {t('history.allPrompts')}
                  </DropdownMenuItem>
                  {folders.map(folder => (
                    <DropdownMenuItem key={folder.id} onClick={() => handleBulkMove(folder.id)} className="cursor-pointer">
                      {folder.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 text-destructive/80 hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                onClick={handleBulkDelete}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                {t('history.delete')}
              </Button>
            </div>

            <div className="h-4 w-px bg-white/10" />

                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-white/40 hover:text-white hover:bg-white/10 rounded-full cursor-pointer"
                      onClick={deselectAll}
                    >
                      <X className="h-4 w-4" />
                    </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

