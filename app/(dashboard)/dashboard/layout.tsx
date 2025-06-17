"use client";

import { MinimalAppSidebar } from "@/components/ui/navigation/MinimalAppSidebar";
import { Toaster } from "@/components/Toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMounted, setIsMounted] = useState(false);
  const [open, setOpen] = useState(false);

  // Handle initial render
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-white dark:bg-black">
        <Toaster />
        <div className="flex h-screen w-full flex-col overflow-hidden bg-white md:flex-row dark:bg-black">
          <MinimalAppSidebar open={open} setOpen={setOpen} />
          <div className="flex flex-1 overflow-hidden">
            <div className="w-full flex-1 rounded-tl-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-black overflow-y-auto">
              <div className="h-full">
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}