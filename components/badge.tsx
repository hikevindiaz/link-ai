// Tremor Badge [v0.0.1]

import React from "react"
import { tv, type VariantProps } from "tailwind-variants"

import { cn } from "@/lib/utils"

const badgeVariants = tv({
  base: cn(
    "inline-flex items-center gap-x-1 whitespace-nowrap rounded-xl px-2 py-1 text-xs font-medium ring-1 ring-inset",
  ),
  variants: {
    variant: {
      default: [
        "bg-neutral-50 text-neutral-900 ring-neutral-500/30",
        "dark:bg-neutral-400/10 dark:text-neutral-400 dark:ring-neutral-400/20",
      ],
      neutral: [
        "bg-neutral-50 text-neutral-900 ring-neutral-500/30",
        "dark:bg-neutral-400/10 dark:text-neutral-400 dark:ring-neutral-400/20",
      ],
      neutral: [
        "bg-neutral-50 text-neutral-900 ring-neutral-500/30",
        "dark:bg-neutral-400/10 dark:text-neutral-400 dark:ring-neutral-400/30",
      ],
      success: [
        "bg-emerald-50 text-emerald-900 ring-emerald-600/30",
        "dark:bg-emerald-400/10 dark:text-emerald-400 dark:ring-emerald-400/20",
      ],
      error: [
        "bg-red-50 text-red-900 ring-red-600/20",
        "dark:bg-red-400/10 dark:text-red-400 dark:ring-red-400/20",
      ],
      warning: [
        "bg-yellow-50 text-yellow-900 ring-yellow-600/30",
        "dark:bg-yellow-400/10 dark:text-yellow-500 dark:ring-yellow-400/20",
      ],
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

interface BadgeProps
  extends React.ComponentPropsWithoutRef<"span">,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, ...props }: BadgeProps, forwardedRef) => {
    return (
      <span
        ref={forwardedRef}
        className={cn(badgeVariants({ variant }), className)}
        tremor-id="tremor-raw"
        {...props}
      />
    )
  },
)

Badge.displayName = "Badge"

export { Badge, badgeVariants, type BadgeProps }