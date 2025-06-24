"use client";

import React, { useEffect, useState } from "react";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/MinimalSidebar";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { 
  IconGridDots,
  IconGrain,
  IconMail,
  IconShoppingBag,
  IconClipboardList,
  IconTicket,
  IconCalendar,
  IconCircleDot,
  IconPhone,
  IconMicrophone,
  IconFileIsr,
  IconPuzzle,
  IconBell,
  IconChevronUp,
  IconChevronDown,
} from "@tabler/icons-react";
import Image from "next/image";
import { UserProfile } from "./UserProfile";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { NotificationsDrawer } from "./NotificationsDrawer";
import { useNotifications } from "@/hooks/useNotifications";

// Define Module type (sessionFlag removed)
interface ModuleItem {
  id: string;
  name: string;
  href: string;
  icon: React.ElementType;
}

// Define the shape of the session user object with the nested settings map
interface SessionUserWithSettings {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  integrationSettings?: Record<string, boolean>;
}

// Main navigation items (no section title)
const navigation = [
  {
    name: "Home",
    href: "/dashboard",
    icon: IconGridDots,
    notifications: false,
    active: false,
  },
  {
    name: "Inbox",
    href: "/dashboard/inbox",
    icon: IconMail,
    notifications: 0 as number | false, 
    active: false,
  },
];

// Agents section navigation - ordered with most recent first
const agentsNavigation = [
  {
    name: "Integrations",
    href: "/dashboard/integrations",
    icon: IconPuzzle,
  },
  {
    name: "Voices",
    href: "/dashboard/voices",
    icon: IconMicrophone,
  },
  {
    name: "Phone Numbers",
    href: "/dashboard/phone-numbers",
    icon: IconPhone,
  },
  {
    name: "Knowledge Base",
    href: "/dashboard/knowledge-base",
    icon: IconFileIsr,
  },
  {
    name: "My Agents",
    href: "/dashboard/agents",
    icon: IconCircleDot,
  },
];

// Define all potential modules for Products section - ordered with most recent first
const allModules: ModuleItem[] = [
  {
    id: 'module-tickets',
    name: 'Tickets', 
    href: '/dashboard/tickets', 
    icon: IconTicket,
  },
  {
    id: 'module-forms',
    name: 'Smart Forms', 
    href: '/dashboard/forms', 
    icon: IconClipboardList,
  },
  {
    id: 'module-orders',
    name: 'Orders', 
    href: '/dashboard/orders', 
    icon: IconShoppingBag,
  },
  {
    id: 'module-calendar',
    name: 'Calendar', 
    href: '/dashboard/calendar',
    icon: IconCalendar,
  },
];

const Logo = () => {
  return (
    <a
      href="#"
      className="relative z-20 flex items-center justify-start gap-2 py-2 text-sm font-normal text-black"
    >
      <Image
        src="/LINK AI ICON DARK.png"
        className="h-6 w-auto shrink-0 dark:hidden"
        width={24}
        height={24}
        alt="Link AI Logo"
      />
      <Image
        src="/LINK AI ICON LIGHT.png"
        className="hidden h-6 w-auto shrink-0 dark:block"
        width={24}
        height={24}
        alt="Link AI Logo"
      />
    </a>
  );
};

const LogoIcon = () => {
  return (
    <a
      href="#"
      className="relative z-20 flex items-center justify-start gap-2 py-2 text-sm font-normal text-black"
    >
      <Image
        src="/LINK AI ICON DARK.png"
        className="h-6 w-auto shrink-0 dark:hidden"
        width={24}
        height={24}
        alt="Link AI Logo"
      />
      <Image
        src="/LINK AI ICON LIGHT.png"
        className="hidden h-6 w-auto shrink-0 dark:block"
        width={24}
        height={24}
        alt="Link AI Logo"
      />
    </a>
  );
};

// Section title component
const SectionTitle = ({ title, show }: { title: string; show: boolean }) => {
  return (
    <div className="px-2 py-1 mt-4 mb-2">
      <span className={cn(
        "text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider transition-opacity duration-200",
        show ? "opacity-100" : "opacity-0"
      )}>
        {title}
      </span>
    </div>
  );
};

