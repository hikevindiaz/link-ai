// Tremor Badge [v0.0.1]

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
  {
    variants: {
      variant: {
        default:
          "bg-neutral-50 text-neutral-700 ring-neutral-600/20 dark:bg-neutral-400/10 dark:text-neutral-400 dark:ring-neutral-400/20",
        primary:
          "bg-neutral-50 text-neutral-700 ring-neutral-600/20 dark:bg-neutral-400/10 dark:text-neutral-400 dark:ring-neutral-400/20",
        secondary:
          "bg-neutral-50 text-neutral-700 ring-neutral-600/20 dark:bg-neutral-400/10 dark:text-neutral-400 dark:ring-neutral-400/20",
        success:
          "bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-400/10 dark:text-green-400 dark:ring-green-400/20",
        info:
          "bg-neutral-50 text-neutral-700 ring-neutral-600/20 dark:bg-neutral-400/10 dark:text-neutral-400 dark:ring-neutral-400/20",
        warning:
          "bg-yellow-50 text-yellow-700 ring-yellow-600/20 dark:bg-yellow-400/10 dark:text-yellow-400 dark:ring-yellow-400/20",
        danger:
          "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-400/10 dark:text-red-400 dark:ring-red-400/20",
        neutral:
          "bg-neutral-50 text-neutral-700 ring-neutral-600/20 dark:bg-neutral-400/10 dark:text-neutral-400 dark:ring-neutral-400/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }