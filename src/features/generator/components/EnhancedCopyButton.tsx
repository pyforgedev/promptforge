import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Copy, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/useToast'

interface EnhancedCopyButtonProps {
  content: string
  aspectRatio?: string
  className?: string
}

export const EnhancedCopyButton = memo(function EnhancedCopyButton({
  content,
  aspectRatio,
  className,
}: EnhancedCopyButtonProps) {
  const { t } = useTranslation()
  const { showCopySuccess } = useToast()

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      showCopySuccess()
    } catch {
      // fallback
    }
  }

  const handleCopyMidjourney = () => {
    const arSuffix = aspectRatio ? ` --ar ${aspectRatio}` : ''
    handleCopy(`${content} --v 6.0${arSuffix}`)
  }

  const handleCopyDalle = () => {
    handleCopy(content) // DALL-E doesn't need suffixes, but we can customize if needed
  }

  return (
    <div className={`flex ${className}`}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleCopy(content)}
        className="flex-1 rounded-r-none border-r-0"
      >
        <Copy className="mr-2 h-4 w-4" />
        {t('generator.copy')}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="px-2 rounded-l-none">
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleCopy(content)}>
            {t('generator.copy')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCopyMidjourney}>
            {t('generator.copyMidjourney')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCopyDalle}>
            {t('generator.copyDalle')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
})
