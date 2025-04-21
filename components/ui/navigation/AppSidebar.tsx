"use client";

import React, { useEffect, useState } from "react";

import {
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
  SidebarSubLink,
  SidebarProvider,
  useSidebar,
} from "@/components/Sidebar";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { 
  RiArrowDownSFill, 
  RiShoppingBagFill, 
  RiCheckboxMultipleFill, 
  RiCustomerService2Fill, 
  RiCalendarFill,
  RiApps2AiLine,
  RiMailLine,
  RiShoppingBag2Line,
  RiTicketLine,
  RiCalendarLine,
  RiMailAiLine,
} from "@remixicon/react";
import { BookText, MessageSquare, Mouse, PackageSearch, PanelLeft, PanelRight } from "lucide-react";
import Image from "next/image";
import { UserProfile } from "./UserProfile";
import { Divider } from "@/components/Divider";
import { Input } from "@/components/Input";
import { Icons } from "@/components/icons";
import { useTheme } from "next-themes";  // Theme hook for dark mode support
import MovingGradientIcon from "@/components/MovingGradientIcon";
import LinkAIProfileIcon from "@/components/LinkAIProfileIcon";
import { usePathname } from "next/navigation";
import { LinkAIAgentIcon } from "@/components/icons/LinkAIAgentIcon";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/Button";

// Define Module type (sessionFlag removed)
interface ModuleItem {
  id: string;
  name: string;
  href: string;
  icon: React.ElementType;
}

// Define the shape of the session user object with the nested settings map
// Make sure types/next-auth.d.ts reflects this structure
interface SessionUserWithSettings {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  integrationSettings?: Record<string, boolean>; // Key is integrationId
}

// Main navigation items
const navigation = [
  {
    name: "Home",
    href: "/dashboard",
    icon: RiApps2AiLine,
    notifications: false,
    active: false,
  },
  {
    name: "Inbox",
    href: "/dashboard/inbox",
    icon: RiMailAiLine,
    notifications: 0 as number | false, 
    active: false,
  },
];

// Define all potential modules (sessionFlag removed)
const allModules: ModuleItem[] = [
  {
    id: 'module-orders',
    name: 'Orders', 
    href: '/dashboard/orders', 
    icon: RiShoppingBag2Line,
  },
  {
    id: 'module-forms',
    name: 'Smart Forms', 
    href: '/dashboard/forms', 
    icon: Icons.clipboard,
  },
  {
    id: 'module-tickets',
    name: 'Customer Tickets', 
    href: '/dashboard/tickets', 
    icon: RiTicketLine,
  },
  {
    id: 'module-calendar',
    name: 'Calendar', 
    href: '/dashboard/calendar',
    icon: RiCalendarLine,
  },
];

// Nested navigation - Remove Activity, keep Agents, KB, Settings
const navigationGroups = [
  // Activity group removed
  {
    name: "Agents",
    href: "#",
    icon: () => (
      <LinkAIAgentIcon 
        className="size-5 text-[#121826] dark:text-white" 
        aria-hidden="true"
      />
    ),
    children: [
      { name: "All Agents", href: "/dashboard/agents", active: false },
      { name: "Phone Numbers", href: "/dashboard/phone-numbers", active: false },
      { name: "Voices", href: "/dashboard/voices", active: false },
    ],
  },
  {
    name: "Knowledge Base",
    href: "/dashboard/knowledge-base", // Direct link for parent?
    icon: Icons.brain,
    children: [
      { name: "Sources", href: "/dashboard/knowledge-base", active: false },
      // Add other KB links if needed
    ],
  },
  {
    name: "Settings",
    href: "#",
    icon: Icons.settings,
    children: [
      { name: "Integrations", href: "/dashboard/integrations", active: false },
      { name: "General Settings", href: "/dashboard/settings", active: false },
      // Add Billing, etc.
    ],
  },
];

