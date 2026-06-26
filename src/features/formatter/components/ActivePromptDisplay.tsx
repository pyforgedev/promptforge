import { Maximize2, Hash } from 'lucide-react'
import type { FormatterItem } from '../types'

interface ActivePromptDisplayProps {
  item: FormatterItem
}

export function ActivePromptDisplay({ item }: ActivePromptDisplayProps) {
  return (
    <div className="card-spotlight flex min-h-[160px] flex-col gap-4 rounded-xl border border-border-subtle bg-surface p-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-caption-ui text-muted">
          <Hash className="h-3.5 w-3.5" />
          <span>Prompt #{item.order + 1}</span>
        </div>
        {item.detectedAspectRatio && (
          <div className="flex items-center gap-1.5 rounded-full bg-brand-primary/10 px-2.5 py-1 text-caption-ui font-medium text-brand-primary">
            <Maximize2 className="h-3.5 w-3.5" />
            {item.detectedAspectRatio}
          </div>
        )}
      </div>
      <div className="flex-1">
        <p className="whitespace-pre-wrap break-words font-mono text-[14px] leading-[1.75] text-primary">
          {item.promptText}
        </p>
      </div>
    </div>
  )
}
