// Tremor Textarea [v0.0.2]

import React from "react"

import { cn, focusInput, hasErrorInput } from "@/lib/utils"

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, hasError, ...props }: TextareaProps, forwardedRef) => {
    return (
      <textarea
        ref={forwardedRef}
        className={cn(
          // base
          "flex min-h-[4rem] w-full rounded-xl border px-3 py-1.5 shadow-sm outline-none transition-colors sm:text-sm",
          // text color
          "text-neutral-900 dark:text-neutral-50",
          // border color
          "border-neutral-200 dark:border-neutral-700",
          // background color
          "bg-neutral-50 dark:bg-neutral-900",
          // placeholder color
          "placeholder-neutral-400 dark:placeholder-neutral-500",
          // disabled
          "disabled:border-neutral-300 disabled:bg-neutral-100 disabled:text-neutral-300",
          "disabled:dark:border-neutral-700 disabled:dark:bg-neutral-800 disabled:dark:text-neutral-500",
          // focus
          focusInput,
          // error
          hasError ? hasErrorInput : "",
          // invalid (optional)
          // "aria-[invalid=true]:dark:ring-red-400/20 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-red-200 aria-[invalid=true]:border-red-500 invalid:ring-2 invalid:ring-red-200 invalid:border-red-500"
          className,
        )}
        tremor-id="tremor-raw"
        {...props}
      />
    )
  },
)

Textarea.displayName = "Textarea"

export { Textarea, type TextareaProps }