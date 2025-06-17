"use client"

// Tremor TabNavigation [v0.1.0]

import * as React from "react"
import Link from "next/link"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const tabNavigationVariants = cva(
  "flex items-center gap-x-2 border-b border-gray-200 dark:border-gray-800",
  {
    variants: {
      size: {
        default: "px-4",
        sm: "px-2",
        lg: "px-6",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

export interface TabNavigationProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof tabNavigationVariants> {}

const TabNavigation = React.forwardRef<HTMLDivElement, TabNavigationProps>(
  ({ className, size, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(tabNavigationVariants({ size }), className)}
      {...props}
    />
  )
)
TabNavigation.displayName = "TabNavigation"

const tabNavigationLinkVariants = cva(
  "inline-flex items-center border-b-2 border-transparent px-4 py-3 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-700 dark:hover:text-gray-200",
  {
    variants: {
      active: {
        true: "border-neutral-500 text-neutral-600 dark:border-neutral-500 dark:text-neutral-400",
        false: "",
      },
    },
    defaultVariants: {
      active: false,
    },
  }
)

export interface TabNavigationLinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement>,
    VariantProps<typeof tabNavigationLinkVariants> {
  href: string
  active?: boolean
}

const TabNavigationLink = React.forwardRef<HTMLAnchorElement, TabNavigationLinkProps>(
  ({ className, active, href, ...props }, ref) => (
    <Link
      ref={ref}
      href={href}
      className={cn(tabNavigationLinkVariants({ active }), className)}
      {...props}
    />
  )
)
TabNavigationLink.displayName = "TabNavigationLink"

export { TabNavigation, TabNavigationLink, tabNavigationVariants, tabNavigationLinkVariants }
