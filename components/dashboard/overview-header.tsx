import { Select, SelectItem, SelectTrigger, SelectValue, SelectContent } from "@/components/ui/select";

interface DashboardOverviewProps {
  selectedPeriod: string;
  onPeriodChange: (value: string) => void;
}

export function DashboardOverview({ selectedPeriod, onPeriodChange }: DashboardOverviewProps) {
  return (
    <header>
      <div className="sm:flex sm:items-center sm:justify-between">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
          Overview
        </h3>
        <div className="mt-4 items-center sm:mt-0 sm:flex sm:space-x-2">
          <Select value={selectedPeriod} onValueChange={onPeriodChange}>
            <SelectTrigger className="w-full sm:w-fit">
              <SelectValue placeholder="Select period..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </header>
  );
} 