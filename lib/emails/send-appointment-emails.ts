import { render } from '@react-email/render';
import { email } from '@/lib/email';
import AppointmentConfirmationEmail from '@/emails/appointment-confirmation';
import AppointmentReminderEmail from '@/emails/appointment-reminder';
import prisma from '@/lib/prisma';
import { Appointment, Calendar, User } from '@prisma/client';

export interface AppointmentWithDetails extends Appointment {
  calendar: Calendar & {
    user: User;
    chatbots: Array<{ name: string }>;
  };
}

/**
 * Send appointment confirmation email
 */
export async function sendAppointmentConfirmationEmail(appointmentId: string): Promise<boolean> {
  try {
    console.log('[Email] Starting confirmation email process for appointment:', appointmentId);
    
    // Check if Resend is properly initialized
    if (!email) {
      console.error('[Email] Resend email client not initialized');
      return false;
    }
    
    // Check if API key exists
    if (!process.env.RESEND_API_KEY) {
      console.error('[Email] RESEND_API_KEY environment variable not found');
      return false;
    }
    
    // Fetch appointment with related data
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        calendar: {
          include: {
            user: true,
            chatbots: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    if (!appointment) {
      console.error('[Email] Appointment not found:', appointmentId);
      return false;
    }

    if (!appointment.clientEmail) {
      console.error('[Email] No client email found for appointment:', appointmentId);
      return false;
    }

    console.log('[Email] Sending to:', appointment.clientEmail);

    // Email notifications are always enabled since there's no field to control this
    // If you want to add this control later, add notificationEmailEnabled to the Calendar model
    console.log('[Email] Preparing email content for appointment:', appointmentId);

    // Format date and time for display
    const appointmentDate = appointment.startTime.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const appointmentTime = appointment.startTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    // Also pass the raw datetime for calendar link generation
    const appointmentDateTime = appointment.startTime.toISOString();

    // Extract location from description if it contains location info
    const locationRegex = /Location:\s*(.+?)(?:\n|$)/;
    const locationMatch = appointment.description.match(locationRegex);
    const appointmentLocation = locationMatch ? locationMatch[1].trim() : appointment.calendar.defaultLocation;

    // Extract notes from description (everything after "Notes:")
    const notesRegex = /Notes:\s*(.+?)(?:\nLocation:|$)/;
    const notesMatch = appointment.description.match(notesRegex);
    const appointmentNotes = notesMatch ? notesMatch[1].trim() : null;

    // Clean up the title (remove notes and location from description)
    let appointmentTitle = appointment.description
      .replace(/\n\nNotes:.*$/, '')
      .replace(/\nLocation:.*$/, '')
      .trim();

    if (!appointmentTitle || appointmentTitle === 'Appointment') {
      appointmentTitle = 'Your Appointment';
    }

    // Format booking creation date
    const bookedOn = appointment.createdAt.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    // Calculate reminder date (24 hours before appointment)
    const reminderDate = new Date(appointment.startTime.getTime() - 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    // Get chatbot name - use the first chatbot if available
    const chatbotName = appointment.calendar.chatbots[0]?.name || 'AI Assistant';

    // Render the email
    const emailHtml = render(AppointmentConfirmationEmail({
      appointmentTitle,
      appointmentDate,
      appointmentTime,
      appointmentDateTime,
      appointmentLocation,
      appointmentNotes,
      clientName: appointment.clientName,
      clientEmail: appointment.clientEmail,
      clientPhoneNumber: appointment.clientPhoneNumber || undefined,
      businessName: appointment.calendar.user.companyName || undefined,
      businessWebsite: appointment.calendar.user.businessWebsite || undefined,
      calendarOwnerName: appointment.calendar.user.name || undefined,
      calendarOwnerEmail: appointment.calendar.user.email || undefined,
      chatbotName,
      bookedOn,
      reminderDate,
    }));

    // Send the email
    console.log('[Email] Attempting to send via Resend API...');
    console.log('[Email] From:', `${appointment.calendar.user.companyName || appointment.calendar.user.name || 'Link AI'} <no-reply@getlinkai.com>`);
    console.log('[Email] To:', appointment.clientEmail);
    console.log('[Email] Subject:', `${appointment.clientName}, your appointment is confirmed ✅`);
    console.log('[Email] Reply-to:', appointment.calendar.user.email || 'hello@getlinkai.com');
    console.log('[Email] HTML length:', emailHtml.length);
    
    try {
      const result = await email.emails.send({
        from: `${appointment.calendar.user.companyName || appointment.calendar.user.name || 'Link AI'} <no-reply@getlinkai.com>`,
        to: appointment.clientEmail,
        subject: `${appointment.clientName}, your appointment is confirmed ✅`,
        html: emailHtml,
        reply_to: appointment.calendar.user.email || 'hello@getlinkai.com',
      });

      console.log('[Email] Appointment confirmation email sent successfully:', result);
      console.log('[Email] Result details:', JSON.stringify(result));
      return true;
    } catch (resendError: any) {
      console.error('[Email] Resend API error:', resendError?.message || resendError);
      if (resendError?.response) {
        console.error('[Email] Resend response status:', resendError.response.status);
        console.error('[Email] Resend response data:', resendError.response.data);
      }
      throw resendError; // Re-throw to be caught by outer catch
    }
  } catch (error) {
    console.error('[Email] Error sending appointment confirmation email:', error);
    console.error('[Email] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      fullError: error
    });
    return false;
  }
}

/**
 * Send appointment reminder email
 */
export async function sendAppointmentReminderEmail(appointmentId: string): Promise<boolean> {
  try {
    // Fetch appointment with related data
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        calendar: {
          include: {
            user: true,
            chatbots: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    if (!appointment) {
      console.error('Appointment not found:', appointmentId);
      return false;
    }

    if (!appointment.clientEmail) {
      console.error('No client email found for appointment:', appointmentId);
      return false;
    }

    // Email reminders are always enabled since there's no field to control this
    // If you want to add this control later, add emailReminderEnabled to the Calendar model
    console.log('Sending reminder email for appointment:', appointmentId);

    // Check if appointment is in the future
    const now = new Date();
    if (appointment.startTime <= now) {
      console.log('Appointment is in the past, skipping reminder:', appointmentId);
      return false;
    }

    // Calculate time until appointment
    const timeDifference = appointment.startTime.getTime() - now.getTime();
    const hoursUntil = Math.floor(timeDifference / (1000 * 60 * 60));
    const minutesUntil = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));

    let reminderTime = '';
    if (hoursUntil >= 24) {
      const daysUntil = Math.floor(hoursUntil / 24);
      reminderTime = `${daysUntil} day${daysUntil > 1 ? 's' : ''}`;
    } else if (hoursUntil >= 1) {
      reminderTime = `${hoursUntil} hour${hoursUntil > 1 ? 's' : ''}`;
    } else {
      reminderTime = `${minutesUntil} minute${minutesUntil > 1 ? 's' : ''}`;
    }

    // Format date and time for display
    const appointmentDate = appointment.startTime.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const appointmentTime = appointment.startTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    // Also pass the raw datetime for calendar link generation
    const appointmentDateTime = appointment.startTime.toISOString();

    // Extract location from description if it contains location info
    const locationRegex = /Location:\s*(.+?)(?:\n|$)/;
    const locationMatch = appointment.description.match(locationRegex);
    const appointmentLocation = locationMatch ? locationMatch[1].trim() : appointment.calendar.defaultLocation;

    // Extract notes from description (everything after "Notes:")
    const notesRegex = /Notes:\s*(.+?)(?:\nLocation:|$)/;
    const notesMatch = appointment.description.match(notesRegex);
    const appointmentNotes = notesMatch ? notesMatch[1].trim() : null;

    // Clean up the title (remove notes and location from description)
    let appointmentTitle = appointment.description
      .replace(/\n\nNotes:.*$/, '')
      .replace(/\nLocation:.*$/, '')
      .trim();

    if (!appointmentTitle || appointmentTitle === 'Appointment') {
      appointmentTitle = 'Your Appointment';
    }

    // Generate booking ID for the reminder
    const bookingId = `LK-${appointment.createdAt.getFullYear()}-${appointment.id.slice(-6)}`;

    // Get chatbot name - use the first chatbot if available
    const chatbotName = appointment.calendar.chatbots[0]?.name || 'AI Assistant';

    // Render the email
    const emailHtml = render(AppointmentReminderEmail({
      appointmentTitle,
      appointmentDate,
      appointmentTime,
      appointmentDateTime,
      appointmentLocation,
      appointmentNotes,
      clientName: appointment.clientName,
      clientEmail: appointment.clientEmail,
      clientPhoneNumber: appointment.clientPhoneNumber || undefined,
      businessName: appointment.calendar.user.companyName || undefined,
      businessWebsite: appointment.calendar.user.businessWebsite || undefined,
      calendarOwnerName: appointment.calendar.user.name || undefined,
      calendarOwnerEmail: appointment.calendar.user.email || undefined,
      chatbotName,
      reminderTime,
      bookingId,
    }));

    // Send the email
    const result = await email.emails.send({
      from: `${appointment.calendar.user.companyName || appointment.calendar.user.name || 'Link AI'} <no-reply@getlinkai.com>`,
      to: appointment.clientEmail,
      subject: `${appointment.clientName}, your appointment is in ${reminderTime} ⏰`,
      html: emailHtml,
      reply_to: appointment.calendar.user.email || 'hello@getlinkai.com',
    });

    console.log('Appointment reminder email sent:', result);
    return true;
  } catch (error) {
    console.error('Error sending appointment reminder email:', error);
    return false;
  }
}

/**
 * Schedule reminder emails for an appointment
 */
export async function scheduleAppointmentReminders(appointmentId: string): Promise<void> {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        calendar: true
      }
    });

    if (!appointment) {
      return;
    }

    // Schedule reminders for all appointments with email addresses
    if (!appointment.clientEmail) {
      console.log('No email address provided, skipping reminder scheduling');
      return;
    }

    // Calculate reminder time
    const reminderTime = new Date(appointment.startTime);
    reminderTime.setMinutes(reminderTime.getMinutes() - appointment.calendar.reminderTimeMinutes);

    // Only schedule if reminder time is in the future
    const now = new Date();
    if (reminderTime > now) {
      // Here you would typically schedule the reminder with a job queue
      // For now, we'll log it - you can integrate with a service like Vercel Cron or similar
      console.log(`Reminder scheduled for appointment ${appointmentId} at ${reminderTime.toISOString()}`);
      
      // You could store this in a reminders table or use a job queue service
      // For immediate implementation, you might want to use Vercel Cron jobs or similar
    }
  } catch (error) {
    console.error('Error scheduling appointment reminders:', error);
  }
} 