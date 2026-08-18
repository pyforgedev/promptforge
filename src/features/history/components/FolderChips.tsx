import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Folder as FolderIcon, Inbox, MoreVertical, Edit2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useHistoryStore } from '@/store/useHistoryStore'
import { useToast } from '@/hooks/useToast'
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
import type { Folder } from '@/features/history/types'

interface ChipProps {
  label: string
  count: number
  icon: React.ReactNode
  active: boolean
  onClick: () => void
  onRename?: () => void
  onDelete?: () => void
}

function FolderChip({ label, count, icon, active, onClick, onRename, onDelete }: ChipProps) {
  const { t } = useTranslation()
  const hasMenu = Boolean(onRename && onDelete)

  return (
    <div
      className={cn(
        "group flex shrink-0 items-center rounded-full border transition-colors duration-150",
        active
          ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
          : "border-border-subtle bg-surface text-secondary hover:border-border-strong hover:bg-surface-hover hover:text-primary"
      )}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-10 gap-2 rounded-full px-3 cursor-pointer lg:h-9"
            onClick={onClick}
            aria-pressed={active}
          >
            <span className="shrink-0 [&_svg]:h-3.5 [&_svg]:w-3.5">{icon}</span>
            <span className="max-w-32 truncate text-label-ui font-medium">{label}</span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-caption-ui tabular-nums",
                active ? "bg-brand-primary/10 text-brand-primary" : "bg-surface-hover text-muted"
              )}
            >
              {count}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      {hasMenu && (
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full text-muted transition-opacity cursor-pointer hover:text-primary hover:bg-surface-hover lg:h-8 lg:w-8"
                  onClick={(e) => e.stopPropagation()}
                  aria-label={t('common.options')}
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>{t('common.options')}</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" className="overlay-glass border-border-strong">
            <DropdownMenuItem className="gap-2 cursor-pointer" onClick={onRename}>
              <Edit2 className="h-3.5 w-3.5" />
              {t('history.rename')}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-2 cursor-pointer text-muted focus:text-brand-danger"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t('history.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}

export const FolderChips = () => {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const {
    folders,
    folderCounts,
    totalPromptCount,
    currentFolderId,
    setCurrentFolder,
    renameFolder,
    removeFolder,
  } = useHistoryStore()

  const [renamingFolder, setRenamingFolder] = useState<{ id: string, name: string } | null>(null)
  const [deleteFolderId, setDeleteFolderId] = useState<string | null>(null)

  if (folders.length === 0) return null

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!renamingFolder) return
    try {
      await renameFolder(renamingFolder.id, renamingFolder.name)
      showToast('success', t('toast.folderRenamed'))
      setRenamingFolder(null)
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

  return (
    <>
      <div className="chips-scrollbar flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-gutter:stable]">
        <FolderChip
          label={t('history.allPrompts')}
          count={totalPromptCount}
          icon={<Inbox />}
          active={currentFolderId === null}
          onClick={() => setCurrentFolder(null)}
        />
        {folders.map((folder: Folder) => (
          <FolderChip
            key={folder.id}
            label={folder.name}
            count={folderCounts[folder.id] ?? 0}
            icon={<FolderIcon />}
            active={currentFolderId === folder.id}
            onClick={() => setCurrentFolder(folder.id)}
            onRename={() => setRenamingFolder({ id: folder.id, name: folder.name })}
            onDelete={() => setDeleteFolderId(folder.id)}
          />
        ))}
      </div>

      <Dialog open={!!renamingFolder} onOpenChange={(open) => !open && setRenamingFolder(null)}>
        <DialogContent className="overlay-glass sm:max-w-md">
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
    </>
  )
}