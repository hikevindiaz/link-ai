import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next"

import { authOptions } from "@/lib/auth"
import { db } from '@/lib/db';
import OpenAI from 'openai';
import { z } from 'zod';
import { deleteFromSupabase } from '@/lib/supabase';

const routeContextSchema = z.object({
    params: z.object({
        fileId: z.string(),
    }),
})

async function verifyCurrentUserHasAccessToFile(fileId: string) {
    const session = await getServerSession(authOptions)

    const count = await db.file.count({
        where: {
            id: fileId,
            userId: session?.user?.id,
        },
    })

    return count > 0
}


export async function DELETE(
    request: Request,
    context: z.infer<typeof routeContextSchema>
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session) {
            return new Response("Unauthorized", { status: 403 })
        }

        const { params } = routeContextSchema.parse(context)

        if (!(await verifyCurrentUserHasAccessToFile(params.fileId))) {
            return new Response(null, { status: 403 })
        }

        const openAIConfig = await db.openAIConfig.findUnique({
            select: {
                globalAPIKey: true,
                id: true,
            },
            where: {
                userId: session?.user?.id
            }
        })
        if (!openAIConfig?.globalAPIKey) {
            return new Response("Missing OpenAI API key", { status: 400, statusText: "Missing OpenAI API key" })
        }

        const file = await db.file.findUnique({
            select: {
                id: true,
                openAIFileId: true,
                blobUrl: true,
                // @ts-ignore - these fields exist in the schema
                storageUrl: true,
                storageProvider: true,
                name: true,
            },
            where: {
                id: params.fileId
            }
        })

        if (!file) {
            return new Response(null, { status: 404 })
        }

        // Delete from storage based on provider
        // @ts-ignore - storageProvider exists in the schema
        if (file.storageProvider === 'supabase') {
            // Extract path from storage URL - assumes the URL pattern from Supabase
            // Expected format: https://[project-ref].supabase.co/storage/v1/object/public/[bucket]/[path]
            // @ts-ignore - storageUrl exists in the schema
            const url = new URL(file.storageUrl);
            const pathParts = url.pathname.split('/');
            const bucketIndex = pathParts.findIndex(part => part === 'public') + 1;
            
            if (bucketIndex > 0 && bucketIndex < pathParts.length) {
                const bucket = pathParts[bucketIndex];
                const path = pathParts.slice(bucketIndex + 1).join('/');
                
                await deleteFromSupabase(path, bucket);
            }
        } else if (file.blobUrl) {
            // For backward compatibility, try to delete from Vercel Blob if URL exists
            try {
                const { del } = await import('@vercel/blob');
                await del(file.blobUrl);
            } catch (error) {
                console.log(`Failed to delete from Vercel Blob: ${error}`);
            }
        }

        try {
            const openai = new OpenAI({
                apiKey: openAIConfig?.globalAPIKey
            })
    
            await openai.files.del(file.openAIFileId)
        } catch (error) {
            console.log(`Cant delete file in OpenAI ${error}`)
        }

        await db.file.delete({
            where: {
                id: params.fileId,
            }
        })

        return NextResponse.json({ deleted: true }, { status: 200 });
    } catch (error) {
        console.error(error)
        return new Response(null, { status: 500 })
    }
}
