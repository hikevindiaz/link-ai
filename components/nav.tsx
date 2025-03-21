"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { SidebarNavItem } from "@/types";
import { cn } from "@/lib/utils";
import { Icons } from "@/components/icons";

export function DashboardNav({ items }: { items: SidebarNavItem[] }) {
  const path = usePathname();
  const { theme, resolvedTheme, setTheme } = useTheme();

  if (!items?.length) {
    return null;
  }

  return (
    <nav className="flex flex-col justify-between h-full">
      {/* Top Section: Logo */}
      <div className="flex flex-col items-center space-y-2 py-4">
        <img
          src={
            theme === "dark" || resolvedTheme === "dark"
              ? "/LINK LOGO WHITE.png"
              : "/LINK LOGO DARK.png"
          }
          alt="Link AI Logo"
          className="h-8 w-auto"
        />
        <div className="w-full border-t border-gray-200" />
      </div>

      {/* Middle Section: Navigation Items */}
      <div className="flex-1 overflow-y-auto px-4">
        {items.map((item, index) => {
          const Icon = Icons[item.icon || "arrowRight"];
          return (
            <Link
              key={index}
              href={item.disabled ? "/" : item.href || "#"}
              className={cn(
                "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                path === item.href ? "bg-[#3c82f6] text-white" : "text-gray-700",
                item.disabled && "cursor-not-allowed opacity-50"
              )}
            >
              {Icon && <Icon className="mr-2 h-5 w-5" />}
              <span>{item.title}</span>
            </Link>
          );
        })}
      </div>

      {/* Bottom Section: Dark Mode Toggle and Settings */}
      <div className="flex flex-col items-center space-y-4 pb-4">
        <button
          onClick={() =>
            setTheme(theme === "dark" || resolvedTheme === "dark" ? "light" : "dark")
          }
          className="flex items-center justify-center h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          <Icons.sun className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        </button>
        <Link
          href="/dashboard/settings"
          className="flex items-center justify-center h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          <Icons.settings className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        </Link>
      </div>
    </nav>
  );
}
