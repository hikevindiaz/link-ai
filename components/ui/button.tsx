// Tremor Button [v0.2.0] - Updated to match Design System

"use client"

import React from "react"
import { Slot } from "@radix-ui/react-slot"
import { RiLoader2Fill } from "@remixicon/react"
import { tv, type VariantProps } from "tailwind-variants"

import { cn, focusRing } from "@/lib/utils"

const buttonVariants = tv({
  base: [
    // base
    "relative inline-flex items-center justify-center whitespace-nowrap rounded-xl border px-0 py-0 text-center text-base font-normal shadow-sm transition-all duration-200 ease-in-out",
    // disabled
    "disabled:pointer-events-none disabled:shadow-none disabled:opacity-50",
    // focus
    focusRing,
  ],
  variants: {
    variant: {
      primary: [
        // Design System: Primary button styling
        "border-transparent",
        "text-white dark:text-black",
        "bg-black dark:bg-white",
        "hover:bg-neutral-800 dark:hover:bg-neutral-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        // disabled
        "disabled:bg-neutral-600 disabled:text-white",
        "disabled:dark:bg-neutral-600 disabled:dark:text-neutral-400",
      ],
      secondary: [
        // Design System: Secondary button styling
        "border-neutral-200 dark:border-neutral-800",
        "text-neutral-700 dark:text-neutral-200",
        "bg-white dark:bg-black",
        "hover:bg-neutral-50 dark:hover:bg-neutral-900",
        // disabled
        "disabled:text-neutral-400",
        "disabled:dark:text-neutral-600",
      ],
      light: [
        // base
        "shadow-none",
        "border-transparent",
        "text-neutral-700 dark:text-neutral-200",
        "bg-neutral-100 dark:bg-neutral-800",
        "hover:bg-neutral-200 dark:hover:bg-neutral-700",
        // disabled
        "disabled:bg-neutral-100 disabled:text-neutral-400",
        "disabled:dark:bg-neutral-800 disabled:dark:text-neutral-600",
      ],
      ghost: [
        // base
        "shadow-none",
        "border-transparent",
        "text-neutral-700 dark:text-neutral-200",
        "bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800",
        // disabled
        "disabled:text-neutral-400",
        "disabled:dark:text-neutral-600",
      ],
      destructive: [
        "text-white",
        "border-transparent",
        "bg-red-600 dark:bg-red-700",
        "hover:bg-red-700 dark:hover:bg-red-600",
        // disabled
        "disabled:bg-red-300 disabled:text-white",
        "disabled:dark:bg-red-950 disabled:dark:text-red-400",
      ],
      // Design System: neutral accent variant
      accent: [
        "border-transparent",
        "text-white dark:text-white",
        "bg-neutral-600 dark:bg-neutral-600",
        "hover:bg-neutral-700 dark:hover:bg-neutral-500",
        // disabled
        "disabled:bg-neutral-300 disabled:text-white",
        "disabled:dark:bg-neutral-900 disabled:dark:text-neutral-400",
      ],
    },
    size: {
      default: "h-10 px-4 py-2",
      sm: "h-9 rounded-xl px-3 text-sm",
      lg: "h-12 rounded-xl px-8 text-lg",
      icon: "h-10 w-10",
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "default",
  },
})

interface ButtonProps
  extends React.ComponentPropsWithoutRef<"button">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  isLoading?: boolean
  loadingText?: string
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      asChild,
      isLoading = false,
      loadingText,
      className,
      disabled,
      variant,
      size,
      children,
      ...props
    }: ButtonProps,
    forwardedRef,
  ) => {
    const Component = asChild ? Slot : "button"
    return (
      <Component
        ref={forwardedRef}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || isLoading}
        tremor-id="tremor-raw"
        {...props}
      >
        {isLoading ? (
          <span className="pointer-events-none flex shrink-0 items-center justify-center gap-1.5">
            <RiLoader2Fill
              className="size-4 shrink-0 animate-spin"
              aria-hidden="true"
            />
            <span className="sr-only">
              {loadingText ? loadingText : "Loading"}
            </span>
            {loadingText ? loadingText : children}
          </span>
        ) : (
          children
        )}
      </Component>
    )
  },
)

Button.displayName = "Button"

export { Button, buttonVariants, type ButtonProps }