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
import type { CalendarSettingsInput, CalendarUpdateInput } from "@/lib/api/appointments";

// Button states for the save button
type SaveButtonState = 'idle' | 'loading' | 'success' | 'error';

interface CalendarSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSettings: CalendarSettingsInput & { name?: string }; // Include name for editing
  onSave: (settings: CalendarUpdateInput) => Promise<void>; // Make it async for proper state handling
}

export function CalendarSettingsDialog({
  open,
  onOpenChange,
  initialSettings,
  onSave,
}: CalendarSettingsDialogProps) {
  const [settingsTab, setSettingsTab] = useState<string>("general"); // Default to General
  // Local state uses the flat CalendarSettingsInput type with name
  const [currentSettings, setCurrentSettings] = useState<CalendarSettingsInput & { name?: string }>(initialSettings);
  const [saveButtonState, setSaveButtonState] = useState<SaveButtonState>('idle');

  // Reset local state when dialog reopens or initialSettings change
  useEffect(() => {
    if (open) {
      // Ensure initialSettings is not undefined/null before setting
      setCurrentSettings(initialSettings || {}); // Use initial or empty object
      setSettingsTab("general"); // Reset to first tab
      setSaveButtonState('idle'); // Reset button state
    }
  }, [open, initialSettings]);

  // Generic handler for updating flat state properties
  const handleSettingChange = (
    key: keyof (CalendarSettingsInput & { name?: string }),
    value: any
  ) => {
    // Handle number conversions for numeric fields
    let updatedValue = value;
    if (['reminderTimeMinutes', 'defaultDuration', 'bufferBetweenAppointments', 'minimumAdvanceNotice', 'maxBookingsPerSlot'].includes(key)) {
      updatedValue = Number(value);
    }
    setCurrentSettings(prev => ({
      ...prev,
      [key]: updatedValue,
    }));
  };

  const handleSaveChanges = async () => {
    setSaveButtonState('loading');
    
    try {
      await onSave(currentSettings);
      setSaveButtonState('success');
      
      // Show success state for 2 seconds, then back to idle (but keep dialog open)
      setTimeout(() => {
        setSaveButtonState('idle');
      }, 2000);
      
    } catch (error) {
      setSaveButtonState('error');
      
      // Show error state for 2 seconds, then back to idle
      setTimeout(() => {
        setSaveButtonState('idle');
      }, 2000);
    }
  };

  // Get button content based on state
  const getButtonContent = () => {
    switch (saveButtonState) {
      case 'loading':
        return (
          <>
            <Icons.spinner className="h-4 w-4 mr-2 animate-spin" />
            Saving...
          </>
        );
      case 'success':
        return (
          <>
            <Icons.check className="h-4 w-4 mr-2" />
            Saved!
          </>
        );
      case 'error':
        return (
          <>
            <Icons.close className="h-4 w-4 mr-2" />
            Save Failed
          </>
        );
      default:
        return (
          <>
            <Icons.check className="h-4 w-4 mr-2" />
            Save Changes
          </>
        );
    }
  };

  // Get button variant based on state
  const getButtonVariant = () => {
    switch (saveButtonState) {
      case 'success':
        return 'primary'; // Use primary color for success
      case 'error':
        return 'destructive';
      default:
        return 'primary';
    }
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
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Icons.settings className="h-4 w-4" />
              <span>General</span>
            </TabsTrigger>
            <TabsTrigger value="availability" className="flex items-center gap-2">
              <Icons.clock className="h-4 w-4" />
              <span>Hours</span>
            </TabsTrigger>
            <TabsTrigger value="booking" className="flex items-center gap-2">
              <Icons.calendar className="h-4 w-4" />
              <span>Booking</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Icons.bell className="h-4 w-4" />
              <span>Alerts</span>
            </TabsTrigger>
          </TabsList>
          
          {/* General Settings */}
          <TabsContent value="general" className="space-y-6 pt-2">
            <div>
              <h3 className="text-sm font-medium mb-2">Calendar Information</h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm text-neutral-500">Calendar Name</label>
                  <Input 
                    type="text"
                    placeholder="Enter calendar name"
                    value={currentSettings.name || ''}
                    onChange={(e) => handleSettingChange('name', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </TabsContent>
          
          {/* Availability Settings - Use flat properties */} 
          <TabsContent value="availability" className="space-y-6 pt-2">
            <div>
              <h3 className="text-sm font-medium mb-2">Working Hours</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm text-neutral-500">Start Time</label>
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
                  <label className="text-sm text-neutral-500">End Time</label>
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
                <div className="flex items-center justify-between p-3 border rounded-xl">
                  <label className="text-sm text-neutral-700">Include Saturdays</label>
                  <input 
                    type="checkbox" 
                    // Use includeSaturday
                    checked={!!currentSettings.includeSaturday} // Ensure boolean
                    onChange={(e) => handleSettingChange('includeSaturday', e.target.checked)}
                    className="h-4 w-4 rounded border-neutral-300 text-neutral-600 focus:ring-neutral-600"
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-xl">
                  <label className="text-sm text-neutral-700">Include Sundays</label>
                  <input 
                    type="checkbox" 
                     // Use includeSunday
                    checked={!!currentSettings.includeSunday} // Ensure boolean
                    onChange={(e) => handleSettingChange('includeSunday', e.target.checked)}
                    className="h-4 w-4 rounded border-neutral-300 text-neutral-600 focus:ring-neutral-600"
                  />
                </div>
              </div>
            </div>
          </TabsContent>
          
          {/* Booking Configuration Settings */}
          <TabsContent value="booking" className="space-y-6 pt-2">
            <div>
              <h3 className="text-sm font-medium mb-2">Booking Preferences</h3>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between p-3 border rounded-xl">
                  <label className="text-sm text-neutral-700">Ask for appointment duration</label>
                  <input 
                    type="checkbox" 
                    checked={!!currentSettings.askForDuration}
                    onChange={(e) => handleSettingChange('askForDuration', e.target.checked)}
                    className="h-4 w-4 rounded border-neutral-300 text-neutral-600 focus:ring-neutral-600"
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-xl">
                  <label className="text-sm text-neutral-700">Ask for appointment notes</label>
                  <input 
                    type="checkbox" 
                    checked={!!currentSettings.askForNotes}
                    onChange={(e) => handleSettingChange('askForNotes', e.target.checked)}
                    className="h-4 w-4 rounded border-neutral-300 text-neutral-600 focus:ring-neutral-600"
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-xl">
                  <label className="text-sm text-neutral-700">Require phone number</label>
                  <input 
                    type="checkbox" 
                    checked={!!currentSettings.requirePhoneNumber}
                    onChange={(e) => handleSettingChange('requirePhoneNumber', e.target.checked)}
                    className="h-4 w-4 rounded border-neutral-300 text-neutral-600 focus:ring-neutral-600"
                  />
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-2">Scheduling Settings</h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm text-neutral-500">Default Duration (minutes)</label>
                  <Input 
                    type="number"
                    min="15"
                    max="240"
                    value={currentSettings.defaultDuration || 30}
                    onChange={(e) => handleSettingChange('defaultDuration', parseInt(e.target.value) || 30)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-neutral-500">Buffer Between Appointments (minutes)</label>
                  <Input 
                    type="number"
                    min="0"
                    max="120"
                    value={currentSettings.bufferBetweenAppointments || 15}
                    onChange={(e) => handleSettingChange('bufferBetweenAppointments', parseInt(e.target.value) || 15)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-neutral-500">Minimum Advance Notice (minutes)</label>
                  <Input 
                    type="number"
                    min="0"
                    max="10080"
                    value={currentSettings.minimumAdvanceNotice || 60}
                    onChange={(e) => handleSettingChange('minimumAdvanceNotice', parseInt(e.target.value) || 60)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-neutral-500">Max Bookings Per Slot</label>
                  <Input 
                    type="number"
                    min="1"
                    max="10"
                    value={currentSettings.maxBookingsPerSlot || 1}
                    onChange={(e) => handleSettingChange('maxBookingsPerSlot', parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-neutral-500">Default Location</label>
                  <Input 
                    type="text"
                    placeholder="Office, Zoom link, etc."
                    value={currentSettings.defaultLocation || ''}
                    onChange={(e) => handleSettingChange('defaultLocation', e.target.value)}
                  />
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-2">Custom Messages</h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm text-neutral-500">Booking Prompt</label>
                  <Input 
                    type="text"
                    placeholder="e.g., Please provide your reason for the appointment"
                    value={currentSettings.bookingPrompt || ''}
                    onChange={(e) => handleSettingChange('bookingPrompt', e.target.value)}
                  />
                  <p className="text-xs text-neutral-400">Custom message shown during booking process</p>
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-neutral-500">Confirmation Message</label>
                  <Input 
                    type="text"
                    placeholder="e.g., Your appointment has been confirmed! We'll send a reminder."
                    value={currentSettings.confirmationMessage || ''}
                    onChange={(e) => handleSettingChange('confirmationMessage', e.target.value)}
                  />
                  <p className="text-xs text-neutral-400">Message shown after successful booking</p>
                </div>
              </div>
            </div>
          </TabsContent>
          
          {/* Notification Settings - Use flat properties */} 
          <TabsContent value="notifications" className="space-y-6 pt-2">
            <div>
              <h3 className="text-sm font-medium mb-2">SMS Notification Settings</h3>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between p-3 border rounded-xl">
                  <label className="text-sm text-neutral-700">Send SMS Confirmations</label>
                  <input 
                    type="checkbox" 
                    checked={!!currentSettings.notificationSmsEnabled}
                    onChange={(e) => handleSettingChange('notificationSmsEnabled', e.target.checked)}
                    className="h-4 w-4 rounded border-neutral-300 text-neutral-600 focus:ring-neutral-600"
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-xl">
                  <label className="text-sm text-neutral-700">Send SMS Reminders</label>
                  <input 
                    type="checkbox" 
                    checked={!!currentSettings.smsReminderEnabled}
                    onChange={(e) => handleSettingChange('smsReminderEnabled', e.target.checked)}
                    className="h-4 w-4 rounded border-neutral-300 text-neutral-600 focus:ring-neutral-600"
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-xl">
                  <label className="text-sm text-neutral-700">Require SMS Confirmation</label>
                  <input 
                    type="checkbox" 
                    checked={!!currentSettings.confirmationRequired}
                    onChange={(e) => handleSettingChange('confirmationRequired', e.target.checked)}
                    className="h-4 w-4 rounded border-neutral-300 text-neutral-600 focus:ring-neutral-600"
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-sm text-neutral-500">Reminder Time</label>
              <Select 
                value={currentSettings.reminderTimeMinutes?.toString() || '30'} 
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
            
            <div className="space-y-1">
              <label className="text-sm text-neutral-500">Auto-Cancel Timeout (hours)</label>
              <Input 
                type="number"
                min="1"
                max="72"
                value={currentSettings.confirmationTimeoutHours || 24}
                onChange={(e) => handleSettingChange('confirmationTimeoutHours', parseInt(e.target.value) || 24)}
              />
              <p className="text-xs text-neutral-400">Unconfirmed appointments will be cancelled after this time</p>
            </div>
            
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>How SMS Notifications Work:</strong><br/>
                • Clients receive SMS to confirm appointments<br/>
                • They reply YES to confirm or NO to cancel<br/>
                • Reminders are sent before appointments<br/>
                • Requires a phone number assigned to your agent
              </p>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="mt-6 sticky bottom-0 bg-white dark:bg-neutral-950 pt-4 pb-2 border-t">
          <Button 
            variant="secondary"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button 
            variant={getButtonVariant()}
            onClick={handleSaveChanges}
          >
            {getButtonContent()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 