import { useTranslation } from 'react-i18next'
import { Info, ExternalLink } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const PASTE_FORMAT_DOCS_URL =
  'https://github.com/pyforgedev/promptforge/blob/main/docs/supported-format-paste.md'

export function PasteHelpDialog() {
  const { t } = useTranslation()
  const title = t('formatter.pasteHelpTitle')

  return (
    <Dialog>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <button
              type="button"
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-hover hover:text-primary"
              aria-label={title}
            >
              <Info className="h-4 w-4" />
            </button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent side="top">{title}</TooltipContent>
      </Tooltip>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{t('formatter.pasteHelpDescription')}</DialogDescription>
        </DialogHeader>
        <a
          href={PASTE_FORMAT_DOCS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-label-ui font-medium text-brand-primary transition-colors hover:text-brand-primary-hover"
        >
          {t('formatter.pasteHelpLink')}
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </DialogContent>
    </Dialog>
  )
}
