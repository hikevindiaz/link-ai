'use client';

import React from 'react';
import { TooltipProps } from "@/components/SparkChart";
import { cn } from "@/lib/utils";

// Custom tooltip component for analytics charts
export const AnalyticsTooltip = ({ payload, active, label }: TooltipProps) => {
  if (!active || !payload || payload.length === 0) return null;
  const categoryPayload = payload[0];

  // Label should be month name (e.g., "Jan", "Feb", "Mar") from API
  // If we're getting numbers, use the payload data instead
  const monthName = typeof label === 'string' && label.length === 3 ? label : 
                   categoryPayload?.payload?.date || label || 'Unknown';

  return (
    <div className="w-24 rounded border border-neutral-200 bg-white text-xs shadow-md dark:border-neutral-700 dark:bg-neutral-800">
      <div className="px-2 py-1.5">
        <div className="flex items-center justify-between space-x-2">
          <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
            {monthName}
          </p>
          <p className="font-medium text-neutral-900 dark:text-neutral-50 text-xs">
            {Intl.NumberFormat('us').format(categoryPayload.value).toString()}
          </p>
        </div>
      </div>
    </div>
  );
}; 