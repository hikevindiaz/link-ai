"use client"

import React from "react"
import * as RadioGroupPrimitives from "@radix-ui/react-radio-group"

import { cn, focusInput, focusRing } from "@/lib/utils"

const RadioCardGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitives.Root>
>(({ className, ...props }, forwardedRef) => {
  return (
    <RadioGroupPrimitives.Root
      ref={forwardedRef}
      className={cn("grid gap-2", className)}
      {...props}
    />
  )
})

RadioCardGroup.displayName = "RadioCardGroup"

const RadioCardItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitives.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitives.Item>
>(({ className, children, ...props }, forwardedRef) => {
  return (
    <RadioGroupPrimitives.Item
      ref={forwardedRef}
      className={cn(
        // base
        "group relative w-full rounded-xl border p-4 text-left shadow-sm transition focus:outline-none",
        // background color
        "bg-white dark:bg-neutral-950",
        // border color
        "border-neutral-300 dark:border-neutral-800",
        "data-[state=checked]:border-neutral-500",
        "data-[state=checked]:dark:border-neutral-500",
        // disabled
        "data-[disabled]:border-neutral-100 data-[disabled]:dark:border-neutral-800",
        "data-[disabled]:bg-neutral-50 data-[disabled]:shadow-none data-[disabled]:dark:bg-neutral-900",
        focusInput,
        className,
      )}
      {...props}
    >
      {children}
    </RadioGroupPrimitives.Item>
  )
})

RadioCardItem.displayName = "RadioCardItem"

const RadioCardIndicator = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitives.Indicator>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitives.Indicator>
>(({ className, ...props }, forwardedRef) => {
  return (
    <div
      className={cn(
        // base
        "relative flex size-4 shrink-0 appearance-none items-center justify-center rounded-full border shadow-sm outline-none",
        // border color
        "border-neutral-300 dark:border-neutral-800",
        // background color
        "bg-white dark:bg-neutral-950",
        // checked
        "group-data-[state=checked]:border-0 group-data-[state=checked]:border-transparent group-data-[state=checked]:bg-neutral-500",
        // disabled
        "group-data-[disabled]:border-neutral-300 group-data-[disabled]:bg-neutral-100 group-data-[disabled]:text-neutral-400",
        "group-data-[disabled]:dark:border-neutral-700 group-data-[disabled]:dark:bg-neutral-800",
        // focus
        focusRing,
        className,
      )}
    >
      <RadioGroupPrimitives.Indicator
        ref={forwardedRef}
        className={cn("flex items-center justify-center")}
        {...props}
      >
        <div
          className={cn(
            // base
            "size-1.5 shrink-0 rounded-full",
            // indicator
            "bg-white",
            // disabled
            "group-data-[disabled]:bg-neutral-400 group-data-[disabled]:dark:bg-neutral-500",
          )}
        />
      </RadioGroupPrimitives.Indicator>
    </div>
  )
})

RadioCardIndicator.displayName = "RadioCardIndicator"

export { RadioCardGroup, RadioCardIndicator, RadioCardItem } 