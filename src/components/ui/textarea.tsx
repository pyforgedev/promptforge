import * as React from "react"
import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  const innerRef = React.useRef<HTMLTextAreaElement>(null)
  React.useImperativeHandle(ref, () => innerRef.current!)

  React.useEffect(() => {
    const textarea = innerRef.current
    if (textarea) {
      const resize = () => {
        textarea.style.height = "auto"
        textarea.style.height = `${textarea.scrollHeight}px`
      }
      textarea.addEventListener("input", resize)
      resize()
      return () => textarea.removeEventListener("input", resize)
    }
  }, [])

  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-border-subtle bg-surface px-3 py-2 text-body-ui transition-colors placeholder:text-muted hover:bg-surface-hover/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-app disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-border-danger",
        className
      )}
      ref={innerRef}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
