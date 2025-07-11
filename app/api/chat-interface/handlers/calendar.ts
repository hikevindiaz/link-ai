import prisma from '@/lib/prisma';
import { sendAppointmentSMS } from '@/lib/calendar-sms';
import { sendAppointmentConfirmationEmail, scheduleAppointmentReminders } from '@/lib/emails/send-appointment-emails';

// TODO: Get timezone from user/calendar settings instead of hardcoding
const DEFAULT_TIMEZONE = 'America/New_York'; // Default timezone - should be from user settings

interface CalendarConfig {
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

// Handler for checking availability
export async function handleCheckAvailability(params: any, calendarConfig: CalendarConfig | null) {
  try {
    console.log('[Calendar Tool] Checking availability with params:', params);
    
    if (!calendarConfig || !calendarConfig.defaultCalendarId) {
      return JSON.stringify({
        success: false,
        message: "No calendar configured for checking availability."
      });
    }
    
    // Parse the date - handle "tomorrow" and other relative dates
    let checkDate = params.date;
    const now = new Date();
    
    // Helper function to get the next occurrence of a weekday
    const getNextWeekday = (dayName: string, fromNextWeek: boolean = false) => {
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const targetDay = days.indexOf(dayName.toLowerCase());
      if (targetDay === -1) return null;
      
      // Use a clean date without time component to avoid timezone issues
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      
      const result = new Date(today);
      const currentDay = result.getDay();
      
      console.log(`[Calendar Tool] getNextWeekday - Looking for ${dayName} (${targetDay}) from ${days[currentDay]} (${currentDay})`);
      
      if (fromNextWeek) {
        // Get to next Monday first
        const daysUntilNextMonday = currentDay === 0 ? 1 : 8 - currentDay;
        result.setDate(result.getDate() + daysUntilNextMonday);
        // Then get to the target day
        const daysFromMonday = targetDay === 0 ? 6 : targetDay - 1;
        result.setDate(result.getDate() + daysFromMonday);
      } else {
        // Get next occurrence of this day
        let daysUntilTarget = targetDay - currentDay;
        
        // If it's the same day or in the past this week, get next week's occurrence
        if (daysUntilTarget <= 0) {
          daysUntilTarget += 7;
        }
        
        result.setDate(result.getDate() + daysUntilTarget);
      }
      
      console.log(`[Calendar Tool] getNextWeekday - Result date: ${result.toISOString().split('T')[0]}`);
      
      return result;
    };
    
    // Handle relative dates
    if (!checkDate || checkDate.toLowerCase() === 'tomorrow') {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      checkDate = tomorrow.toISOString().split('T')[0];
      console.log('[Calendar Tool] Using tomorrow:', checkDate);
    } else if (checkDate.toLowerCase() === 'today') {
      checkDate = now.toISOString().split('T')[0];
      console.log('[Calendar Tool] Using today:', checkDate);
    } else if (checkDate.toLowerCase().includes('next week')) {
      // Parse "Wednesday of next week", "next week", etc.
      const dayMatch = checkDate.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
      if (dayMatch) {
        const nextWeekDay = getNextWeekday(dayMatch[1], true);
        if (nextWeekDay) {
          checkDate = nextWeekDay.toISOString().split('T')[0];
          console.log(`[Calendar Tool] Using ${dayMatch[1]} of next week:`, checkDate);
        }
      } else {
        // Just "next week" - use next Monday
        const nextMonday = getNextWeekday('monday', false);
        if (nextMonday) {
          checkDate = nextMonday.toISOString().split('T')[0];
          console.log('[Calendar Tool] Using next Monday:', checkDate);
        }
      }
    } else if (checkDate.toLowerCase().includes('this week')) {
      // Parse "Wednesday this week", etc.
      const dayMatch = checkDate.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
      if (dayMatch) {
        const thisWeekDay = new Date(now);
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const targetDay = days.indexOf(dayMatch[1].toLowerCase());
        const currentDay = thisWeekDay.getDay();
        const daysUntilTarget = targetDay - currentDay;
        
        if (daysUntilTarget >= 0) {
          thisWeekDay.setDate(thisWeekDay.getDate() + daysUntilTarget);
          checkDate = thisWeekDay.toISOString().split('T')[0];
          console.log(`[Calendar Tool] Using ${dayMatch[1]} this week:`, checkDate);
        } else {
          // Day already passed this week, use next occurrence
          const nextDay = getNextWeekday(dayMatch[1], false);
          if (nextDay) {
            checkDate = nextDay.toISOString().split('T')[0];
            console.log(`[Calendar Tool] ${dayMatch[1]} already passed, using next ${dayMatch[1]}:`, checkDate);
          }
        }
      }
    } else if (checkDate.match(/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i)) {
      // Just a day name - get next occurrence
      const nextDay = getNextWeekday(checkDate, false);
      if (nextDay) {
        checkDate = nextDay.toISOString().split('T')[0];
        console.log(`[Calendar Tool] Using next ${checkDate}:`, checkDate);
      }
    } else {
      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(checkDate)) {
        // Try to parse the date
        const parsedDate = new Date(checkDate);
        if (isNaN(parsedDate.getTime())) {
          // Invalid date, use tomorrow
          const tomorrow = new Date(now);
          tomorrow.setDate(tomorrow.getDate() + 1);
          checkDate = tomorrow.toISOString().split('T')[0];
          console.log('[Calendar Tool] Invalid date format, using tomorrow:', checkDate);
        } else {
          checkDate = parsedDate.toISOString().split('T')[0];
        }
      }
      
      // Check if the date is in the past
      const requestedDate = new Date(checkDate);
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      
      if (requestedDate < today) {
        // Date is in the past, use tomorrow
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        checkDate = tomorrow.toISOString().split('T')[0];
        console.log('[Calendar Tool] Date is in the past, using tomorrow:', checkDate);
      }
    }
    
    // Call the availability API directly using the database
    const calendar = await prisma.calendar.findUnique({
      where: { id: calendarConfig.defaultCalendarId },
      include: {
        appointments: {
          where: {
            startTime: {
              gte: new Date(checkDate + 'T00:00:00'),
              lt: new Date(new Date(checkDate + 'T00:00:00').getTime() + 24 * 60 * 60 * 1000) // Next day
            },
            status: {
              not: 'CANCELLED'
            }
          },
          orderBy: {
            startTime: 'asc'
          }
        }
      }
    });
    
    if (!calendar) {
      return JSON.stringify({
        success: false,
        message: "Calendar not found."
      });
    }
    
    // Determine if we're looking for AM or PM slots
    const preferAM = params.prefer_am || false;
    const preferPM = params.prefer_pm || false;
    
    // Check if a specific time was requested
    const specificTime = params.specific_time;
    if (specificTime) {
      // Parse the specific time (e.g., "3:00 PM", "15:00")
      const timeMatch = specificTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (timeMatch) {
        let hour = parseInt(timeMatch[1]);
        const minute = parseInt(timeMatch[2]);
        const meridiem = timeMatch[3];
        
        // Convert to 24-hour format if needed
        if (meridiem) {
          if (meridiem.toUpperCase() === 'PM' && hour !== 12) {
            hour += 12;
          } else if (meridiem.toUpperCase() === 'AM' && hour === 12) {
            hour = 0;
          }
        }
        
        // Check if this specific slot is available
        const slotTime = new Date(checkDate + 'T00:00:00');
        slotTime.setHours(hour, minute, 0, 0);
        
        // Check if this slot is available (not booked)
        const isBooked = calendar.appointments.some(apt => {
          const aptStart = new Date(apt.startTime);
          const aptEnd = new Date(apt.endTime);
          return slotTime >= aptStart && slotTime < aptEnd;
        });
        
        // Check minimum advance notice
        const minutesUntilSlot = Math.floor((slotTime.getTime() - now.getTime()) / (1000 * 60));
        
        if (minutesUntilSlot < calendarConfig.minimumAdvanceNotice) {
          return JSON.stringify({
            success: false,
            message: `That time slot requires at least ${calendarConfig.minimumAdvanceNotice} minutes advance notice. Please choose a later time.`
          });
        }
        
        const friendlyDate = slotTime.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
          timeZone: DEFAULT_TIMEZONE
        });
        
        const friendlyTime = slotTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          timeZone: DEFAULT_TIMEZONE
        });
        
        if (isBooked) {
          // Find up to 3 available slots after the requested time
          const nextAvailableSlots = [];
          const searchEndTime = new Date(checkDate + 'T23:59:59');
          
          // Start searching from the requested time
          for (let searchHour = hour; searchHour < 18 && nextAvailableSlots.length < 3; searchHour++) {
            for (let searchMinute = (searchHour === hour ? minute : 0); searchMinute < 60 && nextAvailableSlots.length < 3; searchMinute += 30) {
              const searchSlotTime = new Date(checkDate + 'T00:00:00');
              searchSlotTime.setHours(searchHour, searchMinute, 0, 0);
              
              // Skip if this is before the requested time
              if (searchSlotTime <= slotTime) continue;
              
              // Check if this slot is available
              const isSearchSlotBooked = calendar.appointments.some(apt => {
                const aptStart = new Date(apt.startTime);
                const aptEnd = new Date(apt.endTime);
                return searchSlotTime >= aptStart && searchSlotTime < aptEnd;
              });
              
              if (!isSearchSlotBooked) {
                // Check minimum advance notice
                const minutesUntilSearchSlot = Math.floor((searchSlotTime.getTime() - now.getTime()) / (1000 * 60));
                if (minutesUntilSearchSlot >= calendarConfig.minimumAdvanceNotice) {
                  nextAvailableSlots.push({
                    time: searchSlotTime,
                    display: searchSlotTime.toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                      timeZone: DEFAULT_TIMEZONE
                    })
                  });
                }
              }
            }
          }
          
          // If we found alternative slots on the same day
          if (nextAvailableSlots.length > 0) {
            let alternativeMessage = `Sorry, **${friendlyTime}** on **${friendlyDate}** is not available.\n\n`;
            
            if (nextAvailableSlots.length === 1) {
              alternativeMessage += `However, I have **${nextAvailableSlots[0].display}** available on the same day.\n\nWould you like to book this time instead?`;
            } else {
              alternativeMessage += `However, I have these alternative times available on the same day:\n\n`;
              nextAvailableSlots.forEach(slot => {
                alternativeMessage += `• ${slot.display}\n`;
              });
              alternativeMessage += `\nWhich time works best for you?`;
            }
            
            return JSON.stringify({
              success: false,
              message: alternativeMessage,
              available: false,
              alternativeSlots: nextAvailableSlots.map(slot => ({
                time: slot.time.toISOString(),
                display: slot.display
              }))
            });
          } else {
            // No slots available for the rest of the day
            return JSON.stringify({
              success: false,
              message: `Sorry, **${friendlyTime}** on **${friendlyDate}** is not available, and I don't have any other slots available later that day.\n\nWould you like me to check another day?`,
              available: false
            });
          }
        } else {
          return JSON.stringify({
            success: true,
            available: true,
            message: `Great! **${friendlyTime}** on **${friendlyDate}** is available.\n\nDoes this time work for you?`,
            date: checkDate,
            slots: [friendlyTime],
            specificSlotTime: slotTime.toISOString()
          });
        }
      }
    }
    
    // Generate available slots
    const slots = [];
    const startHour = preferPM ? 12 : 9; // Start at noon for PM, 9 AM for AM
    const endHour = preferPM ? 17 : 12; // End at 5 PM for PM, noon for AM
    
    // If no preference, show slots from 9 AM to 5 PM
    const actualStartHour = (!preferAM && !preferPM) ? 9 : startHour;
    const actualEndHour = (!preferAM && !preferPM) ? 17 : endHour;
    
    // For PM preference, skip noon and start at 1 PM for better afternoon times
    const pmStartHour = preferPM ? 13 : actualStartHour; // 1 PM instead of noon for PM
    
    for (let hour = pmStartHour; hour < actualEndHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const slotTime = new Date(checkDate + 'T00:00:00');
        slotTime.setHours(hour, minute, 0, 0);
        
        // Check if this slot is available (not booked)
        const isBooked = calendar.appointments.some(apt => {
          const aptStart = new Date(apt.startTime);
          const aptEnd = new Date(apt.endTime);
          return slotTime >= aptStart && slotTime < aptEnd;
        });
        
        if (!isBooked) {
          // Check minimum advance notice
          const minutesUntilSlot = Math.floor((slotTime.getTime() - now.getTime()) / (1000 * 60));
          if (minutesUntilSlot >= calendarConfig.minimumAdvanceNotice) {
            slots.push({
              time: slotTime,
              display: slotTime.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })
            });
          }
        }
      }
    }
    
    // Format the date in a friendly way
    const dateObj = new Date(checkDate + 'T00:00:00');
    const friendlyDate = dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: DEFAULT_TIMEZONE
    });
    
    if (slots.length === 0) {
      // No slots available in the requested time period
      const timePreference = preferAM ? "morning" : preferPM ? "afternoon" : "day";
      return JSON.stringify({
        success: true,
        available: false,
        message: `I don't have any ${timePreference} slots available on **${friendlyDate}**.\n\nWould you like me to check a different day or time?`,
        date: checkDate,
        slots: []
      });
    }
    
    // Return up to 3 available slots
    const availableSlots = slots.slice(0, 3);
    const slotDisplays = availableSlots.map(slot => slot.display);
    
    let message = '';
    if (availableSlots.length === 1) {
      message = `I have **${slotDisplays[0]}** available on **${friendlyDate}**.\n\nDoes this time work for you?`;
    } else if (availableSlots.length === 2) {
      message = `I have these times available on **${friendlyDate}**:\n\n• ${slotDisplays[0]}\n• ${slotDisplays[1]}\n\nWhich time works best for you?`;
    } else {
      message = `I have these times available on **${friendlyDate}**:\n\n• ${slotDisplays[0]}\n• ${slotDisplays[1]}\n• ${slotDisplays[2]}\n\nWhich time works best for you? (I have ${slots.length - 3} more slots available if needed)`;
    }
    
    return JSON.stringify({
      success: true,
      available: true,
      message: message,
      date: checkDate,
      slots: slotDisplays,
      allAvailableSlots: availableSlots.map(slot => ({
        time: slot.time.toISOString(),
        display: slot.display
      }))
    });
    
  } catch (error) {
    console.error('[Calendar Tool] Error checking availability:', error);
    return JSON.stringify({
      success: false,
      message: `Sorry, I couldn't check the calendar availability. Please try again.`
    });
  }
}

