'use client';

import React, { useState, useEffect } from 'react';
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/Select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRoot, TableRow } from "@/components/Table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/DropdownMenu";
import { Badge } from "@/components/ui/badge";
import { IconDots, IconEdit, IconUser, IconCreditCard, IconCalendar, IconX } from "@tabler/icons-react";
import { AssignSubscriptionDialog } from "./AssignSubscriptionDialog";
import { toast } from "sonner";

interface SubscriptionsTabProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  userFilter: string;
  setUserFilter: (user: string) => void;
}

interface UserSubscription {
  id: string;
  userId: string;
  user: {
    name: string | null;
    email: string;
  };
  plan: {
    id: string;
    name: string;
    price: number;
    currency: string;
    interval: string;
  };
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  usage?: {
    messages: { used: number; limit: number };
    sms: { used: number; limit: number };
    webSearches: { used: number; limit: number };
    voiceMinutes: { used: number; limit: number };
    storage: { used: number; limit: number };
  };
}

const statusOptions = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Trialing', value: 'trialing' },
  { label: 'Past Due', value: 'past_due' },
  { label: 'Canceled', value: 'canceled' },
  { label: 'Incomplete', value: 'incomplete' },
];

export function SubscriptionsTab({ 
  searchQuery, 
  setSearchQuery, 
  statusFilter, 
  setStatusFilter,
  userFilter,
  setUserFilter
}: SubscriptionsTabProps) {
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [cancelingSubscriptionId, setCancelingSubscriptionId] = useState<string | null>(null);

  // Fetch subscriptions
  const fetchSubscriptions = async () => {
    try {
      setSubscriptionsLoading(true);
      const response = await fetch('/api/admin/billing/subscriptions');
      if (response.ok) {
        const data = await response.json();
        setSubscriptions(data.subscriptions || []);
      } else {
        toast.error('Failed to fetch subscriptions');
      }
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      toast.error('Failed to fetch subscriptions');
    } finally {
      setSubscriptionsLoading(false);
    }
  };

  // Fetch users for filter
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

    fetchUsers();
  }, []);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  // Handle subscription actions
  const handleAssignSubscription = (user: any) => {
    setSelectedUser(user);
    setAssignDialogOpen(true);
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    setCancelingSubscriptionId(subscriptionId);
    
    try {
      const response = await fetch(`/api/admin/billing/subscriptions/${subscriptionId}/cancel`, {
        method: 'POST',
      });

      if (response.ok) {
        fetchSubscriptions(); // Refresh the list
        toast.success('Subscription canceled successfully');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Error canceling subscription:', error);
      toast.error('Failed to cancel subscription');
    } finally {
      setCancelingSubscriptionId(null);
    }
  };

  // Handle subscription updated
  const handleSubscriptionUpdated = () => {
    fetchSubscriptions(); // Refresh the list
  };

  // Filter subscriptions based on search and filters
  const filteredSubscriptions = subscriptions.filter(subscription => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = searchQuery === '' || 
      subscription.user.email.toLowerCase().includes(searchLower) ||
      (subscription.user.name && subscription.user.name.toLowerCase().includes(searchLower)) ||
      subscription.plan.name.toLowerCase().includes(searchLower);
    
    const matchesStatus = statusFilter === 'all' || subscription.status === statusFilter;
    
    const matchesUser = userFilter === 'all' || subscription.userId === userFilter;
    
    return matchesSearch && matchesStatus && matchesUser;
  });

  // Helper functions
  const formatPrice = (price: number, currency: string, interval: string) => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(price / 100);
    return `${formatted}/${interval}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-400';
      case 'trialing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-400/10 dark:text-blue-400';
      case 'past_due':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-400/10 dark:text-orange-400';
      case 'canceled':
        return 'bg-red-100 text-red-800 dark:bg-red-400/10 dark:text-red-400';
      case 'incomplete':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-400/10 dark:text-yellow-400';
      default:
        return 'bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-300';
    }
  };

  const renderSubscriptionsTable = () => (
    <TableRoot className="mt-3">
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              User
            </TableHeaderCell>
            <TableHeaderCell className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Plan
            </TableHeaderCell>
            <TableHeaderCell className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Status
            </TableHeaderCell>
            <TableHeaderCell className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Current Period
            </TableHeaderCell>
            <TableHeaderCell className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Usage This Month
            </TableHeaderCell>
            <TableHeaderCell className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Started
            </TableHeaderCell>
            <TableHeaderCell>
              <span className="sr-only">Actions</span>
            </TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredSubscriptions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                No subscriptions found
              </TableCell>
            </TableRow>
          ) : (
            filteredSubscriptions.map((subscription) => (
              <TableRow
                key={subscription.id}
                className="hover:bg-neutral-50 hover:dark:bg-neutral-900"
              >
                <TableCell className="text-sm text-neutral-700 dark:text-neutral-200">
                  <div>
                    <div className="font-medium">{subscription.user.name || 'No name'}</div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                      {subscription.user.email}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-neutral-700 dark:text-neutral-200">
                  <div>
                    <div className="font-medium">{subscription.plan.name}</div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                      {formatPrice(subscription.plan.price, subscription.plan.currency, subscription.plan.interval)}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${getStatusColor(subscription.status)}`}>
                    {subscription.status.replace('_', ' ').toUpperCase()}
                  </span>
                  {subscription.cancelAtPeriodEnd && (
                    <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                      Cancels at period end
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-sm text-neutral-500 dark:text-neutral-400">
                  <div className="text-xs">
                    <div>{new Date(subscription.currentPeriodStart).toLocaleDateString()}</div>
                    <div>to {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</div>
                  </div>
                </TableCell>
                <TableCell>
                  {subscription.usage ? (
                    <div className="text-xs space-y-1">
                      <div>Messages: {subscription.usage.messages.used.toLocaleString()}/{subscription.usage.messages.limit.toLocaleString()}</div>
                      <div>SMS: {subscription.usage.sms.used}/{subscription.usage.sms.limit}</div>
                      <div>Searches: {subscription.usage.webSearches.used}/{subscription.usage.webSearches.limit}</div>
                      <div>Storage: {subscription.usage.storage.used}GB/{subscription.usage.storage.limit}GB</div>
                    </div>
                  ) : (
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">No data</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-neutral-500 dark:text-neutral-400">
                  {new Date(subscription.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:text-neutral-300 dark:hover:bg-neutral-800 transition-colors">
                        <IconDots className="h-4 w-4" />
                        <span className="sr-only">Open menu for {subscription.user.email}</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleAssignSubscription(subscription.user)}>
                        <IconEdit className="h-4 w-4 mr-2" />
                        Change Plan
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => window.open(`/dashboard/settings`, '_blank')}>
                        <IconCreditCard className="h-4 w-4 mr-2" />
                        Billing Portal
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => window.open(`/admin/manage?tab=users&search=${subscription.user.email}`, '_blank')}>
                        <IconUser className="h-4 w-4 mr-2" />
                        View User
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => handleCancelSubscription(subscription.id)}
                        className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                        disabled={cancelingSubscriptionId === subscription.id || subscription.status === 'canceled'}
                      >
                        <IconX className="h-4 w-4 mr-2" />
                        {cancelingSubscriptionId === subscription.id ? 'Canceling...' : 'Cancel Subscription'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableRoot>
  );

  const renderLoadingSkeleton = (skeletonCount: number) => (
    <div className="mt-3 space-y-2">
      {Array.from({ length: skeletonCount }).map((_, index) => (
        <Skeleton key={index} className="h-16 w-full" />
      ))}
    </div>
  );

  return (
    <div className="mt-4">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div className="sm:flex sm:items-center sm:space-x-2">
          <Input 
            placeholder="Search users or plans..." 
            type="search" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="sm:w-80"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="mt-2 sm:mt-0 sm:w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="mt-2 sm:mt-0 sm:w-48">
              <SelectValue placeholder="Filter by user" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name || user.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button onClick={() => setAssignDialogOpen(true)}>
            <IconUser className="h-4 w-4 mr-2" />
            Assign Subscription
          </Button>
        </div>
      </div>

      {subscriptionsLoading ? renderLoadingSkeleton(5) : renderSubscriptionsTable()}

      {/* Assign Subscription Dialog */}
      <AssignSubscriptionDialog
        open={assignDialogOpen}
        setOpen={setAssignDialogOpen}
        selectedUser={selectedUser}
        onSubscriptionAssigned={handleSubscriptionUpdated}
      />
    </div>
  );
} 