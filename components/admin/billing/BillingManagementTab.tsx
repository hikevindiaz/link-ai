'use client';

import React, { useState } from 'react';
import { PlansTab } from './PlansTab';
import { SubscriptionsTab } from './SubscriptionsTab';
import { AddOnManagementTab } from './AddOnManagementTab';

export function BillingManagementTab() {
  const [activeTab, setActiveTab] = useState('plans');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('');

  const tabs = [
    { id: 'plans', label: 'Plans', description: 'Manage subscription plans and pricing' },
    { id: 'subscriptions', label: 'Subscriptions', description: 'View and manage user subscriptions' },
    { id: 'addons', label: 'Add-ons', description: 'Manage add-on products and integrations' },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-neutral-200 dark:border-neutral-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:border-neutral-300 dark:hover:border-neutral-600'
              }`}
            >
              <div className="flex flex-col items-start">
                <span>{tab.label}</span>
                <span className="text-xs text-neutral-400 dark:text-neutral-500 font-normal">
                  {tab.description}
                </span>
              </div>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'plans' && (
          <PlansTab searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
        )}
        {activeTab === 'subscriptions' && (
          <SubscriptionsTab 
            searchQuery={searchQuery} 
            setSearchQuery={setSearchQuery}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            userFilter={userFilter}
            setUserFilter={setUserFilter}
          />
        )}
        {activeTab === 'addons' && (
          <AddOnManagementTab searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
        )}
      </div>
    </div>
  );
} 