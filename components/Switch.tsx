// Tremor Switch [v0.0.1]

import * as SwitchPrimitives from "@radix-ui/react-switch"
import React from "react"
import { tv, VariantProps } from "tailwind-variants"

import { cn, focusRing } from "@/lib/utils"

const switchVariants = tv({
  slots: {
    root: [
      // base
      "group relative isolate inline-flex shrink-0 cursor-pointer items-center rounded-full p-0.5 shadow-inner outline-none ring-1 ring-inset transition-all",
      "bg-neutral-200 dark:bg-neutral-950",
      // ring color
      "ring-black/5 dark:ring-neutral-800",
      // checked
      "data-[state=checked]:bg-neutral-600 data-[state=checked]:dark:bg-neutral-400",
      // disabled
      "data-[disabled]:cursor-default",
      // disabled checked
      "data-[disabled]:data-[state=checked]:bg-neutral-300",
      "data-[disabled]:data-[state=checked]:ring-neutral-300",
      // disabled checked dark
      "data-[disabled]:data-[state=checked]:dark:ring-neutral-700",
      "data-[disabled]:data-[state=checked]:dark:bg-neutral-700",
      // disabled unchecked
      "data-[disabled]:data-[state=unchecked]:ring-neutral-300",
      "data-[disabled]:data-[state=unchecked]:bg-neutral-100",
      // disabled unchecked dark
      "data-[disabled]:data-[state=unchecked]:dark:ring-neutral-700",
      "data-[disabled]:data-[state=unchecked]:dark:bg-neutral-800",
      focusRing,
    ],
    thumb: [
      // base
      "pointer-events-none relative inline-block transform appearance-none rounded-full border-none shadow-lg outline-none transition-all duration-150 ease-in-out focus:border-none focus:outline-none focus:outline-transparent",
      // background color
      "bg-white dark:bg-neutral-50",
      // disabled
      "group-data-[disabled]:shadow-none",
      "group-data-[disabled]:bg-neutral-50 group-data-[disabled]:dark:bg-neutral-500",
    ],
  },
  variants: {
    size: {
      default: {
        root: "h-5 w-9",
        thumb:
          "h-4 w-4 data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0",
      },
      small: {
        root: "h-4 w-7",
        thumb:
          "h-3 w-3 data-[state=checked]:translate-x-3 data-[state=unchecked]:translate-x-0",
      },
    },
  },
  defaultVariants: {
    size: "default",
  },
})

interface SwitchProps
  extends Omit<
      React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>,
      "asChild"
    >,
    VariantProps<typeof switchVariants> {}

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  SwitchProps
>(({ className, size, ...props }: SwitchProps, forwardedRef) => {
  const { root, thumb } = switchVariants({ size })
  return (
    <SwitchPrimitives.Root
      ref={forwardedRef}
      className={cn(root(), className)}
      tremor-id="tremor-raw"
      {...props}
    >
      <SwitchPrimitives.Thumb className={cn(thumb())} />
    </SwitchPrimitives.Root>
  )
})

Switch.displayName = "Switch"

export { Switch }
