import { LoadingSpinner } from './LoadingSpinner'

export function LazyFallback() {
  return (
    <div className="flex h-full items-center justify-center">
      <LoadingSpinner />
    </div>
  )
}
