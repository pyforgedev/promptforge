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
      className="toaster"
      position="top-right"
      offset={{ top: 64 }}
      mobileOffset={{ top: 64 }}
      visibleToasts={3}
      expand={false}
      duration={4000}
      containerAriaLabel="Notifications"
      icons={{
        success: <CircleCheck className="h-4 w-4" />,
        info: <Info className="h-4 w-4" />,
        warning: <TriangleAlert className="h-4 w-4" />,
        error: <OctagonX className="h-4 w-4" />,
        loading: <LoaderCircle className="h-4 w-4 motion-safe:animate-pulse" />,
      }}
      {...props}
    />
  )
}

export { Toaster }
