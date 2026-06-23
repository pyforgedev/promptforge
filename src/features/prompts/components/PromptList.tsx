import { useTranslation } from 'react-i18next'
import type { Prompt } from '@/types'
import { PromptCard } from './PromptCard'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { AlertCircle } from 'lucide-react'

interface PromptListProps {
  prompts: Prompt[]
  loading: boolean
  error: string | null
  onEdit: (prompt: Prompt) => void
  onDelete: (id: string) => void
  onUseAsReference?: (prompt: Prompt) => void
}

export function PromptList({
  prompts,
  loading,
  error,
  onEdit,
  onDelete,
  onUseAsReference,
}: PromptListProps) {
  const { t } = useTranslation()

  if (loading) return <LoadingSpinner />

  if (error) {
    return (
      <div className="overlay-glass flex items-start gap-2 rounded-r-lg border-l-[3px] border-l-brand-danger p-4 text-body-ui">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-danger" />
        <span className="text-secondary">{error}</span>
      </div>
    )
  }

  if (prompts.length === 0) {
    return (
      <EmptyState
        title={t('prompts.emptyTitle')}
        description={t('prompts.emptyDescription')}
      />
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {prompts.map((prompt) => (
        <PromptCard
          key={prompt.id}
          prompt={prompt}
          onEdit={onEdit}
          onDelete={onDelete}
          onUseAsReference={onUseAsReference}
        />
      ))}
    </div>
  )
}
