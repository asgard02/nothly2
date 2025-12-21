import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-bold border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-x-[4px] active:translate-y-[4px] active:shadow-none hover:-translate-y-[1px] hover:-translate-x-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-black text-white hover:bg-gray-800",
        destructive: "bg-red-500 text-white hover:bg-red-600",
        outline: "bg-white text-black hover:bg-gray-50",
        secondary: "bg-[#F472B6] text-black hover:bg-[#F472B6]/90",
        ghost: "border-transparent shadow-none hover:shadow-none hover:bg-black/5 active:translate-x-0 active:translate-y-0",
        link: "text-primary underline-offset-4 hover:underline border-none shadow-none",
        neo: "bg-[#8B5CF6] text-white hover:bg-[#7C3AED]", // Violet primary
      },
      size: {
        default: "h-12 px-6 py-2",
        sm: "h-10 rounded-lg px-4",
        lg: "h-14 rounded-lg px-10 text-lg",
        icon: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

