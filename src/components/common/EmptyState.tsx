import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border p-12 text-center">
      <Inbox className="h-12 w-12 text-muted" />
      <h3 className="text-heading text-primary">
        {title}
      </h3>
      {description && (
        <p className="max-w-sm text-body-ui text-muted">
          {description}
        </p>
      )}
      {action}
    </div>
  )
}
