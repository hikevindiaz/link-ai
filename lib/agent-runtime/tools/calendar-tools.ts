import { AgentTool, AgentContext } from '../types';
import { 
  handleCheckAvailability, 
  handleBookAppointment, 
  handleViewAppointment, 
  handleModifyAppointment, 
  handleCancelAppointment 
} from '@/app/api/chat-interface/handlers/calendar';

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

// Generate calendar tools with the given configuration
export function getCalendarTools(calendarConfig: CalendarConfig): AgentTool[] {
  const calendarSystemPrompt = `# Calendar Management Tools Available

You have access to calendar management tools that allow you to:
- Check appointment availability
- Book appointments
- View appointment details
- Modify appointments
- Cancel appointments

## Important Calendar Guidelines:

1. **Availability Checking**:
   - Always check availability before suggesting times
   - The system will automatically show up to 3 available time slots
   - If user mentions AM/PM preference, use prefer_am or prefer_pm parameters
   - Handle relative dates naturally (e.g., "tomorrow", "next week", "this Thursday")
   - If a specific time is unavailable, the system will suggest up to 3 alternative slots

2. **Booking Process**:
   - Collect all required information before booking:
     - Name (required)
     - Email (required)
     ${calendarConfig.requirePhoneNumber ? '- Phone number (required)' : '- Phone number (optional)'}
   - Default appointment duration: ${calendarConfig.defaultDuration} minutes
   - Minimum advance notice: ${calendarConfig.minimumAdvanceNotice} minutes
   - Default location: ${calendarConfig.defaultLocation || 'To be determined'}

3. **Professional Communication**:
   - When multiple slots are shown, ask which time works best
   - Confirm all details before finalizing a booking
   - Provide clear appointment confirmations with date, time, and duration
   - Be helpful if users need to reschedule or cancel

4. **Time Handling**:
   - Always display times in 12-hour format with AM/PM
   - Show dates in a friendly format (e.g., "Monday, January 15, 2024")
   - Be mindful of business hours (typically 9 AM - 5 PM)

5. **Best Practices**:
   - When user asks about availability, immediately use check_availability tool
   - Present multiple options when available to give users flexibility
   - If all shown slots don't work, offer to check different days or times

${calendarConfig.bookingPrompt ? `\n6. **Booking Introduction**:\n   ${calendarConfig.bookingPrompt}\n` : ''}
${calendarConfig.confirmationMessage ? `\n7. **Confirmation Message**:\n   After successful booking, include: ${calendarConfig.confirmationMessage}\n` : ''}`;

  return [
    {
      id: 'check_availability',
      name: 'check_availability',
      description: "Check available time slots for a specific date. Pass relative dates as-is (e.g., 'tomorrow', 'next week', 'Wednesday of next week', 'this Thursday'). IMPORTANT: If the user previously mentioned AM or PM preference in the conversation, always pass prefer_am or prefer_pm accordingly.",
      systemPrompt: calendarSystemPrompt,
      parameters: {
        type: "object" as const,
        properties: {
          date: {
            type: "string",
            description: "Date to check - can be: YYYY-MM-DD format, 'tomorrow', 'today', 'next week', 'Wednesday of next week', 'this Thursday', or just a day name like 'Monday', 'Tuesday', etc."
          },
          prefer_am: {
            type: "boolean",
            description: "Set to true if the user wants morning slots (9 AM - 12 PM). If user said 'morning' or 'AM' at any point, this should be true.",
            default: false
          },
          prefer_pm: {
            type: "boolean",
            description: "Set to true if the user wants afternoon slots (12 PM - 5 PM). If user said 'afternoon' or 'PM' at any point, this should be true.",
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
      },
      handler: async (params: any, context: AgentContext): Promise<any> => {
        const result = await handleCheckAvailability(params, calendarConfig);
        return JSON.parse(result);
      }
    },
    {
      id: 'book_appointment',
      name: 'book_appointment',
      description: "Book an appointment on the calendar",
      parameters: {
        type: "object" as const,
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
      },
      handler: async (params: any, context: AgentContext): Promise<any> => {
        // Extract userId from agent config
        const chatbotUserId = context.agent.userId || 'default-user';
        const result = await handleBookAppointment(params, calendarConfig, chatbotUserId);
        return JSON.parse(result);
      }
    },
    {
      id: 'view_appointment',
      name: 'view_appointment',
      description: "View appointment details using appointment ID and email/phone for verification",
      parameters: {
        type: "object" as const,
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
      },
      handler: async (params: any, context: AgentContext): Promise<any> => {
        const result = await handleViewAppointment(params);
        return JSON.parse(result);
      }
    },
    {
      id: 'modify_appointment',
      name: 'modify_appointment',
      description: "Modify an existing appointment (change date/time)",
      parameters: {
        type: "object" as const,
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
      },
      handler: async (params: any, context: AgentContext): Promise<any> => {
        const result = await handleModifyAppointment(params, calendarConfig);
        return JSON.parse(result);
      }
    },
    {
      id: 'cancel_appointment',
      name: 'cancel_appointment',
      description: "Cancel an appointment",
      parameters: {
        type: "object" as const,
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
      },
      handler: async (params: any, context: AgentContext): Promise<any> => {
        const result = await handleCancelAppointment(params);
        return JSON.parse(result);
      }
    }
  ];
} 