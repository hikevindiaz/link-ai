'use client';

import React, { useState, useEffect } from 'react';
import { Input } from "@/components/Input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/Select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRoot, TableRow } from "@/components/Table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/DropdownMenu";
import { RiMore2Line, RiEditLine, RiShieldLine, RiDeleteBinLine, RiShieldCheckLine } from "@remixicon/react";
import { EditUserDialog } from "./EditUserDialog";

interface UserManagementTabProps {
  users: any[];
  usersLoading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  roleFilter: string;
  setRoleFilter: (role: string) => void;
  onUserUpdated?: () => void;
}

const roles = [
  { name: 'User', value: 'USER' },
  { name: 'Admin', value: 'ADMIN' },
];

export function UserManagementTab({ 
  users, 
  usersLoading, 
  searchQuery, 
  setSearchQuery, 
  roleFilter, 
  setRoleFilter,
  onUserUpdated
}: UserManagementTabProps) {
  const [invitations, setInvitations] = useState<any[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [blockingUserId, setBlockingUserId] = useState<string | null>(null);

  // Fetch pending invitations
  useEffect(() => {
    const fetchInvitations = async () => {
      try {
        const response = await fetch('/api/admin/invitations?status=pending');
        if (response.ok) {
          const data = await response.json();
          setInvitations(data.invitations || []);
        }
      } catch (error) {
        console.error('Error fetching invitations:', error);
      } finally {
        setInvitationsLoading(false);
      }
    };

    fetchInvitations();
  }, []);

  // Helper function to check if email is verified (handles DateTime field)
  const isEmailVerified = (emailVerified: any) => {
    return emailVerified !== null && emailVerified !== undefined && emailVerified !== '';
  };

  // Helper function to format verification date
  const getVerificationDate = (emailVerified: any) => {
    if (!isEmailVerified(emailVerified)) return null;
    try {
      return new Date(emailVerified).toLocaleDateString();
    } catch {
      return 'Invalid date';
    }
  };

  // Helper function to get subscription status
  const getSubscriptionStatus = (user: any) => {
    if (!user.stripeSubscriptionStatus) {
      return { status: 'Pending', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-400/10 dark:text-yellow-400' };
    }

    switch (user.stripeSubscriptionStatus) {
      case 'trialing':
        return { status: 'Trialing', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-400/10 dark:text-indigo-400' };
      case 'active':
        return { status: 'Active', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-400' };
      case 'past_due':
        return { status: 'Past Due', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-400/10 dark:text-yellow-400' };
      case 'canceled':
        return { status: 'Canceled', color: 'bg-red-100 text-red-800 dark:bg-red-400/10 dark:text-red-400' };
      default:
        return { status: 'Custom', color: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-300' };
    }
  };

  // Helper function to get role badge styling
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return { label: 'Admin', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-400/10 dark:text-indigo-400' };
      case 'USER':
      default:
        return { label: 'User', color: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-300' };
    }
  };

  // Filter users based on search and role
  const filteredUsers = users.filter(user => {
    const matchesSearch = searchQuery === '' || 
      (user.name && user.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  // Filter invitations based on search
  const filteredInvitations = invitations.filter(invitation => {
    return searchQuery === '' || invitation.email.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Separate users by different categories
  const allUsers = filteredUsers;
  const adminUsers = filteredUsers.filter(user => user.role === 'ADMIN');

  // Handle user update
  const handleUserUpdated = (updatedUser: any) => {
    console.log('User updated:', updatedUser);
    // Trigger refetch of users in the parent component
    onUserUpdated?.();
  };

  // Handle block/unblock user
  const handleBlockUser = async (userId: string, action: 'block' | 'unblock') => {
    setBlockingUserId(userId);
    
    try {
      const response = await fetch(`/api/admin/users/${userId}/block`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`User ${action}ed successfully:`, result);
        // Trigger refetch of users
        onUserUpdated?.();
      } else {
        const error = await response.json();
        console.error(`Failed to ${action} user:`, error);
        // You could add a toast notification here
      }
    } catch (error) {
      console.error(`Error ${action}ing user:`, error);
    } finally {
      setBlockingUserId(null);
    }
  };

  const renderUserTable = (userList: any[]) => (
    <TableRoot className="mt-3">
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Member
            </TableHeaderCell>
            <TableHeaderCell className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Email
            </TableHeaderCell>
            <TableHeaderCell className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Role
            </TableHeaderCell>
            <TableHeaderCell className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Subscription
            </TableHeaderCell>
            <TableHeaderCell className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Status
            </TableHeaderCell>
            <TableHeaderCell className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Email Verified
            </TableHeaderCell>
            <TableHeaderCell className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Onboarding
            </TableHeaderCell>
            <TableHeaderCell className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Date Added
            </TableHeaderCell>
            <TableHeaderCell>
              <span className="sr-only">Actions</span>
            </TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {userList.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                No users found
              </TableCell>
            </TableRow>
          ) : (
            userList.map((user) => {
              const subscription = getSubscriptionStatus(user);
              const roleBadge = getRoleBadge(user.role);
              
              return (
                <TableRow
                  key={user.id}
                  className="hover:bg-neutral-50 hover:dark:bg-neutral-900"
                >
                  <TableCell className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                    {user.name || 'No name'}
                  </TableCell>
                  <TableCell className="text-sm text-neutral-700 dark:text-neutral-200">
                    {user.email}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${roleBadge.color}`}>
                      {roleBadge.label}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${subscription.color}`}>
                      {subscription.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                      user.status === 'BLOCKED'
                        ? 'bg-red-100 text-red-800 dark:bg-red-400/10 dark:text-red-400'
                        : user.onboardingCompleted 
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-400'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-400/10 dark:text-yellow-400'
                    }`}>
                      {user.status === 'BLOCKED' ? 'Blocked' : user.onboardingCompleted ? 'Active' : 'Pending'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span 
                      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                        isEmailVerified(user.emailVerified)
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-400/10 dark:text-red-400'
                      }`}
                      title={isEmailVerified(user.emailVerified) ? `Verified on ${getVerificationDate(user.emailVerified)}` : 'Email not verified'}
                    >
                      {isEmailVerified(user.emailVerified) ? 'Verified' : 'Unverified'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                      user.onboardingCompleted 
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-400'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-400/10 dark:text-yellow-400'
                    }`}>
                      {user.onboardingCompleted ? 'Completed' : 'Incomplete'}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-neutral-500 dark:text-neutral-400">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:text-neutral-300 dark:hover:bg-neutral-800 transition-colors">
                            <RiMore2Line className="size-4" />
                            <span className="sr-only">Open menu for {user.name}</span>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setSelectedUser(user);
                            setEditDialogOpen(true);
                          }}>
                            <RiEditLine className="size-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          {user.status === 'BLOCKED' ? (
                            <DropdownMenuItem 
                              onClick={() => handleBlockUser(user.id, 'unblock')}
                              disabled={blockingUserId === user.id}
                            >
                              <RiShieldCheckLine className="size-4 mr-2" />
                              {blockingUserId === user.id ? 'Unblocking...' : 'Unblock'}
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem 
                              onClick={() => handleBlockUser(user.id, 'block')}
                              disabled={blockingUserId === user.id}
                            >
                              <RiShieldLine className="size-4 mr-2" />
                              {blockingUserId === user.id ? 'Blocking...' : 'Block'}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => console.log('Delete user:', user.id)}
                            className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                          >
                            <RiDeleteBinLine className="size-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </TableRoot>
  );

  const renderInvitationsTable = () => (
    <TableRoot className="mt-3">
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Email
            </TableHeaderCell>
            <TableHeaderCell className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Role
            </TableHeaderCell>
            <TableHeaderCell className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Status
            </TableHeaderCell>
            <TableHeaderCell className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Invited By
            </TableHeaderCell>
            <TableHeaderCell className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Expires At
            </TableHeaderCell>
            <TableHeaderCell className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Date Sent
            </TableHeaderCell>
            <TableHeaderCell>
              <span className="sr-only">Actions</span>
            </TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredInvitations.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                No pending invitations
              </TableCell>
            </TableRow>
          ) : (
            filteredInvitations.map((invitation) => {
              const roleBadge = getRoleBadge(invitation.role);
              const isExpired = new Date(invitation.expiresAt) < new Date();
              
              return (
                <TableRow
                  key={invitation.id}
                  className="hover:bg-neutral-50 hover:dark:bg-neutral-900"
                >
                  <TableCell className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                    {invitation.email}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${roleBadge.color}`}>
                      {roleBadge.label}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                      isExpired 
                        ? 'bg-red-100 text-red-800 dark:bg-red-400/10 dark:text-red-400'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-400/10 dark:text-yellow-400'
                    }`}>
                      {isExpired ? 'Expired' : 'Pending'}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-neutral-700 dark:text-neutral-200">
                    {invitation.invitedByUser?.name || 'Admin'}
                  </TableCell>
                  <TableCell className="text-sm text-neutral-500 dark:text-neutral-400">
                    {new Date(invitation.expiresAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-sm text-neutral-500 dark:text-neutral-400">
                    {new Date(invitation.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:text-neutral-300 dark:hover:bg-neutral-800 transition-colors">
                            <RiMore2Line className="size-4" />
                            <span className="sr-only">Open menu for {invitation.email}</span>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => console.log('Resend invitation:', invitation.id)}>
                            <RiEditLine className="size-4 mr-2" />
                            Resend
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => console.log('Cancel invitation:', invitation.id)}
                            className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                          >
                            <RiDeleteBinLine className="size-4 mr-2" />
                            Cancel
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </TableRoot>
  );

  const renderLoadingSkeleton = (skeletonCount: number) => (
    <div className="mt-3 space-y-2">
      {Array.from({ length: skeletonCount }).map((_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  );

  return (
    <div className="px-4 md:px-8 pt-6">
      <h1 className="text-lg font-regular text-neutral-700 dark:text-neutral-200">
        User Management
      </h1>
      <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
        Manage your workspace, team members and their roles.
      </p>
      <Tabs defaultValue="all" className="mt-8">
        <TabsList variant="line">
          <TabsTrigger value="all">
            All users ({allUsers.length})
          </TabsTrigger>
          <TabsTrigger value="admins">
            Admins ({adminUsers.length})
          </TabsTrigger>
          <TabsTrigger value="invitations">
            Pending invitations ({invitations.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="all">
          <div className="mt-4 sm:flex sm:items-center sm:space-x-2">
            <Input 
              placeholder="Search users..." 
              type="search" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="mt-2 sm:mt-0 sm:w-32">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {usersLoading ? renderLoadingSkeleton(3) : renderUserTable(allUsers)}
        </TabsContent>
        
        <TabsContent value="admins">
          <div className="mt-4 sm:flex sm:items-center sm:space-x-2">
            <Input 
              placeholder="Search admin users..." 
              type="search" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {usersLoading ? renderLoadingSkeleton(2) : renderUserTable(adminUsers)}
        </TabsContent>
        


        <TabsContent value="invitations">
          <div className="mt-4 sm:flex sm:items-center sm:space-x-2">
            <Input 
              placeholder="Search invitations..." 
              type="search" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {invitationsLoading ? renderLoadingSkeleton(2) : renderInvitationsTable()}
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      <EditUserDialog
        open={editDialogOpen}
        setOpen={setEditDialogOpen}
        user={selectedUser}
        onUserUpdated={handleUserUpdated}
      />
    </div>
  );
} 