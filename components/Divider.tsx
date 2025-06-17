// Tremor Divider [v0.0.2]

import React from "react"

import { cn } from "@/lib/utils"

type DividerProps = React.ComponentPropsWithoutRef<"div">

const Divider = React.forwardRef<HTMLDivElement, DividerProps>(
  ({ className, children, ...props }, forwardedRef) => (
    <div
      ref={forwardedRef}
      className={cn(
        // base
        "mx-auto my-4 flex w-full items-center justify-between gap-3 text-sm",
        // text color
        "text-neutral-500 dark:text-neutral-500",
        className,
      )}
      tremor-id="tremor-raw"
      {...props}
    >
      {children ? (
        <>
          <div
            className={cn(
              // base
              "h-[1px] w-full",
              // background color
              "bg-neutral-200 dark:bg-neutral-800",
            )}
          />
          <div className="whitespace-nowrap text-inherit">{children}</div>
          <div
            className={cn(
              // base
              "h-[1px] w-full",
              // background color
              "bg-neutral-200 dark:bg-neutral-800",
            )}
          />
        </>
      ) : (
        <div
          className={cn(
            // base
            "h-[1px] w-full",
            // background color
            "bg-neutral-200 dark:bg-neutral-800",
          )}
        />
      )}
    </div>
  ),
)

Divider.displayName = "Divider"

export { Divider }
