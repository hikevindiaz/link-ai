import { NextResponse } from 'next/server';
import { updateCalendar, deleteCalendar } from '@/lib/api/appointments'; // Import update/delete logic
import type { CalendarUpdateInput } from "@/lib/api/appointments"; // Import input type
// We need a way to get the ACTUAL user ID server-side
// import { getCurrentUserId } from '@/lib/auth'; 

interface RouteParams {
    params: {
        calendarId: string;
    }
}

// PATCH /api/calendars/[calendarId]
export async function PATCH(request: Request, { params }: RouteParams) {
    const { calendarId } = params;

    if (!calendarId) {
        return NextResponse.json({ error: 'Missing calendarId parameter' }, { status: 400 });
    }

    try {
        // TODO: Add authentication check here (e.g., using getCurrentUserId)
        // const userId = await getCurrentUserId();
        // if (!userId) { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
        // Verify user owns the calendar before allowing update (handled within updateCalendar)

        const body = await request.json();

        // --- Input Validation ---
        const updateInput: CalendarUpdateInput = body;
        if (Object.keys(updateInput).length === 0) {
             return NextResponse.json({ error: 'Request body cannot be empty for update' }, { status: 400 });
        }
        // Validate name if present
        if (updateInput.name !== undefined && (typeof updateInput.name !== 'string' || updateInput.name.trim() === '')){
             return NextResponse.json({ error: 'Invalid calendar name' }, { status: 400 });
        }
        // TODO: Add more validation for specific settings fields if needed
        // ------------------------

        const updatedCalendar = await updateCalendar(calendarId, updateInput);

        return NextResponse.json(updatedCalendar);

    } catch (error) {
        console.error(`Error updating calendar ${calendarId}:`, error);
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        // Handle specific errors like "Not Found" or permission issues from the API layer
        if (message.includes("not found") || message.includes("permission")) { 
            return NextResponse.json({ error: `Calendar not found or permission denied` }, { status: 404 }); // Or 403 for permission
        }
        return NextResponse.json({ error: `Failed to update calendar: ${message}` }, { status: 500 });
    }
}

// DELETE /api/calendars/[calendarId]
export async function DELETE(request: Request, { params }: RouteParams) {
    const { calendarId } = params;

    if (!calendarId) {
        return NextResponse.json({ error: 'Missing calendarId parameter' }, { status: 400 });
    }

    try {
        // TODO: Add authentication check here (e.g., using getCurrentUserId)
        // const userId = await getCurrentUserId();
        // if (!userId) { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
        // Verify user owns the calendar before allowing delete (handled within deleteCalendar)
        
        await deleteCalendar(calendarId);

        return new NextResponse(null, { status: 204 }); // 204 No Content on successful deletion

    } catch (error) {
        console.error(`Error deleting calendar ${calendarId}:`, error);
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        // Handle specific errors like "Not Found" or permission issues
        if (message.includes("not found") || message.includes("permission")) { 
            return NextResponse.json({ error: `Calendar not found or permission denied` }, { status: 404 }); // Or 403
        }
        return NextResponse.json({ error: `Failed to delete calendar: ${message}` }, { status: 500 });
    }
}

// Optional: GET /api/calendars/[calendarId]
// export async function GET(request: Request, { params }: RouteParams) {
//     const { calendarId } = params;
//     // ... implementation to fetch single calendar by ID ...
// } 