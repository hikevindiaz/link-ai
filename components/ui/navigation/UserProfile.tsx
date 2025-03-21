"use client"

import { Button } from "@/components/Button"
import { cn, focusRing } from "@/lib/utils"
import { ChevronsUpDown } from "lucide-react"
import { DropdownUserProfile } from "./DropdownUserProfile"

interface UserProfileProps {
  user: {
    name?: string | null;
    email?: string | null;
  };
  collapsed?: boolean;
}

export function UserProfile({ user, collapsed = false }: UserProfileProps) {
  const userName = user?.name || "User";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <DropdownUserProfile>
      <Button
        aria-label="User settings"
        variant="ghost"
        className={cn(
          "group flex w-full items-center justify-between rounded-md px-1 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200/50 data-[state=open]:bg-gray-200/50 hover:dark:bg-gray-800/50 data-[state=open]:dark:bg-gray-900",
          focusRing,
          collapsed && "justify-center"
        )}
      >
        <span className={cn("flex items-center", collapsed ? "gap-1" : "gap-3")}>
          {/* Avatar with initials */}
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white text-xs text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
            aria-hidden="true"
          >
            {userInitials}
          </span>
          {/* Display user's name only when not collapsed */}
          {!collapsed && <span>{userName}</span>}
        </span>
        {/* Only show dropdown indicator when not collapsed */}
        {!collapsed && (
          <ChevronsUpDown
            className="size-4 shrink-0 text-gray-500 group-hover:text-gray-700 group-hover:dark:text-gray-400"
            aria-hidden="true"
          />
        )}
      </Button>
    </DropdownUserProfile>
  );
}
