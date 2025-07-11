"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Divider } from "@/components/Divider";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/DropdownMenu";
import { Icons } from "@/components/icons"; // Use our Icons component
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton

// Import the actual types from the API module
import type { Appointment, AppointmentStatus, Calendar } from "@/lib/api/appointments";

// Type for status configuration - Make sure this matches the main page or is imported
interface StatusConfig {
  [key: string]: {
    label: string;
    // Replace React.ComponentType with the actual type if needed, or use keyof typeof Icons
    iconName: keyof typeof Icons; // Use icon name
    color: string;
    variant: string;
  };
}

// Type for appointment counts - Make sure this matches the main page or is imported
interface AppointmentCounts {
  all: number;
  upcoming: number;
  completed: number;
  cancelled: number;
  [key: string]: number; // Add index signature
}

interface AppointmentListSidebarProps {
  appointments: Appointment[];
  filteredAppointments: Appointment[];
  selectedAppointment: Appointment | null;
  statusFilter: string;
  appointmentCounts: Record<AppointmentStatus | 'all', number>; // Use correct type
  statusConfig: { // Define inline or import a refined type if needed elsewhere
      [key in AppointmentStatus | 'all']: {
          label: string;
          iconName: keyof typeof Icons;
          color: string;
          variant: string;
      }
  };
  onStatusFilterChange: (value: string) => void;
  onSelectAppointment: (appointment: Appointment) => void; // Use imported Appointment type
  onCreateAppointment: () => void;
  formatDate: (date: Date) => string; // Expects Date object
  getInitials: (name: string | null | undefined) => string; // Expects name string
  getColorCombination: (index: number) => { text: string; bg: string };
  capitalize: (str: string) => string; // Add capitalize function prop
  calendars: Calendar[];
  selectedCalendarId: string | null | 'all'; // Allow 'all'
  onCalendarSelectChange: (value: string) => void;
  onCreateCalendar: () => void; // To open the dialog
  onOpenCalendarSettings: () => void; // To open calendar settings dialog
  isLoading: boolean;
  className?: string; // Add className prop
}

