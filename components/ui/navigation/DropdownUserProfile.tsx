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
import { ArrowUpRight, Monitor, Moon, Sun } from "lucide-react"
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
        <AlertDialogContent className="bg-white border dark:border-gray-800 dark:bg-gray-900">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground dark:text-gray-100">
              Are you sure you want to sign out?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground dark:text-gray-400">
              You will be redirected to the login page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleSignOut}
              className={cn(
                "bg-indigo-600 hover:bg-indigo-700 text-white",
                "dark:bg-indigo-600 dark:hover:bg-indigo-700"
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
          className="sm:!min-w-[calc(var(--radix-dropdown-menu-trigger-width))] border dark:border-gray-800 bg-white dark:bg-gray-900"
        >
          <DropdownMenuLabel className="text-foreground dark:text-gray-100">{session?.user?.email || "Loading..."}</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuSubMenu>
              <DropdownMenuSubMenuTrigger>
                <div className="flex items-center gap-2">
                  {currentTheme === "dark" ? (
                    <Moon className="size-4 shrink-0" aria-hidden="true" />
                  ) : currentTheme === "light" ? (
                    <Sun className="size-4 shrink-0" aria-hidden="true" />
                  ) : (
                    <Monitor className="size-4 shrink-0" aria-hidden="true" />
                  )}
                  Theme: {currentTheme && currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1)}
                </div>
              </DropdownMenuSubMenuTrigger>
              <DropdownMenuSubMenuContent className="border dark:border-gray-800 bg-white dark:bg-gray-900">
                <DropdownMenuRadioGroup
                  value={theme}
                  onValueChange={handleThemeChange}
                >
                  <DropdownMenuRadioItem
                    aria-label="Switch to Light Mode"
                    value="light"
                    iconType="check"
                    className="text-foreground dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <Sun className="size-4 shrink-0" aria-hidden="true" />
                    Light
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem
                    aria-label="Switch to Dark Mode"
                    value="dark"
                    iconType="check"
                    className="text-foreground dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <Moon className="size-4 shrink-0" aria-hidden="true" />
                    Dark
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem
                    aria-label="Switch to System Mode"
                    value="system"
                    iconType="check"
                    className="text-foreground dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <Monitor className="size-4 shrink-0" aria-hidden="true" />
                    System
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubMenuContent>
            </DropdownMenuSubMenu>
          </DropdownMenuGroup>
          <DropdownMenuSeparator className="dark:border-gray-800" />
          <DropdownMenuGroup>
            <DropdownMenuItem className="text-foreground dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800">
            <a href="https://www.getlinkai.com/legal/terms-of-use" className="w-full">
                Terms of Use
              </a>
              <ArrowUpRight
                className="mb-1 ml-1 size-3 shrink-0 text-gray-500 dark:text-gray-500"
                aria-hidden="true"
              />
            </DropdownMenuItem>
            <DropdownMenuItem className="text-foreground dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800">
            <a href="https://www.getlinkai.com/legal/privacy-policy" className="w-full">
                Privacy Policy
              </a>
              <ArrowUpRight
                className="mb-1 ml-1 size-3 shrink-0 text-gray-500 dark:text-gray-500"
                aria-hidden="true"
              />
            </DropdownMenuItem>
            <DropdownMenuItem className="text-foreground dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800">
            <a href="https://www.instagram.com/getlinkai/" className="w-full">
                Follow us on Instagram
              </a>
              <ArrowUpRight
                className="mb-1 ml-1 size-3 shrink-0 text-gray-500 dark:text-gray-500"
                aria-hidden="true"
              />
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator className="dark:border-gray-800" />
          <DropdownMenuGroup>
            <DropdownMenuItem 
              onClick={() => setShowSignOutDialog(true)}
              className="text-foreground dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
