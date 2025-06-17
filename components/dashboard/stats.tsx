import { RiArrowDownSFill, RiArrowUpSFill } from '@remixicon/react';
import { Card } from '@/components/ui/card';
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
  // Updated to show all 5 requested stats
  const allowedStats = ['Messages', 'Appointments', 'Calls', 'Call Minutes', 'Orders'];
  
  // Helper function to clean stat values
  const cleanStatValue = (value: string): string => {
    if (!value || value === 'NaN' || value === 'undefined' || value === 'null') {
      return '0';
    }
    // If it's a number, ensure it's properly formatted
    const numValue = parseFloat(value);
    if (isNaN(numValue) || !isFinite(numValue)) {
      return '0';
    }
    // Return the original value if it's valid
    return value;
  };

  // Helper function to format call minutes as time duration
  const formatCallMinutes = (minutes: string): string => {
    const totalMinutes = parseInt(minutes) || 0;
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}`;
    } else {
      return `${mins}:00`;
    }
  };

  // Helper function to format stat display based on type
  const formatStatDisplay = (item: any): string => {
    if (item.name === 'Call Minutes') {
      return formatCallMinutes(item.stat);
    }
    return item.stat;
  };
  
  // Create a map of existing data for quick lookup
  const dataMap = new Map(data.map(item => [item.name, item]));
  
  // Ensure we have all 5 stats, create placeholders for missing ones
  const completeData = allowedStats.map(statName => {
    const existingData = dataMap.get(statName);
    if (existingData) {
      // Validate the existing data and clean up any invalid values
      const cleanedData = { ...existingData };
      cleanedData.stat = cleanStatValue(cleanedData.stat);
      if (!cleanedData.change || cleanedData.change === 'NaN%' || cleanedData.change === 'undefined%') {
        cleanedData.change = '0%';
      }
      return cleanedData;
    }
    // Create placeholder data for missing stats with valid values
    return {
      name: statName,
      stat: '0',
      change: '0%', // Always use a valid percentage
      changeType: 'positive' as const
    };
  });

  const renderPercentageChange = (item: StatsData) => {
    // Clean up the change value and handle edge cases
    let changeStr = item.change;
    if (!changeStr || changeStr === 'NaN%' || changeStr === 'undefined%' || changeStr === 'null%') {
      return null; // Don't show anything for invalid values
    }
    
    // Remove % sign and any other non-numeric characters except - and +
    const cleanedValue = changeStr.replace(/[^-+0-9.]/g, '');
    
    // Parse the percentage value
    const percentValue = parseFloat(cleanedValue);
    
    // If parsing failed or result is NaN, don't show anything
    if (isNaN(percentValue) || !isFinite(percentValue)) {
      return null;
    }
    
    // If it's 0, show nothing
    if (percentValue === 0) {
      return null;
    }
    
    // Determine if it's positive or negative
    const isPositive = percentValue > 0;
    
    // Format the display value
    const displayValue = Math.abs(percentValue);
    
    return (
      <dd
        className={cn(
          isPositive
            ? 'bg-green-50 text-green-700 dark:bg-green-400/10 dark:text-green-400'
            : 'bg-red-50 text-red-700 dark:bg-red-400/10 dark:text-red-400',
          'inline-flex items-center gap-x-0.5 rounded-xl px-1.5 py-0.5 text-xs font-medium shrink-0'
        )}
      >
        {isPositive ? (
          <RiArrowUpSFill className="size-3 shrink-0" />
        ) : (
          <RiArrowDownSFill className="size-3 shrink-0" />
        )}
        <span className="hidden sm:inline">
          {isPositive ? `+${displayValue}%` : `-${displayValue}%`}
        </span>
        <span className="sm:hidden">
          {isPositive ? `+${displayValue}` : `-${displayValue}`}
        </span>
      </dd>
    );
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 mb-3 sm:mb-4">
      {completeData.map((item) => (
        <Card key={item.name} className="relative overflow-hidden">
          <div className="flex flex-col space-y-1 sm:space-y-2">
            {/* Header with title and percentage */}
            <div className="flex items-start justify-between min-h-[16px] sm:min-h-[20px]">
              <dt className="text-xs font-medium text-neutral-500 dark:text-neutral-400 truncate pr-1">
                {item.name}
              </dt>
              {renderPercentageChange(item)}
            </div>
            
            {/* Main stat number - formatted based on type */}
            <dd className="text-base sm:text-lg lg:text-xl xl:text-2xl font-semibold text-black dark:text-white">
              {formatStatDisplay(item)}
            </dd>
          </div>
        </Card>
      ))}
    </div>
  );
} 