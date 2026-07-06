import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTranslation } from 'react-i18next'

interface ExportMenuProps {
  onExport: (format: 'txt' | 'json' | 'csv') => void
}

export function ExportMenu({ onExport }: ExportMenuProps) {
  const { t } = useTranslation()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 text-secondary hover:text-primary hover:bg-surface-hover cursor-pointer"
        >
          <Download className="mr-2 h-3.5 w-3.5" />
          {t('history.export')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="overlay-glass border-border-strong">
        <DropdownMenuItem onClick={() => onExport('txt')} className="cursor-pointer">TXT</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onExport('json')} className="cursor-pointer">JSON</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onExport('csv')} className="cursor-pointer">CSV</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
