import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next"; // Import session logic
import { authOptions } from "@/lib/auth"; // Import auth options
import { fetchAppointments, createAppointment } from '@/lib/api/appointments'; // Import the server-side logic
import { sendAppointmentConfirmationEmail, scheduleAppointmentReminders } from '@/lib/emails/send-appointment-emails';
import { sendAppointmentSMS } from '@/lib/calendar-sms';
// We need a way to get the ACTUAL user ID server-side
// import { getCurrentUserId } from '@/lib/auth'; 
import type { AppointmentInput } from "@/lib/api/appointments"; // Import input type
import { NotificationTriggers } from '@/lib/services/notificationService';

// GET /api/appointments
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');
  const calendarId = searchParams.get('calendarId') || null; // Get optional calendarId

  // --- Input Validation ---
  if (!startDateParam || !endDateParam) {
    return NextResponse.json({ error: 'Missing required query parameters: startDate, endDate' }, { status: 400 });
  }

  const startDate = new Date(startDateParam);
  const endDate = new Date(endDateParam);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return NextResponse.json({ error: 'Invalid date format for startDate or endDate' }, { status: 400 });
  }

  // TODO: Add validation: endDate should be after startDate
  // if (endDate <= startDate) { ... }
  // ------------------------

  try {
    // Get authenticated user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;
    
    // Pass the authenticated userId to fetchAppointments
    const appointments = await fetchAppointments(userId, startDate, endDate, calendarId);
    
    return NextResponse.json(appointments);

  } catch (error) {
    console.error("Error fetching appointments:", error);
    // Avoid leaking internal error details
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 });
  }
}

// POST /api/appointments
export async function POST(request: Request) {
  try {
    // Get authenticated user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await request.json();

    // --- Input Validation ---
    const { calendarId, clientName, clientEmail, date, startTime, endTime, ...rest } = body;
    if (!calendarId || !clientName || !clientEmail || !date || !startTime || !endTime) {
      // Return the actual missing fields error from the frontend validation
      return NextResponse.json({ error: 'Missing required fields: calendarId, clientName, clientEmail, date, startTime, endTime' }, { status: 400 });
    }
    // Add check to prevent creating in "All Calendars"
    if (calendarId === 'all') {
      return NextResponse.json({ error: 'Cannot create an appointment in "All Calendars". Please select a specific calendar.' }, { status: 400 });
    }
    // TODO: Add more robust validation (date format, time format, etc.)
    // ------------------------

    // Prepare data conforming to AppointmentInput
    const appointmentInput: AppointmentInput = {
      calendarId,
      clientName,
      clientEmail,
      date,
      startTime,
      endTime,
      clientPhoneNumber: rest.clientPhoneNumber,
      description: rest.description,
      status: rest.status, // Assumes frontend sends valid AppointmentStatus or null
      color: rest.color,
    };

    // Call createAppointment with the input and the authenticated userId
    const newAppointment = await createAppointment(appointmentInput, userId);

    // Send email confirmation if email is provided
    if (newAppointment.clientEmail) {
      try {
        await sendAppointmentConfirmationEmail(newAppointment.id);
        await scheduleAppointmentReminders(newAppointment.id);
        console.log(`[Manual Appointment] Email confirmation sent for appointment ${newAppointment.id}`);
      } catch (error) {
        console.error('[Manual Appointment] Error sending email confirmation:', error);
        // Don't fail the creation if email fails - just log the error
      }
    }

    // Send SMS confirmation if enabled and phone is provided
    if (newAppointment.clientPhoneNumber) {
      try {
        // Get calendar info to check if SMS is enabled
        const prisma = require('@/lib/prisma').default;
        const calendar = await prisma.calendar.findUnique({
          where: { id: newAppointment.calendarId }
        });
        
        if (calendar?.notificationSmsEnabled) {
          await sendAppointmentSMS(newAppointment.id, 'confirmation');
          console.log(`[Manual Appointment] SMS confirmation sent for appointment ${newAppointment.id}`);
        }
      } catch (error) {
        console.error('[Manual Appointment] Error sending SMS confirmation:', error);
        // Don't fail the creation if SMS fails - just log the error
      }
    }

    // 🔔 CREATE NOTIFICATION - This is the key part!
    await NotificationTriggers.onAppointmentCreated({
      id: newAppointment.id,
      customerName: newAppointment.clientName,
      date: new Date(newAppointment.startTime).toLocaleDateString(),
      time: new Date(newAppointment.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      businessOwnerId: userId
    });

    return NextResponse.json(newAppointment, { status: 201 }); // 201 Created

  } catch (error) {
    console.error("Error creating appointment:", error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
     // Don't expose potentially sensitive validation errors directly unless intended
    return NextResponse.json({ error: `Failed to create appointment: ${message}` }, { status: 500 }); 
  }
}

// TODO: Add PATCH, DELETE handlers (will be in a dynamic route file) 