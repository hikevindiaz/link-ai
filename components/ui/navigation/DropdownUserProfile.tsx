"use client"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSubMenu,
  DropdownMenuSubMenuContent,
  DropdownMenuSubMenuTrigger,
  DropdownMenuTrigger,
} from "@/components/DropdownMenu"
import { ArrowUpRight, Monitor, Moon, Sun, Settings } from "lucide-react"
import { useTheme } from "next-themes"
import { signOut, useSession } from "next-auth/react";
import * as React from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

export type DropdownUserProfileProps = {
  children: React.ReactNode
  align?: "center" | "start" | "end"
}

export function DropdownUserProfile({
  children,
  align = "start",
}: DropdownUserProfileProps) {
  const [mounted, setMounted] = React.useState(false)
  const [showSignOutDialog, setShowSignOutDialog] = React.useState(false)
  const { theme, setTheme, resolvedTheme } = useTheme()
  const { data: session } = useSession();
  const router = useRouter();
  
  // State to track current effective theme
  const [currentTheme, setCurrentTheme] = React.useState<string | undefined>(undefined)

  // Effect to handle mounting and theme initialization
  React.useEffect(() => {
    setMounted(true)
    // Initialize current theme after mount
    setCurrentTheme(resolvedTheme)
  }, [resolvedTheme])

  // Effect to sync theme changes
  React.useEffect(() => {
    if (mounted && resolvedTheme) {
      // Update currentTheme when resolvedTheme changes
      setCurrentTheme(resolvedTheme)
      
      // Apply theme-specific body classes for global styling
      const root = window.document.documentElement
      root.classList.remove("light", "dark")
      root.classList.add(resolvedTheme)
    }
  }, [mounted, resolvedTheme])

  // Handle theme change from dropdown
  const handleThemeChange = (value: string) => {
    setTheme(value)
    // Force theme update in case the change doesn't propagate immediately
    if (value !== "system") {
      setCurrentTheme(value)
    }
  }

  const handleSignOut = async () => {
    await signOut({ 
      redirect: true,
      callbackUrl: '/login' 
    });
  }

  // Don't render anything until mounted to prevent theme flashing
  if (!mounted) {
    return null
  }

  return (
    <>
      <AlertDialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
        <AlertDialogContent className="bg-white border dark:border-neutral-800 dark:bg-black">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground dark:text-neutral-200">
              Are you sure you want to sign out?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground dark:text-neutral-400">
              You will be redirected to the login page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleSignOut}
              className={cn(
                "bg-neutral-600 hover:bg-neutral-700 text-white",
                "dark:bg-neutral-600 dark:hover:bg-neutral-700"
              )}
            >
              Sign out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
        <DropdownMenuContent
          align={align}
          className="sm:!min-w-[calc(var(--radix-dropdown-menu-trigger-width))] border dark:border-neutral-800 bg-white dark:bg-black z-[200] p-1"
        >
          <DropdownMenuLabel className="text-sm font-medium text-neutral-700 dark:text-neutral-200 px-2 py-2">{session?.user?.email || "Loading..."}</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuSubMenu>
              <DropdownMenuSubMenuTrigger className="text-sm text-neutral-700 dark:text-neutral-200 px-2 py-2 rounded-xl">
                <div className="flex items-center gap-2">
                  {currentTheme === "dark" ? (
                    <Moon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  ) : currentTheme === "light" ? (
                    <Sun className="h-5 w-5 shrink-0" aria-hidden="true" />
                  ) : (
                    <Monitor className="h-5 w-5 shrink-0" aria-hidden="true" />
                  )}
                  <span>Theme: {currentTheme && currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1)}</span>
                </div>
              </DropdownMenuSubMenuTrigger>
              <DropdownMenuSubMenuContent className="border dark:border-neutral-800 bg-white dark:bg-black p-1">
                <DropdownMenuRadioGroup
                  value={theme}
                  onValueChange={handleThemeChange}
                >
                  <DropdownMenuRadioItem
                    aria-label="Switch to Light Mode"
                    value="light"
                    iconType="check"
                    className="text-sm text-neutral-700 dark:text-neutral-200 px-2 py-2 rounded-xl"
                  >
                    <div className="flex items-center gap-2">
                      <Sun className="h-5 w-5 shrink-0" aria-hidden="true" />
                      <span>Light</span>
                    </div>
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem
                    aria-label="Switch to Dark Mode"
                    value="dark"
                    iconType="check"
                    className="text-sm text-neutral-700 dark:text-neutral-200 px-2 py-2 rounded-xl"
                  >
                    <div className="flex items-center gap-2">
                      <Moon className="h-5 w-5 shrink-0" aria-hidden="true" />
                      <span>Dark</span>
                    </div>
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem
                    aria-label="Switch to System Mode"
                    value="system"
                    iconType="check"
                    className="text-sm text-neutral-700 dark:text-neutral-200 px-2 py-2 rounded-xl"
                  >
                    <div className="flex items-center gap-2">
                      <Monitor className="h-5 w-5 shrink-0" aria-hidden="true" />
                      <span>System</span>
                    </div>
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubMenuContent>
            </DropdownMenuSubMenu>
          </DropdownMenuGroup>
          <DropdownMenuSeparator className="dark:border-neutral-800 my-1" />
          <DropdownMenuGroup>
            <DropdownMenuItem 
              onClick={() => router.push('/dashboard/settings')}
              className="text-sm text-neutral-700 dark:text-neutral-200 px-2 py-2 rounded-xl"
            >
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span>Settings</span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator className="dark:border-neutral-800 my-1" />
          <DropdownMenuGroup>
            <DropdownMenuItem className="text-sm text-neutral-700 dark:text-neutral-200 px-2 py-2 rounded-xl">
              <a href="https://www.getlinkai.com/legal" className="flex items-center gap-2 w-full">
                <span>Terms of Use</span>
                <ArrowUpRight
                  className="h-4 w-4 shrink-0 text-neutral-600 dark:text-neutral-400 ml-auto"
                  aria-hidden="true"
                />
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem className="text-sm text-neutral-700 dark:text-neutral-200 px-2 py-2 rounded-xl">
              <a href="https://www.getlinkai.com/legal" className="flex items-center gap-2 w-full">
                <span>Privacy Policy</span>
                <ArrowUpRight
                  className="h-4 w-4 shrink-0 text-neutral-600 dark:text-neutral-400 ml-auto"
                  aria-hidden="true"
                />
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem className="text-sm text-neutral-700 dark:text-neutral-200 px-2 py-2 rounded-xl">
              <a href="https://www.instagram.com/getlinkai/" className="flex items-center gap-2 w-full">
                <span>Follow us on Instagram</span>
                <ArrowUpRight
                  className="h-4 w-4 shrink-0 text-neutral-600 dark:text-neutral-400 ml-auto"
                  aria-hidden="true"
                />
              </a>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator className="dark:border-neutral-800 my-1" />
          <DropdownMenuGroup>
            <DropdownMenuItem 
              onClick={() => setShowSignOutDialog(true)}
              className="text-sm text-neutral-700 dark:text-neutral-200 px-2 py-2 rounded-xl"
            >
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
