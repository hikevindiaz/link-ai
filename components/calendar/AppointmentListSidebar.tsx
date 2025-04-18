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
import { LoadingState } from "@/components/LoadingState"; // Import LoadingState

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
  isLoading,
  className, // Destructure className
}: AppointmentListSidebarProps) {
  return (
    <div className={cn(
      "w-80 border-r border-gray-200 dark:border-gray-800 flex flex-col h-full", // Base styles
      className // Apply passed className
    )}>
      <div className="p-4 pb-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
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

        {/* Calendar Selection Dropdown */}
        <div className="mb-4">
            <Select 
                value={selectedCalendarId ?? 'all'} // Default to 'all' if null/undefined
                onValueChange={onCalendarSelectChange}
                disabled={isLoading}
            >
                <SelectTrigger className="w-full">
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
                    <SelectItem value="new" className="text-indigo-600 dark:text-indigo-400">
                       + Create New Calendar
                    </SelectItem>
                </SelectContent>
            </Select>
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
          <div className="flex items-center justify-center h-full">
            <LoadingState text="Loading appointments..." size="small" />
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
          <div className="grid grid-cols-1 gap-3 mt-1">
            {filteredAppointments.map((appointment, index) => (
              <Card 
                key={appointment.id}
                className={cn(
                  "group transition-all duration-200",
                  "hover:bg-gray-50 dark:hover:bg-gray-900",
                  "hover:shadow-sm",
                  "hover:border-gray-300 dark:hover:border-gray-700",
                  selectedAppointment?.id === appointment.id && [
                    "border-indigo-500 dark:border-indigo-500",
                    "bg-indigo-50/50 dark:bg-indigo-500/5",
                    "ring-1 ring-indigo-500/20 dark:ring-indigo-500/20"
                  ]
                )}
              >
                <div className="relative px-3.5 py-2.5">
                  <div className="flex items-center space-x-3">
                    <span
                      className={cn(
                        getColorCombination(index).bg,
                        getColorCombination(index).text,
                        'flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-medium',
                        'transition-transform duration-200 group-hover:scale-[1.02]',
                        selectedAppointment?.id === appointment.id && [
                          "border-2 border-indigo-500 dark:border-indigo-500",
                          "shadow-[0_0_0_4px_rgba(59,130,246,0.1)]"
                        ]
                      )}
                      aria-hidden={true}
                    >
                      {/* Use clientName for initials */}
                      {getInitials(appointment.clientName)} 
                    </span>
                    <div className="truncate min-w-0">
                      <p className={cn(
                        "truncate text-sm font-medium text-gray-900 dark:text-gray-50",
                        selectedAppointment?.id === appointment.id && "text-indigo-600 dark:text-indigo-400"
                      )}>
                      <button
                          onClick={() => onSelectAppointment(appointment)}
                          className="focus:outline-none hover:no-underline no-underline text-left"
                        type="button"
                        >
                          <span className="absolute inset-0" aria-hidden="true" />
                           {/* Use clientName instead of title */}
                          {appointment.clientName}
                      </button>
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p className="text-xs text-gray-500 dark:text-gray-500 pointer-events-none no-underline">
                           {/* Use startTime (Date object) for formatDate */}
                          {formatDate(appointment.startTime)} 
                          {/* TODO: Decide how/if to display time range */}
                          {/* Example: • {appointment.startTime.toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})} - {appointment.endTime.toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})} */} 
                        </p>
                        </div>
                    </div>
                  </div>

                  <div className="absolute right-2.5 top-2.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={(e) => e.stopPropagation()} // Prevent card click
                        >
                          <Icons.more className="h-3.5 w-3.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="min-w-56">
                        <DropdownMenuLabel>Appointment Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuGroup>
                          {/* Pass correct appointment object */}
                          <DropdownMenuItem onClick={() => onSelectAppointment(appointment)}>
                            <span className="flex items-center gap-x-2">
                              <Icons.eye className="size-4 text-inherit" /> {/* Use eye icon? */}
                              <span>View Details</span>
                            </span>
                          </DropdownMenuItem>
                           {/* TODO: Add Edit/Cancel options later */}
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 