import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next"; // Import session logic
import { authOptions } from "@/lib/auth"; // Import auth options
import { updateAppointment, deleteAppointment } from '@/lib/api/appointments'; // Import update/delete logic
import type { AppointmentInput } from "@/lib/api/appointments"; // Import input type

interface RouteParams {
    params: {
        appointmentId: string;
    }
}

// PATCH /api/appointments/[appointmentId]
export async function PATCH(request: Request, { params }: RouteParams) {
    const { appointmentId } = params;

    if (!appointmentId) {
        return NextResponse.json({ error: 'Missing appointmentId parameter' }, { status: 400 });
    }

    try {
        // Get authenticated user
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userId = session.user.id;

        const body = await request.json();

        // --- Input Validation ---
        // Validate the fields being updated (e.g., status must be valid enum)
        // For now, we pass the partial body directly to the update function,
        // which has its own internal checks (like checking calendar ownership if calendarId changes).
        const updateInput: Partial<AppointmentInput> & { calendarId?: string } = body;
        // ------------------------

        // Pass appointmentId, updateInput, and authenticated userId to the update function
        const updatedAppointment = await updateAppointment(appointmentId, updateInput, userId);

        return NextResponse.json(updatedAppointment);

    } catch (error) {
        console.error(`Error updating appointment ${appointmentId}:`, error);
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        // Handle specific errors like "Not Found" potentially with 404
        if (message.includes("not found")) { 
            return NextResponse.json({ error: `Appointment not found` }, { status: 404 });
        }
        return NextResponse.json({ error: `Failed to update appointment: ${message}` }, { status: 500 });
    }
}

// DELETE /api/appointments/[appointmentId]
export async function DELETE(request: Request, { params }: RouteParams) {
    const { appointmentId } = params;

    if (!appointmentId) {
        return NextResponse.json({ error: 'Missing appointmentId parameter' }, { status: 400 });
    }

    try {
        // Get authenticated user
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userId = session.user.id;

        // TODO: Add authentication/authorization check here 
        // Ensure the logged-in user OWNS this appointment before allowing delete.
        // NOTE: deleteAppointment function in lib still needs refactoring to accept userId

        await deleteAppointment(appointmentId);

        return new NextResponse(null, { status: 204 }); // 204 No Content on successful deletion

    } catch (error) {
        console.error(`Error deleting appointment ${appointmentId}:`, error);
        const message = error instanceof Error ? error.message : 'Internal Server Error';
         // Handle specific errors like "Not Found" potentially with 404
        if (message.includes("not found")) { 
            return NextResponse.json({ error: `Appointment not found` }, { status: 404 });
        }
        return NextResponse.json({ error: `Failed to delete appointment: ${message}` }, { status: 500 });
    }
}

// Optional: GET /api/appointments/[appointmentId]
// export async function GET(request: Request, { params }: RouteParams) {
//     const { appointmentId } = params;
//     // ... implementation to fetch single appointment by ID ...
// } 