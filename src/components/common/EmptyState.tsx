import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border p-12 text-center">
      <Inbox className="h-12 w-12 text-muted-foreground" />
      <h3 className="text-lg font-medium text-foreground">
        {title}
      </h3>
      {description && (
        <p className="max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {action}
    </div>
  )
}
