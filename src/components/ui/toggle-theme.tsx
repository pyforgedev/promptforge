import { MonitorCogIcon, MoonStarIcon, SunIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useAppContext } from '@/hooks/useAppContext'

const THEME_OPTIONS = [
  {
    icon: MonitorCogIcon,
    value: 'system' as const,
  },
  {
    icon: SunIcon,
    value: 'light' as const,
  },
  {
    icon: MoonStarIcon,
    value: 'dark' as const,
  },
]

export function ToggleTheme() {
  const { preferences, setTheme } = useAppContext()

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="bg-muted/80 inline-flex items-center overflow-hidden rounded-md border"
      role="radiogroup"
    >
      {THEME_OPTIONS.map((option) => (
        <button
          key={option.value}
          className={cn(
            'relative flex size-7 cursor-pointer items-center justify-center rounded-md transition-all',
            preferences.theme === option.value
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
          role="radio"
          aria-checked={preferences.theme === option.value}
          aria-label={`Switch to ${option.value} theme`}
          onClick={() => setTheme(option.value)}
        >
          {preferences.theme === option.value && (
            <motion.div
              layoutId="theme-option"
              transition={{ type: 'spring', bounce: 0.1, duration: 0.75 }}
              className="border-muted-foreground/50 absolute inset-0 rounded-md border"
            />
          )}
          <option.icon className="size-3.5" />
        </button>
      ))}
    </motion.div>
  )
}
