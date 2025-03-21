import { Card } from '@/components/ui/homepage/card';
import { Button } from '@/components/ui/button';
import { AreaChart } from '@/components/AreaChart';
import { Eye } from 'lucide-react';

interface MessagesChartProps {
  data: {
    date: string;
    Messages: number;
  }[];
  totalMessages: number;
}

export function MessagesChart({ data, totalMessages }: MessagesChartProps) {
  const valueFormatter = (number: number) => {
    return Intl.NumberFormat('us').format(number).toString();
  };

  return (
    <Card className="mt-8 p-6">
      <div className="sm:flex sm:items-center sm:justify-between sm:space-x-10">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Messages per Day</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">
            {totalMessages}
          </p>
        </div>
        <Button className="mt-4 w-full sm:mt-0 sm:w-fit" variant="secondary">
          <a href="/dashboard/interactions" className="flex items-center gap-2">
            <Eye className="size-4" />
            View All
          </a>
        </Button>
      </div>
      <AreaChart
        data={data}
        index="date"
        categories={['Messages']}
        valueFormatter={valueFormatter}
        showLegend={false}
        fill="solid"
        className="mt-6 h-60"
      />
    </Card>
  );
} 