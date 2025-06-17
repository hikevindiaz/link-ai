import React from "react"

interface BadgeProps extends React.ComponentPropsWithoutRef<"span"> {}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ children, className, ...props }: BadgeProps, forwardedRef) => {
    return (
      <span
        ref={forwardedRef}
        className="z-10 block w-fit rounded-lg border border-neutral-200/20 bg-neutral-50/50 px-3 py-1.5 font-semibold uppercase leading-4 tracking-tighter sm:text-sm dark:border-neutral-800/30 dark:bg-neutral-900/20"
        {...props}
      >
        <span className="bg-gradient-to-b from-neutral-500 to-neutral-600 bg-clip-text text-transparent dark:from-neutral-200 dark:to-neutral-400">
          {children}
        </span>
      </span>
    )
  },
)

Badge.displayName = "Badge"

export { Badge, type BadgeProps }
