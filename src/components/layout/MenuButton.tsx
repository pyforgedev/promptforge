import { PanelLeft, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

interface MenuButtonProps {
  onClick: () => void
  className?: string
  label: string
  variant: 'open' | 'close'
}

/**
 * Panel toggle button with a smooth icon crossfade on hover:
 * open  = PanelLeft     → hover PanelLeftOpen
 * close = PanelLeftClose → hover PanelLeft
 */
export function MenuButton({ onClick, className = '', label, variant }: MenuButtonProps) {
  const RestIcon = variant === 'open' ? PanelLeft : PanelLeftClose
  const HoverIcon = variant === 'open' ? PanelLeftOpen : PanelLeft

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          className={`group cursor-pointer rounded-md p-1.5 transition-colors duration-150 hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-app ${className}`}
          onClick={onClick}
          aria-label={label}
        >
          <span className="relative flex h-5 w-5 items-center justify-center">
            <RestIcon className="absolute h-5 w-5 text-primary transition-all duration-[120ms] ease-out group-hover:scale-75 group-hover:rotate-[-10deg] group-hover:opacity-0" />
            <HoverIcon className="absolute h-5 w-5 scale-75 rotate-[-10deg] text-primary opacity-0 transition-all duration-[120ms] ease-out group-hover:scale-100 group-hover:rotate-0 group-hover:opacity-100" />
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {label}
      </TooltipContent>
    </Tooltip>
  )
}