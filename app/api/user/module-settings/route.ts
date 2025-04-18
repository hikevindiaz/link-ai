import { NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';
// Import NextAuth functions to get the session server-side
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth" // Adjust path if needed

const prisma = new PrismaClient();

// No longer need moduleFieldMap
// const moduleFieldMap: Record<string, ModuleEnablementField> = { ... };

export async function PATCH(request: Request) {
    try {
        // --- Get User ID from actual Session --- 
        const session = await getServerSession(authOptions); 
        if (!session?.user?.id) {
            // User is not authenticated
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userId = session.user.id;
        // --- End Session Check ---

        const body = await request.json();
        const { integrationId, isEnabled } = body; 

        // --- Input Validation ---
        if (typeof integrationId !== 'string' || integrationId.trim() === '') {
            return NextResponse.json({ error: 'Invalid or missing integrationId' }, { status: 400 });
        }
        if (typeof isEnabled !== 'boolean') {
            return NextResponse.json({ error: 'Invalid or missing isEnabled flag (must be boolean)' }, { status: 400 });
        }
        // TODO: Optional: Check if integrationId is a known/valid ID from a predefined list?
        // ------------------------

        // Upsert the setting for this user and integration
        const upsertedSetting = await prisma.userIntegrationSetting.upsert({
            where: {
                userId_integrationId: { 
                    userId: userId, // Use the actual userId from session
                    integrationId: integrationId,
                },
            },
            update: {
                isEnabled: isEnabled,
            },
            create: {
                userId: userId, // Use the actual userId from session
                integrationId: integrationId,
                isEnabled: isEnabled,
            },
            select: { 
                userId: true,
                integrationId: true,
                isEnabled: true,
                configuredAt: true,
            }
        });

        // Optionally, trigger session update if needed
        // (May not be necessary if client refetches or session polling is active)

        return NextResponse.json({ success: true, setting: upsertedSetting });

    } catch (error) {
        console.error("Error updating module settings:", error);
        const message = error instanceof Error ? error.message : 'Internal Server Error';
         // Check specific Prisma errors if needed, otherwise general error
        return NextResponse.json({ error: `Failed to update module settings: ${message}` }, { status: 500 });
    }
} 