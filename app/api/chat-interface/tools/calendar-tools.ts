export interface CalendarConfig {
  defaultCalendarId: string;
  askForDuration: boolean;
  askForNotes: boolean;
  defaultDuration: number;
  bufferBetweenAppointments: number;
  maxBookingsPerSlot: number;
  minimumAdvanceNotice: number;
  requirePhoneNumber: boolean;
  defaultLocation: string | null;
  bookingPrompt: string | null;
  confirmationMessage: string | null;
}

export function getCalendarTools(calendarConfig: CalendarConfig | null) {
  if (!calendarConfig) return [];
  
  return [
    {
      type: "function",
      name: "check_availability",
      description: "Check available time slots for a specific date. Pass relative dates as-is (e.g., 'tomorrow', 'next week', 'Wednesday of next week', 'this Thursday')",
      parameters: {
        type: "object",
        properties: {
          date: {
            type: "string",
            description: "Date to check - can be: YYYY-MM-DD format, 'tomorrow', 'today', 'next week', 'Wednesday of next week', 'this Thursday', or just a day name like 'Monday'"
          },
          prefer_am: {
            type: "boolean",
            description: "Whether to look for morning (AM) slots",
            default: false
          },
          prefer_pm: {
            type: "boolean",
            description: "Whether to look for afternoon (PM) slots",
            default: false
          },
          specific_time: {
            type: "string",
            description: "Specific time to check (e.g., '3:00 PM', '15:00')"
          },
          duration: {
            type: "integer",
            description: "Duration of appointment in minutes",
            default: calendarConfig.defaultDuration
          }
        },
        required: ["date"]
      }
    },
    {
      type: "function",
      name: "book_appointment",
      description: "Book an appointment on the calendar",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Title or purpose of the appointment"
          },
          start_time: {
            type: "string",
            description: "Start time of the appointment in ISO format (YYYY-MM-DDTHH:MM:SS)"
          },
          duration_minutes: {
            type: "integer",
            description: "Duration of the appointment in minutes",
            default: calendarConfig.defaultDuration
          },
          attendee_name: {
            type: "string",
            description: "Name of the person attending the appointment"
          },
          attendee_email: {
            type: "string",
            description: "Email of the person attending the appointment (required for confirmation)"
          },
          attendee_phone: {
            type: "string",
            description: calendarConfig.requirePhoneNumber 
              ? "Phone number of the person attending the appointment (required)" 
              : "Phone number of the person attending the appointment (optional)"
          },
          notes: {
            type: "string",
            description: "Additional notes or context for the appointment"
          },
          location: {
            type: "string",
            description: "Location of the appointment (physical address, Zoom link, etc.)",
            default: calendarConfig.defaultLocation || ""
          }
        },
        required: calendarConfig.requirePhoneNumber 
          ? ["title", "start_time", "attendee_name", "attendee_email", "attendee_phone"]
          : ["title", "start_time", "attendee_name", "attendee_email"]
      }
    },
    {
      type: "function",
      name: "view_appointment",
      description: "View appointment details using appointment ID and email/phone for verification",
      parameters: {
        type: "object",
        properties: {
          appointment_id: {
            type: "string",
            description: "The appointment ID provided during booking"
          },
          verification_info: {
            type: "string",
            description: "Email or phone number associated with the appointment for verification"
          }
        },
        required: ["appointment_id", "verification_info"]
      }
    },
    {
      type: "function",
      name: "modify_appointment",
      description: "Modify an existing appointment (change date/time)",
      parameters: {
        type: "object",
        properties: {
          appointment_id: {
            type: "string",
            description: "The appointment ID"
          },
          verification_info: {
            type: "string",
            description: "Email or phone number for verification"
          },
          new_date: {
            type: "string",
            description: "New date if changing (YYYY-MM-DD format or relative like 'tomorrow')"
          },
          new_time: {
            type: "string",
            description: "New time if changing (HH:MM format)"
          },
          specific_time: {
            type: "string",
            description: "Specific time requested (e.g., '3:00 PM')"
          },
          prefer_am: {
            type: "boolean",
            description: "Whether to look for morning slots when rescheduling"
          },
          prefer_pm: {
            type: "boolean",
            description: "Whether to look for afternoon slots when rescheduling"
          }
        },
        required: ["appointment_id", "verification_info"]
      }
    },
    {
      type: "function",
      name: "cancel_appointment",
      description: "Cancel an appointment",
      parameters: {
        type: "object",
        properties: {
          appointment_id: {
            type: "string",
            description: "The appointment ID"
          },
          verification_info: {
            type: "string",
            description: "Email or phone number for verification"
          },
          reason: {
            type: "string",
            description: "Optional reason for cancellation"
          }
        },
        required: ["appointment_id", "verification_info"]
      }
    }
  ];
} 