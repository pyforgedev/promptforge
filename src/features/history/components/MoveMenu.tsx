import { FolderInput } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTranslation } from 'react-i18next'
import type { Folder } from '@/features/history/types'

interface MoveMenuProps {
  folders: Folder[]
  onMove: (folderId: string | null) => void
}

export function MoveMenu({ folders, onMove }: MoveMenuProps) {
  const { t } = useTranslation()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 text-secondary hover:text-primary hover:bg-surface-hover cursor-pointer"
        >
          <FolderInput className="mr-2 h-3.5 w-3.5" />
          {t('history.move')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="overlay-glass border-border-strong">
        <DropdownMenuItem onClick={() => onMove(null)} className="cursor-pointer">
          {t('history.allPrompts')}
        </DropdownMenuItem>
        {folders.map(folder => (
          <DropdownMenuItem key={folder.id} onClick={() => onMove(folder.id)} className="cursor-pointer">
            {folder.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
