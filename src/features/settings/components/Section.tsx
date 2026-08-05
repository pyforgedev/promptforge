import type { ReactNode, ComponentType } from 'react'

export function FieldRow({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label htmlFor={htmlFor} className="shrink-0 text-label-ui text-primary">
        {label}
      </label>
      <div className="w-full max-w-sm">
        {children}
      </div>
    </div>
  )
}

export function SectionGroup({
  icon: Icon,
  title,
  children,
}: {
  icon: ComponentType<{ className?: string }>
  title: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-muted" />
        <span className="text-caption-ui font-semibold text-secondary">{title}</span>
      </div>
      <div className="flex flex-col gap-4 pl-5">
        {children}
      </div>
    </div>
  )
}

export function SectionDivider() {
  return <div className="border-t border-border-subtle" />
}
