interface LoadingSpinnerProps {
  size?: number
  message?: string
}

export function LoadingSpinner({ size = 24, message }: LoadingSpinnerProps) {
  const dotSize = Math.max(6, Math.round(size / 4))

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12" role="status" aria-live="polite">
      <div className="flex items-center gap-1.5" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="rounded-full bg-border-subtle motion-safe:animate-pulse"
            style={{ width: dotSize, height: dotSize, animationDelay: `${index * 120}ms` }}
          />
        ))}
      </div>
      {message && (
        <p className="text-body-ui text-muted">{message}</p>
      )}
    </div>
  )
}
