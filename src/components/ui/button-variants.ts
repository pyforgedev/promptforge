import { cva, type VariantProps } from "class-variance-authority"

export const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md text-label-ui font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-app disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "btn-press bg-brand-primary text-text-on-brand hover:bg-brand-primary-hover",
        destructive:
          "btn-press bg-brand-danger text-text-on-brand hover:bg-brand-danger/90",
        outline:
          "border border-border-subtle bg-transparent hover:bg-surface-hover text-primary",
        secondary:
          "bg-surface-hover text-primary hover:bg-surface",
        ghost: "text-primary hover:bg-surface-hover border border-transparent hover:border-border-subtle",
        link: "text-brand-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export type ButtonVariantProps = VariantProps<typeof buttonVariants>
