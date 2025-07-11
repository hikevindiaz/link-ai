"use client"

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTitle,
} from "@/components/Drawer"
import { useIsMobile } from "@/lib/useMobile"
import { cn, focusRing } from "@/lib/utils"
import * as VisuallyHidden from "@radix-ui/react-visually-hidden"
import { RiCloseLine } from "@remixicon/react"
import { PanelLeft } from "lucide-react"
import * as React from "react"
import { Button } from "./Button"

// This component is based on shadcn's sidebar component

const SIDEBAR_COOKIE_NAME = "sidebar:state"
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
const SIDEBAR_WIDTH = "16rem"

type SidebarContext = {
  state: "expanded" | "collapsed"
  open: boolean
  setOpen: (open: boolean) => void
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  isMobile: boolean
  toggleSidebar: () => void
}

const SidebarContext = React.createContext<SidebarContext | null>(null)

function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.")
  }

  return context
}

const SidebarProvider = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    defaultOpen?: boolean
    open?: boolean
    onOpenChange?: (open: boolean) => void
  }
>(
  (
    {
      defaultOpen = true,
      open: openProp,
      onOpenChange: setOpenProp,
      className,
      style,
      children,
      ...props
    },
    ref,
  ) => {
    const isMobile = useIsMobile()
    const [openMobile, setOpenMobile] = React.useState(false)

    const [_open, _setOpen] = React.useState(defaultOpen)
    const open = openProp ?? _open
    const setOpen = React.useCallback(
      (value: boolean | ((value: boolean) => boolean)) => {
        const openState = typeof value === "function" ? value(open) : value
        if (setOpenProp) {
          setOpenProp(openState)
        } else {
          _setOpen(openState)
        }

        document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
      },
      [setOpenProp, open],
    )

    const toggleSidebar = React.useCallback(() => {
      return isMobile
        ? setOpenMobile((open) => !open)
        : setOpen((open) => !open)
    }, [isMobile, setOpen, setOpenMobile])

    const state = open ? "expanded" : "collapsed"

    const contextValue = React.useMemo<SidebarContext>(
      () => ({
        state,
        open,
        setOpen,
        isMobile,
        openMobile,
        setOpenMobile,
        toggleSidebar,
      }),
      [
        state,
        open,
        setOpen,
        isMobile,
        openMobile,
        setOpenMobile,
        toggleSidebar,
      ],
    )

    return (
      <SidebarContext.Provider value={contextValue}>
        <div
          style={
            {
              "--sidebar-width": SIDEBAR_WIDTH,
              ...style,
            } as React.CSSProperties
          }
          className={cn("flex min-h-svh", className)}
          ref={ref}
          {...props}
        >
          {children}
        </div>
      </SidebarContext.Provider>
    )
  },
)
SidebarProvider.displayName = "SidebarProvider"

const Sidebar = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, children, ...props }, ref) => {
    const { isMobile, state, openMobile, setOpenMobile } = useSidebar()

    if (isMobile) {
      return (
        <Drawer open={openMobile} onOpenChange={setOpenMobile} {...props}>
          <DrawerContent
            // data-sidebar="sidebar"
            // data-mobile="true"
            className="bg-white dark:bg-black p-0 text-neutral-700 dark:text-neutral-200"
          >
            <VisuallyHidden.Root>
              <DrawerTitle>Sidebar</DrawerTitle>
            </VisuallyHidden.Root>
            <div className="relative flex h-full w-full flex-col">
              <DrawerClose className="absolute right-4 top-4" asChild>
                <Button
                  variant="ghost"
                  className="!p-2 text-neutral-700 hover:text-neutral-900 dark:text-neutral-300 hover:dark:text-neutral-50 w-full"
                >
                  <RiCloseLine className="size-5 shrink-0" aria-hidden="true" />
                </Button>
              </DrawerClose>
              {children}
            </div>
          </DrawerContent>
        </Drawer>
      )
    }

    return (
      <div
        ref={ref}
        className="group peer hidden md:block"
        data-state={state}
        data-collapsible={state === "collapsed" ? true : false}
      >
        {/* This is what handles the sidebar gap on desktop */}
        <div
          className={cn(
            "relative h-svh w-[--sidebar-width] bg-transparent transition-[width] duration-150 ease-in-out will-change-transform",
            "group-data-[collapsible=true]:w-0",
          )}
        />
        <div
          className={cn(
            "fixed inset-y-0 z-10 hidden h-svh w-[--sidebar-width] transition-[left,right,width] duration-150 ease-in-out will-change-transform md:flex",
            "left-0 group-data-[collapsible=true]:left-[calc(var(--sidebar-width)*-1)]",
            "border-r border-neutral-200 dark:border-neutral-800",
            className,
          )}
          {...props}
        >
          <div
            data-sidebar="sidebar"
            className="bg-sidebar flex h-full w-full flex-col"
          >
            {children}
          </div>
        </div>
      </div>
    )
  },
)
Sidebar.displayName = "Sidebar"

const SidebarTrigger = React.forwardRef<
  React.ComponentRef<"button">,
  React.ComponentPropsWithRef<"button">
