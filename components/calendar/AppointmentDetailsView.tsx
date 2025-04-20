"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Icons } from "@/components/icons";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Divider } from "@/components/Divider";

// Import correct types
import { AppointmentStatus, type Appointment } from "@/lib/api/appointments"; // Change import type for enum
import { AppointmentStatus as AppointmentStatusEnum } from "@/lib/api/appointments"; // Import enum as value

// Remove local StatusConfig
// interface StatusConfig { ... }

interface AppointmentDetailsViewProps {
  appointment: Appointment; // Use imported type
  statusConfig: { // Keep inline definition or import from parent/shared types
      [key in AppointmentStatus | 'all']: {
          label: string;
          iconName: keyof typeof Icons;
          color: string;
          variant: string;
      }
  };
  getBgColorClass: (color: string) => string;
  getTextColorClass: (color: string) => string;
  getInitials: (name: string | null | undefined) => string; // Expect name
  formatDate: (date: Date) => string; // Expect Date
  capitalize: (str: string) => string;
  onBack: () => void;
  onStartEdit: (appointment: Appointment) => void;
  onInitiateStatusChange: (id: string, status: AppointmentStatus) => void;
  onUpdateStatus: (appointmentId: string, status: AppointmentStatus) => void; // Expect enum
  onCancel: (appointmentId: string) => void;
}

export function AppointmentDetailsView({
  appointment,
  statusConfig,
  getBgColorClass,
  getTextColorClass,
  getInitials,
  formatDate,
  capitalize,
  onBack,
  onStartEdit,
  onInitiateStatusChange,
  onUpdateStatus,
  onCancel
}: AppointmentDetailsViewProps) {
  
  // Calculate duration using Date objects
  const calculateDuration = () => {
    if (!appointment.startTime || !appointment.endTime) return "N/A"; // Handle missing dates
    
    const durationMillis = appointment.endTime.getTime() - appointment.startTime.getTime();
    if (durationMillis < 0) return "Invalid dates";
    
    const totalMinutes = Math.floor(durationMillis / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    let durationString = "";
    if (hours > 0) {
      durationString += `${hours} hour${hours > 1 ? 's' : ''}`;
    }
    if (minutes > 0) {
      if (durationString.length > 0) durationString += " ";
      durationString += `${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
    return durationString || "0 minutes"; // Show 0 if duration is exactly 0
  };

  const currentStatusConfig = statusConfig[appointment.status]; // Get config for current status
  const StatusIcon = Icons[currentStatusConfig.iconName];

  return (
    <div>
      <header className="border-b border-gray-200 dark:border-gray-800 pb-4 mb-6">
        <div className="sm:flex sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
            Appointment Details
          </h3>
          <div className="mt-3 flex items-center gap-x-2 sm:mt-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={onBack}
            >
              <Icons.chevronLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="sm" className={cn("capitalize justify-start", currentStatusConfig.color)}>
                  {StatusIcon && <StatusIcon className="mr-2 h-4 w-4" />}
                  {appointment.status}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {Object.values(AppointmentStatus).map((statusValue) => {
                  const config = statusConfig[statusValue];
                  const ItemIcon = Icons[config.iconName];
                  if (statusValue === appointment.status) return null; 
                  return (
                    <DropdownMenuItem 
                      key={statusValue} 
                      onClick={() => onInitiateStatusChange(appointment.id, statusValue)}
                      className={cn("capitalize", config.color)}
                    >
                      {ItemIcon && <ItemIcon className="mr-2 h-4 w-4" />}
                      {statusValue}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="secondary" size="sm" onClick={() => onStartEdit(appointment)}> 
              <Icons.edit className="mr-1.5 h-4 w-4"/>
              Edit
            </Button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Details Card - Make it span full width on mobile/tablet */} 
        <Card className="md:col-span-3">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className={cn(
                "flex h-12 w-12 items-center justify-center rounded-full",
                getBgColorClass(appointment.color),
                getTextColorClass(appointment.color)
              )}>
                {/* Use clientName */} 
                {getInitials(appointment.clientName)}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50">
                   {/* Use clientName */} 
                  {appointment.clientName}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center flex-wrap gap-x-2 gap-y-1">
                  <span className="flex items-center"><Icons.calendar className="mr-1.5 h-4 w-4 opacity-70"/> {formatDate(appointment.startTime)}</span>
                  <span className="hidden sm:inline">•</span>
                  <span className="flex items-center"><Icons.clock className="mr-1.5 h-4 w-4 opacity-70"/> {appointment.startTime.toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})} - {appointment.endTime.toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})}</span>
                  <span className="hidden sm:inline">•</span>
                  <span className="flex items-center"><Icons.clock className="mr-1.5 h-4 w-4 opacity-70"/> {calculateDuration()}</span>
                </p>
              </div>
            </div>

            <Divider className="my-5" />

            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Description</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 break-words">
                {appointment.description || <span className="italic text-gray-500">No description provided.</span>}
              </p>
            </div>

            <Divider className="my-5" />

            {/* Placeholder Source Info */}
            <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Source</h3>
                <p className="text-sm text-gray-700 dark:text-gray-300 flex items-center">
                   <Icons.import className="mr-2 h-4 w-4 opacity-70" /> {/* Using Import icon as placeholder */} 
                    Manual
                   {/* Later, replace "Manual" with {appointment.source || "N/A"} when field exists */} 
                </p>
            </div>

            <Divider className="my-5" />

            {/* Moved Actions */}
            <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">Actions</h3>
                <div className="flex flex-col sm:flex-row gap-2">
                    {/* Only show Mark as Completed if not already completed or cancelled */} 
                    {appointment.status !== AppointmentStatusEnum.COMPLETED && appointment.status !== AppointmentStatusEnum.CANCELLED && (
                        <Button variant="secondary" className="w-full sm:w-auto justify-center" onClick={() => onInitiateStatusChange(appointment.id, AppointmentStatusEnum.COMPLETED)}> 
                          <Icons.checkcheck className="mr-2 h-4 w-4" />
                          Mark as Completed
                        </Button>
                    )}

                    {/* Only show Cancel if not already completed or cancelled */} 
                    {appointment.status !== AppointmentStatusEnum.COMPLETED && appointment.status !== AppointmentStatusEnum.CANCELLED && (
                        <Button variant="destructive" className="w-full sm:w-auto justify-center" onClick={() => onCancel(appointment.id)}> 
                          <Icons.calendarX className="mr-2 h-4 w-4" />
                          Cancel Appointment
                        </Button>
                    )}

                     {/* Maybe add a "Reactivate" button if cancelled? */} 
                    {appointment.status === AppointmentStatusEnum.CANCELLED && (
                       <Button variant="secondary" className="w-full sm:w-auto justify-center" onClick={() => onInitiateStatusChange(appointment.id, AppointmentStatusEnum.PENDING)}> 
                         <Icons.reload className="mr-2 h-4 w-4" />
                         Reactivate (Set to Pending)
                       </Button>
                   )}
                </div>
            </div>
          </CardContent>
        </Card>

        {/* Side Details Card Removed */} 
      </div>
    </div>
  );
} 