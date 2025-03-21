import { RiArrowDownSFill, RiArrowUpSFill } from '@remixicon/react';
import { Card } from '@/components/ui/homepage/card';
import { cn } from '@/lib/utils';

interface StatsData {
  name: string;
  stat: string;
  change: string;
  changeType: 'positive' | 'negative';
}

interface DashboardStatsProps {
  data: StatsData[];
}

export function DashboardStats({ data }: DashboardStatsProps) {
  return (
    <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {data.map((item) => (
        <Card key={item.name} className="p-4">
          <div className="flex items-center justify-between">
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {item.name}
            </dt>
            <dd
              className={cn(
                item.changeType === 'positive'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-500'
                  : 'bg-red-100 text-red-800 dark:bg-red-400/10 dark:text-red-500',
                'inline-flex items-center gap-x-1 rounded-md px-1.5 py-0.5 text-xs font-medium'
              )}
            >
              {item.changeType === 'positive' ? (
                <RiArrowUpSFill className="size-4 shrink-0" />
              ) : (
                <RiArrowDownSFill className="size-4 shrink-0" />
              )}
              {item.change}
            </dd>
          </div>
          <dd className="text-3xl font-semibold text-gray-900 dark:text-gray-50">
            {item.stat}
          </dd>
        </Card>
      ))}
    </div>
  );
} 