// lib/api/appointments.ts
import { PrismaClient, Calendar, Appointment, AppointmentStatus } from '@prisma/client';

// Re-export Prisma types so they can be used elsewhere via this module
export type { Calendar, Appointment }; // Export types needed only as types
export { AppointmentStatus }; // Export enum needed as a value (and implicitly as a type)

const prisma = new PrismaClient();

// Placeholder for getting the current user's ID
// In a real app, this would come from session, context, etc.
const getCurrentUserId = async (): Promise<string> => {
    // Replace with actual user ID retrieval logic
    // TODO: Replace with actual user ID retrieval logic
    
    // --- TEMPORARY FIX --- 
    // Return a hardcoded ID to prevent errors if no user exists yet
    // Replace this with your actual authentication logic later!
    const placeholderUserId = "user_placeholder_id_12345"; 
    console.log(`API using placeholder user ID: ${placeholderUserId}`);
    return placeholderUserId;
    // --- END TEMPORARY FIX ---

    // Original logic (commented out temporarily):
    // const user = await prisma.user.findFirst(); // Example: find the first user
    // if (!user) throw new Error("No user found for placeholder logic. Ensure users exist or update logic.");
    // return user.id;
};

// Type for frontend Appointment input - Align with Schema + Frontend needs
export type AppointmentInput = {
    clientName: string;
    clientPhoneNumber?: string;
    description?: string; // Added from schema
    date: string; // YYYY-MM-DD (Keep for frontend ease)
    startTime: string; // HH:MM (Keep for frontend ease, map to startTime)
    endTime: string; // HH:MM (Keep for frontend ease, map to endTime)
    status?: AppointmentStatus;
    color?: string; // Added from schema
    calendarId: string | null; // Added calendarId for selection
    // calendarId is added where needed in function signatures
};


// Type for Calendar settings input - Now includes booking configuration
export type CalendarSettingsInput = {
    // Name field for calendar
    name?: string;
    
    // Availability Settings
    workingHoursStart?: string;
    workingHoursEnd?: string;
    includeSaturday?: boolean;
    includeSunday?: boolean;
    
    // Notification Settings
    notificationSmsEnabled?: boolean;
    smsReminderEnabled?: boolean;
    reminderTimeMinutes?: number;
    confirmationRequired?: boolean;
    confirmationTimeoutHours?: number;
    
    // Booking Configuration (new fields)
    askForDuration?: boolean;
    askForNotes?: boolean;
    defaultDuration?: number;
    bufferBetweenAppointments?: number;
    maxBookingsPerSlot?: number;
    minimumAdvanceNotice?: number;
    requirePhoneNumber?: boolean;
    defaultLocation?: string;
    bookingPrompt?: string;
    confirmationMessage?: string;
};

// --- Calendar Functions ---

/**
 * Fetches all calendars associated with the current user.
 */
export const fetchCalendars = async (): Promise<Calendar[]> => {
    const userId = await getCurrentUserId();
    // Use the correct accessor from PrismaClient
    return prisma.calendar.findMany({
        where: { userId: userId },
        orderBy: { createdAt: 'asc' },
    });
};

/**
 * Updates the settings for a specific calendar using fields from schema.prisma.
 */
export const updateCalendarSettings = async (
    calendarId: string,
    settings: CalendarSettingsInput // Use the adjusted type
): Promise<Calendar> => {
    const userId = await getCurrentUserId();
    const calendar = await prisma.calendar.findFirst({
        where: { id: calendarId, userId: userId },
    });
    if (!calendar) {
        throw new Error("Calendar not found or access denied.");
    }

    // Update all fields including new booking configuration
    return prisma.calendar.update({
        where: { id: calendarId },
        data: {
            name: settings.name,
            // Availability Settings
            workingHoursStart: settings.workingHoursStart,
            workingHoursEnd: settings.workingHoursEnd,
            includeSaturday: settings.includeSaturday,
            includeSunday: settings.includeSunday,
            // Notification Settings
            notificationSmsEnabled: settings.notificationSmsEnabled,
            smsReminderEnabled: settings.smsReminderEnabled,
            reminderTimeMinutes: settings.reminderTimeMinutes,
            confirmationRequired: settings.confirmationRequired,
            confirmationTimeoutHours: settings.confirmationTimeoutHours,
            // Booking Configuration
            askForDuration: settings.askForDuration,
            askForNotes: settings.askForNotes,
            defaultDuration: settings.defaultDuration,
            bufferBetweenAppointments: settings.bufferBetweenAppointments,
            maxBookingsPerSlot: settings.maxBookingsPerSlot,
            minimumAdvanceNotice: settings.minimumAdvanceNotice,
            requirePhoneNumber: settings.requirePhoneNumber,
            defaultLocation: settings.defaultLocation,
            bookingPrompt: settings.bookingPrompt,
            confirmationMessage: settings.confirmationMessage,
        },
    });
};


// --- Appointment Functions ---

