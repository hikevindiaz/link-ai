"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Icons } from "@/components/icons";

// Import the correct settings type from the API layer
import type { CalendarSettingsInput } from "@/lib/api/appointments";

interface CalendarSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSettings: CalendarSettingsInput; // Use the imported type
  onSave: (settings: CalendarSettingsInput) => void; // Use the imported type
}

export function CalendarSettingsDialog({
  open,
  onOpenChange,
  initialSettings,
  onSave,
}: CalendarSettingsDialogProps) {
  const [settingsTab, setSettingsTab] = useState<string>("availability"); // Default to Availability
  // Local state uses the flat CalendarSettingsInput type
  const [currentSettings, setCurrentSettings] = useState<CalendarSettingsInput>(initialSettings);

  // Reset local state when dialog reopens or initialSettings change
  useEffect(() => {
    if (open) {
      // Ensure initialSettings is not undefined/null before setting
      setCurrentSettings(initialSettings || {}); // Use initial or empty object
      setSettingsTab("availability"); // Reset to first tab
    }
  }, [open, initialSettings]);

  // Generic handler for updating flat state properties
  const handleSettingChange = (
    key: keyof CalendarSettingsInput,
    value: any
  ) => {
    // Handle number conversion for reminderTimeMinutes
    const updatedValue = key === 'reminderTimeMinutes' ? Number(value) : value;
    setCurrentSettings(prev => ({
      ...prev,
      [key]: updatedValue,
    }));
  };

  const handleSaveChanges = () => {
    onSave(currentSettings);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Calendar Settings</DialogTitle>
          <DialogDescription>
            Configure availability and notification settings for this calendar.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={settingsTab} onValueChange={setSettingsTab} className="mt-4">
          <TabsList className="grid grid-cols-2 mb-4"> {/* Changed to 2 columns */}
            {/* Remove General Tab for now */}
            {/* <TabsTrigger value="general" className="flex items-center gap-2"> ... </TabsTrigger> */}
            <TabsTrigger value="availability" className="flex items-center gap-2">
              <Icons.clock className="h-4 w-4" />
              <span>Availability</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Icons.bell className="h-4 w-4" />
              <span>Notifications</span>
            </TabsTrigger>
          </TabsList>
          
          {/* Remove General Settings Tab Content */}
          {/* <TabsContent value="general" className="space-y-4"> ... </TabsContent> */}
          
          {/* Availability Settings - Use flat properties */} 
          <TabsContent value="availability" className="space-y-6 pt-2">
            <div>
              <h3 className="text-sm font-medium mb-2">Working Hours</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm text-gray-500">Start Time</label>
                  <Select 
                    // Use workingHoursStart
                    value={currentSettings.workingHoursStart || '09:00'}
                    onValueChange={(value) => handleSettingChange('workingHoursStart', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Generate time options (e.g., every 30 mins) */}
                      {Array.from({ length: 48 }).map((_, i) => {
                        const hour = Math.floor(i / 2);
                        const minute = (i % 2) * 30;
                        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                        const displayHour = hour % 12 === 0 ? 12 : hour % 12;
                        const period = hour < 12 || hour === 24 ? 'AM' : 'PM';
                        const displayTime = `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
                        return (
                            <SelectItem key={timeString} value={timeString}>
                                {displayTime}
                            </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-gray-500">End Time</label>
                  <Select 
                     // Use workingHoursEnd
                    value={currentSettings.workingHoursEnd || '17:00'}
                    onValueChange={(value) => handleSettingChange('workingHoursEnd', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                     <SelectContent>
                      {Array.from({ length: 48 }).map((_, i) => {
                        const hour = Math.floor(i / 2);
                        const minute = (i % 2) * 30;
                        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                        const displayHour = hour % 12 === 0 ? 12 : hour % 12;
                        const period = hour < 12 || hour === 24 ? 'AM' : 'PM';
                        const displayTime = `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
                        return (
                            <SelectItem key={timeString} value={timeString}>
                                {displayTime}
                            </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-2">Weekend Availability</h3>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <label className="text-sm text-gray-700">Include Saturdays</label>
                  <input 
                    type="checkbox" 
                    // Use includeSaturday
                    checked={!!currentSettings.includeSaturday} // Ensure boolean
                    onChange={(e) => handleSettingChange('includeSaturday', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <label className="text-sm text-gray-700">Include Sundays</label>
                  <input 
                    type="checkbox" 
                     // Use includeSunday
                    checked={!!currentSettings.includeSunday} // Ensure boolean
                    onChange={(e) => handleSettingChange('includeSunday', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                  />
                </div>
              </div>
            </div>
          </TabsContent>
          
          {/* Notification Settings - Use flat properties */} 
          <TabsContent value="notifications" className="space-y-6 pt-2">
             <div className="space-y-1">
                 <label htmlFor="notificationEmail" className="text-sm text-gray-500">Notification Email Address</label>
                 <Input 
                     id="notificationEmail"
                     type="email"
                     placeholder="Enter email for notifications" 
                     value={currentSettings.notificationEmail || ''}
                     onChange={(e) => handleSettingChange('notificationEmail', e.target.value)}
                 />
             </div>

            <div>
              <h3 className="text-sm font-medium mb-2">Notification Preferences</h3>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <label className="text-sm text-gray-700">Email Booking Notifications</label>
                  <input 
                    type="checkbox" 
                     // Use notificationEmailEnabled
                    checked={!!currentSettings.notificationEmailEnabled}
                    onChange={(e) => handleSettingChange('notificationEmailEnabled', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                  />
                </div>
                {/* Remove Push Notifications toggle */}
                {/* <div className="flex items-center justify-between"> ... </div> */}
                 <div className="flex items-center justify-between p-3 border rounded-md">
                   <label className="text-sm text-gray-700">Email Appointment Reminders</label>
                   <input 
                     type="checkbox" 
                     // Use emailReminderEnabled
                     checked={!!currentSettings.emailReminderEnabled}
                     onChange={(e) => handleSettingChange('emailReminderEnabled', e.target.checked)}
                     className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                   />
                 </div>
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <label className="text-sm text-gray-700">SMS Appointment Reminders (Requires Setup)</label>
                  <input 
                    type="checkbox" 
                     // Use smsReminderEnabled
                    checked={!!currentSettings.smsReminderEnabled}
                    onChange={(e) => handleSettingChange('smsReminderEnabled', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-sm text-gray-500">Reminder Time</label>
              <Select 
                // Use reminderTimeMinutes (convert to string for value)
                value={currentSettings.reminderTimeMinutes?.toString() || '30'} 
                // Pass number back in handler
                onValueChange={(value) => handleSettingChange('reminderTimeMinutes', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 minutes before</SelectItem>
                  <SelectItem value="10">10 minutes before</SelectItem>
                  <SelectItem value="15">15 minutes before</SelectItem>
                  <SelectItem value="30">30 minutes before</SelectItem>
                  <SelectItem value="60">1 hour before</SelectItem>
                  <SelectItem value="120">2 hours before</SelectItem>
                  <SelectItem value="1440">1 day before</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="mt-6 sticky bottom-0 bg-white dark:bg-gray-950 pt-4 pb-2 border-t">
          <Button 
            variant="secondary"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button onClick={handleSaveChanges}>
            <Icons.check className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 