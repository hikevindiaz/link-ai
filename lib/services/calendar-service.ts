import { AppointmentStatus } from "@/lib/api/appointments";

/**
 * Calendar service for interacting with the calendar API programmatically
 * Used by AI agents to book appointments
 */

// Basic calendar type
export interface Calendar {
  id: string;
  name: string;
  userId: string;
  workingHoursStart: string;
  workingHoursEnd: string;
  includeSaturday: boolean;
  includeSunday: boolean;
  notificationEmail: string;
  notificationEmailEnabled: boolean;
  emailReminderEnabled: boolean;
  smsReminderEnabled: boolean;
  reminderTimeMinutes: number;
}

// Appointment type
export interface Appointment {
  id: string;
  calendarId: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  status: AppointmentStatus;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone?: string;
  notes?: string;
  location?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Timeslot type
export interface TimeSlot {
  startTime: Date;
  endTime: Date;
  available: boolean;
}

// Input for creating a new appointment
export interface AppointmentInput {
  calendarId: string;
  title: string;
  description: string;
  startTime: Date | string;
  endTime: Date | string;
  status?: AppointmentStatus;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone?: string;
  notes?: string;
  location?: string;
}

/**
 * Fetch all calendars for the current user
 */
export async function fetchCalendars(): Promise<Calendar[]> {
  try {
    const response = await fetch('/api/calendars');
    if (!response.ok) {
      throw new Error(`Failed to fetch calendars: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching calendars:", error);
    throw error;
  }
}

/**
 * Get a specific calendar by ID
 */
export async function getCalendarById(calendarId: string): Promise<Calendar> {
  try {
    const response = await fetch(`/api/calendars/${calendarId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch calendar: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching calendar ${calendarId}:`, error);
    throw error;
  }
}

/**
 * Book a new appointment programmatically
 */
export async function bookAppointment(appointmentData: AppointmentInput): Promise<Appointment> {
  try {
    const response = await fetch('/api/appointments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(appointmentData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to book appointment: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error booking appointment:", error);
    throw error;
  }
}

/**
 * Fetch available time slots for a specific date range
 */
export async function fetchAvailableTimeSlots(
  calendarId: string,
  startDate: Date | string,
  endDate: Date | string,
  durationMinutes: number = 30
): Promise<TimeSlot[]> {
  try {
    // Format dates if they are Date objects
    const startDateParam = typeof startDate === 'string' ? startDate : startDate.toISOString();
    const endDateParam = typeof endDate === 'string' ? endDate : endDate.toISOString();
    
    const params = new URLSearchParams({
      calendarId,
      startDate: startDateParam,
      endDate: endDateParam,
      durationMinutes: durationMinutes.toString(),
    });

    const response = await fetch(`/api/calendars/${calendarId}/available-slots?${params.toString()}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to fetch time slots: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching available time slots:", error);
    throw error;
  }
}

/**
 * Check if a specific time slot is available
 */
export async function isTimeSlotAvailable(
  calendarId: string,
  startTime: Date | string,
  endTime: Date | string
): Promise<boolean> {
  try {
    // Format dates if they are Date objects
    const startTimeParam = typeof startTime === 'string' ? startTime : startTime.toISOString();
    const endTimeParam = typeof endTime === 'string' ? endTime : endTime.toISOString();
    
    const params = new URLSearchParams({
      startTime: startTimeParam,
      endTime: endTimeParam,
    });

    const response = await fetch(`/api/calendars/${calendarId}/check-availability?${params.toString()}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to check time slot availability: ${response.statusText}`);
    }

    const { available } = await response.json();
    return available;
  } catch (error) {
    console.error("Error checking time slot availability:", error);
    throw error;
  }
}

/**
 * Get default calendar for AI booking
 * Returns the first calendar or null if none exists
 */
export async function getDefaultCalendar(): Promise<Calendar | null> {
  try {
    const calendars = await fetchCalendars();
    return calendars.length > 0 ? calendars[0] : null;
  } catch (error) {
    console.error("Error getting default calendar:", error);
    return null;
  }
} 