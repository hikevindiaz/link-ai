'use client';

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/homepage/card';
import { Button } from '@/components/ui/button';
import { AreaChart } from '@/components/AreaChart';
import { Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface MessagesChartProps {
  data: {
    name: string;
    channels: {
      [channel: string]: number;
    };
  }[];
  totalMessages: number;
}

function formatNumber(number: number) {
  return Intl.NumberFormat('us').format(number).toString();
}

export function MessagesChart({ data, totalMessages }: MessagesChartProps) {
  const [selectedChannel, setSelectedChannel] = useState('all');

  const availableChannels = useMemo(() => {
    const channels = new Set<string>();
    data.forEach(day => {
      Object.keys(day.channels).forEach(channel => {
        channels.add(channel);
      });
    });
    return Array.from(channels);
  }, [data]);

  const formattedData = useMemo(() => {
    return data.map(day => {
      const result: any = { date: day.name };
      
      if (selectedChannel === 'all') {
        availableChannels.forEach(channel => {
          result[channel] = day.channels[channel] || 0;
        });
        
        result['Total'] = Object.values(day.channels).reduce((sum, count) => sum + count, 0);
      } else {
        result[selectedChannel] = day.channels[selectedChannel] || 0;
      }
      
      return result;
    });
  }, [data, selectedChannel, availableChannels]);

  const chartCategories = useMemo(() => {
    if (selectedChannel === 'all') {
      return ['Total', ...availableChannels.slice(0, 3)];
    } else {
      return [selectedChannel];
    }
  }, [selectedChannel, availableChannels]);

  const customTooltip = (props: any) => {
    const { payload, active, label } = props;
    if (!active || !payload || payload.length === 0) return null;

    return (
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black text-neutral-900 dark:text-white shadow-lg p-2">
        <div className="border-b border-neutral-200 dark:border-neutral-800 px-3 py-1">
          <p className="font-medium">{label}</p>
        </div>
        <div className="px-3 py-1 space-y-1">
          {payload.map((category: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between space-x-8">
              <div className="flex items-center space-x-2">
                <span
                  className={`h-1 w-3 shrink-0 rounded-sm ${
                    category.color || 'bg-neutral-500'
                  }`}
                />
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  {category.dataKey}
                </p>
              </div>
              <span className="font-medium tabular-nums text-sm">
                {formatNumber(category.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card className="mt-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between sm:space-x-10 mb-4 space-y-2 sm:space-y-0">
        <div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Messages per Day</p>
          <p className="text-xl font-semibold text-black dark:text-white">
            {formatNumber(totalMessages)}
          </p>
        </div>
        <Button className="text-xs px-3 py-1.5 w-fit" variant="secondary">
          <Eye className="size-3 mr-1" />
          View All
        </Button>
      </div>

      <Tabs value={selectedChannel} onValueChange={setSelectedChannel} className="mb-3">
        <TabsList className="bg-neutral-100 dark:bg-neutral-800">
          <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
          {availableChannels.map(channel => (
            <TabsTrigger key={channel} value={channel} className="text-xs">
              {channel.charAt(0).toUpperCase() + channel.slice(1)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <AreaChart
        data={formattedData}
        index="date"
        categories={chartCategories}
        valueFormatter={formatNumber}
        customTooltip={customTooltip}
        showLegend={true}
        fill="gradient"
        colors={["neutral", "emerald", "amber", "rose"]}
        className="h-48"
      />
    </Card>
  );
} 