/**
 * Fetches appointments for a given calendar (or all calendars) within a date range.
 * Uses startTime for filtering.
 */
export const fetchAppointments = async (
    userId: string,
    startDate: Date,
    endDate: Date,
    calendarId?: string | null
): Promise<Appointment[]> => {
    // Filter based on fields in the Appointment model: bookedByUserId, startTime, endTime
    const whereClause: any = {
        // The user ID relation on Appointment is bookedByUserId
        bookedByUserId: userId,
        // Filter based on the appointment's start time
        startTime: {
            gte: startDate,
            lte: endDate, // Check if appointment STARTS within the range
        },
        // // Alternative: Check for overlap
        // OR: [
        //     { startTime: { lte: endDate }, endTime: { gte: startDate } }, // Overlaps range
        // ],
    };

    if (calendarId && calendarId !== 'all') {
        whereClause.calendarId = calendarId;
    }

    // Use the correct accessor 'appointment'
    return prisma.appointment.findMany({
        where: whereClause,
        include: {
             calendar: true, // Optionally include related calendar
             bookedByUser: true, // Optionally include related user
        },
        orderBy: {
            // Order by the correct field 'startTime'
            startTime: 'asc',
        },
    });
};

/**
 * Creates a new appointment using fields from schema.prisma.
 */
export const createAppointment = async (
    input: AppointmentInput, // Frontend input
    userId: string // Pass the authenticated user ID explicitly
): Promise<Appointment> => {
    // Ensure calendarId is present in the input from the frontend
    if (!input.calendarId) {
        throw new Error("Calendar ID is missing in the input.");
    }

    console.log("[createAppointment] Checking ownership - User ID:", userId, "Calendar ID:", input.calendarId);

    const calendar = await prisma.calendar.findFirst({
        where: { id: input.calendarId, userId: userId }, // Ensure creator owns the calendar
    });

    console.log("[createAppointment] Ownership check passed. Calendar found:", calendar.id);

    // Combine date and time strings into Date objects for startTime and endTime
    const startTimeString = `${input.date}T${input.startTime}:00`;
    const endTimeString = `${input.date}T${input.endTime}:00`; // Assumes end time is provided
    const startTime = new Date(startTimeString);
    const endTime = new Date(endTimeString);

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        throw new Error("Invalid date or time format provided.");
    }
    if (endTime <= startTime) {
         throw new Error("End time must be after start time.");
    }

    // Determine the initial status - using PENDING from schema enum as default
    // TODO: Revisit initial status logic if appointmentAutoConfirm is added to schema
    const initialStatus = input.status ?? AppointmentStatus.PENDING;

    // Prepare data for Prisma
    const dataToCreate = {
        calendarId: input.calendarId, // Should not be null here due to check above
        bookedByUserId: userId, // Should be the authenticated user's ID
        clientName: input.clientName,
        clientPhoneNumber: input.clientPhoneNumber,
        description: input.description ?? '',
        startTime: startTime,
        endTime: endTime,
        status: initialStatus,
        color: input.color ?? 'indigo',
    };

    console.log("[createAppointment] Data before Prisma create:", JSON.stringify(dataToCreate, null, 2));

    // Use the correct accessor 'appointment' and field names from schema
    try {
        const newAppointment = await prisma.appointment.create({
            data: dataToCreate,
        });
        console.log("[createAppointment] Successfully created appointment:", newAppointment.id);
        return newAppointment;
    } catch (error) {
        console.error("[createAppointment] Prisma create error:", error);
        // Re-throw the error so the API route can handle it
        throw error;
    }
};

/**
 * Updates an existing appointment using fields from schema.prisma.
 */
export const updateAppointment = async (
    id: string,
    input: Partial<AppointmentInput>, // Allow partial updates of AppointmentInput fields
    userId: string // Pass the authenticated user ID
): Promise<Appointment> => {
    // Verify ownership using bookedByUserId
    const existingAppointment = await prisma.appointment.findFirst({
        where: { id: id, bookedByUserId: userId }, // Use the passed userId
    });

    if (!existingAppointment) {
        throw new Error("Appointment not found or access denied.");
    }

    // Verify target calendar if changed
    if (input.calendarId && input.calendarId !== existingAppointment.calendarId) {
        const targetCalendar = await prisma.calendar.findFirst({
            where: { id: input.calendarId, userId: userId }, // Check user owns target calendar
        });
        if (!targetCalendar) {
            throw new Error("Target calendar for update not found or access denied.");
        }
    }

    // Handle date/time updates
    let startTime: Date | undefined = undefined;
    let endTime: Date | undefined = undefined;
    const baseDate = input.date ?? existingAppointment.startTime.toISOString().split('T')[0]; // Use input date or existing date

    if (input.startTime) {
        const startString = `${baseDate}T${input.startTime}:00`;
        startTime = new Date(startString);
        if (isNaN(startTime.getTime())) throw new Error("Invalid start time format.");
    }
     if (input.endTime) {
        const endString = `${baseDate}T${input.endTime}:00`;
        endTime = new Date(endString);
         if (isNaN(endTime.getTime())) throw new Error("Invalid end time format.");
    }

    // Ensure end time is after start time if both are being updated or one is updated relative to the other
    const finalStartTime = startTime ?? existingAppointment.startTime;
    const finalEndTime = endTime ?? existingAppointment.endTime;
    if (finalEndTime <= finalStartTime) {
        throw new Error("End time must be after start time.");
    }

    // Use the correct accessor 'appointment' and field names
    return prisma.appointment.update({
        where: { id: id },
        data: {
            ...(input.calendarId && { calendarId: input.calendarId }),
            ...(input.clientName && { clientName: input.clientName }),
            ...(input.clientPhoneNumber && { clientPhoneNumber: input.clientPhoneNumber }),
            ...(input.description && { description: input.description }),
            ...(startTime && { startTime: startTime }),
            ...(endTime && { endTime: endTime }),
            ...(input.status && { status: input.status }),
            ...(input.color && { color: input.color }),
        },
    });
};