>(({ className, onClick, ...props }, ref) => {
  const { toggleSidebar } = useSidebar()

  return (
    <button
      ref={ref}
      data-sidebar="trigger"
      className={cn(
        "group inline-flex rounded-xl p-1.5 hover:bg-neutral-200/50 hover:dark:bg-neutral-900",
        focusRing,
      )}
      onClick={(event) => {
        onClick?.(event)
        toggleSidebar()
      }}
      {...props}
    >
      <PanelLeft
        className="size-[18px] shrink-0 text-neutral-700 dark:text-neutral-300"
        aria-hidden="true"
      />
      <span className="sr-only">Toggle Sidebar</span>
    </button>
  )
})
SidebarTrigger.displayName = "SidebarTrigger"

const SidebarFooter = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="footer"
      className={cn("flex flex-col gap-2 p-3", className)}
      {...props}
    />
  )
})
SidebarFooter.displayName = "SidebarFooter"

const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="content"
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-2 overflow-auto",
        className,
      )}
      {...props}
    />
  )
})
SidebarContent.displayName = "SidebarContent"

const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="header"
      className={cn("flex flex-col gap-2 p-2", className)}
      {...props}
    />
  )
})
SidebarHeader.displayName = "SidebarHeader"

const SidebarLink = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentProps<"a"> & {
    children: React.ReactNode
    icon?: React.ElementType
    isActive?: boolean
    notifications?: number | boolean
    showLabel?: boolean
  }
>(({ children, isActive, icon, notifications, showLabel = true, className, ...props }, ref) => {
  const Icon = icon
  return (
    <a
      ref={ref}
      aria-current={isActive ? "page" : undefined}
      data-active={isActive}
      className={cn(
        "flex items-center justify-between rounded-xl p-2 text-base transition hover:bg-neutral-200/50 sm:text-sm hover:dark:bg-neutral-900",
        "text-neutral-700 dark:text-neutral-400 hover:dark:text-neutral-50",
        "data-[active=true]:text-neutral-600 data-[active=true]:dark:text-neutral-400",
        !showLabel && "justify-center",
        focusRing,
      )}
      {...props}
    >
      <span className={cn("flex items-center", showLabel ? "gap-x-2.5" : "")}>
        {Icon && <Icon className="size-[18px] shrink-0" aria-hidden="true" />}
        {children}
      </span>
      {notifications && (
        <span className={cn(
          "inline-flex size-5 items-center justify-center rounded bg-neutral-100 text-sm font-medium text-neutral-600 sm:text-xs dark:bg-neutral-500/10 dark:text-neutral-400",
          !showLabel && "absolute top-0 right-0 translate-x-1/3 -translate-y-1/3 size-4"
        )}>
          {notifications}
        </span>
      )}
    </a>
  )
})
SidebarLink.displayName = "SidebarLink"

const SidebarGroup = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="group"
      className={cn("relative flex w-full min-w-0 flex-col p-3", className)}
      {...props}
    />
  )
})
SidebarGroup.displayName = "SidebarGroup"

const SidebarGroupContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="group-content"
    className={cn("w-full text-sm", className)}
    {...props}
  />
))
SidebarGroupContent.displayName = "SidebarGroupContent"

const SidebarMenu = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    data-sidebar="menu"
    className={cn("flex w-full min-w-0 flex-col gap-1", className)}
    {...props}
  />
))
SidebarMenu.displayName = "SidebarMenu"

const SidebarMenuItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ ...props }, ref) => <li ref={ref} {...props} />)
SidebarMenuItem.displayName = "SidebarMenuItem"

const SidebarSubLink = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentProps<"a"> & {
    children: React.ReactNode
    isActive?: boolean
  }
>(({ isActive, children, className, ...props }, ref) => {
  return (
    <a
      ref={ref}
      aria-current={isActive ? "page" : undefined}
      data-active={isActive}
      className={cn(
        "relative flex gap-2 rounded-xl py-1.5 pl-9 pr-3 text-base transition sm:text-sm",
        "text-neutral-700 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-50",
        "data-[active=true]:rounded data-[active=true]:bg-white data-[active=true]:text-neutral-600 data-[active=true]:shadow data-[active=true]:ring-1 data-[active=true]:ring-neutral-200 data-[active=true]:dark:bg-neutral-900 data-[active=true]:dark:text-neutral-400 data-[active=true]:dark:ring-neutral-800",
        focusRing,
      )}
      {...props}
    >
      {isActive && (
        <div
          className="absolute left-4 top-1/2 h-5 w-px -translate-y-1/2 bg-neutral-600 dark:bg-neutral-400"
          aria-hidden="true"
        />
      )}
      {children}
    </a>
  )
})
SidebarSubLink.displayName = "SidebarSubLink"

const SidebarMenuSub = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    data-sidebar="menu-sub"
    className={cn("relative space-y-1 border-l border-transparent", className)}
    {...props}
  />
))
SidebarMenuSub.displayName = "SidebarMenuSub"

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarLink,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarProvider,
  SidebarSubLink,
  SidebarTrigger,
  useSidebar,
}
