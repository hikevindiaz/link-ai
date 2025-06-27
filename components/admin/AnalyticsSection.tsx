'use client';

import React from 'react';
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SparkAreaChart } from "@/components/SparkChart";
import { AnalyticsTooltip } from "./AnalyticsTooltip";
import { cn } from "@/lib/utils";

interface AnalyticsSectionProps {
  analyticsLoading: boolean;
  analyticsData: any;
  users: any[];
}

export function AnalyticsSection({ analyticsLoading, analyticsData, users }: AnalyticsSectionProps) {
  if (analyticsLoading) {
    return (
      <dl className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="flex items-center justify-between space-x-4 p-4">
            <div className="truncate">
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-10 w-20 flex-none" />
          </Card>
        ))}
      </dl>
    );
  }

  if (analyticsData?.summary) {
    return (
      <dl className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {analyticsData.summary.map((item: any) => (
          <Card
            key={item.name}
            className="flex items-center justify-between space-x-4 p-4"
          >
            <div className="truncate">
              <div className="flex items-center space-x-2">
                <dt className="text-base font-semibold text-neutral-700 dark:text-neutral-200">
                  {item.current || 0} {item.name}
                </dt>
                <span
                  className={cn(
                    item.changeType === 'positive'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-400'
                      : item.changeType === 'negative'
                      ? 'bg-red-100 text-red-800 dark:bg-red-400/10 dark:text-red-400'
                      : 'bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-300',
                    'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium',
                  )}
                >
                  {item.change}
                </span>
              </div>
              <dd className="mt-1 truncate text-xs text-neutral-500 dark:text-neutral-400">
                {item.description} (Growth rate)
              </dd>
            </div>
            <SparkAreaChart
              data={analyticsData.data || []}
              index="date"
              categories={[item.category]}
              fill="solid"
              colors={item.changeType === 'positive' ? ['emerald'] : item.changeType === 'negative' ? ['red'] : ['gray']}
              className="h-10 flex-none"
              showTooltip={true}
              customTooltip={AnalyticsTooltip}
            />
          </Card>
        ))}
      </dl>
    );
  }

  // Fallback when no analytics data
  return (
    <dl className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {[
        { name: 'Users', count: users.length },
        { name: 'Agents', count: 0 },
        { name: 'Active Subscriptions', count: 0 }
      ].map((item, index) => (
        <Card key={item.name} className="flex items-center justify-between space-x-4 p-4">
          <div className="truncate">
            <div className="flex items-center space-x-2">
              <dt className="text-base font-semibold text-neutral-700 dark:text-neutral-200">
                {item.count} {item.name}
              </dt>
              <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-300">
                +0.0%
              </span>
            </div>
            <dd className="mt-1 truncate text-xs text-neutral-500 dark:text-neutral-400">
              {item.name === 'Users' ? 'Total registered users' : 
               item.name === 'Agents' ? 'Total agents created' : 
               'Currently active subscriptions'}
            </dd>
          </div>
          <div className="h-10 w-20 flex-none bg-neutral-100 dark:bg-neutral-800 rounded" />
        </Card>
      ))}
    </dl>
  );
} 