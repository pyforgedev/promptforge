import { useReducedMotion, motion } from 'framer-motion'
import { cn } from '@/lib/utils'

function Skeleton({
  className,
  withShimmer = true,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { withShimmer?: boolean }) {
  const shouldReduceMotion = useReducedMotion()
  const showShimmer = withShimmer && !shouldReduceMotion

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md bg-border-subtle',
        className
      )}
      aria-hidden="true"
      {...props}
    >
      {showShimmer && (
        <motion.div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, var(--shimmer, rgba(255,255,255,0.08)) 50%, transparent 100%)',
            mixBlendMode: 'overlay',
          }}
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{
            repeat: Infinity,
            duration: 1.8,
            ease: [0.25, 0.1, 0.25, 1],
          }}
        />
      )}
    </div>
  )
}

function CardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border-subtle bg-surface">
      <div className="flex items-center justify-between border-b border-border-subtle px-4 py-2.5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="flex gap-4 border-b border-border-subtle px-4 py-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="space-y-3 px-4 py-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-[92%]" />
        <Skeleton className="h-4 w-[85%]" />
        <Skeleton className="h-4 w-[70%]" />
      </div>
      <div className="flex items-center justify-between border-t border-border-subtle px-4 py-2.5">
        <div className="flex gap-2">
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>
    </div>
  )
}

function HistoryCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-surface p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-[88%]" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-7 w-16 rounded-md" />
        <Skeleton className="h-7 w-16 rounded-md" />
      </div>
    </div>
  )
}

function MetricTileSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border-subtle bg-surface p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-24" />
        </div>
        <Skeleton className="h-9 w-9 rounded-lg" />
      </div>
    </div>
  )
}

function RecentPromptItemSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-surface p-4">
      <div className="flex gap-2">
        <Skeleton className="h-5 w-20 rounded-md" />
        <Skeleton className="h-5 w-24 rounded-md" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-[75%]" />
      <div className="flex justify-end">
        <Skeleton className="h-7 w-16 rounded-md" />
      </div>
    </div>
  )
}

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6" role="status" aria-live="polite">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-[300px] w-full rounded-xl" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    </div>
  )
}

function FormSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface p-6">
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-10 w-28 rounded-lg" />
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>
    </div>
  )
}

function FormatterSkeleton() {
  return (
    <div className="flex flex-col gap-6 md:gap-8" role="status" aria-live="polite">
      <div className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-surface p-5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[85%]" />
        </div>
      </div>
      <div className="rounded-xl border border-border-subtle bg-surface p-6">
        <Skeleton className="h-[420px] w-full rounded-lg" />
      </div>
      <div className="flex items-center justify-between rounded-xl border border-border-subtle bg-surface p-5">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
    </div>
  )
}

export { Skeleton, CardSkeleton, HistoryCardSkeleton, MetricTileSkeleton, RecentPromptItemSkeleton, PageSkeleton, FormSkeleton, FormatterSkeleton }