// Handler for booking appointments
export async function handleBookAppointment(params: any, calendarConfig: CalendarConfig | null, chatbotUserId: string) {
  try {
    console.log('[Calendar Tool] Booking appointment with params:', params);
    
    if (!calendarConfig || !calendarConfig.defaultCalendarId) {
      return JSON.stringify({
        success: false,
        message: "No calendar configured for booking appointments."
      });
    }
    
    // Parse the start_time - it might be in ISO format or we need to construct it
    let startDateTime;
    
    // Log all parameters for debugging
    console.log('[Calendar Tool] Raw booking parameters:', JSON.stringify(params, null, 2));
    
    if (params.start_time && params.start_time.includes('T')) {
      // Already in ISO format
      startDateTime = new Date(params.start_time);
    } else if (params.date && params.time) {
      // Construct from separate date and time parameters
      startDateTime = new Date(`${params.date}T${params.time}:00`);
    } else if (params.start_time) {
      // Try to parse whatever format was provided
      startDateTime = new Date(params.start_time);
    } else {
      // Only use tomorrow as last resort if no date info provided
      return JSON.stringify({
        success: false,
        message: "Missing required date and time information. Please provide when you'd like to book the appointment."
      });
    }
    
    // Validate the parsed date
    if (isNaN(startDateTime.getTime())) {
      console.error('[Calendar Tool] Invalid date parsing result:', params);
      return JSON.stringify({
        success: false,
        message: "Invalid date/time format. Please provide a valid date and time."
      });
    }
    
    console.log('[Calendar Tool] Parsed start time:', startDateTime.toISOString());
    console.log('[Calendar Tool] Current time:', new Date().toISOString());
    
    // Convert parameters from snake_case to camelCase and match API format
    const appointmentData = {
      calendarId: calendarConfig.defaultCalendarId,
      clientName: params.attendee_name,
      clientPhoneNumber: params.attendee_phone,
      clientEmail: params.attendee_email,
      description: params.notes || params.title || 'Appointment',
      date: startDateTime.toISOString().split('T')[0], // Extract date part
      startTime: startDateTime.toTimeString().substring(0, 5), // Extract time part (HH:MM)
      endTime: new Date(startDateTime.getTime() + (params.duration_minutes || calendarConfig.defaultDuration) * 60000).toTimeString().substring(0, 5),
      status: 'PENDING' as const,
      color: "neutral"
    };
    
    // Validate required fields
    if (!appointmentData.clientName || !appointmentData.date || !appointmentData.startTime || !appointmentData.endTime) {
      return JSON.stringify({
        success: false,
        message: "Missing required fields: name, date, and time are required"
      });
    }
    
    // Check email requirement if enabled
    const requireEmailAddress = (calendarConfig as any).requireEmailAddress ?? true;
    if (requireEmailAddress && !appointmentData.clientEmail) {
      return JSON.stringify({
        success: false,
        message: "Email address is required for booking appointments"
      });
    }
    
    // Check phone number requirement if enabled
    if (calendarConfig.requirePhoneNumber && !appointmentData.clientPhoneNumber) {
      return JSON.stringify({
        success: false,
        message: "Phone number is required for booking appointments"
      });
    }
    
    // Check minimum advance notice
    const now = new Date();
    const minutesDifference = Math.floor((startDateTime.getTime() - now.getTime()) / (1000 * 60));
    
    console.log('[Calendar Tool] Advance notice check:', {
      requestedTime: startDateTime.toISOString(),
      currentTime: now.toISOString(),
      minutesDifference,
      minimumRequired: calendarConfig.minimumAdvanceNotice,
      willPass: minutesDifference >= calendarConfig.minimumAdvanceNotice
    });
    
    if (minutesDifference < calendarConfig.minimumAdvanceNotice) {
      return JSON.stringify({
        success: false,
        message: `Appointments must be booked at least ${calendarConfig.minimumAdvanceNotice} minutes in advance. The requested time is only ${minutesDifference} minutes from now. Please choose a later time.`
      });
    }
    
    // Build description with notes and location
    let fullDescription = params.title || 'Appointment';
    if (params.notes && params.notes !== params.title) {
      fullDescription += `\n\nNotes: ${params.notes}`;
    }
    if (params.location) {
      fullDescription += `\nLocation: ${params.location}`;
    }
    
    // Book the appointment directly using Prisma
    const appointment = await prisma.appointment.create({
      data: {
        calendarId: appointmentData.calendarId,
        clientName: appointmentData.clientName,
        clientPhoneNumber: appointmentData.clientPhoneNumber,
        clientEmail: appointmentData.clientEmail,
        description: fullDescription,
        startTime: new Date(`${appointmentData.date}T${appointmentData.startTime}:00`),
        endTime: new Date(`${appointmentData.date}T${appointmentData.endTime}:00`),
        status: 'PENDING', // Start as PENDING if confirmation required
        color: appointmentData.color,
        bookedByUserId: chatbotUserId, // The chatbot owner is booking
        source: 'Web Chat'
      },
      include: {
        calendar: true
      }
    });
    
    // Send SMS confirmation if enabled
    if (appointment.calendar.notificationSmsEnabled && appointment.clientPhoneNumber) {
      await sendAppointmentSMS(appointment.id, 'confirmation');
    }

    // Send email confirmation if enabled and email is provided
    if (appointment.clientEmail) {
      try {
        await sendAppointmentConfirmationEmail(appointment.id);
        await scheduleAppointmentReminders(appointment.id);
      } catch (error) {
        console.error('Error sending email confirmation:', error);
        // Don't fail the booking if email fails
      }
    }
    
    // Format the appointment details for confirmation
    const appointmentDate = new Date(`${appointmentData.date}T${appointmentData.startTime}:00`);
    const friendlyDate = appointmentDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: DEFAULT_TIMEZONE
    });
    const friendlyTime = appointmentDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    let confirmationMessage = calendarConfig.confirmationMessage || 
      "✅ **Perfect! I've successfully scheduled your appointment.**\n\nYou will receive a confirmation email shortly with all the details.";
    
    // Add appointment details to the message
    confirmationMessage += `\n\n**📋 Appointment Summary:**\n\n`;
    confirmationMessage += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    confirmationMessage += `📅 **Date:** ${friendlyDate}\n\n`;
    confirmationMessage += `🕐 **Time:** ${friendlyTime}\n\n`;
    confirmationMessage += `⏱️ **Duration:** ${params.duration_minutes || calendarConfig.defaultDuration} minutes\n\n`;
    confirmationMessage += `👤 **Name:** ${appointmentData.clientName}\n\n`;
    if (appointmentData.clientPhoneNumber) {
      confirmationMessage += `📱 **Phone:** ${appointmentData.clientPhoneNumber}\n\n`;
    }
    if (appointmentData.clientEmail) {
      confirmationMessage += `📧 **Email:** ${appointmentData.clientEmail}\n\n`;
    }
    if (params.location) {
      confirmationMessage += `📍 **Location:** ${params.location}\n\n`;
    }
    if (params.notes && params.notes !== params.title) {
      confirmationMessage += `📝 **Notes:** ${params.notes}\n\n`;
    }
    confirmationMessage += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    confirmationMessage += `🔖 **Appointment ID:** \`${appointment.id}\`\n\n`;
    confirmationMessage += `💡 *Keep this ID to view, modify, or cancel your appointment.*`;
    
    return JSON.stringify({
      success: true,
      message: confirmationMessage,
      appointmentId: appointment.id
    });
  } catch (error) {
    console.error('[Calendar Tool] Error booking appointment:', error);
    return JSON.stringify({
      success: false,
      message: `Failed to book appointment: ${error.message || "Unknown error"}`
    });
  }
}

