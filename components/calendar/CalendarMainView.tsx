"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Icons } from "@/components/icons";
import type { Appointment } from "@/lib/api/appointments";
import type { CalendarSettingsInput } from "@/lib/api/appointments";

// Define types used within this component
interface CalendarDay {
  date: Date;
  day: number;
  isCurrentMonth: boolean;
}
interface WeekDayInfo {
  date: Date;
  dayOfMonth: number;
  dayName: string;
  isToday: boolean;
}

// Props definition
interface CalendarMainViewProps {
  calendarView: string; // 'day', 'week', 'month'
  currentDate: Date;
  setCurrentDate: (dateUpdater: (prevDate: Date) => Date) => void;
  appointments: Appointment[];
  calendarSettings: CalendarSettingsInput;
  onCalendarViewChange: (view: string) => void;
  onAppointmentClick: (appointment: Appointment) => void; 

  // Helper functions passed from parent
  generateCalendarDays: () => CalendarDay[];
  getWeekDays: () => WeekDayInfo[];
  generateHoursForDay: () => number[];
  getAppointmentsForDay: (date: Date) => Appointment[]; // Specific function for day view
  getAppointmentsForDate: (date: Date) => Appointment[]; // Generic function for date
  getAppointmentsForHour: (hour: number, dayAppointments: Appointment[]) => Appointment[];
  formatHour: (hour: number) => string;
  getBgColorClass: (color: string) => string;
  getTextColorClass: (color: string) => string;
}

// Internal navigation handler
const handleNavigateDateInternal = (direction: 'prev' | 'next', view: string, currentDate: Date, setCurrentDate: (dateUpdater: (prevDate: Date) => Date) => void) => {
  setCurrentDate(prevDate => {
    const newDate = new Date(prevDate);
    const increment = direction === 'next' ? 1 : -1;
    if (view === "day") {
      newDate.setDate(newDate.getDate() + increment);
    } else if (view === "week") {
      newDate.setDate(newDate.getDate() + (7 * increment));
    } else { // month view
      newDate.setMonth(newDate.getMonth() + increment);
    }
    return newDate;
  });
};

