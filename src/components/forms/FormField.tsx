import { AlertCircle } from 'lucide-react'
import type { ReactNode } from 'react'

interface FormFieldProps {
  label: string
  name: string
  error?: string
  required?: boolean
  children: ReactNode
}

export function FormField({ label, name, error, required, children }: FormFieldProps) {
  const errorId = `${name}-error`

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-label-ui">
        {label}
        {required && (
          <span className="ml-1 text-brand-danger" aria-hidden="true">*</span>
        )}
      </label>
      {children}
      {error && (
        <p id={errorId} className="flex items-center gap-1 text-caption-ui text-brand-danger" role="alert">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}
