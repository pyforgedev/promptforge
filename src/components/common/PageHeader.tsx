interface PageHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between animate-stagger-1">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-display text-primary">
          {title}
        </h1>
        {description && (
          <p className="text-body-ui text-secondary max-w-prose">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
