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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppointmentStatus } from "@/lib/api/appointments";
import type { AppointmentInput, Calendar, Appointment } from "@/lib/api/appointments";
import { toast } from "react-hot-toast"; // Use toast for feedback
import { Icons } from "@/components/icons"; // Import Icons for spinner

interface EditAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (id: string, data: Partial<AppointmentInput>) => Promise<any>; // Allow any promise return type
  appointment: Appointment | null; // The appointment to edit
  calendars: Calendar[];
}

// Helper to format Date to YYYY-MM-DD
const formatDateForInput = (date: Date | string | undefined | null): string => {
    if (!date) return '';
    try {
        const d = typeof date === 'string' ? new Date(date) : date;
        return d.toISOString().split('T')[0];
    } catch {
        return '';
    }
};

// Helper to format Date to HH:MM
const formatTimeForInput = (date: Date | string | undefined | null): string => {
    if (!date) return '';
    try {
        const d = typeof date === 'string' ? new Date(date) : date;
        const hours = d.getHours().toString().padStart(2, '0');
        const minutes = d.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    } catch {
        return '';
    }
};


export function EditAppointmentDialog({
  open,
  onOpenChange,
  onSubmit,
  appointment,
  calendars
}: EditAppointmentDialogProps) {
  const [formData, setFormData] = useState<Partial<AppointmentInput>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate form when appointment data changes (dialog opens)
  useEffect(() => {
    if (open && appointment) {
      setFormData({
        calendarId: appointment.calendarId,
        clientName: appointment.clientName,
        clientPhoneNumber: appointment.clientPhoneNumber ?? '',
        description: appointment.description ?? '',
        date: formatDateForInput(appointment.startTime), // Format from Date object
        startTime: formatTimeForInput(appointment.startTime), // Format from Date object
        endTime: formatTimeForInput(appointment.endTime), // Format from Date object
        color: appointment.color ?? 'neutral',
        status: appointment.status ?? AppointmentStatus.PENDING,
      });
      setError(null);
      setIsSubmitting(false);
    } else if (!open) {
        // Clear form when closing if needed
        setFormData({});
    }
  }, [open, appointment]);

  const handleInputChange = (field: keyof AppointmentInput, value: string | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setError(null);
    if (!appointment) {
        setError("No appointment selected for editing.");
        return;
    }

    // Basic validation
    if (!formData.calendarId || !formData.clientName || !formData.date || !formData.startTime || !formData.endTime) {
      setError("Please fill in all required fields (Calendar, Client Name, Date, Start Time, End Time).");
      return;
    }

    setIsSubmitting(true);
    try {
      // Pass only the changed fields (or all fields as Partial<AppointmentInput>)
      await onSubmit(appointment.id, formData);
      toast.success("Appointment updated successfully!"); // Add success toast
      onOpenChange(false); // Close dialog on success
    } catch (err) {
      console.error("Submission error in edit dialog:", err);
      const message = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(`Failed to update appointment: ${message}`);
      toast.error(`Failed to update appointment: ${message}`); // Add error toast
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-none overflow-y-visible">
        <DialogHeader>
          <DialogTitle>Edit Appointment</DialogTitle>
          <DialogDescription>
            Modify the details of this appointment.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2"> {/* Allow scrolling within form section */}
          {/* Calendar Select */}
          <div className="grid gap-2">
            <Label htmlFor="edit-calendarId" className="text-sm font-medium">
              Calendar <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.calendarId ?? ""}
              onValueChange={(value) => handleInputChange('calendarId', value)}
              disabled={isSubmitting || calendars.length === 0}
            >
              <SelectTrigger id="edit-calendarId">
                <SelectValue placeholder={calendars.length > 0 ? "Select a calendar" : "No calendars available"} />
              </SelectTrigger>
              <SelectContent>
                {calendars.map(cal => (
                  <SelectItem key={cal.id} value={cal.id}>{cal.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {calendars.length === 0 && <p className="text-xs text-gray-500">No calendars available.</p>}
          </div>

          {/* Client Name */}
          <div className="grid gap-2">
            <Label htmlFor="edit-clientName" className="text-sm font-medium">
              Client Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="edit-clientName"
              type="text"
              value={formData.clientName ?? ""}
              onChange={(e) => handleInputChange('clientName', e.target.value)}
              placeholder="Enter client's full name"
              disabled={isSubmitting}
            />
          </div>

          {/* Client Phone */}
          <div className="grid gap-2">
            <Label htmlFor="edit-clientPhoneNumber" className="text-sm font-medium">
              Client Phone <span className="text-xs text-gray-500">(Optional)</span>
            </Label>
            <Input
              id="edit-clientPhoneNumber"
              type="tel"
              value={formData.clientPhoneNumber ?? ""}
              onChange={(e) => handleInputChange('clientPhoneNumber', e.target.value)}
              placeholder="Enter client's phone number"
              disabled={isSubmitting}
            />
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <Label htmlFor="edit-description" className="text-sm font-medium">
              Description
            </Label>
            <textarea
              id="edit-description"
              className="flex min-h-[80px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={formData.description ?? ""}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Meeting description"
              disabled={isSubmitting}
            />
          </div>

          {/* Date */}
          <div className="grid gap-2">
            <Label htmlFor="edit-date" className="text-sm font-medium">
              Date <span className="text-red-500">*</span>
            </Label>
            <Input
              id="edit-date"
              type="date"
              className="input-styles" // Reuse or define styles
              value={formData.date ?? ""}
              onChange={(e) => handleInputChange('date', e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {/* Start/End Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-startTime" className="text-sm font-medium">
                Start Time <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-startTime"
                type="time"
                className="input-styles" // Reuse or define styles
                value={formData.startTime ?? ""}
                onChange={(e) => handleInputChange('startTime', e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-endTime" className="text-sm font-medium">
                End Time <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-endTime"
                type="time"
                className="input-styles" // Reuse or define styles
                value={formData.endTime ?? ""}
                onChange={(e) => handleInputChange('endTime', e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

           {/* Color Select */}
          <div className="grid gap-2">
            <Label htmlFor="edit-color" className="text-sm font-medium">
              Color
            </Label>
            <Select
              value={formData.color ?? "neutral"}
              onValueChange={(value) => handleInputChange('color', value)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="edit-color">
                <SelectValue placeholder="Select a color" />
              </SelectTrigger>
              <SelectContent>
                 {/* Color options */}
                 <SelectItem value="purple">Purple</SelectItem>
                 <SelectItem value="sky">Sky</SelectItem>
                 <SelectItem value="emerald">Emerald</SelectItem>
                 <SelectItem value="amber">Amber</SelectItem>
                 <SelectItem value="neutral">neutral</SelectItem>
                 <SelectItem value="rose">Rose</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status Select - Generally status is changed via dedicated flow, but can include if needed */}
           <div className="grid gap-2">
             <Label htmlFor="edit-status" className="text-sm font-medium">
               Status
             </Label>
             <Select
               value={formData.status ?? AppointmentStatus.PENDING}
               onValueChange={(value) => handleInputChange('status', value as AppointmentStatus)}
               disabled={isSubmitting}
             >
               <SelectTrigger id="edit-status">
                 <SelectValue placeholder="Select status" />
               </SelectTrigger>
               <SelectContent>
                 {Object.values(AppointmentStatus).map(status => (
                   <SelectItem key={status} value={status}>{status}</SelectItem>
                 ))}
               </SelectContent>
             </Select>
           </div>


          {/* Display Error Message */}
          {error && (
            <p className="text-sm text-red-600 pt-2">{error}</p>
          )}
        </div>

        <DialogFooter className="pt-4 border-t dark:border-gray-700"> {/* Add separator */}
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <><Icons.spinner className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 