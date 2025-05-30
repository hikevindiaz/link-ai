import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Assuming authOptions is defined here
import prisma from "@/lib/prisma"; // Use consistent prisma import
import type { CalendarCreateInput } from "@/lib/api/appointments"; // Import input type
// We will handle auth here later
// import { getCurrentUserId } from '@/lib/auth';

// GET /api/calendars
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;
    
    const calendars = await prisma.calendar.findMany({
        where: { userId: userId },
        orderBy: { createdAt: 'asc' },
    });
    
    return NextResponse.json(calendars);

  } catch (error) {
    console.error("Error fetching calendars:", error);
    return NextResponse.json({ error: 'Failed to fetch calendars' }, { status: 500 });
  }
}

// POST /api/calendars - Create a new calendar
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;
    
    const body = await request.json();

    // --- Input Validation ---
    const createInput: CalendarCreateInput = body;
    if (!createInput.name || typeof createInput.name !== 'string' || createInput.name.trim() === '') {
      return NextResponse.json({ error: 'Missing or invalid required field: name' }, { status: 400 });
    }
    // Optional: Add validation for any provided settings fields here if needed
    // ------------------------

    // Create calendar directly using prisma and the authenticated userId
    const newCalendar = await prisma.calendar.create({
        data: {
            ...createInput,
            userId: userId, // Include the actual user ID
        },
    });

    return NextResponse.json(newCalendar, { status: 201 }); // 201 Created

  } catch (error) {
    console.error("Error creating calendar:", error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    // Check for Prisma foreign key error specifically
    if (error.code === 'P2003') { 
      return NextResponse.json({ error: `Database error: User ID constraint failed.` }, { status: 500 });
    }
    return NextResponse.json({ error: `Failed to create calendar: ${message}` }, { status: 500 }); 
  }
}

// We can add POST here later to create calendars if needed 