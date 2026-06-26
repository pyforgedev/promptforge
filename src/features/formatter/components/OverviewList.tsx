import { cn } from '@/lib/utils'
import { Check, Play } from 'lucide-react'
import type { FormatterItem } from '../types'
import { useRef, useEffect } from 'react'

interface OverviewListProps {
  items: FormatterItem[]
  currentIndex: number
  onJump: (index: number) => void
}

export function OverviewList({ items, currentIndex, onJump }: OverviewListProps) {
  const activeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ block: 'nearest' })
    }
  }, [currentIndex])

  return (
    <div className="flex flex-col gap-0.5 py-2 px-2">
      {items.map((item, idx) => {
        const isCurrent = idx === currentIndex
        const isCopied = item.status === 'copied'
        return (
          <button
            key={item.id ?? idx}
            ref={isCurrent ? activeRef : null}
            onClick={() => onJump(idx)}
            className={cn(
              'group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all duration-150',
              isCurrent && 'bg-brand-primary/10 ring-1 ring-brand-primary/30',
              !isCurrent && isCopied && 'opacity-60 hover:opacity-90',
              !isCurrent && !isCopied && 'hover:bg-surface-hover'
            )}
          >
            <span className={cn(
              'flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-caption-ui font-medium transition-all',
              isCurrent ? 'bg-brand-primary text-text-on-brand' : 'bg-surface-hover text-muted'
            )}>
              {isCurrent ? <Play className="h-3 w-3 fill-current" /> : item.order + 1}
            </span>
            <span className={cn(
              'flex-1 truncate font-mono text-[13px] leading-relaxed',
              isCopied ? 'text-muted line-through decoration-muted/30' : 'text-primary'
            )}>
              {item.promptText}
            </span>
            {isCopied ? (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-success/15">
                <Check className="h-3 w-3 text-brand-success" />
              </span>
            ) : isCurrent ? (
              <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-brand-primary" />
            ) : (
              <span className="h-2 w-2 shrink-0 rounded-full bg-border-subtle" />
            )}
          </button>
        )
      })}
    </div>
  )
}
