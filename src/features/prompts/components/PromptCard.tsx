import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil, Trash2, Clock, Sparkles } from 'lucide-react'
import type { Prompt } from '@/types'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface PromptCardProps {
  prompt: Prompt
  onEdit: (prompt: Prompt) => void
  onDelete: (id: string) => void
  onUseAsReference?: (prompt: Prompt) => void
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(timestamp)
}

export const PromptCard = memo(function PromptCard({ prompt, onEdit, onDelete, onUseAsReference }: PromptCardProps) {
  const { t } = useTranslation()

  return (
    <Card className="cursor-pointer transition-all duration-200 hover:border-primary/30">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">{prompt.name}</CardTitle>
          <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            {prompt.category}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <p className="line-clamp-3 text-sm text-muted-foreground">
          {prompt.content}
        </p>
        {prompt.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {prompt.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          {formatDate(prompt.updatedAt)}
        </div>
        <div className="flex gap-1">
          {onUseAsReference && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => { e.stopPropagation(); onUseAsReference(prompt) }}
              aria-label={t('templates.useAsReference')}
              title={t('templates.useAsReference')}
            >
              <Sparkles className="h-4 w-4 text-primary" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => { e.stopPropagation(); onEdit(prompt) }}
            aria-label={t('common.edit')}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => { e.stopPropagation(); onDelete(prompt.id) }}
            aria-label={t('common.delete')}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
})
