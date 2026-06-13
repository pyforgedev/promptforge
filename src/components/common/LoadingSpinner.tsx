import { Loader2 } from 'lucide-react'

interface LoadingSpinnerProps {
  size?: number
  message?: string
}

export function LoadingSpinner({ size = 24, message }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12">
      <Loader2 className="animate-spin text-primary" style={{ width: size, height: size }} />
      {message && (
        <p className="text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  )
}
