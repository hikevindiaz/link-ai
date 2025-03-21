"use client";

import { useState } from "react";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { 
  RiFilterLine, 
  RiCalendarLine, 
  RiSettings4Line,
  RiNotification3Line,
  RiTimeLine,
  RiUserLine,
  RiCalendarCheckLine,
  RiCalendarEventLine,
  RiCalendarTodoLine,
  RiMoreFill,
  RiAddLine
} from "@remixicon/react";
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

// Mock data for appointments
const mockAppointments = [
  {
    id: "1",
    title: "Meeting with friends",
    description: "Meet-Up for Travel Destination Discussion",
    date: "2024-01-10",
    startTime: "10:00",
    endTime: "11:00",
    status: "upcoming",
    color: "purple"
  },
  {
    id: "2",
    title: "Visiting online course",
    description: "Checks updates for design course",
    date: "2024-01-10",
    startTime: "05:40",
    endTime: "13:00",
    status: "upcoming",
    color: "sky"
  },
  {
    id: "3",
    title: "Development meet",
    description: "Discussion with developer for upcoming project",
    date: "2024-01-14",
    startTime: "10:00",
    endTime: "11:00",
    status: "upcoming",
    color: "emerald"
  },
  {
    id: "4",
    title: "Doctor appointment",
    description: "Annual checkup",
    date: "2024-01-18",
    startTime: "14:00",
    endTime: "15:00",
    status: "upcoming",
    color: "amber"
  },
  {
    id: "5",
    title: "Team retrospective",
    description: "Monthly team review meeting",
    date: "2024-01-25",
    startTime: "11:00",
    endTime: "12:30",
    status: "upcoming",
    color: "indigo"
  },
  {
    id: "6",
    title: "Client presentation",
    description: "Final project presentation",
    date: "2024-01-28",
    startTime: "15:00",
    endTime: "16:30",
    status: "upcoming",
    color: "rose"
  }
];

// Status configuration
const statusConfig: {
  [key: string]: {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    variant: string;
  }
} = {
  all: {
    label: "All Appointments",
    icon: RiCalendarLine,
    color: "text-gray-500",
    variant: "default"
  },
  upcoming: {
    label: "Upcoming",
    icon: RiCalendarEventLine,
    color: "text-indigo-500",
    variant: "default"
  },
  completed: {
    label: "Completed",
    icon: RiCalendarCheckLine,
    color: "text-green-500",
    variant: "success"
  },
  cancelled: {
    label: "Cancelled",
    icon: RiCalendarTodoLine,
    color: "text-red-500",
    variant: "destructive"
  }
};

// Default calendar settings
const defaultCalendarSettings = {
  workingHours: {
    start: "09:00",
    end: "17:00"
  },
  weekends: {
    saturday: true,
    sunday: false
  },
  notifications: {
    email: true,
    push: true,
    sms: false,
    reminderTime: "30" // minutes before appointment
  }
};

// Type for appointment
interface Appointment {
  id: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  color: string;
}