// Handler for viewing appointment details
export async function handleViewAppointment(params: any) {
  try {
    console.log('[Calendar Tool] Viewing appointment with params:', params);
    
    const { appointment_id, verification_info } = params;
    
    // Find the appointment and verify ownership
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointment_id,
        OR: [
          { clientPhoneNumber: verification_info },
          { clientEmail: verification_info }
        ]
      },
      include: {
        calendar: true
      }
    });
    
    if (!appointment) {
      return JSON.stringify({
        success: false,
        message: "Appointment not found or verification failed. Please check your appointment ID and email or phone number."
      });
    }
    
    // Format the appointment details
    const friendlyDate = appointment.startTime.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: DEFAULT_TIMEZONE
    });
    const friendlyStartTime = appointment.startTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    const friendlyEndTime = appointment.endTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    const duration = Math.floor((appointment.endTime.getTime() - appointment.startTime.getTime()) / (1000 * 60));
    
    let message = `**📋 Your Appointment Details:**\n\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    message += `🔖 **ID:** \`${appointment.id}\`\n\n`;
    message += `📅 **Date:** ${friendlyDate}\n\n`;
    message += `🕐 **Time:** ${friendlyStartTime} - ${friendlyEndTime}\n\n`;
    message += `⏱️ **Duration:** ${duration} minutes\n\n`;
    message += `📊 **Status:** ${appointment.status}\n\n`;
    message += `👤 **Name:** ${appointment.clientName}\n\n`;
    if (appointment.clientPhoneNumber) {
      message += `📱 **Phone:** ${appointment.clientPhoneNumber}\n\n`;
    }
    if (appointment.clientEmail) {
      message += `📧 **Email:** ${appointment.clientEmail}\n\n`;
    }
    if (appointment.description) {
      message += `📝 **Details:** ${appointment.description}\n\n`;
    }
    message += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    message += `*Would you like to modify or cancel this appointment?*`;
    
    return JSON.stringify({
      success: true,
      message: message,
      appointment: appointment
    });
  } catch (error) {
    console.error('[Calendar Tool] Error viewing appointment:', error);
    return JSON.stringify({
      success: false,
      message: "Failed to retrieve appointment details. Please try again."
    });
  }
}

