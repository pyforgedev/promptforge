import { AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { CardSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/common/EmptyState'
import { Button } from '@/components/ui/button'
import { TemplateCard } from '@/features/templates/components/TemplateCard'
import type { PromptTemplate } from '@/features/templates/types'
import type { TemplateErrorCode } from '@/features/templates/services/templateService'

interface TemplateListProps {
  templates: PromptTemplate[]
  loading: boolean
  loadError: TemplateErrorCode | null
  onEdit: (template: PromptTemplate) => void
  onDelete: (id: string) => void
  onUseAsReference?: (template: PromptTemplate) => void
  onCreate?: () => void
}

export function TemplateList({ templates, loading, loadError, onEdit, onDelete, onUseAsReference, onCreate }: TemplateListProps) {
  const { t } = useTranslation()

  if (loading) {
    return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-live="polite">{Array.from({ length: 6 }).map((_, index) => <CardSkeleton key={index} />)}</div>
  }

  return (
    <div className="flex flex-col gap-4">
      {loadError && (
        <div role="alert" className="overlay-glass flex items-start gap-2 rounded-r-lg border-l-[3px] border-l-brand-danger p-4 text-body-ui">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-danger" />
          <span className="text-secondary">{t('templates.errors.loadFailed')}</span>
        </div>
      )}
      {templates.length === 0 ? (
        <EmptyState
          title={t('templates.empty.title')}
          description={t('templates.empty.description')}
          action={onCreate ? <Button onClick={onCreate}>{t('templates.empty.createAction')}</Button> : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => <TemplateCard key={template.id} template={template} onEdit={onEdit} onDelete={onDelete} onUseAsReference={onUseAsReference} />)}
        </div>
      )}
    </div>
  )
}
