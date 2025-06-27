'use client';

import { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/Button";
import { Divider } from "@/components/Divider";
import { 
  RiMailLine,
  RiMegaphoneLine,
  RiEyeLine,
  RiUserAddLine
} from "@remixicon/react";
import { Skeleton } from "@/components/ui/skeleton";

export default function MarketingAdmin() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  // Client-side admin check
  useEffect(() => {
    if (status === 'loading') return; // Still loading
    
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    // Check if user is admin
    if (status === 'authenticated' && session?.user) {
      const userRole = (session.user as any).role;
      if (userRole !== 'ADMIN') {
        router.push('/dashboard');
        return;
      }
    }
  }, [status, session, router]);

  // Don't render anything while checking auth
  if (status === 'loading') {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Don't render if not authenticated or not admin
  if (status !== 'authenticated' || (session?.user as any)?.role !== 'ADMIN') {
    return null;
  }

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-0">
      {/* Header Section */}
      <div className="px-4 md:px-8 pt-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
          {/* Left Side: Title */}
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-50">
              Marketing & Campaigns
            </h3>
          </div>

          {/* Right Side: Actions */}
          <div className="flex items-center space-x-4">
            <Button variant="secondary" size="sm">
              Create Campaign
            </Button>
            <Button size="sm">
              Send Newsletter
            </Button>
          </div>
        </div>
      </div>

      <Divider className="my-4" />

      {/* Content Section */}
      <div className="px-4 md:px-8 space-y-6">
        {/* Marketing Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Email Subscribers</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">0</p>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">No campaigns yet</p>
              </div>
              <RiMailLine className="size-8 text-blue-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Active Campaigns</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">0</p>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">None scheduled</p>
              </div>
              <RiMegaphoneLine className="size-8 text-purple-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Open Rate</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">0%</p>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">No data available</p>
              </div>
              <RiEyeLine className="size-8 text-green-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Conversion Rate</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">0%</p>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">No data available</p>
              </div>
              <RiUserAddLine className="size-8 text-orange-500" />
            </div>
          </Card>
        </div>

        {/* Coming Soon */}
        <Card className="p-8">
          <div className="flex flex-col items-center justify-center text-center">
            <RiMegaphoneLine className="size-12 text-neutral-400 mb-4" />
            <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-50 mb-2">
              Advanced Marketing Tools Coming Soon
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              We're building advanced campaign management, A/B testing, and detailed analytics.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
} 