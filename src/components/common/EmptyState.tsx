import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border-subtle bg-surface px-6 py-10 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
        <Inbox className="h-5 w-5" />
      </div>
      <h3 className="text-heading text-primary">
        {title}
      </h3>
      {description && (
        <p className="max-w-sm text-body-ui text-muted">
          {description}
        </p>
      )}
      {action && <div className="pt-1">{action}</div>}
    </div>
  )
}
