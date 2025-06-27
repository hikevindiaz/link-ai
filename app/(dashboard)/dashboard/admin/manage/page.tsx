'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Divider } from "@/components/Divider";
import { InviteUserDialog } from "@/components/admin/invite-user-dialog";
import { ManagePageHeader } from "@/components/admin/ManagePageHeader";
import { AnalyticsSection } from "@/components/admin/AnalyticsSection";
import { ManageTabContent } from "@/components/admin/ManageTabContent";
import { RiUserLine, RiRobotLine, RiFileTextLine, RiDatabase2Line } from "@remixicon/react";
import { Skeleton } from "@/components/ui/skeleton";

// Tab definitions
const tabs = [
  { id: 'users', label: 'Users', icon: RiUserLine, disabled: false },
  { id: 'agents', label: 'Agents', icon: RiRobotLine, disabled: false },
  { id: 'knowledge-sources', label: 'Knowledge Sources', icon: RiDatabase2Line, disabled: false },
  { id: 'vector-store', label: 'Vector Store', icon: RiDatabase2Line, disabled: false },
  { id: 'billing', label: 'Billing', icon: RiFileTextLine, disabled: false },
];

export default function ManagePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  // Client-side admin check
  useEffect(() => {
    if (status === 'loading') return;
    
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated' && session?.user) {
      const userRole = (session.user as any).role;
      if (userRole !== 'ADMIN') {
        router.push('/dashboard');
        return;
      }
    }
  }, [status, session, router]);

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch('/api/admin/manage-analytics');
        if (response.ok) {
          const data = await response.json();
          setAnalyticsData(data);
        }
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setAnalyticsLoading(false);
      }
    };

    if (status === 'authenticated' && (session?.user as any)?.role === 'ADMIN') {
      fetchAnalytics();
    }
  }, [status, session]);

  // Fetch users data
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/admin/users');
        if (response.ok) {
          const data = await response.json();
          setUsers(data.users || []);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setUsersLoading(false);
      }
    };

    if (status === 'authenticated' && (session?.user as any)?.role === 'ADMIN') {
      fetchUsers();
    }
  }, [status, session]);

  // Refetch users function
  const refetchUsers = async () => {
    setUsersLoading(true);
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setUsersLoading(false);
    }
  };

  // Handle successful invitation
  const handleInviteSuccess = () => {
    if (status === 'authenticated' && (session?.user as any)?.role === 'ADMIN') {
      refetchUsers();
    }
  };

  // Handle user update
  const handleUserUpdated = () => {
    if (status === 'authenticated' && (session?.user as any)?.role === 'ADMIN') {
      refetchUsers();
    }
  };

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

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-0">
      {/* Page Header */}
      <ManagePageHeader onInviteUserClick={() => setInviteDialogOpen(true)} />

      <Divider className="my-0" />

      {/* Analytics Section */}
      <div className="px-4 md:px-8 pt-6 pb-4">
        <AnalyticsSection
          analyticsLoading={analyticsLoading}
          analyticsData={analyticsData}
          users={users}
        />
      </div>

      <Divider className="my-0" />

      {/* Tab Navigation */}
      <div className="w-full">
        <div className="flex space-x-0 border-b border-neutral-200 dark:border-neutral-700">
          <div className="px-4 md:px-8 flex space-x-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => !tab.disabled && setActiveTab(tab.id)}
                disabled={tab.disabled}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  tab.disabled
                    ? 'border-transparent text-neutral-400 dark:text-neutral-600 cursor-not-allowed opacity-50'
                    : activeTab === tab.id
                    ? 'border-neutral-500 text-neutral-600 dark:text-neutral-400'
                    : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="pb-8">
        <ManageTabContent
          activeTab={activeTab}
          users={users}
          usersLoading={usersLoading}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          roleFilter={roleFilter}
          setRoleFilter={setRoleFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          userFilter={userFilter}
          setUserFilter={setUserFilter}
          onUserUpdated={handleUserUpdated}
        />
      </div>

      {/* Invite User Dialog */}
      <InviteUserDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onInviteSuccess={handleInviteSuccess}
      />
    </div>
  );
} 