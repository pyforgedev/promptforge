import { Plus, Folder as FolderIcon, MoreVertical, Globe, MapPin, Trash2, Edit2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
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
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/useToast'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export const FolderSidebar = () => {
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

  const handleCreateFolder = async () => {
    try {
      await createFolder(t('history.newFolder'))
      showToast('success', t('toast.folderCreated'))
    } catch {
      showToast('error', t('toast.error'))
    }
  }

  const handleDeleteFolder = async (id: string) => {
    try {
      await removeFolder(id)
      showToast('success', t('toast.folderDeleted'))
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
    <div className="flex flex-col w-64 h-full border-r border-white/5 bg-black/20 backdrop-blur-xl">
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white/90">{t('history.library')}</h2>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 rounded-md transition-colors hover:bg-white/10"
            onClick={handleCreateFolder}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-white/5 border border-white/5">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 text-xs gap-2 rounded-md transition-all cursor-pointer",
              searchMode === 'local' ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60 hover:bg-white/5"
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
              "h-7 text-xs gap-2 rounded-md transition-all cursor-pointer",
              searchMode === 'global' ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60 hover:bg-white/5"
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
              currentFolderId === null ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"
            )}
            onClick={() => setCurrentFolder(null)}
          >
            <FolderIcon className="h-4 w-4" />
            <span className="text-sm font-medium">{t('history.allPrompts')}</span>
          </Button>

          {folders.map((folder) => (
            <div key={folder.id} className="group flex items-center gap-1">
              <Button
                variant="ghost"
                className={cn(
                  "flex-1 justify-start gap-2 h-9 px-3 rounded-md transition-colors cursor-pointer",
                  currentFolderId === folder.id ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"
                )}
                onClick={() => setCurrentFolder(folder.id)}
              >
                <FolderIcon className="h-4 w-4" />
                <span className="text-sm font-medium truncate">{folder.name}</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 transition-opacity rounded-md text-white/40 hover:text-white hover:bg-white/10 cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-black/90 backdrop-blur-xl border-white/10">
                  <DropdownMenuItem 
                    className="gap-2 cursor-pointer"
                    onClick={() => setRenamingFolder({ id: folder.id, name: folder.name })}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    {t('history.rename')}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="gap-2 text-destructive focus:text-destructive cursor-pointer"
                    onClick={() => handleDeleteFolder(folder.id)}
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
        <DialogContent className="bg-black/90 backdrop-blur-xl border-white/10 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white/90">{t('history.renameFolder')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRenameSubmit} className="space-y-4 pt-4">
            <Input
              value={renamingFolder?.name || ''}
              onChange={(e) => setRenamingFolder(prev => prev ? { ...prev, name: e.target.value } : null)}
              className="bg-white/5 border-white/10 text-white focus-visible:ring-primary/50"
              autoFocus
            />
            <DialogFooter>
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setRenamingFolder(null)}
                className="text-white/60 hover:text-white hover:bg-white/5"
              >
                {t('common.cancel')}
              </Button>
              <Button 
                type="submit"
                className="bg-primary text-white hover:bg-primary/90 shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                disabled={!renamingFolder?.name.trim()}
              >
                {t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

