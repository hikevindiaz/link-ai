import { Divider } from "@/components/Divider";
import { StoreHours } from "@/lib/orders-data";

interface StoreHoursSettingsProps {
  storeHours: StoreHours[];
  onStoreHoursChange: (index: number, field: string, value: string | boolean) => void;
}

export function StoreHoursSettings({ storeHours, onStoreHoursChange }: StoreHoursSettingsProps) {
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800">
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 p-4 font-medium text-sm text-neutral-700 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-900 rounded-t-md">
        <div>Day</div>
        <div>Opening Time</div>
        <div>Closing Time</div>
        <div>Open</div>
      </div>
      <Divider />
      {storeHours.map((day: StoreHours, index: number) => (
        <div key={day.day} className="grid grid-cols-[1fr_auto_auto_auto] gap-4 p-4 items-center">
          <div className="font-medium text-sm">{day.day}</div>
          <div>
            <input
              type="time"
              className="rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-1.5 text-sm"
              value={day.open}
              onChange={(e) => onStoreHoursChange(index, 'open', e.target.value)}
              disabled={!day.isOpen}
            />
          </div>
          <div>
            <input
              type="time"
              className="rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-1.5 text-sm"
              value={day.close}
              onChange={(e) => onStoreHoursChange(index, 'close', e.target.value)}
              disabled={!day.isOpen}
            />
          </div>
          <div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={day.isOpen}
                onChange={(e) => onStoreHoursChange(index, 'isOpen', e.target.checked)}
              />
              <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-neutral-300 dark:peer-focus:ring-neutral-800 rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-neutral-600 peer-checked:bg-neutral-600"></div>
            </label>
          </div>
        </div>
      ))}
    </div>
  );
} 