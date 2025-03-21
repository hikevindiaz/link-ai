"use client";

import { SidebarProvider } from "@/components/Sidebar";
import { AppSidebar } from "@/components/ui/navigation/AppSidebar";
import { Breadcrumbs } from "@/components/ui/navigation/Breadcrumbs";
import { Toaster } from "@/components/Toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <Toaster />
        <AppSidebar />
        <main className="flex-1 overflow-auto bg-white dark:bg-gray-950">
          {children}
        </main>
      </div>
    </TooltipProvider>
  );
}
