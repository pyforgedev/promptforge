'use client'

import { Monitor, Moon, Sun } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAppContext } from '@/hooks/useAppContext'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

const THEME_OPTIONS = [
  { icon: Monitor, value: 'system', label: 'System' },
  { icon: Sun, value: 'light', label: 'Light' },
  { icon: Moon, value: 'dark', label: 'Dark' },
] as const

export function ToggleTheme() {
  const { preferences, setTheme, isReady } = useAppContext()

  if (!isReady) {
    return <div className="flex h-8 w-24" />
  }

  return (
    <div
      className="inline-flex items-center overflow-hidden rounded-md border border-border-subtle bg-surface"
      role="radiogroup"
    >
      {THEME_OPTIONS.map(({ icon: Icon, value, label }) => (
        <Tooltip key={value}>
          <TooltipTrigger asChild>
            <button
              className={cn(
                'relative flex size-7 cursor-pointer items-center justify-center rounded-md transition-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-1 focus-visible:ring-offset-surface',
                preferences.theme === value
                  ? 'text-primary'
                  : 'text-muted hover:text-primary',
              )}
              role="radio"
              aria-checked={preferences.theme === value}
              aria-label={`Switch to ${value} theme`}
              onClick={() => setTheme(value)}
            >
              {preferences.theme === value && (
                <motion.div
                  layoutId="theme-option"
                  transition={{ type: 'spring', bounce: 0.1, duration: 0.75 }}
                  className="absolute inset-0 rounded-md border border-border-strong"
                />
              )}
              <Icon className="relative size-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  )
}
