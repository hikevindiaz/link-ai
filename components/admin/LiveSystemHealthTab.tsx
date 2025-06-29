'use client';

import React, { useState, useEffect } from 'react';
import {
  RiCheckboxCircleFill,
  RiErrorWarningFill,
  RiSettings5Fill,
  RiRefreshLine,
  RiTimeLine,
} from '@remixicon/react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

type ServiceStatus = 'Operational' | 'Downtime' | 'Maintenance' | 'Degraded';

interface LiveServiceHealth {
  name: string;
  status: ServiceStatus;
  uptime: string;
  lastChecked: string;
  responseTime?: string;
}

interface LiveSystemHealthData {
  overallStatus: ServiceStatus;
  lastUpdated: string;
  services: LiveServiceHealth[];
}

const statusConfig = {
  'Operational': {
    icon: <RiCheckboxCircleFill className="size-5 text-emerald-500" />,
    bgClass: 'bg-emerald-100 dark:bg-emerald-400/20',
    textClass: 'text-emerald-700 dark:text-emerald-400',
    borderClass: 'border-emerald-200 dark:border-emerald-800',
  },
  'Degraded': {
    icon: <RiErrorWarningFill className="size-5 text-orange-500" />,
    bgClass: 'bg-orange-100 dark:bg-orange-400/20',
    textClass: 'text-orange-700 dark:text-orange-400',
    borderClass: 'border-orange-200 dark:border-orange-800',
  },
  'Downtime': {
    icon: <RiErrorWarningFill className="size-5 text-red-500" />,
    bgClass: 'bg-red-100 dark:bg-red-400/20',
    textClass: 'text-red-700 dark:text-red-400',
    borderClass: 'border-red-200 dark:border-red-800',
  },
  'Maintenance': {
    icon: <RiSettings5Fill className="size-5 text-amber-500" />,
    bgClass: 'bg-amber-100 dark:bg-amber-400/20',
    textClass: 'text-amber-700 dark:text-amber-400',
    borderClass: 'border-amber-200 dark:border-amber-800',
  },
};

export default function LiveSystemHealthTab() {
  const [healthData, setHealthData] = useState<LiveSystemHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHealthData = async () => {
    try {
      const response = await fetch('/api/admin/system-health');
      if (response.ok) {
        const data = await response.json();
        console.log('Live health data received:', data);
        setHealthData(data);
      } else {
        console.error('Failed to fetch system health:', response.status);
        setHealthData(null);
      }
    } catch (error) {
      console.error('Error fetching system health:', error);
      setHealthData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
    
    // Auto-refresh every 30 seconds for live monitoring
    const interval = setInterval(fetchHealthData, 30 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchHealthData();
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="px-4 md:px-8 py-6">
        <div className="text-center mb-8">
          <Skeleton className="h-12 w-12 rounded-full mx-auto mb-4" />
          <Skeleton className="h-6 w-48 mx-auto mb-2" />
          <Skeleton className="h-4 w-64 mx-auto" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-16" />
              </div>
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-12" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!healthData) {
    return (
      <div className="px-4 md:px-8 py-6">
        <div className="text-center">
          <RiErrorWarningFill className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50 mb-2">
            Failed to load system health
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
            Unable to fetch system health data. Please try again.
          </p>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors"
          >
            <RiRefreshLine className="size-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const overallConfig = statusConfig[healthData.overallStatus];
  const isAllOperational = healthData.services.every(service => service.status === 'Operational');

  return (
    <div className="px-4 md:px-8 py-6">
      {/* Overall Status Header */}
      <div className="text-center mb-8">
        <div className={cn('inline-flex items-center justify-center w-12 h-12 rounded-full mb-4', overallConfig.bgClass)}>
          {overallConfig.icon}
        </div>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50 mb-2">
          {isAllOperational ? 'All systems operational' : 'Some systems need attention'}
        </h1>
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Last updated: {new Date(healthData.lastUpdated).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </p>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1 px-3 py-1 text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50 border border-neutral-200 dark:border-neutral-700 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RiRefreshLine className={cn('size-3', refreshing && 'animate-spin')} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {healthData.services.map((service) => {
          const config = statusConfig[service.status];
          return (
            <Card key={service.name} className={cn('p-6 transition-colors', config.borderClass)}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn('p-2 rounded-lg', config.bgClass)}>
                    {config.icon}
                  </div>
                  <div>
                    <h3 className="font-medium text-neutral-900 dark:text-neutral-50">
                      {service.name}
                    </h3>
                    <p className={cn('text-sm font-medium', config.textClass)}>
                      {service.status}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                    {service.uptime}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    uptime
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1 text-neutral-500 dark:text-neutral-400">
                  <RiTimeLine className="size-3" />
                  <span>{service.responseTime}</span>
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                  {service.lastChecked}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Auto-refresh indicator */}
      <div className="mt-6 text-center">
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Auto-refreshes every 30 seconds
        </p>
      </div>
    </div>
  );
} 