// Collapsible Products Section Component
const CollapsibleProductsSection = ({ 
  modules, 
  open: sidebarOpen, 
  isExpanded, 
  setIsExpanded 
}: { 
  modules: ModuleItem[]; 
  open: boolean; 
  isExpanded: boolean; 
  setIsExpanded: (expanded: boolean) => void; 
}) => {
  if (modules.length === 0) return null;

  return (
    <div className="mb-2">
      {/* Collapsible Header - styled like SidebarLink */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "flex items-center justify-start gap-2 group/sidebar py-2 w-full text-left",
          "text-neutral-700 dark:text-neutral-200 transition-colors"
        )}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <IconGrain className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
            {sidebarOpen && (
              <span className="text-sm font-medium group-hover/sidebar:translate-x-1 transition duration-150 whitespace-pre">
                Tools
              </span>
            )}
          </div>
          {sidebarOpen && (
            <div className="ml-auto">
              {isExpanded ? 
                <IconChevronUp className="h-4 w-4 shrink-0 text-neutral-700 dark:text-neutral-200" /> : 
                <IconChevronDown className="h-4 w-4 shrink-0 text-neutral-700 dark:text-neutral-200" />
              }
            </div>
          )}
        </div>
      </button>

      {/* Expandable Content - only show when sidebar is open AND expanded */}
      {sidebarOpen && isExpanded && (
        <div className="ml-8 mt-1 space-y-1">
          {modules.map((module, idx) => (
            <a
              key={`products-${idx}`}
              href={module.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-2 py-2 text-sm font-medium transition-colors",
                "hover:bg-neutral-100 dark:hover:bg-neutral-800",
                "text-neutral-700 dark:text-neutral-200"
              )}
            >
              <div className="h-0.5 w-3 bg-neutral-300 dark:bg-neutral-600 rounded-full shrink-0" />
              <span>{module.name}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

// Notifications Section Component
const NotificationsSection = ({ 
  open, 
  hasUnread, 
  onClick 
}: { 
  open: boolean; 
  hasUnread: boolean; 
  onClick: () => void; 
}) => {
  return (
    <div className="mb-2">
      <button
        onClick={onClick}
        className={cn(
          "flex items-center justify-start gap-2 group/sidebar py-2 w-full text-left transition-colors",
          "text-neutral-700 dark:text-neutral-200"
        )}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <div className="relative">
              <IconBell className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
              {hasUnread && (
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-neutral-600 rounded-full" />
              )}
            </div>
            {open && (
              <span className="text-sm font-medium group-hover/sidebar:translate-x-1 transition duration-150 whitespace-pre">
                Notifications
              </span>
            )}
          </div>
        </div>
      </button>
    </div>
  );
};

interface MinimalAppSidebarProps {
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}

export function MinimalAppSidebar({ open: propOpen, setOpen: propSetOpen }: MinimalAppSidebarProps) {
  const pathname = usePathname();
  const { toast } = useToast();
  const { data: session, status: sessionStatus } = useSession();
  const [inboxUnreadCount, setInboxUnreadCount] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);
  const [productsExpanded, setProductsExpanded] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  
  // Use notifications hook
  const { unreadCount: notificationsUnreadCount } = useNotifications();

  // Use prop state if provided, otherwise use internal state
  const open = propOpen !== undefined ? propOpen : internalOpen;
  const setOpen = propSetOpen !== undefined ? propSetOpen : setInternalOpen;

  // Auto-close Products section when sidebar collapses
  useEffect(() => {
    if (!open && productsExpanded) {
      setProductsExpanded(false);
    }
  }, [open, productsExpanded]);

  // Filter modules based on session data
  const enabledModules = React.useMemo(() => {
    if (sessionStatus !== 'authenticated' || !session?.user) {
      return [];
    }
    const currentUser = session.user as SessionUserWithSettings;
    const settings = currentUser.integrationSettings ?? {};
    
    return allModules.filter(module => {
        const isEnabled = settings[module.id] === true;
        return isEnabled;
    });
  }, [session, sessionStatus]);

  // Set mounted state
  useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsMounted(false);
    };
  }, []);

  // Fetch unread counts effect
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
          if (navigation.length > 1) {
            navigation[1].notifications = count > 0 ? count : false;
          }
        } else {
          console.error('[MinimalAppSidebar] Failed to fetch unread count:', response.status);
          setInboxUnreadCount(0);
          if (navigation.length > 1) {
            navigation[1].notifications = false;
          }
        }
      } catch (error) {
        if (!isMounted) return;
        console.error('[MinimalAppSidebar] Error fetching unread count:', error);
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

  if (!isMounted) return null;

  // Convert navigation items to links format
  const navigationLinks = navigation.map(item => ({
    label: item.name,
    href: item.href,
    icon: (
      <div className="relative">
        <item.icon className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
        {item.name === 'Inbox' && inboxUnreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-2 w-2 bg-neutral-600 dark:bg-neutral-400 rounded-full" />
        )}
      </div>
    ),
  }));

  // Convert agents navigation to links format
  const agentsNavigationLinks = agentsNavigation.map(item => ({
    label: item.name,
    href: item.href,
    icon: <item.icon className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />,
  }));

  return (
    <Sidebar open={open} setOpen={setOpen}>
      <SidebarBody className="justify-between gap-10">
        <div className="flex flex-1 flex-col overflow-hidden">
          {open ? <Logo /> : <LogoIcon />}
          
          <div className="mt-8 flex flex-col gap-2 overflow-hidden">
            {/* Main Navigation Links (Home, Inbox) */}
            {navigationLinks.map((link, idx) => (
              <SidebarLink key={idx} link={link} />
            ))}
            
            {/* Agents Section */}
            <SectionTitle title="Agents" show={open} />
            {agentsNavigationLinks.map((link, idx) => (
              <SidebarLink key={`agents-${idx}`} link={link} />
            ))}
          </div>
        </div>
        
        {/* Footer with Collapsible Products, Notifications, and User Profile */}
        <div className="space-y-2 flex-shrink-0 overflow-hidden">
          {/* Collapsible Products Section */}
          <CollapsibleProductsSection
            modules={enabledModules}
            open={open}
            isExpanded={productsExpanded}
            setIsExpanded={setProductsExpanded}
          />
          
          {/* Notifications Section */}
          <NotificationsSection 
            open={open} 
            hasUnread={notificationsUnreadCount > 0}
            onClick={() => setNotificationsOpen(true)}
          />
          
          {/* User Profile */}
          {session && (
            <UserProfile 
              user={session.user as SessionUserWithSettings} 
              collapsed={!open} 
            />
          )}
        </div>
      </SidebarBody>
      
      {/* Notifications Drawer */}
      <NotificationsDrawer 
        open={notificationsOpen} 
        onOpenChange={setNotificationsOpen} 
      />
    </Sidebar>
  );
} 