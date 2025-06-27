'use client';

import React from 'react';
import { Card } from "@/components/ui/card";
import { RiRobotLine, RiFileTextLine } from "@remixicon/react";
import { UserManagementTab } from "./UserManagementTab";
import { AgentManagementTab } from "./AgentManagementTab";
import { BillingManagementTab } from "./BillingManagementTab";
import { KnowledgeSourcesManagementTab } from "./KnowledgeSourcesManagementTab";
import { VectorStoreManagementTab } from "./VectorStoreManagementTab";

interface ManageTabContentProps {
  activeTab: string;
  users: any[];
  usersLoading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  roleFilter: string;
  setRoleFilter: (role: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  userFilter: string;
  setUserFilter: (user: string) => void;
  onUserUpdated?: () => void;
}

export function ManageTabContent({ 
  activeTab, 
  users, 
  usersLoading, 
  searchQuery, 
  setSearchQuery, 
  roleFilter, 
  setRoleFilter,
  statusFilter,
  setStatusFilter,
  userFilter,
  setUserFilter,
  onUserUpdated
}: ManageTabContentProps) {
  switch (activeTab) {
    case 'users':
      return (
        <UserManagementTab
          users={users}
          usersLoading={usersLoading}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          roleFilter={roleFilter}
          setRoleFilter={setRoleFilter}
          onUserUpdated={onUserUpdated}
        />
      );

    case 'agents':
      return (
        <AgentManagementTab
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          userFilter={userFilter}
          setUserFilter={setUserFilter}
        />
      );

    case 'knowledge-sources':
      return (
        <KnowledgeSourcesManagementTab
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          userFilter={userFilter}
          setUserFilter={setUserFilter}
        />
      );

    case 'vector-store':
      return (
        <VectorStoreManagementTab
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          userFilter={userFilter}
          setUserFilter={setUserFilter}
        />
      );

    case 'billing':
      return (
        <BillingManagementTab
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          userFilter={userFilter}
          setUserFilter={setUserFilter}
        />
      );

    default:
      return null;
  }
} 