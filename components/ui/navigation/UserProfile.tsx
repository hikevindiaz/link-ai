"use client"

import { Button } from "@/components/Button"
import { cn, focusRing } from "@/lib/utils"
import { ChevronsUpDown } from "lucide-react"
import { IconUser } from "@tabler/icons-react"
import Image from "next/image"
import { DropdownUserProfile } from "./DropdownUserProfile"

interface UserProfileProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  collapsed?: boolean;
}

export function UserProfile({ user, collapsed = false }: UserProfileProps) {
  const userName = user?.name || "User";
  const userImage = user?.image;
  
  // Use specific placeholder image
  const fallbackImageUrl = "https://ugnyocjdcpdlneirkfiq.supabase.co/storage/v1/object/public/brand-assets/website-images/USER%20AVATAR%20Light%20Mode.png";

  return (
    <div className="[&>*]:hover:bg-transparent [&>*]:focus:bg-transparent [&>*]:active:bg-transparent">
      <DropdownUserProfile>
        <Button
          aria-label="User settings"
          variant="ghost"
          className={cn(
            "group flex w-full items-center justify-start gap-2 py-2 px-0 text-sm font-medium transition-colors",
            "text-neutral-700 dark:text-neutral-200",
            "data-[state=open]:bg-transparent hover:bg-transparent focus:bg-transparent active:bg-transparent",
            "focus:outline-none focus-visible:ring-0 focus-visible:ring-transparent",
            "h-auto min-h-0",
            "!bg-transparent !hover:bg-transparent",
            collapsed && "justify-center"
          )}
        >
          <div className="flex items-center justify-between w-full">
            <div className={cn("flex items-center", collapsed ? "gap-1" : "gap-2")}>
              {/* Avatar with user image or fallback - sized to match sidebar icons */}
              <div
                className="flex size-5 shrink-0 items-center justify-center rounded-full overflow-hidden"
                aria-hidden="true"
              >
                {userImage ? (
                  <Image
                    src={userImage}
                    alt={`${userName}'s avatar`}
                    width={20}
                    height={20}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={fallbackImageUrl}
                    alt={`${userName}'s avatar`}
                    width={20}
                    height={20}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              {/* Display user's name only when not collapsed */}
              {!collapsed && (
                <span className="text-sm group-hover/sidebar:translate-x-1 transition duration-150 whitespace-pre">
                  {userName}
                </span>
              )}
            </div>
            {/* Only show dropdown indicator when not collapsed */}
            {!collapsed && (
              <ChevronsUpDown
                className="h-4 w-4 shrink-0 text-neutral-700 dark:text-neutral-200 ml-auto"
                aria-hidden="true"
              />
            )}
          </div>
        </Button>
      </DropdownUserProfile>
    </div>
  );
}