export function AppointmentListSidebar({
  appointments,
  filteredAppointments,
  selectedAppointment,
  statusFilter,
  appointmentCounts,
  statusConfig,
  onStatusFilterChange,
  onSelectAppointment,
  onCreateAppointment,
  formatDate,
  getInitials,
  getColorCombination,
  capitalize, // Destructure capitalize function
  calendars,
  selectedCalendarId,
  onCalendarSelectChange,
  onCreateCalendar,
  onOpenCalendarSettings,
  isLoading,
  className, // Destructure className
}: AppointmentListSidebarProps) {
  return (
    <div className={cn(
      "w-80 border-r border-neutral-200 dark:border-neutral-800 flex flex-col h-full", // Base styles
      className // Apply passed className
    )}>
      <div className="p-4 pb-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-black dark:text-white">
            Appointments
          </h2>
          
           {/* Appointment/Calendar Creation Buttons */}
           <div className="flex items-center gap-1">
              {/* New Calendar Button (Icon) */}
              <Button
                variant="secondary"
                className="h-8 w-8 p-0"
                onClick={onCreateCalendar} // Use onCreateCalendar prop
                disabled={isLoading}
                aria-label="Create new calendar"
              >
                <Icons.calendarPlus className="h-4 w-4" />
              </Button>
              {/* Add Appointment Button (Icon) */}
              <Button
                variant="secondary"
                className="h-8 w-8 p-0"
                onClick={onCreateAppointment} 
                aria-label="Create new appointment"
              >
                <Icons.add className="h-4 w-4" /> 
              </Button>
           </div>
        </div>

        {/* Calendar Selection Dropdown with Settings */}
        <div className="mb-4">
            <div className="flex gap-2 items-center">
                <Select 
                    value={selectedCalendarId ?? 'all'} // Default to 'all' if null/undefined
                    onValueChange={onCalendarSelectChange}
                    disabled={isLoading}
                >
                    <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select Calendar" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Calendars</SelectItem>
                        <Divider className="my-1" />
                        {calendars.length > 0 ? (
                            calendars.map(cal => (
                                <SelectItem key={cal.id} value={cal.id}>{cal.name}</SelectItem>
                            ))
                        ) : (
                           <div className="px-2 py-1.5 text-xs text-gray-500 italic">No calendars exist</div>
                        )}
                        <Divider className="my-1" />
                        <SelectItem value="new" className="text-neutral-600 dark:text-neutral-400">
                           + Create New Calendar
                        </SelectItem>
                    </SelectContent>
                </Select>
                
                {/* Calendar Settings Button - only show when specific calendar is selected */}
                {selectedCalendarId && selectedCalendarId !== 'all' && (
                    <Button
                        variant="secondary"
                        size="icon"
                        onClick={onOpenCalendarSettings}
                        className="h-10 w-10 shrink-0"
                        title="Configure Calendar"
                    >
                        <Icons.settings className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
        
        {/* Status Filter Select */}
        <div className="mt-4">
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="flex items-center">
                <div className="flex items-center gap-2">
                  {/* Use Icons.filter now that it's added */}
                  <Icons.filter className="size-4 text-gray-500" /> 
                  <span>All Appointments</span>
                  <Badge 
                    variant="secondary"
                    className="ml-auto text-xs"
                  >
                    {/* Access count using 'all' key */}
                    {appointmentCounts.all || 0} 
                  </Badge>
                </div>
              </SelectItem>
              {/* Filter out 'all' before mapping status enum keys */}
              {(Object.keys(statusConfig) as Array<AppointmentStatus | 'all'>)
                .filter(key => key !== 'all')
                .map((status) => {
                  const config = statusConfig[status];
                  // Get the Icon component from Icons map
                  const StatusIcon = config.iconName ? Icons[config.iconName] : null;
                  return (
                    <SelectItem key={status} value={status} className="flex items-center">
                      <div className="flex items-center gap-2">
                        {StatusIcon ? <StatusIcon className={cn("size-4", config.color)} /> : <span className="size-4" />}
                        <span>{capitalize(config.label)}</span>
                        <Badge 
                          variant={config.variant as any} // Keep cast for variant flexibility
                          className="ml-auto text-xs"
                        >
                          {/* Access count using enum key */}
                          {appointmentCounts[status as AppointmentStatus] || 0}
                        </Badge>
                      </div>
                    </SelectItem>
                  );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <Divider className="mt-4" />
      
      {/* Appointment List */}
      <div className="flex-1 overflow-auto px-4 pb-4">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-2 mt-1">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="ml-3 w-full">
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <Skeleton className="mt-1 h-3 w-32" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <Icons.calendarX className="h-10 w-10 text-gray-400 mb-3" /> 
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No Appointments Found</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Try adjusting the calendar or status filters.
              </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 mt-1">
            {filteredAppointments.map((appointment, index) => (
              <div 
                key={appointment.id}
                onClick={() => onSelectAppointment(appointment)}
                className={cn(
                  "group transition-all duration-200 cursor-pointer p-3 rounded-lg border relative",
                  "hover:bg-neutral-50 dark:hover:bg-neutral-900",
                  "hover:shadow-sm",
                  "bg-white dark:bg-black border-neutral-200 dark:border-neutral-800",
                  "hover:border-neutral-300 dark:hover:border-neutral-700",
                  selectedAppointment?.id === appointment.id && [
                    "border-neutral-400 dark:border-white",
                    "bg-neutral-50 dark:bg-neutral-900"
                  ]
                )}
              >
                <div className="flex items-center">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-medium">
                    {getInitials(appointment.clientName)}
                  </span>
                  <div className="ml-3 w-full overflow-hidden">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center max-w-[70%]">
                        <div className="truncate text-sm font-medium text-neutral-700 dark:text-neutral-200">
                          {appointment.clientName}
                        </div>
                        <div className="ml-2 flex-shrink-0">
                          <Badge 
                            variant={statusConfig[appointment.status]?.variant as any ?? "secondary"} 
                            className="text-[10px] px-1 py-0 leading-tight capitalize"
                          >
                            {appointment.status.toLowerCase()}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <p className="mt-1 truncate text-xs text-neutral-600 dark:text-neutral-400">
                      {formatDate(appointment.startTime)}
                    </p>
                  </div>
                </div>

                <div className="absolute right-2 top-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Icons.more className="h-3.5 w-3.5 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="min-w-56">
                      <DropdownMenuLabel>Appointment Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuGroup>
                        <DropdownMenuItem onClick={() => onSelectAppointment(appointment)}>
                          <span className="flex items-center gap-x-2">
                            <Icons.eye className="size-4 text-inherit" />
                            <span>View Details</span>
                          </span>
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 