"use client";

import { AppSidebar } from "@/components/ui/navigation/AppSidebar";
import { Toaster } from "@/components/Toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Handle initial render and sidebar state
  useEffect(() => {
    setIsMounted(true);
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      } else if (window.innerWidth > 1280) {
        setSidebarCollapsed(false);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  if (!isMounted) return null;

  const handleSidebarToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-white dark:bg-gray-950">
        <Toaster />
        <AppSidebar collapsed={sidebarCollapsed} onToggle={handleSidebarToggle} />
        <main 
          className={cn(
            "transition-all duration-300 min-h-screen",
            sidebarCollapsed ? "ml-[70px]" : "ml-[260px]"
          )}
        >
          {children}
        </main>
      </div>
    </TooltipProvider>
  );
}
