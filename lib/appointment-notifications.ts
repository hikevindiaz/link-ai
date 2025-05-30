import prisma from './prisma';
import { sendAppointmentSMS } from './calendar-sms';

// Trigger notifications for an appointment (SMS confirmation, etc.)
export async function triggerAppointmentNotifications(appointmentId: string): Promise<void> {
  try {
    console.log(`[Notifications] Triggering notifications for appointment: ${appointmentId}`);
    
    // Get appointment with calendar details
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
    
    if (!appointment) {
      console.error('[Notifications] Appointment not found:', appointmentId);
      return;
    }
    
    // Send SMS confirmation if enabled and phone number exists
    if (appointment.calendar.notificationSmsEnabled && appointment.clientPhoneNumber) {
      console.log('[Notifications] Sending SMS confirmation');
      await sendAppointmentSMS(appointmentId, 'confirmation');
    }
    
    // Future: Add other notification types here (email, etc.)
    console.log(`[Notifications] Notifications processed for appointment: ${appointmentId}`);
    
  } catch (error) {
    console.error('[Notifications] Error triggering notifications:', error);
  }
}

// Schedule reminder notifications for upcoming appointments
export async function scheduleReminders(): Promise<void> {
  try {
    console.log('[Notifications] Scheduling reminder notifications');
    
    const now = new Date();
    
    // Find confirmed appointments that need reminders in the next hour
    const appointmentsNeedingReminders = await prisma.appointment.findMany({
      where: {
        status: 'CONFIRMED',
        startTime: {
          gte: now,
          lte: new Date(now.getTime() + 60 * 60 * 1000) // Next hour
        }
      },
      include: {
        calendar: true
      }
    });
    
    for (const appointment of appointmentsNeedingReminders) {
      if (!appointment.calendar.smsReminderEnabled) continue;
      
      const reminderTime = new Date(
        appointment.startTime.getTime() - appointment.calendar.reminderTimeMinutes * 60 * 1000
      );
      
      // If it's time to send the reminder (within the next 5 minutes)
      if (reminderTime <= new Date(now.getTime() + 5 * 60 * 1000) && reminderTime >= now) {
        console.log(`[Notifications] Sending reminder for appointment: ${appointment.id}`);
        await sendAppointmentSMS(appointment.id, 'reminder');
      }
    }
    
  } catch (error) {
    console.error('[Notifications] Error scheduling reminders:', error);
  }
}

// Auto-cancel unconfirmed appointments
export async function autoCancelUnconfirmed(): Promise<void> {
  try {
    console.log('[Notifications] Auto-cancelling unconfirmed appointments');
    
    const now = new Date();
    
    const unconfirmedAppointments = await prisma.appointment.findMany({
      where: {
        status: 'PENDING',
        createdAt: {
          lte: new Date(now.getTime() - 4 * 60 * 60 * 1000) // Older than 4 hours
        }
      },
      include: {
        calendar: true
      }
    });
    
    for (const appointment of unconfirmedAppointments) {
      if (!appointment.calendar.confirmationRequired) continue;
      
      const timeoutTime = new Date(
        appointment.createdAt.getTime() + appointment.calendar.confirmationTimeoutHours * 60 * 60 * 1000
      );
      
      if (now >= timeoutTime) {
        console.log(`[Notifications] Auto-cancelling appointment: ${appointment.id}`);
        
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: { 
            status: 'CANCELLED',
            description: appointment.description + '\n\nAuto-cancelled: No confirmation received within timeout period'
          }
        });
      }
    }
    
  } catch (error) {
    console.error('[Notifications] Error auto-cancelling appointments:', error);
  }
} 