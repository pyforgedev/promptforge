import { Plus, Folder as FolderIcon, MoreVertical, Globe, MapPin, Trash2, Edit2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { useHistoryStore } from '@/store/useHistoryStore'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/useToast'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface FolderSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export const FolderSidebar = ({ isOpen, onClose }: FolderSidebarProps) => {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const { 
    folders, 
    currentFolderId, 
    setCurrentFolder, 
    searchMode, 
    setSearchMode,
    createFolder,
    renameFolder,
    removeFolder
  } = useHistoryStore()

  const [renamingFolder, setRenamingFolder] = useState<{ id: string, name: string } | null>(null)
  const [deleteFolderId, setDeleteFolderId] = useState<string | null>(null)

  const handleCreateFolder = async () => {
    try {
      await createFolder(t('history.newFolder'))
      showToast('success', t('toast.folderCreated'))
    } catch {
      showToast('error', t('toast.error'))
    }
  }

  const confirmDeleteFolder = async () => {
    if (!deleteFolderId) return
    try {
      await removeFolder(deleteFolderId)
      showToast('success', t('toast.folderDeleted'))
      setDeleteFolderId(null)
    } catch {
      showToast('error', t('toast.error'))
    }
  }

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (renamingFolder) {
      try {
        await renameFolder(renamingFolder.id, renamingFolder.name)
        showToast('success', t('toast.folderRenamed'))
        setRenamingFolder(null)
      } catch {
        showToast('error', t('toast.error'))
      }
    }
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-drawer bg-black/70 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "flex flex-col h-full border-r border-border-subtle bg-surface/80 backdrop-blur-md",
          "fixed left-0 top-16 z-drawer w-[260px] transition-transform duration-200 md:static md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-border-subtle">
          <h2 className="text-label-ui font-semibold text-primary">{t('history.library')}</h2>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="min-h-[40px] min-w-[40px] md:min-h-0 md:min-w-0 md:h-7 md:w-7 rounded-md transition-colors hover:bg-surface-hover md:hidden cursor-pointer"
                  onClick={onClose}
                  aria-label={t('common.close')}
                >
                  <X className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('common.close')}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="min-h-[40px] min-w-[40px] md:min-h-0 md:min-w-0 md:h-7 md:w-7 rounded-md transition-colors hover:bg-surface-hover cursor-pointer"
                  onClick={handleCreateFolder}
                  aria-label={t('history.newFolder')}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('history.newFolder')}</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="p-4 border-b border-border-subtle">
          <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-surface-hover border border-border-subtle">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 text-caption-ui gap-2 rounded-md transition-all cursor-pointer",
                searchMode === 'local' ? "bg-brand-primary/10 text-brand-primary" : "text-muted hover:text-secondary hover:bg-surface-hover"
              )}
              onClick={() => setSearchMode('local')}
            >
              <MapPin className="h-3 w-3" />
              {t('history.local')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 text-caption-ui gap-2 rounded-md transition-all cursor-pointer",
                searchMode === 'global' ? "bg-brand-primary/10 text-brand-primary" : "text-muted hover:text-secondary hover:bg-surface-hover"
              )}
              onClick={() => setSearchMode('global')}
            >
              <Globe className="h-3 w-3" />
              {t('history.global')}
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 px-2 py-4">
          <div className="space-y-1">
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-2 h-9 px-3 rounded-md transition-colors cursor-pointer",
                currentFolderId === null ? "bg-brand-primary/10 text-brand-primary" : "text-muted hover:text-primary hover:bg-surface-hover"
              )}
              onClick={() => { setCurrentFolder(null); onClose() }}
            >
              <FolderIcon className="h-4 w-4" />
              <span className="text-label-ui font-medium">{t('history.allPrompts')}</span>
            </Button>

            {folders.map((folder) => (
              <div key={folder.id} className="group flex items-center gap-1">
                <Button
                  variant="ghost"
                  className={cn(
                    "flex-1 justify-start gap-2 h-9 px-3 rounded-md transition-colors cursor-pointer",
                    currentFolderId === folder.id ? "bg-brand-primary/10 text-brand-primary" : "text-muted hover:text-primary hover:bg-surface-hover"
                  )}
                  onClick={() => { setCurrentFolder(folder.id); onClose() }}
                >
                  <FolderIcon className="h-4 w-4" />
                  <span className="text-label-ui font-medium truncate">{folder.name}</span>
                </Button>
                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 transition-opacity rounded-md text-muted hover:text-primary hover:bg-surface-hover cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                          aria-label={t('common.options')}
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent>{t('common.options')}</TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="end" className="overlay-glass border-border-strong z-modal">
                    <DropdownMenuItem 
                      className="gap-2 cursor-pointer"
                      onClick={() => setRenamingFolder({ id: folder.id, name: folder.name })}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      {t('history.rename')}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="gap-2 text-brand-danger focus:text-brand-danger cursor-pointer"
                      onClick={() => setDeleteFolderId(folder.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t('history.delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        </ScrollArea>

        <Dialog open={!!renamingFolder} onOpenChange={(open) => !open && setRenamingFolder(null)}>
          <DialogContent className="overlay-glass sm:max-w-md" aria-describedby="rename-folder-desc">
            <DialogHeader>
              <DialogTitle className="text-primary">{t('history.renameFolder')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleRenameSubmit} className="space-y-4 pt-4">
              <Input
                value={renamingFolder?.name || ''}
                onChange={(e) => setRenamingFolder(prev => prev ? { ...prev, name: e.target.value } : null)}
                autoFocus
              />
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setRenamingFolder(null)}
                >
                  {t('common.cancel')}
                </Button>
                <Button 
                  type="submit"
                  disabled={!renamingFolder?.name.trim()}
                >
                  {t('common.save')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deleteFolderId} onOpenChange={(open) => !open && setDeleteFolderId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('history.deleteFolderTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('history.deleteFolderConfirmation')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-border-subtle bg-transparent hover:bg-surface-hover">{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteFolder}
                className="bg-brand-danger text-text-on-brand hover:bg-brand-danger/90"
              >
                {t('common.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </aside>
    </>
  )
}

