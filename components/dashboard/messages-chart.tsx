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

  const summary = useMemo(() => {
    const channelTotals: { [channel: string]: number } = {};
    let grandTotal = 0;

    data.forEach(day => {
      Object.entries(day.channels).forEach(([channel, count]) => {
        channelTotals[channel] = (channelTotals[channel] || 0) + count;
        grandTotal += count;
      });
    });

    const items = [
      {
        category: 'All Channels',
        total: formatNumber(grandTotal),
        color: 'bg-indigo-500',
      }
    ];

    const topChannels = Object.entries(channelTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    const channelColors: { [key: string]: string } = {
      web: 'bg-blue-500',
      sms: 'bg-emerald-500',
      voice: 'bg-amber-500', 
      whatsapp: 'bg-green-500',
      'voice call': 'bg-amber-500',
      'web call': 'bg-cyan-500'
    };

    topChannels.forEach(([channel, total], index) => {
      items.push({
        category: channel.charAt(0).toUpperCase() + channel.slice(1),
        total: formatNumber(total),
        color: channelColors[channel] || `bg-gray-500`,
      });
    });

    return items;
  }, [data]);

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
      <div className="rounded-tremor-default border border-tremor-border bg-tremor-background text-tremor-default shadow-tremor-dropdown p-2">
        <div className="border-b border-tremor-border px-3 py-1">
          <p className="font-medium">{label}</p>
        </div>
        <div className="px-3 py-1 space-y-1">
          {payload.map((category: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between space-x-8">
              <div className="flex items-center space-x-2">
                <span
                  className={`h-1 w-3 shrink-0 rounded-sm ${
                    category.color || 'bg-gray-500'
                  }`}
                />
                <p className="text-sm text-gray-600 dark:text-gray-400">
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
    <Card className="mt-8 p-6">
      <div className="sm:flex sm:items-center sm:justify-between sm:space-x-10">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Messages per Day</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">
            {formatNumber(totalMessages)}
          </p>
        </div>
        <Button className="mt-4 w-full sm:mt-0 sm:w-fit" variant="secondary">
          <a href="/dashboard/interactions" className="flex items-center gap-2">
            <Eye className="size-4" />
            View All
          </a>
        </Button>
      </div>

      <ul role="list" className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {summary.map((item, index) => (
          <li key={index}>
            <div className="flex space-x-2 items-center">
              {item.color && (
                <span
                  className={cn(item.color, 'w-1 h-8 shrink-0 rounded')}
                  aria-hidden={true}
                />
              )}
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {item.total}
              </p>
            </div>
            <p className={cn(
              item.color ? "pl-3" : "",
              "text-sm text-gray-500 dark:text-gray-400"
            )}>
              {item.category}
            </p>
          </li>
        ))}
      </ul>

      <Tabs value={selectedChannel} onValueChange={setSelectedChannel} className="mt-6">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          {availableChannels.map(channel => (
            <TabsTrigger key={channel} value={channel}>
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
        fill="solid"
        className="mt-4 h-60"
      />
    </Card>
  );
} 