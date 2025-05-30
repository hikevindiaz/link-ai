import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { startOfDay, endOfDay, addDays, setHours, setMinutes, format, isBefore, isAfter, addMinutes } from 'date-fns';

export async function GET(
  req: NextRequest,
  { params }: { params: { calendarId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const duration = parseInt(searchParams.get('duration') || '30');

    if (!date) {
      return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 });
    }

    // Fetch calendar with settings
    const calendar = await prisma.calendar.findUnique({
      where: { id: params.calendarId },
      include: {
        appointments: {
          where: {
            startTime: {
              gte: startOfDay(new Date(date)),
              lte: endOfDay(new Date(date))
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
      return NextResponse.json({ error: 'Calendar not found' }, { status: 404 });
    }

    // Parse working hours
    const [startHour, startMinute] = calendar.workingHoursStart.split(':').map(Number);
    const [endHour, endMinute] = calendar.workingHoursEnd.split(':').map(Number);

    // Check if the requested date is a weekend and if weekends are disabled
    const requestedDate = new Date(date);
    const dayOfWeek = requestedDate.getDay();
    const isSaturday = dayOfWeek === 6;
    const isSunday = dayOfWeek === 0;

    if ((isSaturday && !calendar.includeSaturday) || (isSunday && !calendar.includeSunday)) {
      return NextResponse.json({ 
        available: false,
        message: 'This day is not available for bookings',
        slots: [] 
      });
    }

    // Generate all possible time slots for the day
    const slots = [];
    let currentSlot = setMinutes(setHours(new Date(date), startHour), startMinute);
    const endTime = setMinutes(setHours(new Date(date), endHour), endMinute);
    const now = new Date();
    const minimumBookingTime = addMinutes(now, (calendar as any).minimumAdvanceNotice);

    while (isBefore(currentSlot, endTime)) {
      const slotEnd = addMinutes(currentSlot, duration);
      
      // Check if slot end time exceeds working hours
      if (isAfter(slotEnd, endTime)) {
        break;
      }

      // Check if slot meets minimum advance notice
      if (isBefore(currentSlot, minimumBookingTime)) {
        currentSlot = addMinutes(currentSlot, 30); // Move to next 30-min slot
        continue;
      }

      // Check for conflicts with existing appointments
      const hasConflict = calendar.appointments.some(appointment => {
        const appointmentEnd = new Date(appointment.endTime);
        const appointmentStart = new Date(appointment.startTime);
        
        // Add buffer time
        const bufferedStart = addMinutes(appointmentStart, -(calendar as any).bufferBetweenAppointments);
        const bufferedEnd = addMinutes(appointmentEnd, (calendar as any).bufferBetweenAppointments);
        
        return (
          (currentSlot >= bufferedStart && currentSlot < bufferedEnd) ||
          (slotEnd > bufferedStart && slotEnd <= bufferedEnd) ||
          (currentSlot <= bufferedStart && slotEnd >= bufferedEnd)
        );
      });

      if (!hasConflict) {
        slots.push({
          start: format(currentSlot, "yyyy-MM-dd'T'HH:mm:ss"),
          end: format(slotEnd, "yyyy-MM-dd'T'HH:mm:ss"),
          display: format(currentSlot, 'h:mm a')
        });
      }

      // Move to next slot (30-minute intervals)
      currentSlot = addMinutes(currentSlot, 30);
    }

    return NextResponse.json({
      available: slots.length > 0,
      date: date,
      slots: slots,
      workingHours: {
        start: calendar.workingHoursStart,
        end: calendar.workingHoursEnd
      },
      settings: {
        minimumAdvanceNotice: (calendar as any).minimumAdvanceNotice,
        bufferBetweenAppointments: (calendar as any).bufferBetweenAppointments
      }
    });

  } catch (error) {
    console.error('Error checking availability:', error);
    return NextResponse.json(
      { error: 'Failed to check availability' },
      { status: 500 }
    );
  }
} 