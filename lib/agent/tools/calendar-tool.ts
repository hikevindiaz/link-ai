import { 
  bookAppointment, 
  fetchAvailableTimeSlots, 
  getCalendarById, 
  getDefaultCalendar, 
  isTimeSlotAvailable,
  type AppointmentInput,
  type TimeSlot
} from "@/lib/services/calendar-service"
import { AppointmentStatus } from "@/lib/api/appointments"

/**
 * Calendar Tool - Used by AI agent to book appointments
 */

export interface CalendarToolConfig {
  defaultCalendarId: string | null
  defaultDuration: number
  askForDuration: boolean
  askForNotes: boolean
  confirmationMessage: string
  allowedCalendarIds: string[]
  bufferBetweenAppointments: number
  maxBookingsPerSlot: number
  minimumAdvanceNotice: number
  requirePhoneNumber: boolean
  defaultLocation?: string
}

export interface CalendarToolInput {
  // Required fields
  title: string
  startTime: string
  attendeeName: string
  attendeeEmail: string
  
  // Optional fields
  calendarId?: string
  duration?: number 
  description?: string
  notes?: string
  attendeePhone?: string
  location?: string
}

/**
 * Book an appointment on the calendar
 * 
 * This is the main entry point for the AI agent to book appointments
 */
export async function bookCalendarAppointment(
  input: CalendarToolInput,
  config: CalendarToolConfig
): Promise<{ success: boolean; message: string; appointmentId?: string }> {
  try {
    // Validate required fields
    if (!input.title || !input.startTime || !input.attendeeName || !input.attendeeEmail) {
      return {
        success: false,
        message: "Missing required fields: title, startTime, attendeeName, and attendeeEmail are required"
      }
    }

    // Check phone number requirement if enabled
    if (config.requirePhoneNumber && !input.attendeePhone) {
      return {
        success: false,
        message: "Phone number is required for booking appointments"
      }
    }

    // Parse start time to Date object
    let startTime: Date
    try {
      startTime = new Date(input.startTime)
      if (isNaN(startTime.getTime())) {
        throw new Error("Invalid date format")
      }
      
      // Check minimum advance notice (lead time) requirement
      const now = new Date()
      const minutesDifference = Math.floor((startTime.getTime() - now.getTime()) / (1000 * 60))
      if (minutesDifference < config.minimumAdvanceNotice) {
        return {
          success: false,
          message: `Appointments must be booked at least ${config.minimumAdvanceNotice} minutes in advance. Please choose a later time.`
        }
      }
    } catch (error) {
      return {
        success: false,
        message: "Invalid startTime format. Please use ISO format (YYYY-MM-DDTHH:MM:SS)"
      }
    }

    // Determine calendar ID to use
    const calendarId = input.calendarId || config.defaultCalendarId
    if (!calendarId) {
      // Try to get the default calendar
      const defaultCalendar = await getDefaultCalendar()
      if (!defaultCalendar) {
        return {
          success: false,
          message: "No calendar specified and no default calendar found. Please create a calendar first."
        }
      }
    }

    // Determine appointment duration (in minutes)
    const durationMinutes = input.duration || config.defaultDuration || 30
    
    // Calculate end time based on duration
    const endTime = new Date(startTime)
    endTime.setMinutes(endTime.getMinutes() + durationMinutes)

    // Check if the time slot is available considering buffer time
    const bufferStartTime = new Date(startTime)
    bufferStartTime.setMinutes(bufferStartTime.getMinutes() - config.bufferBetweenAppointments)
    
    const bufferEndTime = new Date(endTime)
    bufferEndTime.setMinutes(bufferEndTime.getMinutes() + config.bufferBetweenAppointments)
    
    const isAvailable = await isTimeSlotAvailable(
      calendarId,
      bufferStartTime,
      bufferEndTime
    )

    if (!isAvailable) {
      return {
        success: false,
        message: "The requested time slot is not available. Please choose a different time."
      }
    }

    // Use default location if none provided
    const location = input.location || config.defaultLocation || '';

    // Prepare appointment data
    const appointmentData: AppointmentInput = {
      calendarId,
      title: input.title,
      description: input.description || "",
      startTime,
      endTime,
      status: AppointmentStatus.CONFIRMED,
      attendeeName: input.attendeeName,
      attendeeEmail: input.attendeeEmail,
      attendeePhone: input.attendeePhone,
      notes: input.notes,
      location
    }

    // Book the appointment
    const appointment = await bookAppointment(appointmentData)

    return {
      success: true,
      message: config.confirmationMessage || "Appointment successfully booked.",
      appointmentId: appointment.id
    }
  } catch (error) {
    console.error("Error booking appointment:", error)
    return {
      success: false,
      message: `Failed to book appointment: ${error.message || "Unknown error"}`
    }
  }
}

/**
 * Get available time slots for a date range
 */
export async function getAvailableTimeSlots(
  startDate: string,
  endDate: string,
  calendarId?: string,
  durationMinutes?: number,
  config?: CalendarToolConfig
): Promise<{ success: boolean; timeSlots?: TimeSlot[]; message?: string }> {
  try {
    // Determine calendar ID to use
    const calId = calendarId || (config?.defaultCalendarId)
    if (!calId) {
      // Try to get the default calendar
      const defaultCalendar = await getDefaultCalendar()
      if (!defaultCalendar) {
        return {
          success: false,
          message: "No calendar specified and no default calendar found. Please create a calendar first."
        }
      }
    }

    // Determine appointment duration (in minutes)
    const duration = durationMinutes || (config?.defaultDuration) || 30
    
    // Parse dates
    let start: Date, end: Date
    try {
      start = new Date(startDate)
      end = new Date(endDate)
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error("Invalid date format")
      }
    } catch (error) {
      return {
        success: false,
        message: "Invalid date format. Please use ISO format (YYYY-MM-DDTHH:MM:SS)"
      }
    }
    
    // Get available time slots
    const timeSlots = await fetchAvailableTimeSlots(calId, start, end, duration)
    
    return {
      success: true,
      timeSlots
    }
  } catch (error) {
    console.error("Error fetching available time slots:", error)
    return {
      success: false,
      message: `Failed to fetch available time slots: ${error.message || "Unknown error"}`
    }
  }
}

/**
 * Format available time slots for display
 */
export function formatAvailableTimeSlots(timeSlots: TimeSlot[]): string {
  if (timeSlots.length === 0) {
    return "No available time slots found for the specified date range."
  }

  // Group time slots by date
  const slotsByDate = timeSlots.reduce((acc, slot) => {
    const date = slot.startTime.toLocaleDateString()
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(slot)
    return acc
  }, {} as Record<string, TimeSlot[]>)

  // Format time slots by date
  let result = "Available time slots:\n\n"

  Object.entries(slotsByDate).forEach(([date, slots]) => {
    result += `${date}:\n`
    slots.forEach(slot => {
      const startTime = slot.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      const endTime = slot.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      result += `- ${startTime} to ${endTime}\n`
    })
    result += "\n"
  })

  return result
} 