// Tremor SelectNative [v0.0.1]

import React from "react"
import { tv, type VariantProps } from "tailwind-variants"

import { cn, focusInput, hasErrorInput } from "@/lib/utils"

const selectNativeStyles = tv({
  base: [
    // base
    "peer w-full cursor-pointer appearance-none truncate rounded-xl border py-2 pl-3 pr-7 shadow-sm outline-none transition-all sm:text-sm",
    // background color
    "bg-white dark:bg-neutral-950",
    // border color
    "border-neutral-300 dark:border-neutral-800",
    // text color
    "text-neutral-900 dark:text-neutral-50",
    // placeholder color
    "placeholder-neutral-400 dark:placeholder-neutral-500",
    // hover
    "hover:bg-neutral-50 hover:dark:bg-neutral-950/50",
    // disabled
    "disabled:pointer-events-none",
    "disabled:bg-neutral-100 disabled:text-neutral-400",
    "disabled:dark:border-neutral-700 disabled:dark:bg-neutral-800 disabled:dark:text-neutral-500",
    // focus
    focusInput,
    // invalid (optional)
    // "aria-[invalid=true]:dark:ring-red-400/20 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-red-200 aria-[invalid=true]:border-red-500 invalid:ring-2 invalid:ring-red-200 invalid:border-red-500"
  ],
  variants: {
    hasError: {
      true: hasErrorInput,
    },
  },
})

interface SelectNativeProps
  extends React.InputHTMLAttributes<HTMLSelectElement>,
    VariantProps<typeof selectNativeStyles> {}

const SelectNative = React.forwardRef<HTMLSelectElement, SelectNativeProps>(
  ({ className, hasError, ...props }: SelectNativeProps, forwardedRef) => {
    return (
      <select
        ref={forwardedRef}
        className={cn(selectNativeStyles({ hasError }), className)}
        tremor-id="tremor-raw"
        {...props}
      />
    )
  },
)

SelectNative.displayName = "SelectNative"

export { SelectNative, selectNativeStyles, type SelectNativeProps }