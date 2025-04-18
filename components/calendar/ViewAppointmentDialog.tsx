"use client";

import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Appointment, AppointmentStatus } from "@/lib/api/appointments";
import type { Icons } from "@/components/icons";

interface ViewAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment | null;
  onViewDetails: (appointment: Appointment) => void;
  getColorClass: (color: string) => string;
  formatDate: (date: Date) => string;
  capitalize: (str: string) => string;
  statusConfig?: { 
      [key in AppointmentStatus | 'all']?: {
          label: string;
          iconName: keyof typeof Icons;
          color: string;
          variant: string;
      }
  };
}

export function ViewAppointmentDialog({
  open,
  onOpenChange,
  appointment,
  onViewDetails,
  getColorClass,
  formatDate,
  capitalize,
  statusConfig
}: ViewAppointmentDialogProps) {

  if (!appointment) {
    return null;
  }

  const statusLabel = statusConfig?.[appointment.status]?.label 
                      ? capitalize(statusConfig[appointment.status]!.label) 
                      : capitalize(appointment.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{appointment.clientName}</DialogTitle>
          <DialogDescription>
            {formatDate(appointment.startTime)} • {appointment.startTime.toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})} - {appointment.endTime.toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})}
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-2">
            <span className={cn(
              "w-3 h-3 rounded-full flex-shrink-0",
              getColorClass(appointment.color)
            )} />
            <span className="text-sm font-medium">
              {statusLabel}
            </span>
          </div>
          
          <div className="text-sm text-gray-700 dark:text-gray-300 break-words">
            {appointment.description || <span className="italic text-gray-500">No description provided.</span>}
          </div>
        </div>
        
        <DialogFooter className="mt-6">
          <Button 
            variant="secondary" 
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button onClick={() => {
            onViewDetails(appointment);
          }}>
            View Full Details
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 