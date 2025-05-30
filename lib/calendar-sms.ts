import { twilio } from './twilio';
import prisma from './prisma';
import { Appointment, Calendar, TwilioPhoneNumber } from '@prisma/client';

// Format appointment details for SMS
export function formatAppointmentSMS(appointment: Appointment & { calendar: Calendar }, type: 'confirmation' | 'reminder') {
  const date = appointment.startTime.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
  const time = appointment.startTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  if (type === 'confirmation') {
    return `Appointment Request:\n${date} at ${time}\n\nReply YES to confirm or NO to cancel.\n\nID: ${appointment.id.slice(-6)}`;
  } else {
    return `Reminder: Your appointment is ${date} at ${time}.\n\nID: ${appointment.id.slice(-6)}`;
  }
}

// Send SMS notification for appointment
export async function sendAppointmentSMS(
  appointmentId: string,
  type: 'confirmation' | 'reminder'
): Promise<boolean> {
  try {
    // Get appointment with calendar and chatbot details
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        calendar: {
          include: {
            chatbots: {
              include: {
                twilioPhoneNumber: true
              }
            }
          }
        }
      }
    });

    if (!appointment || !appointment.clientPhoneNumber) {
      console.error('Appointment not found or no phone number');
      return false;
    }

    // Check if SMS notifications are enabled
    if (type === 'confirmation' && !appointment.calendar.notificationSmsEnabled) {
      console.log('SMS notifications disabled for calendar');
      return false;
    }

    if (type === 'reminder' && !appointment.calendar.smsReminderEnabled) {
      console.log('SMS reminders disabled for calendar');
      return false;
    }

    // Find the phone number to send from (first chatbot with a phone number)
    const fromPhoneNumber = appointment.calendar.chatbots
      .map(cb => cb.twilioPhoneNumber)
      .find(pn => pn !== null);

    if (!fromPhoneNumber) {
      console.error('No phone number configured for calendar chatbots');
      return false;
    }

    // Format the message
    const message = formatAppointmentSMS(appointment, type);

    // Send SMS via Twilio
    const result = await twilio.messages.create({
      body: message,
      from: fromPhoneNumber.phoneNumber,
      to: appointment.clientPhoneNumber
    });

    console.log(`SMS ${type} sent for appointment ${appointmentId}:`, result.sid);

    // Log the SMS in the database
    await prisma.message.create({
      data: {
        message: `SMS ${type} sent`,
        response: message,
        threadId: `appointment-${appointmentId}`,
        from: 'system',
        userId: appointment.calendar.userId,
        chatbotId: appointment.calendar.chatbots[0]?.id || '',
      }
    });

    return true;
  } catch (error) {
    console.error(`Error sending SMS ${type}:`, error);
    return false;
  }
}

// Process SMS reply for appointment confirmation
export async function processAppointmentSMSReply(
  from: string,
  body: string,
  to: string
): Promise<string> {
  try {
    // Normalize the reply
    const normalizedReply = body.trim().toUpperCase();
    
    // Extract appointment ID if included in the message
    const idMatch = body.match(/ID:\s*([A-Za-z0-9]{6})/i);
    const appointmentIdSuffix = idMatch ? idMatch[1] : null;

    // Find recent pending appointments for this phone number
    const recentAppointments = await prisma.appointment.findMany({
      where: {
        clientPhoneNumber: from,
        status: 'PENDING',
        createdAt: {
          gte: new Date(Date.now() - 48 * 60 * 60 * 1000) // Last 48 hours
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        calendar: true
      }
    });

    // Find the appointment to update
    let appointment = null;
    
    if (appointmentIdSuffix) {
      // If ID provided, find exact match
      appointment = recentAppointments.find(apt => 
        apt.id.endsWith(appointmentIdSuffix.toLowerCase())
      );
    } else if (recentAppointments.length === 1) {
      // If only one pending appointment, use it
      appointment = recentAppointments[0];
    }

    if (!appointment) {
      return "No pending appointment found. Please include the appointment ID from your confirmation message.";
    }

    // Process the reply
    if (normalizedReply === 'YES' || normalizedReply === 'Y') {
      // Confirm the appointment
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { status: 'CONFIRMED' }
      });

      const date = appointment.startTime.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
      const time = appointment.startTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      return `✓ Appointment confirmed for ${date} at ${time}. See you then!`;
    } else if (normalizedReply === 'NO' || normalizedReply === 'N' || normalizedReply === 'CANCEL') {
      // Cancel the appointment
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { status: 'CANCELLED' }
      });

      return "Appointment cancelled. Thank you for letting us know.";
    } else {
      return "Please reply YES to confirm or NO to cancel your appointment.";
    }
  } catch (error) {
    console.error('Error processing appointment SMS reply:', error);
    return "Sorry, there was an error processing your reply. Please try again.";
  }
}

// Schedule reminder SMS for appointments
export async function scheduleAppointmentReminders(): Promise<void> {
  try {
    // Find appointments that need reminders sent
    const now = new Date();
    
    const appointmentsNeedingReminders = await prisma.appointment.findMany({
      where: {
        status: 'CONFIRMED',
        startTime: {
          gte: now,
          lte: new Date(now.getTime() + 24 * 60 * 60 * 1000) // Next 24 hours
        }
      },
      include: {
        calendar: true
      }
    });

    for (const appointment of appointmentsNeedingReminders) {
      const reminderTime = new Date(
        appointment.startTime.getTime() - appointment.calendar.reminderTimeMinutes * 60 * 1000
      );

      // If it's time to send the reminder
      if (reminderTime <= now) {
        // Check if we've already sent a reminder (could track this in a separate table)
        // For now, just send it
        await sendAppointmentSMS(appointment.id, 'reminder');
      }
    }
  } catch (error) {
    console.error('Error scheduling appointment reminders:', error);
  }
}

// Auto-cancel unconfirmed appointments after timeout
export async function autoCancelUnconfirmedAppointments(): Promise<void> {
  try {
    const now = new Date();

    const unconfirmedAppointments = await prisma.appointment.findMany({
      where: {
        status: 'PENDING',
        createdAt: {
          lte: new Date(now.getTime() - 24 * 60 * 60 * 1000) // Older than 24 hours
        }
      },
      include: {
        calendar: true
      }
    });

    for (const appointment of unconfirmedAppointments) {
      if (appointment.calendar.confirmationRequired) {
        const timeoutHours = appointment.calendar.confirmationTimeoutHours;
        const timeoutTime = new Date(
          appointment.createdAt.getTime() + timeoutHours * 60 * 60 * 1000
        );

        if (now >= timeoutTime) {
          // Cancel the appointment
          await prisma.appointment.update({
            where: { id: appointment.id },
            data: { 
              status: 'CANCELLED',
              description: appointment.description + '\n\nAuto-cancelled: No confirmation received'
            }
          });

          console.log(`Auto-cancelled unconfirmed appointment: ${appointment.id}`);
        }
      }
    }
  } catch (error) {
    console.error('Error auto-cancelling appointments:', error);
  }
} 