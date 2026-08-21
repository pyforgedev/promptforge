import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Clock, Pencil, Sparkles, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { hasGeneratorSettings, type PromptTemplate } from '@/features/templates/types'

interface TemplateCardProps {
  template: PromptTemplate
  onEdit: (template: PromptTemplate) => void
  onDelete: (id: string) => void
  onUseAsReference?: (template: PromptTemplate) => void
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(timestamp)
}

export const TemplateCard = memo(function TemplateCard({
  template,
  onEdit,
  onDelete,
  onUseAsReference,
}: TemplateCardProps) {
  const { t } = useTranslation()
  const metadataKey = hasGeneratorSettings(template)
    ? 'templates.fullMetadataBadge'
    : 'templates.textOnlyBadge'

  return (
    <Card className="group transition-all duration-200 hover:border-border-strong hover:bg-surface-hover card-spotlight">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-heading">{template.name}</CardTitle>
          <span className="shrink-0 rounded-full bg-brand-primary/10 px-2.5 py-0.5 text-caption-ui font-medium text-brand-primary">
            {t(`templates.categories.${template.category}`, { defaultValue: template.category })}
          </span>
        </div>
        <span className="w-fit rounded-md bg-surface-hover px-2 py-0.5 text-caption-ui text-muted">
          {t(metadataKey)}
        </span>
      </CardHeader>
      <CardContent>
        <p className="line-clamp-3 text-body-mono text-secondary">{template.content}</p>
        {template.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {template.tags.map((tag) => <span key={tag} className="rounded-md bg-surface-hover px-2 py-0.5 text-caption-ui text-secondary">{tag}</span>)}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-caption-ui text-muted">
          <Clock className="h-3.5 w-3.5" />
          {formatDate(template.updatedAt)}
        </div>
        <div className="flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          {onUseAsReference && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => onUseAsReference(template)} aria-label={t('templates.useAsReference')}>
                  <Sparkles className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('templates.useAsReference')}</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => onEdit(template)} aria-label={t('common.edit')}><Pencil className="h-4 w-4" /></Button>
            </TooltipTrigger>
            <TooltipContent>{t('common.edit')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => onDelete(template.id)} aria-label={t('common.delete')}><Trash2 className="h-4 w-4" /></Button>
            </TooltipTrigger>
            <TooltipContent>{t('common.delete')}</TooltipContent>
          </Tooltip>
        </div>
      </CardFooter>
    </Card>
  )
})