export function AppSidebar({ ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const pathname = usePathname();
  const { toast } = useToast();
  const [collapsed, setCollapsed] = useState(false);
  const { theme, resolvedTheme } = useTheme();
  const [currentTheme, setCurrentTheme] = useState<string | undefined>(undefined);
  const { data: session, status: sessionStatus } = useSession();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<any[]>([]);
  const [inboxUnreadCount, setInboxUnreadCount] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  
  // Debugging log (can be kept or removed)
  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      console.log("[AppSidebar] Session Data:", session);
      console.log("[AppSidebar] Integration Settings from Session:", (session?.user as SessionUserWithSettings)?.integrationSettings);
    }
  }, [session, sessionStatus]);

  // Filter modules based on session data (UPDATED LOGIC)
  const enabledModules = React.useMemo(() => {
    if (sessionStatus !== 'authenticated' || !session?.user) {
      return [];
    }
    // Cast session.user to our specific type
    const currentUser = session.user as SessionUserWithSettings;
    const settings = currentUser.integrationSettings ?? {}; // Get the settings map, default to empty
    
    console.log("[AppSidebar] Filtering based on settings:", settings);

    return allModules.filter(module => {
        // Check if the module's ID exists as a key in the settings map and is true
        const isEnabled = settings[module.id] === true;
        console.log(`[AppSidebar] Checking ${module.id}: Found in settings=${settings.hasOwnProperty(module.id)}, Value=${settings[module.id]}, Enabled=${isEnabled}`);
        return isEnabled;
    });
  }, [session, sessionStatus]);

  // Initialize open menus based on navigationGroups and active modules
  const [openMenus, setOpenMenus] = React.useState<string[]>(() =>
    navigationGroups
      .filter((item) =>
        item.children?.some((child) => pathname === child.href)
      )
      .map((item) => item.name)
  );
  
  // Set mounted state and initialize currentTheme
  useEffect(() => {
    setIsMounted(true);
    setCurrentTheme(resolvedTheme);
    
    return () => {
      setIsMounted(false);
    };
  }, [resolvedTheme]);
  
  // Effect to keep currentTheme updated whenever resolvedTheme changes
  useEffect(() => {
    if (isMounted && resolvedTheme) {
      setCurrentTheme(resolvedTheme);
    }
  }, [isMounted, resolvedTheme]);
  
  // Effect to adjust sidebar based on screen size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setCollapsed(true);
      } else if (window.innerWidth > 1280) {
        setCollapsed(false);
      }
    };
    
    // Set initial state based on screen size
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Simplified effect for fetching count and handling events
  useEffect(() => {
    if (!isMounted) return;
    const fetchUnreadCount = async () => {
      try {
          const response = await fetch('/api/inbox/unread');
        if (!isMounted) return;
          if (response.ok) {
            const data = await response.json();
          const count = data.count > 0 ? data.count : 0;
          setInboxUnreadCount(count);
          // Directly update the navigation item (assuming index 1 is Inbox)
          if (navigation.length > 1) {
              navigation[1].notifications = count > 0 ? count : false;
          }
        } else {
          console.error('[AppSidebar] Failed to fetch unread count:', response.status);
          setInboxUnreadCount(0);
          if (navigation.length > 1) {
             navigation[1].notifications = false;
          }
        }
      } catch (error) {
        if (!isMounted) return;
        console.error('[AppSidebar] Error fetching unread count:', error);
        setInboxUnreadCount(0);
         if (navigation.length > 1) {
             navigation[1].notifications = false;
          }
      }
    };
    fetchUnreadCount();
    const handleThreadRead = () => { if (isMounted) fetchUnreadCount(); };
    const handleNewMessageSaved = () => { if (isMounted) setTimeout(() => { if (isMounted) fetchUnreadCount(); }, 1500); };
    window.addEventListener('inboxThreadRead', handleThreadRead);
    window.addEventListener('newChatMessageSaved', handleNewMessageSaved);
    return () => {
      window.removeEventListener('inboxThreadRead', handleThreadRead);
      window.removeEventListener('newChatMessageSaved', handleNewMessageSaved);
    };
  }, [isMounted]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
  
    if (query.trim() === "") {
      setSearchResults([]);
      return;
    }
    
    // Combine static nav, *ENABLED* modules, and grouped nav for search
    type SearchableItem = { name: string; href: string; [key: string]: any; };
    const allPages: SearchableItem[] = [
      ...navigation as SearchableItem[],
      ...enabledModules as SearchableItem[], // Use the filtered enabledModules for search
      ...navigationGroups.flatMap((item) => {
        if (item.children) {
          return [{ ...item, isParent: true } as SearchableItem, ...item.children as SearchableItem[]];
        }
        return [item as SearchableItem];
      }),
    ];
  
    const filteredResults = allPages.filter((item) =>
      item.name.toLowerCase().includes(query) && item.href !== '#' // Exclude parent group triggers
    );
  
    setSearchResults(filteredResults);
  };

  const toggleMenu = (name: string) => {
    if (collapsed) {
      setCollapsed(false);
      setOpenMenus([name]);
      return;
    }
    setOpenMenus((prev) =>
      prev.includes(name)
        ? prev.filter((item) => item !== name)
        : [...prev, name]
    );
  };

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
    if (!collapsed) {
      setOpenMenus([]);
    }
  };

  if (!isMounted) return null;

  const themeClass = currentTheme === "dark" 
    ? "bg-gray-950 text-white" 
    : "bg-gray-50 text-gray-900";

  return (
    <div
      {...props}
      className={cn(
        "h-full flex flex-col justify-between flex-shrink-0 transition-all duration-300",
        "border-r border-gray-200 dark:border-gray-800",
        themeClass,
        collapsed ? "w-[70px]" : "w-[260px]"
      )}
    >
      {/* Header */}
      <div className={cn(
        "py-4 flex items-center justify-between",
        collapsed ? "px-2" : "px-3"
      )}>
        <div className={cn(
          "flex items-center", 
          collapsed ? "justify-center w-full" : "pl-2"
        )}>
          {collapsed ? (
            <Image 
              src={currentTheme === "dark" ? "/LINK AI ICON LIGHT.png" : "/LINK AI ICON DARK.png"} 
              alt="Link AI Logo" 
              width={12}
              height={12}
              className="object-contain h-auto"
            />
          ) : (
            <Image 
              src={currentTheme === "dark" ? "/LINK AI LOGO LIGHT.png" : "/LINK AI LOGO DARK.png"} 
              alt="Link AI Logo" 
              width={65}
              height={20}
              className="object-contain"
            />
          )}
        </div>
        {!collapsed && (
          <Button
            variant="ghost"
            aria-label="Collapse sidebar"
            onClick={toggleSidebar}
            className="h-8 w-8 p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800"
          >
            <PanelLeft className="size-[18px] shrink-0" aria-hidden="true" />
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {/* Search Bar - only show when expanded */}
        {!collapsed && (
          <div className="relative flex w-full min-w-0 flex-col p-3">
            <div className="w-full text-sm">
              <div className="relative">
                <Input
                  type="search"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search pages..."
                  className="[&>input]:sm:py-1.5"
                />
                {searchQuery && searchResults.length > 0 && (
                  <div className="absolute z-10 mt-2 w-full bg-white shadow-lg rounded-md overflow-hidden dark:bg-gray-800">
                    {searchResults.map((result) => (
                      <button
                        key={result.href}
                        onClick={() => {
                          setSearchQuery("");
                          setSearchResults([]);
                          window.location.href = result.href;
                        }}
                        className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        {result.name}
                      </button>
                    ))}
                  </div>
                )}
                {searchQuery && searchResults.length === 0 && (
                  <div className="absolute z-10 mt-2 w-full bg-white shadow-lg rounded-md overflow-hidden dark:bg-gray-800 p-2 text-center text-xs text-gray-500">
                    No results found.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
  
        {/* Navigation */}
        <div className="relative flex w-full min-w-0 flex-col p-3 pt-0">
          <div className="w-full text-sm">
            <ul className="flex w-full min-w-0 flex-col gap-1 space-y-1">
              {/* Add toggle button as a normal navigation item when collapsed */}
              {collapsed && (
                <li>
                  <button
                    onClick={toggleSidebar}
                    aria-label="Expand sidebar"
                    className={cn(
                      "flex w-full items-center justify-center rounded-md p-2 text-base transition hover:bg-gray-200/50 sm:text-sm hover:dark:bg-gray-900",
                      "text-gray-900 dark:text-gray-400",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    )}
                  >
                    <PanelRight className="size-[18px] shrink-0" aria-hidden="true" />
                  </button>
                </li>
              )}
              
              {/* --- Render Static Top Links (Home, Inbox) --- */}
              {navigation.map((item) => (
                <li key={item.name} className="relative">
                  <a
                    href={item.href}
                    aria-current={pathname === item.href ? "page" : undefined}
                    data-active={pathname === item.href}
                    className={cn(
                      "flex items-center rounded-md p-2 text-base transition hover:bg-gray-200/50 sm:text-sm hover:dark:bg-gray-900",
                      collapsed ? "justify-center" : "justify-between",
                      "text-gray-900 dark:text-gray-400 hover:dark:text-gray-50",
                      "data-[active=true]:text-indigo-600 data-[active=true]:dark:text-indigo-500",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    )}
                  >
                    <span className={cn(
                      "flex items-center", 
                      !collapsed && "gap-x-2.5"
                    )}>
                      {item.icon && <item.icon className="size-[18px] shrink-0" aria-hidden="true" />} 
                      {!collapsed && item.name}
                    </span>
                     {/* Updated notification badge logic */}
                     {item.name === 'Inbox' && inboxUnreadCount > 0 && (
                        <span className={cn(
                            "inline-flex items-center justify-center rounded",
                            collapsed 
                            ? "absolute top-0.5 right-1.5 size-2 bg-indigo-600 dark:bg-indigo-500" 
                            : "ml-auto size-5 bg-indigo-100 text-sm font-medium text-indigo-600 sm:text-xs dark:bg-indigo-500/10 dark:text-indigo-500"
                        )}>
                            {!collapsed && inboxUnreadCount}
                        </span>
                    )}
                  </a>
                </li>
              ))}
              
              {/* Divider between static nav and modules - Conditional Rendering */}
              {enabledModules.length > 0 && (
                <div className="px-3">
                  <Divider className="my-1" />
                </div>
              )}

              {/* --- Render ENABLED Modules based on session --- */}
              {enabledModules.map((item) => (
                <li key={item.id} className="relative">
                  <a
                    href={item.href}
                    aria-current={pathname === item.href ? "page" : undefined}
                    data-active={pathname === item.href}
                    className={cn(
                      "flex items-center rounded-md p-2 text-base transition hover:bg-gray-200/50 sm:text-sm hover:dark:bg-gray-900",
                      collapsed ? "justify-center" : "justify-start", // Align left when expanded
                      "text-gray-900 dark:text-gray-400 hover:dark:text-gray-50",
                      "data-[active=true]:text-indigo-600 data-[active=true]:dark:text-indigo-500",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    )}
                  >
                    <span className={cn(
                      "flex items-center", 
                      !collapsed && "gap-x-2.5"
                    )}>
                      {item.icon && <item.icon className="size-[18px] shrink-0" aria-hidden="true" />} 
                      {!collapsed && item.name}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
  
        {/* Divider */}
        <div className="px-3">
          <Divider className="my-1" />
        </div>
  
        {/* --- Render Static Navigation Groups (Agents, KB, Settings) --- */}
        <div className="relative flex w-full min-w-0 flex-col p-3 pt-1">
          <div className="w-full text-sm">
            <ul className="flex w-full min-w-0 flex-col gap-1 space-y-1"> {/* Reduced space-y */} 
              {navigationGroups.map((item) => (
                <li key={item.name} className="relative">
                  <button
                    onClick={() => toggleMenu(item.name)}
                     // Check if current path is within this group for active state
                     data-active={item.children?.some(child => pathname === child.href)}
                    className={cn(
                      "flex items-center rounded-md p-2 w-full text-base transition sm:text-sm",
                      collapsed ? "justify-center" : "justify-between gap-2",
                      "text-gray-900 dark:text-gray-400 hover:bg-gray-200/50 hover:dark:bg-gray-900 hover:dark:text-gray-50",
                       // Apply active styles to the button if a child is active
                      "data-[active=true]:text-indigo-600 data-[active=true]:dark:text-indigo-500"
                    )}
                  >
                    <div className={cn("flex items-center", !collapsed && "gap-x-2.5")}>
                      <item.icon
                        className="size-[18px] shrink-0" 
                        aria-hidden="true"
                      />
                      {!collapsed && item.name}
                    </div>
                    {!collapsed && (
                      <RiArrowDownSFill
                        className={cn(
                          openMenus.includes(item.name) ? "rotate-0" : "-rotate-90",
                          "size-5 shrink-0 transform text-gray-400 transition-transform"
                        )}
                        aria-hidden="true"
                      />
                    )}
                  </button>
                  {/* Submenu rendering logic remains the same */}
                  {item.children && openMenus.includes(item.name) && !collapsed && (
                    <ul className="relative mt-1 space-y-1 border-l border-transparent">
                      <div className="absolute inset-y-0 left-4 w-px bg-gray-300 dark:bg-gray-800" />
                      {item.children.map((child) => (
                        <li key={child.name}>
                          <a
                            href={child.href}
                            aria-current={pathname === child.href ? "page" : undefined}
                            data-active={pathname === child.href}
                            className={cn(
                              "relative flex gap-2 rounded-md py-1.5 pl-9 pr-3 text-base transition sm:text-sm",
                              "text-gray-700 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50",
                              "data-[active=true]:rounded data-[active=true]:bg-white data-[active=true]:text-indigo-600 data-[active=true]:shadow data-[active=true]:ring-1 data-[active=true]:ring-gray-200 data-[active=true]:dark:bg-gray-900 data-[active=true]:dark:text-indigo-500 data-[active=true]:dark:ring-gray-800",
                              "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                            )}
                          >
                            {pathname === child.href && (
                              <div
                                className="absolute left-4 top-1/2 h-5 w-px -translate-y-1/2 bg-indigo-500 dark:bg-indigo-500"
                                aria-hidden="true"
                              />
                            )}
                            {child.name}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className={cn("flex flex-col gap-2 p-3", collapsed ? "items-center" : "")}>
        <div className="w-full border-t border-gray-200 dark:border-gray-800" />
        {session && <UserProfile user={session.user as SessionUserWithSettings} collapsed={collapsed} />}
      </div>
    </div>
  );
}
