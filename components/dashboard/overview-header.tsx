import { SelectNative } from '@/components/SelectNative';

export function DashboardOverview() {
  return (
    <header>
      <div className="sm:flex sm:items-center sm:justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
          Overview
        </h3>
        <div className="mt-4 items-center sm:mt-0 sm:flex sm:space-x-2">
          <SelectNative className="w-full sm:w-fit" defaultValue="1">
            <option value="1">Today</option>
            <option value="2">Last 7 days</option>
            <option value="3">Last 4 weeks</option>
            <option value="4">Last 12 months</option>
          </SelectNative>
        </div>
      </div>
    </header>
  );
} 