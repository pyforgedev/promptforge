import { useTranslation } from 'react-i18next'
import type { Prompt } from '@/types'
import { PromptCard } from './PromptCard'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

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
      <div className="overlay-glass border-l-[3px] border-l-brand-danger p-4 text-body-ui rounded-r-lg text-brand-danger">
        {error}
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
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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
