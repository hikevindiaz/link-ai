// Tremor Tabs [v0.1.0]

import React from "react"
import * as TabsPrimitives from "@radix-ui/react-tabs"

import { cn, focusRing } from "@/lib/utils"

const Tabs = (
  props: Omit<
    React.ComponentPropsWithoutRef<typeof TabsPrimitives.Root>,
    "orientation"
  >,
) => {
  return <TabsPrimitives.Root tremor-id="tremor-raw" {...props} />
}

Tabs.displayName = "Tabs"

type TabsListVariant = "line" | "solid"

const TabsListVariantContext = React.createContext<TabsListVariant>("line")

interface TabsListProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitives.List> {
  variant?: TabsListVariant
}

const variantStyles: Record<TabsListVariant, string> = {
  line: cn(
    // base
    "flex items-center justify-start border-b",
    // border color
    "border-neutral-200 dark:border-neutral-800",
  ),
  solid: cn(
    // base
    "inline-flex items-center justify-center rounded-xl p-1",
    // background color
    "bg-neutral-100 dark:bg-neutral-900",
  ),
}

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitives.List>,
  TabsListProps
>(({ className, variant = "line", children, ...props }, forwardedRef) => (
  <TabsPrimitives.List
    ref={forwardedRef}
    className={cn(variantStyles[variant], className)}
    {...props}
  >
    <TabsListVariantContext.Provider value={variant}>
      {children}
    </TabsListVariantContext.Provider>
  </TabsPrimitives.List>
))

TabsList.displayName = "TabsList"

function getVariantStyles(tabVariant: TabsListVariant) {
  switch (tabVariant) {
    case "line":
      return cn(
        // base
        "-mb-px items-center justify-center whitespace-nowrap border-b-2 border-transparent px-3 pb-2 text-sm font-medium transition-all",
        // text color
        "text-neutral-500 dark:text-neutral-500",
        // hover
        "hover:text-neutral-700 hover:dark:text-neutral-400",
        // border hover
        "hover:border-neutral-300 hover:dark:border-neutral-400",
        // selected
        "data-[state=active]:border-neutral-600 data-[state=active]:text-neutral-600",
        "data-[state=active]:dark:border-neutral-400 data-[state=active]:dark:text-neutral-400",
        // disabled
        "data-[disabled]:pointer-events-none",
        "data-[disabled]:text-neutral-300 data-[disabled]:dark:text-neutral-700",
      )
    case "solid":
      return cn(
        // base
        "inline-flex items-center justify-center whitespace-nowrap rounded px-3 py-1 text-sm font-medium ring-1 ring-inset transition-all",
        // text color
        "text-neutral-500 dark:text-neutral-400",
        // hover
        "hover:text-neutral-700 hover:dark:text-neutral-200",
        // ring
        "ring-transparent",
        // selected
        "data-[state=active]:bg-white data-[state=active]:text-neutral-900 data-[state=active]:shadow",
        "data-[state=active]:dark:bg-neutral-950 data-[state=active]:dark:text-neutral-50",
        // disabled
        "data-[disabled]:pointer-events-none data-[disabled]:text-neutral-400 data-[disabled]:opacity-50 data-[disabled]:dark:text-neutral-600",
      )
  }
}

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitives.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitives.Trigger>
>(({ className, children, ...props }, forwardedRef) => {
  const variant = React.useContext(TabsListVariantContext)
  return (
    <TabsPrimitives.Trigger
      ref={forwardedRef}
      className={cn(getVariantStyles(variant), focusRing, className)}
      {...props}
    >
      {children}
    </TabsPrimitives.Trigger>
  )
})

TabsTrigger.displayName = "TabsTrigger"

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitives.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitives.Content>
>(({ className, ...props }, forwardedRef) => (
  <TabsPrimitives.Content
    ref={forwardedRef}
    className={cn("outline-none", focusRing, className)}
    {...props}
  />
))

TabsContent.displayName = "TabsContent"

export { Tabs, TabsContent, TabsList, TabsTrigger }