// Type for calendar day
interface CalendarDay {
  date: Date;
  day: number;
  isCurrentMonth: boolean;
}

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
  const [appointments, setAppointments] = useState<Appointment[]>(mockAppointments);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [calendarView, setCalendarView] = useState<string>("day");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [settingsDialogOpen, setSettingsDialogOpen] = useState<boolean>(false);
  const [calendarSettings, setCalendarSettings] = useState(defaultCalendarSettings);
  const [settingsTab, setSettingsTab] = useState<string>("general");
  const [appointmentDialogOpen, setAppointmentDialogOpen] = useState<boolean>(false);
  const [selectedDayAppointment, setSelectedDayAppointment] = useState<Appointment | null>(null);
  const [createAppointmentOpen, setCreateAppointmentOpen] = useState<boolean>(false);
  const [newAppointment, setNewAppointment] = useState<Partial<Appointment>>({
    title: "",
    description: "",
    date: new Date().toISOString().split('T')[0],
    startTime: "09:00",
    endTime: "10:00",
    status: "upcoming",
    color: "indigo"
  });

  // Filter appointments based on status filter
  const filteredAppointments = statusFilter === "all" 
    ? appointments 
    : appointments.filter(appointment => appointment.status === statusFilter);

  // Count appointments by status
  const appointmentCounts = {
    all: appointments.length,
    upcoming: appointments.filter(appointment => appointment.status === "upcoming").length,
    completed: appointments.filter(appointment => appointment.status === "completed").length,
    cancelled: appointments.filter(appointment => appointment.status === "cancelled").length,
  };

  // Function to capitalize first letter
  const capitalize = (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Handle save settings
  const handleSaveSettings = () => {
    // Here you would typically save the settings to your backend
    console.log('Saving calendar settings:', calendarSettings);
    setSettingsDialogOpen(false);
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
  const getInitials = (title: string) => {
    return title
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Generate hours for day view
  const generateHoursForDay = () => {
    const hours = [];
    const workStart = parseInt(calendarSettings.workingHours.start.split(':')[0]);
    const workEnd = parseInt(calendarSettings.workingHours.end.split(':')[0]);
    
    // Start from 6 AM or 2 hours before work start, whichever is earlier
    const startHour = Math.min(6, workStart - 2);
    // End at 8 PM or 2 hours after work end, whichever is later
    const endHour = Math.max(20, workEnd + 2);
    
    for (let hour = startHour; hour <= endHour; hour++) {
      hours.push(hour);
    }
    
    return hours;
  };

  // Get appointments for the current day
  const getAppointmentsForDay = (date: Date) => {
    return appointments.filter(appointment => {
      const appointmentDate = new Date(appointment.date);
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
    const [hours, minutes] = appointment.startTime.split(':').map(Number);
    const [endHours, endMinutes] = appointment.endTime.split(':').map(Number);
    
    // Calculate start position as percentage of day
    const startPercentage = (hours + minutes / 60) / 24 * 100;
    
    // Calculate duration in hours
    const durationHours = (endHours + endMinutes / 60) - (hours + minutes / 60);
    
    // Calculate height as percentage of day
    const heightPercentage = durationHours / 24 * 100;
    
    return {
      top: `${startPercentage}%`,
      height: `${heightPercentage}%`
    };
  };

  // Check if appointment is within visible hours
  const isAppointmentVisible = (appointment: Appointment) => {
    const [hours] = appointment.startTime.split(':').map(Number);
    const [endHours] = appointment.endTime.split(':').map(Number);
    const visibleHours = generateHoursForDay();
    
    return hours >= visibleHours[0] && endHours <= visibleHours[visibleHours.length - 1];
  };

  // Get appointment for a specific hour
  const getAppointmentsForHour = (hour: number, dayAppointments: Appointment[]) => {
    return dayAppointments.filter(appointment => {
      const [startHour] = appointment.startTime.split(':').map(Number);
      const [endHour] = appointment.endTime.split(':').map(Number);
      
      // Check if appointment starts or is ongoing during this hour
      return (startHour <= hour && endHour > hour) || startHour === hour;
    });
  };

  // Get the days of the current week
  const getWeekDays = () => {
    const days = [];
    const currentDay = new Date(currentDate);
    
    // Set to the beginning of the week (Sunday)
    const firstDayOfWeek = currentDay.getDate() - currentDay.getDay();
    currentDay.setDate(firstDayOfWeek);
    
    // Get all 7 days of the week
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

  // Get appointments for a specific day
  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter(appointment => {
      const appointmentDate = new Date(appointment.date);
      return (
        appointmentDate.getDate() === date.getDate() &&
        appointmentDate.getMonth() === date.getMonth() &&
        appointmentDate.getFullYear() === date.getFullYear()
      );
    });
  };

  // Handle creating a new appointment
  const handleCreateAppointment = () => {
    if (!newAppointment.title || !newAppointment.date || !newAppointment.startTime || !newAppointment.endTime) {
      // Show error or validation message
      return;
    }

    const newId = (appointments.length + 1).toString();
    const createdAppointment: Appointment = {
      id: newId,
      title: newAppointment.title || "",
      description: newAppointment.description || "",
      date: newAppointment.date || "",
      startTime: newAppointment.startTime || "",
      endTime: newAppointment.endTime || "",
      status: newAppointment.status || "upcoming",
      color: newAppointment.color || "indigo"
    };

    setAppointments([...appointments, createdAppointment]);
    setCreateAppointmentOpen(false);
    
    // Reset form
    setNewAppointment({
      title: "",
      description: "",
      date: new Date().toISOString().split('T')[0],
      startTime: "09:00",
      endTime: "10:00",
      status: "upcoming",
      color: "indigo"
    });
  };

  return (
    <div className="flex h-full">
      {/* Left Sidebar - Appointment List */}
      <div className="w-80 border-r border-gray-200 dark:border-gray-800 flex flex-col">
        <div className="p-4 pb-0">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
              Appointments
            </h2>
            
            {/* Add Appointment Button */}
            <Button
              variant="secondary"
              className="h-8 w-8 p-0"
              onClick={() => setCreateAppointmentOpen(true)}
            >
              <RiAddLine className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Status Filter Select */}
          <div className="mt-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="flex items-center">
                  <div className="flex items-center gap-2">
                    <RiFilterLine className="size-4 text-gray-500" />
                    <span>All Appointments</span>
                    <Badge 
                      variant="secondary"
                      className="ml-auto text-xs"
                    >
                      {appointmentCounts.all}
                    </Badge>
                  </div>
                </SelectItem>
                {Object.entries(statusConfig).filter(([key]) => key !== 'all').map(([status, config]) => {
                  const StatusIcon = config.icon;
                  return (
                    <SelectItem key={status} value={status} className="flex items-center">
                      <div className="flex items-center gap-2">
                        <StatusIcon className={config.color} />
                        <span>{capitalize(config.label)}</span>
                        <Badge 
                          variant={config.variant as any}
                          className="ml-auto text-xs"
                        >
                          {appointmentCounts[status as keyof typeof appointmentCounts] || 0}
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
                      {getInitials(appointment.title)}
                    </span>
                    <div className="truncate min-w-0">
                      <p className={cn(
                        "truncate text-sm font-medium text-gray-900 dark:text-gray-50",
                        selectedAppointment?.id === appointment.id && "text-indigo-600 dark:text-indigo-400"
                      )}>
                      <button
                          onClick={() => setSelectedAppointment(appointment)}
                          className="focus:outline-none hover:no-underline no-underline"
                        type="button"
                        >
                          <span className="absolute inset-0" aria-hidden="true" />
                          {appointment.title}
                      </button>
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p className="text-xs text-gray-500 dark:text-gray-500 pointer-events-none no-underline">
                          {formatDate(appointment.date)} • {appointment.startTime}-{appointment.endTime}
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
                          onClick={(e) => e.stopPropagation()}
                        >
                          <RiMoreFill className="h-3.5 w-3.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="min-w-56">
                        <DropdownMenuLabel>Appointment Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuGroup>
                          <DropdownMenuItem onClick={() => setSelectedAppointment(appointment)}>
                            <span className="flex items-center gap-x-2">
                              <RiCalendarLine className="size-4 text-inherit" />
                              <span>View Details</span>
                            </span>
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content - Calendar */}
      <div className="flex-1 overflow-auto p-6">
        {selectedAppointment ? (
          // Appointment Details View
          <div>
            <header className="border-b border-gray-200 dark:border-gray-800 pb-4 mb-6">
              <div className="sm:flex sm:items-center sm:justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                  Appointment Details
                </h3>
                <div className="mt-3 flex sm:mt-0">
                  <Button
                    variant="outline"
                    className="mr-2"
                    onClick={() => setSelectedAppointment(null)}
                  >
                    Back to Calendar
                  </Button>
                  <Button>
                    Edit Appointment
                  </Button>
                </div>
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Main Details */}
              <Card className="md:col-span-2">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-full",
                      getColorCombination(parseInt(selectedAppointment.id)).bg,
                      getColorCombination(parseInt(selectedAppointment.id)).text
                    )}>
                      {getInitials(selectedAppointment.title)}
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50">
                        {selectedAppointment.title}
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(selectedAppointment.date)} • {selectedAppointment.startTime} - {selectedAppointment.endTime}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Description</h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {selectedAppointment.description}
                    </p>
                  </div>

                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Status</h3>
                    <Badge 
                      variant={statusConfig[selectedAppointment.status]?.variant as any || "default"}
                      className="text-xs"
                    >
                      {capitalize(selectedAppointment.status)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Side Details */}
              <div className="space-y-6">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">Date & Time</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Date</span>
                        <span className="text-sm text-gray-900 dark:text-gray-100">{formatDate(selectedAppointment.date)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Start Time</span>
                        <span className="text-sm text-gray-900 dark:text-gray-100">{selectedAppointment.startTime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500 dark:text-gray-400">End Time</span>
                        <span className="text-sm text-gray-900 dark:text-gray-100">{selectedAppointment.endTime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Duration</span>
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {(() => {
                            const [startHour, startMinute] = selectedAppointment.startTime.split(':').map(Number);
                            const [endHour, endMinute] = selectedAppointment.endTime.split(':').map(Number);
                            
                            const startMinutes = startHour * 60 + startMinute;
                            const endMinutes = endHour * 60 + endMinute;
                            const durationMinutes = endMinutes - startMinutes;
                            
                            const hours = Math.floor(durationMinutes / 60);
                            const minutes = durationMinutes % 60;
                            
                            return `${hours > 0 ? `${hours} hour${hours > 1 ? 's' : ''}` : ''}${hours > 0 && minutes > 0 ? ' ' : ''}${minutes > 0 ? `${minutes} minute${minutes > 1 ? 's' : ''}` : ''}`;
                          })()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">Actions</h3>
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full justify-start">
                        <RiCalendarLine className="mr-2 h-4 w-4" />
                        Reschedule
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <RiCalendarCheckLine className="mr-2 h-4 w-4" />
                        Mark as Completed
                      </Button>
                      <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50">
                        <RiCalendarTodoLine className="mr-2 h-4 w-4" />
                        Cancel Appointment
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        ) : (
          // Calendar View
          <>
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-5">
              <div className="flex items-center gap-4">
                <h2 className="text-xl leading-8 font-semibold text-gray-900 dark:text-gray-50">
                  {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h2>
                <div className="flex items-center">
                  <Button 
                    variant="ghost"
                    className="text-indigo-600 hover:text-white hover:bg-indigo-600 h-8 w-8 p-0"
                    onClick={() => {
                      const newDate = new Date(currentDate);
                      if (calendarView === "day") {
                        newDate.setDate(newDate.getDate() - 1);
                      } else if (calendarView === "week") {
                        newDate.setDate(newDate.getDate() - 7);
                      } else {
                        newDate.setMonth(newDate.getMonth() - 1);
                      }
                      setCurrentDate(newDate);
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                    >
                      <path
                        d="M10.0002 11.9999L6 7.99971L10.0025 3.99719"
                        stroke="currentColor"
                        strokeWidth="1.3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Button>
                  <Button 
                    variant="ghost"
                    className="text-indigo-600 hover:text-white hover:bg-indigo-600 h-8 w-8 p-0"
                    onClick={() => {
                      const newDate = new Date(currentDate);
                      if (calendarView === "day") {
                        newDate.setDate(newDate.getDate() + 1);
                      } else if (calendarView === "week") {
                        newDate.setDate(newDate.getDate() + 7);
                      } else {
                        newDate.setMonth(newDate.getMonth() + 1);
                      }
                      setCurrentDate(newDate);
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                    >
                      <path
                        d="M6.00236 3.99707L10.0025 7.99723L6 11.9998"
                        stroke="currentColor"
                        strokeWidth="1.3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Button>
                </div>
              </div>
              <div className="flex items-center rounded-md p-1 bg-indigo-50 gap-px">
                <Button 
                  className={cn(
                    "py-2.5 px-5 rounded-lg text-sm font-medium transition-all duration-300",
                    calendarView === "day" 
                      ? "bg-indigo-600 text-white" 
                      : "bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white"
                  )}
                  onClick={() => setCalendarView("day")}
                >
                  Day
                </Button>
                <Button 
                  className={cn(
                    "py-2.5 px-5 rounded-lg text-sm font-medium transition-all duration-300",
                    calendarView === "week" 
                      ? "bg-indigo-600 text-white" 
                      : "bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white"
                  )}
                  onClick={() => setCalendarView("week")}
                >
                  Week
                </Button>
                <Button 
                  className={cn(
                    "py-2.5 px-5 rounded-lg text-sm font-medium transition-all duration-300",
                    calendarView === "month" 
                      ? "bg-indigo-600 text-white" 
                      : "bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white"
                  )}
                  onClick={() => setCalendarView("month")}
                >
                  Month
                </Button>
              </div>
            </div>

            {/* Calendar View */}
            <Card className="border-indigo-200">
              {/* Calendar Header - Days of Week */}
              {calendarView !== "day" && (
                <div className="grid grid-cols-7 rounded-t-xl border-b border-indigo-200">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => (
                    <div
                      key={day}
                      className={cn(
                        "py-3.5 flex items-center justify-center text-sm font-medium text-indigo-600 bg-indigo-50",
                        index === 6 ? "rounded-tr-xl" : "border-r border-indigo-200"
                      )}
                    >
                      {day}
                    </div>
                  ))}
                </div>
              )}
              
              {/* Day View Header */}
              {calendarView === "day" && (
                <div className="rounded-t-xl border-b border-indigo-200 bg-indigo-50 py-3.5 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <RiCalendarLine className="h-4 w-4 text-indigo-600" />
                      <h3 className="text-sm font-medium text-indigo-600">
                        {currentDate.toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          month: 'long', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </h3>
                    </div>
                    <div className="text-xs text-indigo-600 font-medium">
                      {calendarSettings.workingHours.start} - {calendarSettings.workingHours.end}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Calendar Grid - Month View */}
              {calendarView === "month" && (
                <div className="grid grid-cols-7 rounded-b-xl">
                  {generateCalendarDays().map((day, index) => {
                    // Find appointments for this day
                    const dayAppointments = appointments.filter(appointment => {
                      const appointmentDate = new Date(appointment.date);
                      return (
                        appointmentDate.getDate() === day.date.getDate() &&
                        appointmentDate.getMonth() === day.date.getMonth() &&
                        appointmentDate.getFullYear() === day.date.getFullYear()
                      );
                    });
                    
                    const isLastRow = Math.floor(index / 7) === Math.floor((generateCalendarDays().length - 1) / 7);
                    const isLastCol = index % 7 === 6;
                    
                    return (
                      <div
                        key={index}
                        className={cn(
                          "flex flex-col min-h-[100px] p-2 transition-all duration-300 hover:bg-indigo-50 cursor-pointer border-b border-r border-indigo-200",
                          !day.isCurrentMonth && "bg-gray-50 text-gray-400",
                          day.isCurrentMonth && "bg-white text-gray-900",
                          isLastRow && "border-b-0",
                          isLastCol && "border-r-0",
                          isLastRow && isLastCol && "rounded-br-xl"
                        )}
                      >
                        <span className="text-xs font-semibold mb-1">{day.day}</span>
                        
                        {/* Appointment indicators */}
                        <div className="flex flex-col gap-1 mt-1">
                          {dayAppointments.slice(0, 3).map((appointment) => (
                            <div 
                              key={appointment.id}
                              className={cn(
                                "text-xs p-1 rounded truncate",
                                getBgColorClass(appointment.color),
                                getTextColorClass(appointment.color)
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDayAppointment(appointment);
                                setAppointmentDialogOpen(true);
                              }}
                            >
                              {appointment.startTime} {appointment.title}
                            </div>
                          ))}
                          {dayAppointments.length > 3 && (
                            <div className="text-xs text-gray-500 pl-1">
                              +{dayAppointments.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* Week View */}
              {calendarView === "week" && (
                <div className="rounded-b-xl">
                  {/* Week Header */}
                  <div className="grid grid-cols-7 border-b border-indigo-200">
                    {getWeekDays().map((day, index) => (
                      <div 
                        key={index}
                        className={cn(
                          "py-3 flex flex-col items-center justify-center border-r border-indigo-200",
                          day.isToday && "bg-indigo-50",
                          index === 6 && "border-r-0"
                        )}
                      >
                        <div className="text-xs font-medium text-gray-500">{day.dayName}</div>
                        <div className={cn(
                          "mt-1 flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium",
                          day.isToday ? "bg-indigo-600 text-white" : "text-gray-900"
                        )}>
                          {day.dayOfMonth}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Week Content */}
                  <div className="divide-y divide-gray-200 dark:divide-gray-800">
                    {generateHoursForDay().map((hour) => (
                      <div key={hour} className="grid grid-cols-7">
                        {getWeekDays().map((day, dayIndex) => {
                          const dayAppointments = getAppointmentsForDate(day.date);
                          const hourAppointments = getAppointmentsForHour(hour, dayAppointments);
                          const isWorkingHour = hour >= parseInt(calendarSettings.workingHours.start.split(':')[0]) && 
                                               hour < parseInt(calendarSettings.workingHours.end.split(':')[0]);
                          
                          return (
                            <div 
                              key={dayIndex}
                              className={cn(
                                "min-h-[60px] p-1 border-r border-gray-200",
                                isWorkingHour ? "bg-white" : "bg-gray-50",
                                day.isToday && "bg-indigo-50/30",
                                dayIndex === 6 && "border-r-0"
                              )}
                            >
                              {dayIndex === 0 && (
                                <div className="text-xs font-medium text-gray-500 mb-1 -ml-16 w-14 text-right">
                                  {formatHour(hour)}
                                </div>
                              )}
                              
                              {hourAppointments.length > 0 ? (
                                <div className="flex flex-col gap-1 mt-1">
                                  {hourAppointments.map((appointment) => (
                                    <div
                                      key={appointment.id}
                                      className={cn(
                                        "p-1 rounded text-xs cursor-pointer truncate",
                                        getBgColorClass(appointment.color),
                                        getTextColorClass(appointment.color)
                                      )}
                                      onClick={() => {
                                        setSelectedDayAppointment(appointment);
                                        setAppointmentDialogOpen(true);
                                      }}
                                    >
                                      {appointment.startTime} {appointment.title}
                                    </div>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Day View */}
              {calendarView === "day" && (
                <div className="rounded-b-xl">
                  <div className="divide-y divide-gray-200 dark:divide-gray-800">
                    {generateHoursForDay().map((hour) => {
                      const hourAppointments = getAppointmentsForHour(hour, getAppointmentsForDay(currentDate));
                      const isWorkingHour = hour >= parseInt(calendarSettings.workingHours.start.split(':')[0]) && 
                                           hour < parseInt(calendarSettings.workingHours.end.split(':')[0]);
                      
                      return (
                        <div 
                          key={hour} 
                          className={cn(
                            "flex items-start p-2 min-h-[80px]",
                            isWorkingHour ? "bg-white" : "bg-gray-50"
                          )}
                        >
                          <div className="w-16 flex-shrink-0 text-xs font-medium text-gray-500 pt-1">
                            {formatHour(hour)}
                          </div>
                          <div className="flex-1 relative min-h-[60px]">
                            {hourAppointments.length > 0 ? (
                              <div className="flex flex-col gap-1">
                                {hourAppointments.map((appointment, index) => (
                                  <div
                                    key={appointment.id}
                                    className={cn(
                                      "p-2 rounded text-xs cursor-pointer",
                                      getBgColorClass(appointment.color),
                                      getTextColorClass(appointment.color)
                                    )}
                                    onClick={() => {
                                      setSelectedDayAppointment(appointment);
                                      setAppointmentDialogOpen(true);
                                    }}
                                  >
                                    <div className="font-medium">{appointment.title}</div>
                                    <div>{appointment.startTime} - {appointment.endTime}</div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="w-full h-full border border-dashed border-gray-200 rounded-md"></div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card>
          </>
        )}
      </div>

      {/* Settings Dialog */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Calendar Settings</DialogTitle>
            <DialogDescription>
              Configure your calendar preferences and notification settings.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={settingsTab} onValueChange={setSettingsTab} className="mt-4">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="general" className="flex items-center gap-2">
                <RiCalendarLine className="h-4 w-4" />
                <span>General</span>
              </TabsTrigger>
              <TabsTrigger value="availability" className="flex items-center gap-2">
                <RiTimeLine className="h-4 w-4" />
                <span>Availability</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <RiNotification3Line className="h-4 w-4" />
                <span>Notifications</span>
              </TabsTrigger>
            </TabsList>
            
            {/* General Settings */}
            <TabsContent value="general" className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Calendar Display</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-gray-500">Default View</label>
                    <Select 
                      value={calendarView} 
                      onValueChange={(value) => setCalendarView(value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select view" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="day">Day</SelectItem>
                        <SelectItem value="week">Week</SelectItem>
                        <SelectItem value="month">Month</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-500">Week Starts On</label>
                    <Select defaultValue="sunday">
                      <SelectTrigger>
                        <SelectValue placeholder="Select day" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sunday">Sunday</SelectItem>
                        <SelectItem value="monday">Monday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            {/* Availability Settings */}
            <TabsContent value="availability" className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Working Hours</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-gray-500">Start Time</label>
                    <Select 
                      value={calendarSettings.workingHours.start}
                      onValueChange={(value) => {
                        setCalendarSettings({
                          ...calendarSettings,
                          workingHours: {
                            ...calendarSettings.workingHours,
                            start: value
                          }
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }).map((_, i) => (
                          <SelectItem key={i} value={`${i.toString().padStart(2, '0')}:00`}>
                            {i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-500">End Time</label>
                    <Select 
                      value={calendarSettings.workingHours.end}
                      onValueChange={(value) => {
                        setCalendarSettings({
                          ...calendarSettings,
                          workingHours: {
                            ...calendarSettings.workingHours,
                            end: value
                          }
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }).map((_, i) => (
                          <SelectItem key={i} value={`${i.toString().padStart(2, '0')}:00`}>
                            {i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-2">Weekend Settings</h3>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-700">Include Saturdays</label>
                    <input 
                      type="checkbox" 
                      checked={calendarSettings.weekends.saturday}
                      onChange={(e) => {
                        setCalendarSettings({
                          ...calendarSettings,
                          weekends: {
                            ...calendarSettings.weekends,
                            saturday: e.target.checked
                          }
                        });
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-700">Include Sundays</label>
                    <input 
                      type="checkbox" 
                      checked={calendarSettings.weekends.sunday}
                      onChange={(e) => {
                        setCalendarSettings({
                          ...calendarSettings,
                          weekends: {
                            ...calendarSettings.weekends,
                            sunday: e.target.checked
                          }
                        });
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
            
            {/* Notification Settings */}
            <TabsContent value="notifications" className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Notification Preferences</h3>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-700">Email Notifications</label>
                    <input 
                      type="checkbox" 
                      checked={calendarSettings.notifications.email}
                      onChange={(e) => {
                        setCalendarSettings({
                          ...calendarSettings,
                          notifications: {
                            ...calendarSettings.notifications,
                            email: e.target.checked
                          }
                        });
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-700">Push Notifications</label>
                    <input 
                      type="checkbox" 
                      checked={calendarSettings.notifications.push}
                      onChange={(e) => {
                        setCalendarSettings({
                          ...calendarSettings,
                          notifications: {
                            ...calendarSettings.notifications,
                            push: e.target.checked
                          }
                        });
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-700">SMS Notifications</label>
                    <input 
                      type="checkbox" 
                      checked={calendarSettings.notifications.sms}
                      onChange={(e) => {
                        setCalendarSettings({
                          ...calendarSettings,
                          notifications: {
                            ...calendarSettings.notifications,
                            sms: e.target.checked
                          }
                        });
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Reminder Time</label>
                <Select 
                  value={calendarSettings.notifications.reminderTime}
                  onValueChange={(value) => {
                    setCalendarSettings({
                      ...calendarSettings,
                      notifications: {
                        ...calendarSettings.notifications,
                        reminderTime: value
                      }
                    });
                  }}
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
          
          <DialogFooter className="mt-6 sticky bottom-0 bg-white dark:bg-gray-950 pt-4 pb-2">
            <Button 
              variant="secondary" 
              className="mr-2"
              onClick={() => setSettingsDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveSettings}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Appointment Details Dialog */}
      <Dialog open={appointmentDialogOpen} onOpenChange={setAppointmentDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          {selectedDayAppointment && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedDayAppointment.title}</DialogTitle>
                <DialogDescription>
                  {formatDate(selectedDayAppointment.date)} • {selectedDayAppointment.startTime} - {selectedDayAppointment.endTime}
                </DialogDescription>
              </DialogHeader>
              
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-4">
                  <span className={cn(
                    "w-3 h-3 rounded-full",
                    getColorClass(selectedDayAppointment.color)
                  )} />
                  <span className="text-sm font-medium">
                    {capitalize(selectedDayAppointment.status)}
                  </span>
                </div>
                
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  {selectedDayAppointment.description}
                </div>
              </div>
              
              <DialogFooter className="mt-6">
                <Button 
                  variant="secondary" 
                  className="mr-2"
                  onClick={() => setAppointmentDialogOpen(false)}
                >
                  Close
                </Button>
                <Button onClick={() => {
                  setSelectedAppointment(selectedDayAppointment);
                  setAppointmentDialogOpen(false);
                }}>
                  View Details
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Appointment Dialog */}
      <Dialog open={createAppointmentOpen} onOpenChange={setCreateAppointmentOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Appointment</DialogTitle>
            <DialogDescription>
              Add a new appointment to your calendar.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="title" className="text-sm font-medium">
                Title
              </label>
              <input
                id="title"
                type="text"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={newAppointment.title}
                onChange={(e) => setNewAppointment({ ...newAppointment, title: e.target.value })}
                placeholder="Meeting title"
              />
            </div>
            
            <div className="grid gap-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <textarea
                id="description"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={newAppointment.description}
                onChange={(e) => setNewAppointment({ ...newAppointment, description: e.target.value })}
                placeholder="Meeting description"
              />
            </div>
            
            <div className="grid gap-2">
              <label htmlFor="date" className="text-sm font-medium">
                Date
              </label>
              <input
                id="date"
                type="date"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={newAppointment.date}
                onChange={(e) => setNewAppointment({ ...newAppointment, date: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label htmlFor="startTime" className="text-sm font-medium">
                  Start Time
                </label>
                <input
                  id="startTime"
                  type="time"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={newAppointment.startTime}
                  onChange={(e) => setNewAppointment({ ...newAppointment, startTime: e.target.value })}
                />
              </div>
              
              <div className="grid gap-2">
                <label htmlFor="endTime" className="text-sm font-medium">
                  End Time
                </label>
                <input
                  id="endTime"
                  type="time"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={newAppointment.endTime}
                  onChange={(e) => setNewAppointment({ ...newAppointment, endTime: e.target.value })}
                />
              </div>
            </div>
            
            <div className="grid gap-2">
              <label htmlFor="color" className="text-sm font-medium">
                Color
              </label>
              <Select 
                value={newAppointment.color} 
                onValueChange={(value) => setNewAppointment({ ...newAppointment, color: value })}
              >
                <SelectTrigger id="color">
                  <SelectValue placeholder="Select a color" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="purple">Purple</SelectItem>
                  <SelectItem value="sky">Sky</SelectItem>
                  <SelectItem value="emerald">Emerald</SelectItem>
                  <SelectItem value="amber">Amber</SelectItem>
                  <SelectItem value="indigo">Indigo</SelectItem>
                  <SelectItem value="rose">Rose</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="secondary" 
              onClick={() => setCreateAppointmentOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateAppointment}>
              Create Appointment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
