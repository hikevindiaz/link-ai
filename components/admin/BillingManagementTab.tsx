'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlansTab } from "./billing/PlansTab";
import { SubscriptionsTab } from "./billing/SubscriptionsTab";

interface BillingManagementTabProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  userFilter: string;
  setUserFilter: (user: string) => void;
}

export function BillingManagementTab({ 
  searchQuery, 
  setSearchQuery, 
  statusFilter, 
  setStatusFilter,
  userFilter,
  setUserFilter
}: BillingManagementTabProps) {
  const [activeTab, setActiveTab] = useState('plans');

  return (
    <div className="px-4 md:px-8 pt-6">
      <h1 className="text-xl font-normal text-neutral-700 dark:text-neutral-200">
        Billing Management
      </h1>
      <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
        Manage subscription plans, pricing, and user subscriptions across your platform.
      </p>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
        <TabsList variant="line">
          <TabsTrigger value="plans">
            Plans & Pricing
          </TabsTrigger>
          <TabsTrigger value="subscriptions">
            User Subscriptions
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="plans">
          <PlansTab
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        </TabsContent>
        
        <TabsContent value="subscriptions">
          <SubscriptionsTab
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            userFilter={userFilter}
            setUserFilter={setUserFilter}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
} 