export function CalendarMainView({
  calendarView,
  currentDate,
  setCurrentDate,
  appointments,
  calendarSettings,
  onCalendarViewChange,
  onAppointmentClick,
  generateCalendarDays,
  getWeekDays,
  generateHoursForDay,
  getAppointmentsForDay, 
  getAppointmentsForDate,
  getAppointmentsForHour,
  formatHour,
  getBgColorClass,
  getTextColorClass,
}: CalendarMainViewProps) {

  // Helper to format time string (e.g., "09:00") into AM/PM
  const formatTimeString = (timeString: string | null | undefined) => {
      if (!timeString) return '--:--';
      try {
          const [hour, minute] = timeString.split(':').map(Number);
          if (isNaN(hour) || isNaN(minute)) return '--:--';
          const date = new Date();
          date.setHours(hour, minute);
          return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      } catch (e) {
          return '--:--'; // Return placeholder on error
      }
  };

  return (
    <>
      {/* Top Header: Date Navigation & View Switcher */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-6">
        {/* Date Navigation */}
        <div className="flex items-center gap-2">
          <Button 
            variant="secondary" 
            size="icon" 
            aria-label="Previous period"
            onClick={() => handleNavigateDateInternal('prev', calendarView, currentDate, setCurrentDate)}
          >
            <Icons.chevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg md:text-xl font-semibold text-neutral-900 dark:text-neutral-50 text-center w-40">
            {
              calendarView === 'day' ? currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) :
              calendarView === 'week' ? `Week of ${currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : // Simple week display
              currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) // Default to month view
            }
          </h2>
          <Button 
            variant="secondary" 
            size="icon" 
            aria-label="Next period"
            onClick={() => handleNavigateDateInternal('next', calendarView, currentDate, setCurrentDate)}
          >
            <Icons.chevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* View Switcher */}
        <div className="flex items-center rounded-xl p-1 bg-neutral-100 dark:bg-neutral-800 gap-1">
          {(['day', 'week', 'month'] as const).map((view) => (
             <Button 
              key={view}
              variant={calendarView === view ? "secondary" : "ghost"}
              size="sm"
              className={cn(
                "px-3 py-1.5 text-xs font-medium capitalize transition-colors duration-200",
                calendarView === view 
                  ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-50 shadow-sm"
                  : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700/50 hover:text-neutral-900 dark:hover:text-neutral-50"
              )}
              onClick={() => onCalendarViewChange(view)}
            >
              {view}
            </Button>
          ))}
        </div>
      </div>

      {/* Calendar Grid Area */}
      <Card className="px-0 py-0 border dark:border-neutral-800 shadow-sm">
        {/* Calendar Header - Days of Week (for Month/Week) */}
        {calendarView !== "day" && (
          <div className="grid grid-cols-7 border-b dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => (
              <div
                key={day}
                className={cn(
                  "py-2.5 text-center text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider",
                )}
              >
                {day}
              </div>
            ))}
          </div>
        )}
        
        {/* Day View Specific Header - Use flat properties */}
        {calendarView === "day" && (
          <div className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 py-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icons.calendar className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  {currentDate.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </h3>
              </div>
              <div className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">
                {/* Use flat start/end times and format them */} 
                {formatTimeString(calendarSettings.workingHoursStart)} - {formatTimeString(calendarSettings.workingHoursEnd)}
              </div>
            </div>
          </div>
        )}
        
        {/* Calendar Grid - Month View */}
        {calendarView === "month" && (
          <div className="grid grid-cols-7">
            {generateCalendarDays().map((day, index) => {
              const dayAppointments = getAppointmentsForDate(day.date);
              const isToday = day.date.toDateString() === new Date().toDateString();
              
              return (
                <div
                  key={index}
                  className={cn(
                    "relative flex flex-col min-h-[110px] p-2 border-b border-r border-neutral-200 dark:border-neutral-800 transition-colors duration-150",
                    day.isCurrentMonth ? "bg-white dark:bg-neutral-950" : "bg-neutral-50 dark:bg-neutral-900/30", // Dim non-month days
                    day.isCurrentMonth && "hover:bg-neutral-50 dark:hover:bg-neutral-900/70",
                  )}
                >
                  <span className={cn("text-xs font-medium",
                      isToday && "flex items-center justify-center size-5 rounded-full bg-neutral-600 text-white",
                      !isToday && day.isCurrentMonth && "text-neutral-900 dark:text-neutral-100",
                      !isToday && !day.isCurrentMonth && "text-neutral-400 dark:text-neutral-500",
                  )}>
                    {day.day}
                  </span>
                  
                  <div className="flex flex-col gap-1 mt-1">
                    {dayAppointments.slice(0, 3).map((appointment) => (
                      <button // Change div to button for accessibility
                        key={appointment.id}
                        className={cn(
                          "text-[11px] p-1 rounded truncate text-left w-full transition-opacity hover:opacity-80", // Smaller text, hover effect
                          getBgColorClass(appointment.color),
                          getTextColorClass(appointment.color)
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAppointmentClick(appointment);
                        }}
                        type="button" // Explicitly set type
                      >
                        {/* Display time and client name */}
                        {appointment.startTime.toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})} {appointment.clientName}
                      </button>
                    ))}
                    {dayAppointments.length > 3 && (
                      <div className="text-[11px] text-neutral-500 dark:text-neutral-400 pl-1 mt-1">
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
           <div className="grid grid-cols-7">
               {/* Assuming getWeekDays returns 7 days */}
               {getWeekDays().map((dayInfo) => {
                   const dayAppointments = getAppointmentsForDate(dayInfo.date);
                   return (
                     <div 
                       key={dayInfo.date.toISOString()} 
                       className="relative flex flex-col border-r dark:border-neutral-800 min-h-[400px]"
                     >
                        {/* Placeholder for week view content */}
                       <div className="p-2 border-b dark:border-neutral-800">
                           <span className={cn("text-xs", dayInfo.isToday ? "font-bold text-neutral-600" : "text-neutral-600 dark:text-neutral-400")}>
                               {dayInfo.dayName} {dayInfo.dayOfMonth}
                           </span>
                       </div>
                       <div className="flex-1 p-1 space-y-1 overflow-y-auto">
                         {dayAppointments.map(appointment => (
                            <button
                             key={appointment.id}
                             className={cn(
                                 "text-[11px] p-1 rounded truncate text-left w-full transition-opacity hover:opacity-80",
                                 getBgColorClass(appointment.color),
                                 getTextColorClass(appointment.color)
                             )}
                             onClick={(e) => { e.stopPropagation(); onAppointmentClick(appointment); }}
                             type="button"
                            >
                               {appointment.startTime.toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})} {appointment.clientName}
                            </button>
                         ))}
                       </div>
                     </div>
                   );
               })}
            </div>
        )}

        {/* Day View */}
        {calendarView === "day" && (
          <div className="relative overflow-hidden">
              {/* Hour markers and grid lines */}
              <div className="absolute left-0 top-0 bottom-0 w-14 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 z-10">
                  {generateHoursForDay().map((hour) => (
                    <div key={hour} className="h-16 flex items-start justify-center pt-1">
                      <span className="text-[10px] text-neutral-500 dark:text-neutral-400">{formatHour(hour)}</span>
                    </div>
                  ))}
              </div>
              {/* Appointment grid area - Use generateHoursForDay to determine rows */}
              <div className="ml-14 grid" style={{ gridTemplateRows: `repeat(${generateHoursForDay().length * 2}, minmax(0, 1fr))` }}>
                  {generateHoursForDay().map((hour) => (
                    <React.Fragment key={`hour-slot-${hour}`}>
                      {/* Half-hour slots with grid lines */}
                      <div className="h-8 border-b border-neutral-100 dark:border-neutral-800" /> 
                      <div className="h-8 border-b border-neutral-200 dark:border-neutral-700" /> 
                    </React.Fragment>
                  ))}
  
                  {/* Render Appointments */} 
                  {getAppointmentsForDay(currentDate).map((appointment) => {
                     // Calculate position based on hours in the day view, not 24 hours
                     const dayHours = generateHoursForDay();
                     const firstHour = dayHours[0];
                     const totalVisibleHours = dayHours.length;
                      const startHour = appointment.startTime.getHours() + appointment.startTime.getMinutes() / 60;
                      const endHour = appointment.endTime.getHours() + appointment.endTime.getMinutes() / 60;
                      // Calculate offset from the first visible hour
                      const startOffsetHours = Math.max(0, startHour - firstHour);
                      const endOffsetHours = Math.min(totalVisibleHours, endHour - firstHour);
                      // Ensure duration is at least a small positive value
                      const durationHours = Math.max(0.25, endOffsetHours - startOffsetHours); // Min 15 min height
                      // Calculate percentages based on *visible* hours and *half-hour* slots
                      const topPercentage = (startOffsetHours / totalVisibleHours) * 100;
                      const heightPercentage = Math.max(1, (durationHours / totalVisibleHours) * 100); // Min height based on half-hour slots

                    return (
                      <div
                         key={appointment.id}
                         className={cn(
                           "absolute left-1 right-1 p-1.5 rounded-xl shadow-sm overflow-hidden cursor-pointer transition-all hover:opacity-90 hover:shadow-md z-20",
                           getBgColorClass(appointment.color),
                           getTextColorClass(appointment.color)
                         )}
                         style={{
                           top: `${topPercentage}%`,
                           height: `${heightPercentage}%`
                         }}
                         onClick={() => onAppointmentClick(appointment)}
                      >
                        <p className="text-xs font-semibold truncate">{appointment.clientName}</p>
                        <p className="text-[11px] truncate">
                           {appointment.startTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - 
                           {appointment.endTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                       </p>
                      </div>
                    );
                  })}
              </div>
          </div>
        )}
      </Card>
    </>
  );
} 