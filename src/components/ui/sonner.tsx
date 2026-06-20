import {
  CircleCheck,
  Info,
  LoaderCircle,
  OctagonX,
  TriangleAlert,
} from "lucide-react"
import { useAppContext } from "@/hooks/useAppContext"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { preferences } = useAppContext()
  const theme = preferences.theme || "system"

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-right"
      visibleToasts={3}
      expand={true}
      icons={{
        success: <CircleCheck className="h-4 w-4" />,
        info: <Info className="h-4 w-4" />,
        warning: <TriangleAlert className="h-4 w-4" />,
        error: <OctagonX className="h-4 w-4" />,
        loading: <LoaderCircle className="h-4 w-4 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-surface/80 group-[.toaster]:text-primary group-[.toaster]:border-border-strong group-[.toaster]:shadow-xl group-[.toaster]:backdrop-blur-md",
          description: "group-[.toast]:text-secondary",
          actionButton:
            "group-[.toast]:bg-brand-primary group-[.toast]:text-text-on-brand",
          cancelButton:
            "group-[.toast]:bg-surface-hover group-[.toast]:text-primary",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
