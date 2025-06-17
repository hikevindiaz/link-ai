// Tremor Card [v0.0.2] - Updated to match Design System

import React from "react"
import { Slot } from "@radix-ui/react-slot"

import { cn } from "@/lib/utils"

interface CardProps extends React.ComponentPropsWithoutRef<"div"> {
  asChild?: boolean
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, asChild, ...props }, forwardedRef) => {
    const Component = asChild ? Slot : "div"
    return (
      <Component
        ref={forwardedRef}
        className={cn(
          // Design System: Standard card styling
          "relative w-full bg-card-light dark:bg-card-dark p-8 md:p-14 rounded-3xl shadow-sm border-0",
          // Text colors per design system
          "text-black dark:text-white",
          className,
        )}
        tremor-id="tremor-raw"
        {...props}
      />
    )
  },
)

Card.displayName = "Card"

export { Card, type CardProps }