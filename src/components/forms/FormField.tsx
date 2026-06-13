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
      <label htmlFor={name} className="text-sm font-medium">
        {label}
        {required && (
          <span className="ml-1 text-destructive" aria-hidden="true">*</span>
        )}
      </label>
      {children}
      {error && (
        <p id={errorId} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