/**
 * Deletes an appointment.
 */
export const deleteAppointment = async (id: string): Promise<Appointment> => {
    // Needs userId to verify ownership! Add userId parameter
    // const userId = await getCurrentUserId(); // Placeholder removed
    // TODO: Refactor to accept userId parameter similar to updateAppointment

    // Verify ownership using bookedByUserId
    // TODO: Implement ownership check using the passed userId
    // const appointment = await prisma.appointment.findFirst({
    //     where: { id: id, bookedByUserId: userId },
    // });

    // TODO: Throw error if appointment not found or user doesn't own it
    // if (!appointment) {
    //     throw new Error("Appointment not found or access denied for deletion.");
    // }

    // Use the correct accessor 'appointment'
    return prisma.appointment.delete({
        where: { id: id },
    });
};

// --- Calendar CRUD --- 

export type CalendarCreateInput = Pick<Calendar, 'name'> & Partial<CalendarSettingsInput>;

// Create a new Calendar
export async function createCalendar(data: CalendarCreateInput): Promise<Calendar> {
    const userId = await getCurrentUserId();

    // Combine required name with optional settings (providing defaults if necessary)
    const calendarData = {
        userId,
        name: data.name,
        // Availability Settings
        workingHoursStart: data.workingHoursStart ?? "09:00",
        workingHoursEnd: data.workingHoursEnd ?? "17:00",
        includeSaturday: data.includeSaturday ?? true,
        includeSunday: data.includeSunday ?? false,
        // Notification Settings
        notificationSmsEnabled: data.notificationSmsEnabled ?? false,
        smsReminderEnabled: data.smsReminderEnabled ?? false,
        reminderTimeMinutes: data.reminderTimeMinutes ?? 30,
        confirmationRequired: data.confirmationRequired ?? false,
        confirmationTimeoutHours: data.confirmationTimeoutHours ?? 24,
        // Booking Configuration (with defaults)
        askForDuration: data.askForDuration ?? true,
        askForNotes: data.askForNotes ?? true,
        defaultDuration: data.defaultDuration ?? 30,
        bufferBetweenAppointments: data.bufferBetweenAppointments ?? 15,
        maxBookingsPerSlot: data.maxBookingsPerSlot ?? 1,
        minimumAdvanceNotice: data.minimumAdvanceNotice ?? 60,
        requirePhoneNumber: data.requirePhoneNumber ?? true,
        defaultLocation: data.defaultLocation ?? null,
        bookingPrompt: data.bookingPrompt ?? null,
        confirmationMessage: data.confirmationMessage ?? null,
    };

    return prisma.calendar.create({ data: calendarData });
}

// Update Calendar Settings (including name)
export type CalendarUpdateInput = Partial<CalendarCreateInput>; // Can update name + settings

// Renamed from updateCalendarSettings to avoid conflict
export async function updateCalendar(calendarId: string, data: CalendarUpdateInput): Promise<Calendar> {
  const userId = await getCurrentUserId();

  // First, verify the user owns the calendar
  const calendar = await prisma.calendar.findUnique({
    where: { id: calendarId },
  });

  if (!calendar || calendar.userId !== userId) {
    throw new Error("Calendar not found or user does not have permission");
  }

  // Update the calendar with new data (name or settings)
  return prisma.calendar.update({
    where: { id: calendarId },
    data: { ...data }, // Spread the partial update data
  });
}

// Delete a Calendar
export async function deleteCalendar(calendarId: string): Promise<void> {
  const userId = await getCurrentUserId();

  // Verify ownership before deleting
  const calendar = await prisma.calendar.findUnique({
    where: { id: calendarId },
    select: { userId: true }, // Only need userId for verification
  });

  if (!calendar || calendar.userId !== userId) {
    throw new Error("Calendar not found or user does not have permission to delete");
  }

  // Prisma will cascade delete related appointments based on schema
  await prisma.calendar.delete({
    where: { id: calendarId },
  });
} 