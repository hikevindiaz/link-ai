import * as React from "react"
import { RiArrowRightSLine } from "@remixicon/react"

import { cn } from "@/lib/utils"

const BreadcrumbLink = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentPropsWithoutRef<"a">
>(({ className, ...props }, forwardedRef) => (
  <a
    ref={forwardedRef}
    className={cn(
      "text-neutral-500 transition hover:text-neutral-700 dark:text-neutral-400 hover:dark:text-neutral-300",
      className,
    )}
    {...props}
  />
))
BreadcrumbLink.displayName = "BreadcrumbLink"

const BreadcrumbSeparator = React.forwardRef<
  React.ElementRef<typeof RiArrowRightSLine>,
  React.ComponentPropsWithoutRef<typeof RiArrowRightSLine>
>(({ className, ...props }, forwardedRef) => (
  <RiArrowRightSLine
    ref={forwardedRef}
    className={cn("size-4 shrink-0 text-neutral-600 dark:text-neutral-400", className)}
    aria-hidden="true"
    {...props}
  />
))
BreadcrumbSeparator.displayName = "BreadcrumbSeparator"

const BreadcrumbPage = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<"span">
>(({ className, ...props }, forwardedRef) => (
  <span
    ref={forwardedRef}
    className={cn("text-neutral-900 dark:text-neutral-50", className)}
    {...props}
  />
))
BreadcrumbPage.displayName = "BreadcrumbPage"

export { BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage }
