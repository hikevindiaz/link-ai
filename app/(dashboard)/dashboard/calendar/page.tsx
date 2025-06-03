"use client";

import { useState, useEffect, useCallback } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Icons } from "@/components/icons";
import { RiArrowLeftLine } from '@remixicon/react';
import { AppointmentListSidebar } from "@/components/calendar/AppointmentListSidebar";
import { AppointmentDetailsView } from "@/components/calendar/AppointmentDetailsView";
import { CalendarMainView } from "@/components/calendar/CalendarMainView";
import { CreateAppointmentDialog } from "@/components/calendar/CreateAppointmentDialog";
import { CalendarSettingsDialog } from "@/components/calendar/CalendarSettingsDialog";
import { LoadingState } from "@/components/LoadingState";
import {
    AppointmentStatus, 
    type Appointment, 
    type AppointmentInput, 
    type Calendar, 
    type CalendarSettingsInput,
    type CalendarCreateInput,
    type CalendarUpdateInput
} from "@/lib/api/appointments";
import { toast } from "react-hot-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EditAppointmentDialog } from "@/components/calendar/EditAppointmentDialog";

// Type for calendar day (Add back the removed type)
interface CalendarDay {
  date: Date;
  day: number;
  isCurrentMonth: boolean;
}

// Status configuration
const statusConfig: {
  [key in AppointmentStatus | 'all']: {
    label: string;
    iconName: keyof typeof Icons;
    color: string;
    variant: string;
  }
} = {
  all: {
    label: "All Appointments",
    iconName: "calendar",
    color: "text-gray-500",
    variant: "default"
  },
  [AppointmentStatus.PENDING]: {
    label: "Pending",
    iconName: "clock",
    color: "text-yellow-500",
    variant: "warning"
  },
  [AppointmentStatus.CONFIRMED]: {
    label: "Confirmed",
    iconName: "calendar",
    color: "text-indigo-500",
    variant: "default"
  },
  [AppointmentStatus.COMPLETED]: {
    label: "Completed",
    iconName: "checkcheck",
    color: "text-green-500",
    variant: "success"
  },
  [AppointmentStatus.CANCELLED]: {
    label: "Cancelled",
    iconName: "calendarX",
    color: "text-red-500",
    variant: "destructive"
  }
};

// Default calendar settings
const defaultCalendarSettings: CalendarSettingsInput = {
  workingHoursStart: "09:00",
  workingHoursEnd: "17:00",
  includeSaturday: true,
  includeSunday: false,
  notificationEmailEnabled: true,
  emailReminderEnabled: true,
  smsReminderEnabled: false,
  reminderTimeMinutes: 30,
  askForDuration: true,
  askForNotes: true,
  defaultDuration: 30,
  bufferBetweenAppointments: 15,
  maxBookingsPerSlot: 1,
  minimumAdvanceNotice: 60,
  requirePhoneNumber: true,
  defaultLocation: "",
  bookingPrompt: "",
  confirmationMessage: ""
};

// Color combinations for appointment cards
const colorCombinations = [
  { text: 'text-purple-800 dark:text-purple-500', bg: 'bg-purple-100 dark:bg-purple-500/20' },
  { text: 'text-sky-800 dark:text-sky-500', bg: 'bg-sky-100 dark:bg-sky-500/20' },
  { text: 'text-emerald-800 dark:text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-500/20' },
  { text: 'text-amber-800 dark:text-amber-500', bg: 'bg-amber-100 dark:bg-amber-500/20' },
  { text: 'text-indigo-800 dark:text-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-500/20' },
  { text: 'text-rose-800 dark:text-rose-500', bg: 'bg-rose-100 dark:bg-rose-500/20' },
];

export default function CalendarPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [calendarView, setCalendarView] = useState<string>("day");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [settingsDialogOpen, setSettingsDialogOpen] = useState<boolean>(false);
  const [createAppointmentOpen, setCreateAppointmentOpen] = useState<boolean>(false);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null | 'all'>('all');
  const [createCalendarOpen, setCreateCalendarOpen] = useState<boolean>(false);
  const [newCalendarName, setNewCalendarName] = useState<string>("");
  const [newCalendarSettings, setNewCalendarSettings] = useState<CalendarSettingsInput>({
    workingHoursStart: "09:00",
    workingHoursEnd: "17:00",
    includeSaturday: true,
    includeSunday: false,
    notificationEmailEnabled: true,
    emailReminderEnabled: true,
    smsReminderEnabled: false,
    reminderTimeMinutes: 30,
    askForDuration: true,
    askForNotes: true,
    defaultDuration: 30,
    bufferBetweenAppointments: 15,
    maxBookingsPerSlot: 1,
    minimumAdvanceNotice: 60,
    requirePhoneNumber: true,
    defaultLocation: "",
    bookingPrompt: "",
    confirmationMessage: ""
  });
  const [isDeletingCalendar, setIsDeletingCalendar] = useState<boolean>(false);
  const [isCreatingCalendar, setIsCreatingCalendar] = useState<boolean>(false);

  // Add mobile responsiveness state
  const [isMobileView, setIsMobileView] = useState<boolean>(false);
  const [showDetailsOnMobile, setShowDetailsOnMobile] = useState<boolean>(false);

  // State for Edit Appointment Dialog
  const [editAppointmentDialogOpen, setEditAppointmentDialogOpen] = useState<boolean>(false);
  const [appointmentToEdit, setAppointmentToEdit] = useState<Appointment | null>(null);

  // State for Status Change Confirmation
  const [statusConfirmDialogOpen, setStatusConfirmDialogOpen] = useState<boolean>(false);
  const [statusChangeTarget, setStatusChangeTarget] = useState<{ id: string; status: AppointmentStatus } | null>(null);

  // Check for mobile view on mount and window resize
  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 768); // Use 768px as breakpoint
    };
    checkMobileView(); // Initial check
    window.addEventListener('resize', checkMobileView);
    return () => { // Cleanup listener on unmount
      window.removeEventListener('resize', checkMobileView);
    };
  }, []);

  // Update mobile view state when appointment is selected
  useEffect(() => {
    if (selectedAppointment && isMobileView) {
      setShowDetailsOnMobile(true);
    } else if (!selectedAppointment) {
      // Always hide details on mobile when no appointment is selected
      setShowDetailsOnMobile(false);
    }
    // If not on mobile, always hide the details view initially if appointment selection changes?
    // No, desktop view should stay consistent regardless of showDetailsOnMobile state.
  }, [selectedAppointment, isMobileView]);

  // Fetch initial data: Calendars first, then Appointments for the selected calendar
  useEffect(() => {
    const loadCalendars = async () => {
      setIsLoading(true); // Start loading indicator for calendars
      setError(null);
      try {
        const calendarsResponse = await fetch('/api/calendars');
        if (!calendarsResponse.ok) {
          throw new Error(`Failed to fetch calendars: ${calendarsResponse.statusText}`);
        }
        const fetchedCalendars: Calendar[] = await calendarsResponse.json();
        setCalendars(fetchedCalendars);
        // Default to 'all' if it wasn't set and calendars exist, otherwise null
        // setSelectedCalendarId(prevId => prevId ?? (fetchedCalendars.length > 0 ? 'all' : null));

      } catch (err) {
        console.error("Failed to load calendars:", err);
        const message = err instanceof Error ? err.message : "Unknown error occurred";
        setError(`Failed to load calendars: ${message}. Please try again later.`);
        setCalendars([]); // Clear calendars on error
        setSelectedCalendarId(null); // Reset selected ID
      } finally {
        // Consider setting isLoading false only after appointments are also fetched?
        // Or use separate loading states. For now, set false here.
        // setIsLoading(false);
      }
    };
    loadCalendars();
  }, []); // Run only once on mount

  useEffect(() => {
    const loadInitialData = async () => {
      // Don't fetch if calendars haven't loaded yet or if no calendar is selected (and none exist)
      // Note: selectedCalendarId is initialized to 'all', so this check is mainly for the error case
      if (!selectedCalendarId && calendars.length === 0) {
        setAppointments([]);
        setIsLoading(false); // Stop loading if nothing to fetch
        return;
      }
      
      setIsLoading(true); // Indicate loading for appointments
      setError(null); // Clear previous errors
      setAppointments([]); // Clear previous appointments before fetching new ones

      try {
        // 3. Fetch Appointments based on selection
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
        
        const params = new URLSearchParams({
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
        });
        
        // Only add calendarId if it's not 'all' and not null
        if (selectedCalendarId && selectedCalendarId !== 'all') {
            params.append('calendarId', selectedCalendarId);
        } else if (calendars.length === 0) {
            // If no calendars exist, don't fetch appointments
            setAppointments([]);
            setIsLoading(false);
            return;
        }
        // If selectedCalendarId is 'all', the API should fetch all appointments (param not added)

        const appointmentsResponse = await fetch(`/api/appointments?${params.toString()}`);
        if (!appointmentsResponse.ok) {
            throw new Error(`Failed to fetch appointments: ${appointmentsResponse.statusText}`);
        }
        const fetchedAppointmentsData = await appointmentsResponse.json();
        const fetchedAppointments: Appointment[] = fetchedAppointmentsData.map((app: any) => ({
            ...app,
            startTime: new Date(app.startTime),
            endTime: new Date(app.endTime),
            createdAt: new Date(app.createdAt),
            updatedAt: new Date(app.updatedAt),
        }));
        setAppointments(fetchedAppointments);

      } catch (err) {
        console.error("Failed to load initial data:", err);
        const message = err instanceof Error ? err.message : "Unknown error occurred";
        setError(`Failed to load calendar data: ${message}. Please try again later.`);
        setAppointments([]); // Clear appointments on error
        setCalendars([]); // Clear calendars on error
        setSelectedCalendarId(null); // Reset selected ID
      } finally {
        setIsLoading(false);
      }
    };

    // Only run if selectedCalendarId is set (initialized to 'all')
    if (selectedCalendarId) {
      loadInitialData();
    } else {
        // If selectedCalendarId becomes null (e.g., error during calendar fetch), clear appointments and stop loading
        setAppointments([]);
        setIsLoading(false);
    }
  }, [currentDate, selectedCalendarId, calendars]); // Depend on calendars too, ensures fetch after calendars load

  // Get current selected calendar's settings (only if a specific calendar is selected)
  const currentCalendar = selectedCalendarId && selectedCalendarId !== 'all' 
      ? calendars.find(cal => cal.id === selectedCalendarId)
      : null;
  const currentCalendarSettings = currentCalendar ?? defaultCalendarSettings;

  // Filter appointments based on status filter AND selected calendar ('all' means no calendar filter)
  const filteredAppointments = appointments
    .filter(appointment => selectedCalendarId === 'all' || appointment.calendarId === selectedCalendarId) // Apply calendar filter only if not 'all'
    .filter(appointment => statusFilter === "all" || appointment.status === statusFilter as AppointmentStatus);

  // Count appointments by status for the selected calendar ('all' means count all)
  const appointmentCounts = appointments
      .filter(appointment => selectedCalendarId === 'all' || appointment.calendarId === selectedCalendarId) // Apply calendar filter only if not 'all'
      .reduce((acc, app) => {
          acc.all = (acc.all || 0) + 1;
          acc[app.status] = (acc[app.status] || 0) + 1;
          return acc;
      }, { all: 0 } as Record<AppointmentStatus | 'all', number>);

  // Function to capitalize first letter
  const capitalize = (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  // Format date for display
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Handle creating a new calendar via API
  const handleCreateCalendar = async () => {
     if (!newCalendarName.trim()) {
        toast.error("Calendar name cannot be empty.");
        return;
     }
     setIsCreatingCalendar(true);
     try {
        const response = await fetch('/api/calendars', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              name: newCalendarName,
              ...newCalendarSettings 
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `API Error: ${response.statusText}`);
        }

        const newCalendar: Calendar = await response.json();
        setCalendars(prev => [...prev, newCalendar]); // Add to list
        setSelectedCalendarId(newCalendar.id); // Select the newly created calendar
        setCreateCalendarOpen(false); // Close dialog
        setNewCalendarName(""); // Reset name input
        setNewCalendarSettings({ // Reset settings to defaults
          workingHoursStart: "09:00",
          workingHoursEnd: "17:00",
          includeSaturday: true,
          includeSunday: false,
          notificationEmailEnabled: true,
          emailReminderEnabled: true,
          smsReminderEnabled: false,
          reminderTimeMinutes: 30,
          askForDuration: true,
          askForNotes: true,
          defaultDuration: 30,
          bufferBetweenAppointments: 15,
          maxBookingsPerSlot: 1,
          minimumAdvanceNotice: 60,
          requirePhoneNumber: true,
          defaultLocation: "",
          bookingPrompt: "",
          confirmationMessage: ""
        });
        toast.success("Calendar created successfully!");

     } catch (err) {
        console.error("Failed to create calendar:", err);
        const message = err instanceof Error ? err.message : "Unknown error occurred";
        toast.error(`Failed to create calendar: ${message}`);
     } finally {
         setIsCreatingCalendar(false);
     }
  };

  // Handle save settings - TODO: Needs API route
  const handleSaveSettings = async (updatedSettings: CalendarUpdateInput) => {
    if (!selectedCalendarId) {
      throw new Error("No calendar selected to save settings for.");
    }
    console.log('Saving calendar settings/name via API for:', selectedCalendarId, updatedSettings);
    
    const response = await fetch(`/api/calendars/${selectedCalendarId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API Error: ${response.statusText}`);
    }

    const updatedCalendar: Calendar = await response.json();

    // Update the calendar in the state
    setCalendars(prev => 
        prev.map(cal => cal.id === selectedCalendarId ? updatedCalendar : cal)
    );
  };

  // Handle delete via API
  const handleDeleteCalendar = async () => {
    if (!selectedCalendarId) {
        toast.error("No calendar selected to delete.");
        return;
    }
    setIsDeletingCalendar(true);
    
    try {
        const response = await fetch(`/api/calendars/${selectedCalendarId}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            if (response.status === 204) { // Handle success
               // Continue below
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || `API Error: ${response.statusText}`);
            }
        }
        
        toast.success("Calendar deleted successfully!");
        
        // Remove the calendar from state
        const remainingCalendars = calendars.filter(cal => cal.id !== selectedCalendarId);
        setCalendars(remainingCalendars);
        
        // Select the first remaining calendar, or null if none left
        setSelectedCalendarId(remainingCalendars.length > 0 ? remainingCalendars[0].id : null);

    } catch (err) {
        console.error("Failed to delete calendar:", err);
        const message = err instanceof Error ? err.message : "Unknown error occurred";
        toast.error(`Failed to delete calendar: ${message}`);
    } finally {
        setIsDeletingCalendar(false);
    }
  };

  // Generate days for the calendar
  const generateCalendarDays = (): CalendarDay[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Get the first day of the month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Get the day of the week for the first day (0 = Sunday, 6 = Saturday)
    const firstDayOfWeek = firstDay.getDay();
    
    // Calculate days from previous month to show
    const daysFromPrevMonth = firstDayOfWeek;
    
    // Calculate total days to show (previous month days + current month days)
    const totalDays = daysFromPrevMonth + lastDay.getDate();
    
    // Calculate rows needed (7 days per row)
    const rows = Math.ceil(totalDays / 7);
    
    // Generate calendar days
    const days: CalendarDay[] = [];
    let dayCounter = 1 - daysFromPrevMonth;
    
    for (let i = 0; i < rows * 7; i++) {
      const currentDay = new Date(year, month, dayCounter);
      const isCurrentMonth = currentDay.getMonth() === month;
      
      days.push({
        date: currentDay,
        day: currentDay.getDate(),
        isCurrentMonth
      });
      
      dayCounter++;
    }
    
    return days;
  };

  // Get color class based on appointment color
  const getColorClass = (color: string): string => {
    const colorMap: { [key: string]: string } = {
      purple: "bg-purple-600",
      sky: "bg-sky-600",
      emerald: "bg-emerald-600",
      amber: "bg-amber-600",
      indigo: "bg-indigo-600",
      rose: "bg-rose-600"
    };
    
    return colorMap[color] || "bg-gray-600";
  };

  // Get background color class based on appointment color
  const getBgColorClass = (color: string): string => {
    const colorMap: { [key: string]: string } = {
      purple: "bg-purple-100",
      sky: "bg-sky-100",
      emerald: "bg-emerald-100",
      amber: "bg-amber-100",
      indigo: "bg-indigo-100",
      rose: "bg-rose-100"
    };
    
    return colorMap[color] || "bg-gray-100";
  };

  // Get text color class based on appointment color
  const getTextColorClass = (color: string): string => {
    const colorMap: { [key: string]: string } = {
      purple: "text-purple-800",
      sky: "text-sky-800",
      emerald: "text-emerald-800",
      amber: "text-amber-800",
      indigo: "text-indigo-800",
      rose: "text-rose-800"
    };
    
    return colorMap[color] || "text-gray-800";
  };

  // Get color combination for an appointment
  const getColorCombination = (index: number) => {
    return colorCombinations[index % colorCombinations.length];
  };

  // Get initials from appointment title
  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Generate hours for day view based on selected calendar settings
  const generateHoursForDay = () => {
    const settings = calendars.find(cal => cal.id === selectedCalendarId) ?? defaultCalendarSettings;
    const hours = [];
    const workStart = parseInt(settings.workingHoursStart?.split(':')[0] || '9');
    const workEnd = parseInt(settings.workingHoursEnd?.split(':')[0] || '17');
    
    const startHour = Math.min(6, workStart - 2);
    const endHour = Math.max(20, workEnd + 2);
    
    for (let hour = startHour; hour <= endHour; hour++) {
      hours.push(hour);
    }
    
    return hours;
  };

  // Get appointments for the current day (already filtered by calendarId)
  const getAppointmentsForDay = (date: Date) => {
    return appointments.filter(appointment => {
      const appointmentDate = appointment.startTime;
      return (
        appointmentDate.getDate() === date.getDate() &&
        appointmentDate.getMonth() === date.getMonth() &&
        appointmentDate.getFullYear() === date.getFullYear()
      );
    });
  };

  // Format hour for display
  const formatHour = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${displayHour}:00 ${period}`;
  };

  // Get appointment position in day view
  const getAppointmentPosition = (appointment: Appointment) => {
    const hours = appointment.startTime.getHours();
    const minutes = appointment.startTime.getMinutes();
    const endHours = appointment.endTime.getHours();
    const endMinutes = appointment.endTime.getMinutes();
    
    const startPercentage = (hours + minutes / 60) / 24 * 100;
    const durationHours = (endHours + endMinutes / 60) - (hours + minutes / 60);
    // Ensure minimum height for visibility
    const heightPercentage = Math.max(durationHours / 24 * 100, 3); // Increased min height slightly
    
    return {
      top: `${startPercentage}%`,
      height: `${heightPercentage}%`
    };
  };

  // Check if appointment is within visible hours
  const isAppointmentVisible = (appointment: Appointment) => {
    const hours = appointment.startTime.getHours();
    const endHours = appointment.endTime.getHours();
    const visibleHours = generateHoursForDay();
    
    // Check if appointment starts before the last visible hour ends 
    // AND ends after the first visible hour starts
    return hours < visibleHours[visibleHours.length - 1] && endHours >= visibleHours[0];
  };

  // Get appointment for a specific hour
  const getAppointmentsForHour = (hour: number, dayAppointments: Appointment[]) => {
    return dayAppointments.filter(appointment => {
      const startHour = appointment.startTime.getHours();
      const endHour = appointment.endTime.getHours();
      // Appointment starts within the hour OR spans across the hour
      return (startHour === hour) || (startHour < hour && endHour >= hour);
    });
  };

  // Get the days of the current week
  const getWeekDays = () => {
    const days = [];
    const currentDay = new Date(currentDate);
    // Adjust to start week on Sunday (or Monday depending on locale/preference)
    const firstDayOfWeekOffset = currentDay.getDay(); // 0 for Sunday
    const firstDayOfWeek = currentDay.getDate() - firstDayOfWeekOffset;
    currentDay.setDate(firstDayOfWeek);
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentDay);
      days.push({
        date,
        dayOfMonth: date.getDate(),
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        isToday: date.toDateString() === new Date().toDateString()
      });
      currentDay.setDate(currentDay.getDate() + 1);
    }
    return days;
  };

  // Get appointments for a specific day (already filtered by calendar)
  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter(appointment => {
      const appointmentDate = appointment.startTime;
      return (
        appointmentDate.getDate() === date.getDate() &&
        appointmentDate.getMonth() === date.getMonth() &&
        appointmentDate.getFullYear() === date.getFullYear()
      );
    });
  };

  // Handle creating a new appointment via API
  const handleCreateAppointmentSubmit = useCallback(async (appointmentData: AppointmentInput) => {
    // Validate based on the ID passed from the dialog
    if (!appointmentData.calendarId) {
        setError("No calendar selected in the form. Cannot create appointment.");
        toast.error("No calendar selected in the form. Cannot create appointment.");
      return;
    }
    // Use the data directly from the dialog, including the selected calendarId
    const dataToSend = { ...appointmentData }; 

    // --- Optimistic UI (Optional but recommended) ---
    const tempId = `temp-${Date.now()}`; 
    const optimisticAppointment = {
        id: tempId,
        ...dataToSend, // Use combined data
        bookedByUserId: 'optimistic-user', // Placeholder - ideally get from session
        startTime: new Date(`${appointmentData.date}T${appointmentData.startTime}:00`), 
        endTime: new Date(`${appointmentData.date}T${appointmentData.endTime}:00`), 
        status: appointmentData.status ?? AppointmentStatus.PENDING,
        color: appointmentData.color ?? 'indigo',
        description: appointmentData.description ?? '',
        source: 'Manual', // Add the missing source field
        createdAt: new Date(),
        updatedAt: new Date(), 
    } as Appointment; // Cast needed for optimistic update

    setAppointments(prev => [...prev, optimisticAppointment]);
    setCreateAppointmentOpen(false);
    // -----------------------------------------------

    try {
        const response = await fetch('/api/appointments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataToSend),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `API Error: ${response.statusText}`);
        }

        const createdAppointmentData = await response.json();
         // Convert date strings from API response back to Date objects
        const createdAppointment: Appointment = {
            ...createdAppointmentData,
            startTime: new Date(createdAppointmentData.startTime),
            endTime: new Date(createdAppointmentData.endTime),
            createdAt: new Date(createdAppointmentData.createdAt),
            updatedAt: new Date(createdAppointmentData.updatedAt),
        };

        // Replace optimistic appointment with actual data from API
        setAppointments(prev => 
          prev.map(app => app.id === tempId ? createdAppointment : app)
        );
        toast.success("Appointment created successfully!"); // Use toast for feedback

    } catch (err) {
        console.error("Failed to create appointment:", err);
        const message = err instanceof Error ? err.message : "Unknown error occurred";
        setError(`Failed to save appointment: ${message}. Please try again.`);
        toast.error(`Failed to save appointment: ${message}`); // Use toast
        // Revert optimistic update on error
        setAppointments(prev => prev.filter(app => app.id !== tempId));
        setCreateAppointmentOpen(true); // Re-open dialog on error? Or just show error?
        // Consider not re-throwing if toast/setError handles feedback
        // throw err; 
    }
  }, []); // Remove selectedCalendarId dependency, rely on appointmentData argument

  // Handle update via API
  const handleUpdateAppointment = useCallback(async (id: string, status: AppointmentStatus) => { 
    console.log("Updating appointment status via API:", id, status);
    
    const originalAppointments = [...appointments];
    const originalSelected = selectedAppointment ? {...selectedAppointment} : null;

    // --- Optimistic Update --- 
    setAppointments(prev => prev.map(app => app.id === id ? { ...app, status: status } : app));
    if (selectedAppointment?.id === id) {
      setSelectedAppointment(prev => prev ? { ...prev, status: status } : null);
    }
    // ------------------------

    try {
        const response = await fetch(`/api/appointments/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }), // Send only the status update
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `API Error: ${response.statusText}`);
        }

        const updatedAppointmentData = await response.json();
        // Convert date strings from API response back to Date objects
        const updatedAppointment: Appointment = {
            ...updatedAppointmentData,
            startTime: new Date(updatedAppointmentData.startTime),
            endTime: new Date(updatedAppointmentData.endTime),
            createdAt: new Date(updatedAppointmentData.createdAt),
            updatedAt: new Date(updatedAppointmentData.updatedAt),
        };

        // Update state with confirmed data
        setAppointments(prev => prev.map(app => app.id === id ? updatedAppointment : app));
        if (selectedAppointment?.id === id) {
            setSelectedAppointment(updatedAppointment);
        }
        toast.success("Appointment status updated!");

    } catch (err) {
        console.error("Failed to update appointment:", err);
        const message = err instanceof Error ? err.message : "Unknown error occurred";
        setError(`Failed to update appointment status: ${message}`);
        toast.error(`Failed to update status: ${message}`);
        // Revert optimistic update
        setAppointments(originalAppointments);
        if (selectedAppointment?.id === id) {
            setSelectedAppointment(originalSelected);
        }
    }
  }, [appointments, selectedAppointment]);

  // Handle delete via API
  const handleDeleteAppointment = useCallback(async (id: string) => {
    console.log("Deleting appointment via API", id);
    
    const originalAppointments = [...appointments];
    const originalSelected = selectedAppointment ? {...selectedAppointment} : null;
    const wasSelected = selectedAppointment?.id === id;

    // --- Optimistic Update --- 
    setAppointments(prev => prev.filter(app => app.id !== id));
    if (wasSelected) {
      setSelectedAppointment(null); 
    }
    // ------------------------
    
    try {
        const response = await fetch(`/api/appointments/${id}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
             // Handle 204 No Content success specifically
             if (response.status === 204) {
                 toast.success("Appointment deleted successfully!");
                 return; // Success!
             }
            const errorData = await response.json();
            throw new Error(errorData.error || `API Error: ${response.statusText}`);
        }
        
         // Handle cases where DELETE might return the deleted object (though 204 is common)
        if (response.status === 200) {
             const deletedData = await response.json(); // Process if needed
             console.log("Deleted appointment data:", deletedData);
        }

        toast.success("Appointment deleted successfully!");

    } catch (err) {
       console.error("Failed to delete appointment:", err);
       const message = err instanceof Error ? err.message : "Unknown error occurred";
       setError(`Failed to delete appointment: ${message}`);
       toast.error(`Failed to delete appointment: ${message}`);
       // Revert optimistic update
       setAppointments(originalAppointments);
       if (wasSelected) {
           setSelectedAppointment(originalSelected);
       }
    }
  }, [appointments, selectedAppointment]);

  // Handler for navigating dates via prev/next buttons
  const handleNavigateDate = useCallback((direction: 'prev' | 'next') => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      const increment = direction === 'next' ? 1 : -1;
                    if (calendarView === "day") {
      newDate.setDate(newDate.getDate() + increment);
                    } else if (calendarView === "week") {
      newDate.setDate(newDate.getDate() + (7 * increment));
    } else { // month view
      newDate.setMonth(newDate.getMonth() + increment);
    }
    return newDate;
  });
}, [calendarView]); // Depends on the current view

// Handler for clicking an appointment in Month/Week/Day view
const handleAppointmentClick = useCallback((appointment: Appointment) => {
    // Directly set the selected appointment to show details view
    setSelectedAppointment(appointment);
}, []);

// Handler for calendar selection change
const handleCalendarSelectChange = (value: string) => {
    if (value === "new") {
        setCreateCalendarOpen(true);
        // Optionally reset the select to the previous value or 'all'
        // For simplicity, we keep the current selectedCalendarId for now
    } else if (value === "all") {
        setSelectedCalendarId('all');
    } else {
        setSelectedCalendarId(value);
    }
};

// Handler to initiate opening the edit dialog
const handleStartEdit = (appointment: Appointment) => {
  setAppointmentToEdit(appointment);
  setEditAppointmentDialogOpen(true);
};

// Handler to initiate status change confirmation
const handleInitiateStatusChange = (id: string, status: AppointmentStatus) => {
   setStatusChangeTarget({ id, status });
   setStatusConfirmDialogOpen(true);
};

// Handler to submit edited appointment data via API
const handleEditAppointmentSubmit = useCallback(async (id: string, data: Partial<AppointmentInput>) => {
   // We could add optimistic updates here similar to create/delete
   // For simplicity, we'll just call the API and update state on success
  console.log("Editing appointment:", id, data);
  try {
    const response = await fetch(`/api/appointments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data), // Send partial data
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `API Error: ${response.statusText}`);
    }

    const updatedAppointmentData = await response.json();
    // Convert date strings from API response back to Date objects
    const updatedAppointment: Appointment = {
      ...updatedAppointmentData,
      startTime: new Date(updatedAppointmentData.startTime),
      endTime: new Date(updatedAppointmentData.endTime),
      createdAt: new Date(updatedAppointmentData.createdAt),
      updatedAt: new Date(updatedAppointmentData.updatedAt),
    };

    // Update state with confirmed data
    setAppointments(prev => 
      prev.map(app => app.id === id ? updatedAppointment : app)
    );
    // If the edited appointment is the currently selected one, update that too
    if (selectedAppointment?.id === id) {
      setSelectedAppointment(updatedAppointment);
    }
    setEditAppointmentDialogOpen(false); // Close dialog on success
    toast.success("Appointment updated!"); // Use toast

  } catch (err) {
      console.error("Failed to update appointment:", err);
      const message = err instanceof Error ? err.message : "Unknown error occurred";
      toast.error(`Update failed: ${message}`); // Use toast for error
      // Re-throw error so the dialog can display it if needed
      throw err;
  }
}, [appointments, selectedAppointment]);

return (
    <div className="flex h-full">
      {/* Conditional Sidebar Rendering */} 
      {(!isMobileView || (isMobileView && !showDetailsOnMobile)) && (
        <AppointmentListSidebar 
          appointments={filteredAppointments}
          filteredAppointments={filteredAppointments} // Pass filtered if needed by sidebar logic
          selectedAppointment={selectedAppointment}
          statusFilter={statusFilter}
          appointmentCounts={appointmentCounts}
          statusConfig={statusConfig as any}
          onStatusFilterChange={setStatusFilter}
          onSelectAppointment={setSelectedAppointment} // Selecting an appointment handles showing details view
          onCreateAppointment={() => setCreateAppointmentOpen(true)}
          formatDate={formatDate}
          getInitials={getInitials}
          getColorCombination={getColorCombination}
          capitalize={capitalize}
          calendars={calendars}
          selectedCalendarId={selectedCalendarId}
          onCalendarSelectChange={handleCalendarSelectChange}
          onCreateCalendar={() => setCreateCalendarOpen(true)}
          onOpenCalendarSettings={() => setSettingsDialogOpen(true)}
          isLoading={isLoading}
          className={cn(isMobileView ? "w-full h-full" : "w-80 h-full")} // Adjust width for mobile
        />
      )}

      {/* Conditional Main Content Rendering */} 
      {(!isMobileView || (isMobileView && showDetailsOnMobile)) && (
        <div className="flex-1 flex flex-col overflow-auto">
          {/* Mobile Back Button */} 
          {isMobileView && showDetailsOnMobile && selectedAppointment && (
            <div className="p-2 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-background z-10">
              <Button
                variant="ghost"
                onClick={() => setSelectedAppointment(null)} // Go back by clearing selection
                className="flex items-center text-sm text-gray-600 dark:text-gray-300"
              >
                <RiArrowLeftLine className="mr-1 h-4 w-4" />
                Back to Appointments
              </Button>
            </div>
          )}

          {/* Main Content Area */} 
          <div className={cn(
              "flex-1 overflow-y-auto", 
              {
                 "p-4 sm:p-6": !isMobileView || (isMobileView && !selectedAppointment), // Default padding
                 "p-4": isMobileView && selectedAppointment // Padding for mobile details view
              }
             )}> 
            {isLoading && (
             <div className="flex items-center justify-center h-full py-10"> {/* Added flex wrapper for centering */} 
                 <LoadingState text="Loading calendar data..." />
             </div>
             )}

            {error && !isLoading && <div className="p-6 text-center text-red-600">{error}</div>} {/* Also ensure error doesn't show while loading */} 

            {!isLoading && !error && selectedAppointment ? (
            <AppointmentDetailsView
                appointment={selectedAppointment}
                statusConfig={statusConfig as any}
                getBgColorClass={getBgColorClass}
                getTextColorClass={getTextColorClass}
                getInitials={getInitials}
                formatDate={formatDate}
                capitalize={capitalize}
                onBack={() => setSelectedAppointment(null)}
                onStartEdit={handleStartEdit}
                onInitiateStatusChange={handleInitiateStatusChange}
                onUpdateStatus={(id, statusString) => {
                    handleUpdateAppointment(id, statusString as AppointmentStatus)
                }}
                onCancel={handleDeleteAppointment}
            />
            ) : (
            <>
                {!isLoading && !error && selectedCalendarId && (
                <CalendarMainView 
                    calendarView={calendarView}
                    currentDate={currentDate}
                    setCurrentDate={setCurrentDate}
                    appointments={appointments}
                    calendarSettings={currentCalendarSettings}
                    onCalendarViewChange={setCalendarView}
                    onAppointmentClick={handleAppointmentClick}
                    generateCalendarDays={generateCalendarDays}
                    getWeekDays={getWeekDays}
                    generateHoursForDay={generateHoursForDay}
                    getAppointmentsForDay={getAppointmentsForDay}
                    getAppointmentsForDate={getAppointmentsForDate}
                    getAppointmentsForHour={getAppointmentsForHour}
                    formatHour={formatHour}
                    getBgColorClass={getBgColorClass}
                    getTextColorClass={getTextColorClass}
                />
                )}
                {/* Empty state when NO calendars exist */}
                {!isLoading && !error && calendars.length === 0 && (
                    <div className="flex h-full flex-col items-center justify-center text-center p-6">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900">
                            <Icons.calendar className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50">
                           No Calendars Found
                        </h1>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            Create your first calendar using the <Icons.calendarPlus className="inline h-4 w-4 mx-0.5"/> button above to get started.
                        </p>
                        <Button variant="primary" className="mt-6" onClick={() => setCreateCalendarOpen(true)}>
                           <Icons.add className="mr-2 h-4 w-4" />
                           Create Your First Calendar
                        </Button>
                    </div>
                )}
                </>
            )}
          </div>
        </div>
      )}
      
      <CalendarSettingsDialog 
        open={settingsDialogOpen} 
        onOpenChange={setSettingsDialogOpen}
        initialSettings={{...currentCalendarSettings, name: currentCalendar?.name}}
        onSave={handleSaveSettings}
      />

      <CreateAppointmentDialog 
        open={createAppointmentOpen} 
        onOpenChange={setCreateAppointmentOpen} 
        onSubmit={handleCreateAppointmentSubmit}
        calendars={calendars}
        initialCalendarId={selectedCalendarId === 'all' ? null : selectedCalendarId}
      />

      <Dialog open={createCalendarOpen} onOpenChange={setCreateCalendarOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Calendar</DialogTitle>
            <DialogDescription>
              Set up your calendar with basic configuration. You can customize these settings later.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Calendar Name */}
            <div className="space-y-2">
              <Label htmlFor="calendar-name" className="text-sm font-medium">
                Calendar Name *
              </Label>
              <Input
                id="calendar-name"
                value={newCalendarName}
                onChange={(e) => setNewCalendarName(e.target.value)}
                placeholder="e.g., Work Schedule, Personal Appointments"
                className="w-full"
              />
            </div>

            {/* Quick Setup Section */}
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Quick Setup</Label>
                <p className="text-xs text-gray-500 mt-1">Configure the most important settings now</p>
              </div>

              {/* Working Hours */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Start Time</Label>
                  <Select 
                    value={newCalendarSettings.workingHoursStart || '09:00'}
                    onValueChange={(value) => setNewCalendarSettings(prev => ({...prev, workingHoursStart: value}))}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="08:00">8:00 AM</SelectItem>
                      <SelectItem value="09:00">9:00 AM</SelectItem>
                      <SelectItem value="10:00">10:00 AM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">End Time</Label>
                  <Select 
                    value={newCalendarSettings.workingHoursEnd || '17:00'}
                    onValueChange={(value) => setNewCalendarSettings(prev => ({...prev, workingHoursEnd: value}))}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="16:00">4:00 PM</SelectItem>
                      <SelectItem value="17:00">5:00 PM</SelectItem>
                      <SelectItem value="18:00">6:00 PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Weekend Availability */}
              <div className="flex items-center justify-between py-2 px-3 border rounded-md">
                <Label className="text-sm text-gray-700">Include weekends</Label>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-gray-500">Sat</Label>
                  <input 
                    type="checkbox" 
                    checked={!!newCalendarSettings.includeSaturday}
                    onChange={(e) => setNewCalendarSettings(prev => ({...prev, includeSaturday: e.target.checked}))}
                    className="h-3 w-3 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                  />
                  <Label className="text-xs text-gray-500 ml-2">Sun</Label>
                  <input 
                    type="checkbox" 
                    checked={!!newCalendarSettings.includeSunday}
                    onChange={(e) => setNewCalendarSettings(prev => ({...prev, includeSunday: e.target.checked}))}
                    className="h-3 w-3 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                  />
                </div>
              </div>

              {/* Default Duration */}
              <div className="flex items-center justify-between py-2 px-3 border rounded-md">
                <Label className="text-sm text-gray-700">Default appointment duration</Label>
                <Select 
                  value={newCalendarSettings.defaultDuration?.toString() || '30'}
                  onValueChange={(value) => setNewCalendarSettings(prev => ({...prev, defaultDuration: parseInt(value)}))}
                >
                  <SelectTrigger className="w-24 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 min</SelectItem>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="60">60 min</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Phone Requirement */}
              <div className="flex items-center justify-between py-2 px-3 border rounded-md">
                <Label className="text-sm text-gray-700">Require phone number for bookings</Label>
                <input 
                  type="checkbox" 
                  checked={!!newCalendarSettings.requirePhoneNumber}
                  onChange={(e) => setNewCalendarSettings(prev => ({...prev, requirePhoneNumber: e.target.checked}))}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                />
              </div>
            </div>
            
            <div className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-900 p-3 rounded-md">
              💡 You can customize all settings including notifications, booking rules, and more after creating the calendar.
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setCreateCalendarOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateCalendar} disabled={isCreatingCalendar || !newCalendarName.trim()}>
              {isCreatingCalendar ? <Icons.spinner className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isCreatingCalendar ? "Creating..." : "Create Calendar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Appointment Dialog */} 
      {appointmentToEdit && (
          <EditAppointmentDialog
              open={editAppointmentDialogOpen}
              onOpenChange={setEditAppointmentDialogOpen}
              onSubmit={handleEditAppointmentSubmit} 
              appointment={appointmentToEdit}
              calendars={calendars}
          />
      )}

      {/* Status Change Confirmation Dialog */}
      <AlertDialog open={statusConfirmDialogOpen} onOpenChange={setStatusConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Status Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change the status to "{statusChangeTarget?.status}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setStatusChangeTarget(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (statusChangeTarget) {
                    // Call the existing update handler, it handles API + state
                    handleUpdateAppointment(statusChangeTarget.id, statusChangeTarget.status)
                       .finally(() => setStatusChangeTarget(null)); // Clear target after attempt
                }
              }}
            >
               Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