// Handler for modifying appointment
export async function handleModifyAppointment(params: any, calendarConfig: CalendarConfig | null) {
  try {
    console.log('[Calendar Tool] Modifying appointment with params:', params);
    
    const { appointment_id, verification_info, new_date, new_time, prefer_am, prefer_pm, specific_time } = params;
    
    // Find and verify the appointment
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointment_id,
        OR: [
          { clientPhoneNumber: verification_info },
          { clientEmail: verification_info }
        ]
      },
      include: {
        calendar: true
      }
    });
    
    if (!appointment) {
      return JSON.stringify({
        success: false,
        message: "Appointment not found or verification failed."
      });
    }
    
    // If they want to check availability first
    if (!new_time && (new_date || prefer_am || prefer_pm || specific_time)) {
      const checkParams = {
        date: new_date || appointment.startTime.toISOString().split('T')[0],
        prefer_am: prefer_am,
        prefer_pm: prefer_pm,
        specific_time: specific_time,
        duration: Math.floor((appointment.endTime.getTime() - appointment.startTime.getTime()) / (1000 * 60))
      };
      
      const availabilityResult = await handleCheckAvailability(checkParams, calendarConfig);
      const availabilityData = JSON.parse(availabilityResult);
      
      if (!availabilityData.success || !availabilityData.available) {
        return JSON.stringify({
          success: false,
          message: availabilityData.message
        });
      }
      
      // Return availability info and ask for confirmation
      return JSON.stringify({
        success: true,
        message: availabilityData.message + `\n\n*To confirm the change, please let me know if this time works.*`,
        needsConfirmation: true,
        suggestedTime: availabilityData.nextSlotTime
      });
    }
    
    // If they provided specific new date/time, update the appointment
    if (new_date && new_time) {
      const newStartTime = new Date(`${new_date}T${new_time}:00`);
      const duration = appointment.endTime.getTime() - appointment.startTime.getTime();
      const newEndTime = new Date(newStartTime.getTime() + duration);
      
      // Update the appointment
      const updatedAppointment = await prisma.appointment.update({
        where: { id: appointment_id },
        data: {
          startTime: newStartTime,
          endTime: newEndTime
        }
      });
      
      const friendlyDate = newStartTime.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: DEFAULT_TIMEZONE
      });
      const friendlyTime = newStartTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      return JSON.stringify({
        success: true,
        message: `✅ **Your appointment has been successfully rescheduled!**\n\n**New Date:** ${friendlyDate}\n**New Time:** ${friendlyTime}\n\n*You will receive an updated confirmation email.*`
      });
    }
    
    return JSON.stringify({
      success: false,
      message: "Please specify the new date and time for your appointment."
    });
  } catch (error) {
    console.error('[Calendar Tool] Error modifying appointment:', error);
    return JSON.stringify({
      success: false,
      message: "Failed to modify appointment. Please try again."
    });
  }
}

// Handler for canceling appointment
export async function handleCancelAppointment(params: any) {
  try {
    console.log('[Calendar Tool] Canceling appointment with params:', params);
    
    const { appointment_id, verification_info, reason } = params;
    
    // Find and verify the appointment
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointment_id,
        OR: [
          { clientPhoneNumber: verification_info },
          { clientEmail: verification_info }
        ]
      }
    });
    
    if (!appointment) {
      return JSON.stringify({
        success: false,
        message: "Appointment not found or verification failed."
      });
    }
    
    // Update the appointment status to CANCELLED
    await prisma.appointment.update({
      where: { id: appointment_id },
      data: {
        status: 'CANCELLED',
        description: appointment.description + (reason ? `\n\nCancellation reason: ${reason}` : '')
      }
    });
    
    return JSON.stringify({
      success: true,
      message: `✅ **Your appointment has been cancelled.**\n\n*Appointment ID: \`${appointment_id}\`*\n\nIf you'd like to book a new appointment, just let me know!`
    });
  } catch (error) {
    console.error('[Calendar Tool] Error canceling appointment:', error);
    return JSON.stringify({
      success: false,
      message: "Failed to cancel appointment. Please try again."
    });
  }
} 