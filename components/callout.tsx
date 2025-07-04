// Tremor Callout [v0.0.1]

import React from "react"
import { tv, type VariantProps } from "tailwind-variants"

import { cn } from "@/lib/utils"

const calloutVariants = tv({
  base: "flex flex-col overflow-hidden rounded-xl p-4 text-sm",
  variants: {
    variant: {
      default: [
        // text color
        "text-blue-900 dark:text-blue-400",
        // background color
        "bg-blue-50 dark:bg-blue-950/70",
      ],
      success: [
        // text color
        "text-emerald-900 dark:text-emerald-500",
        // background color
        "bg-emerald-50 dark:bg-emerald-950/70",
      ],
      error: [
        // text color
        "text-red-900 dark:text-red-500",
        // background color
        "bg-red-50 dark:bg-red-950/70",
      ],
      warning: [
        // text color
        "text-yellow-900 dark:text-yellow-500",
        // background color
        "bg-yellow-50 dark:bg-yellow-950/70",
      ],
      neutral: [
        // text color
        "text-neutral-900 dark:text-neutral-400",
        // background color
        "bg-neutral-100 dark:bg-neutral-800/70",
      ],
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

interface CalloutProps
  extends React.ComponentPropsWithoutRef<"div">,
    VariantProps<typeof calloutVariants> {
  title: string
  icon?: React.ElementType | React.ReactElement
}

const Callout = React.forwardRef<HTMLDivElement, CalloutProps>(
  (
    { title, icon: Icon, className, variant, children, ...props }: CalloutProps,
    forwardedRef,
  ) => {
    return (
      <div
        ref={forwardedRef}
        className={cn(calloutVariants({ variant }), className)}
        tremor-id="tremor-raw"
        {...props}
      >
        <div className={cn("flex items-start")}>
          {Icon && typeof Icon === "function" ? (
            <Icon
              className={cn("mr-1.5 h-5 w-5 shrink-0")}
              aria-hidden="true"
            />
          ) : (
            Icon
          )}
          <span className={cn("font-semibold")}>{title}</span>
        </div>
        <div className={cn("overflow-y-auto", children ? "mt-2" : "")}>
          {children}
        </div>
      </div>
    )
  },
)

Callout.displayName = "Callout"

export { Callout, calloutVariants, type CalloutProps }