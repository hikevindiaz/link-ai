import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next"

import { authOptions } from "@/lib/auth"
import { db } from '@/lib/db';
import OpenAI from 'openai';
import { getUserSubscriptionPlan } from '@/lib/subscription';
import { RequiresHigherPlanError } from '@/lib/exceptions';
import { fileTypes as codeTypes } from '@/lib/validations/codeInterpreter';
import { fileTypes as searchTypes } from '@/lib/validations/fileSearch';
import { uploadToSupabase, ensureRequiredBuckets } from '@/lib/supabase';

export const maxDuration = 60;

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session) {
            return new Response("Unauthorized", { status: 403 })
        }

        // Validate user subscription plan
        const { user } = session
        const subscriptionPlan = await getUserSubscriptionPlan(user.id)
        const count = await db.file.count({
            where: {
                userId: user.id,
            },
        })

        if (count >= subscriptionPlan.maxFiles) {
            throw new RequiresHigherPlanError()
        }

        const { searchParams } = new URL(request.url);
        const filename = searchParams.get('filename');

        if (!filename) {
            return new Response('Missing filename', { status: 400 });
        }

        const validExtensions = [...codeTypes, ...searchTypes];
        if (!validExtensions.includes(filename.split('.').pop()!)) {
            return new Response(`Invalid file extension, check the documentation for more information.`, { status: 400 });
        }

        if (!request.body) {
            return new Response('Missing body', { status: 400 });
        }

        // Ensure required buckets exist
        await ensureRequiredBuckets();

        // Get the file as a blob
        const fileBlob = await request.blob();

        // Upload to Supabase
        const uploadResult = await uploadToSupabase(
            fileBlob,
            'files',  // bucket
            '',       // folder
            user.id,  // userId
            filename  // fileName
        );

        if (!uploadResult) {
            return new Response('Failed to upload file to storage', { status: 500 });
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
            return new Response("Missing OpenAI API key. Add your API key in the Settings tab.", { status: 400, statusText: "Missing OpenAI API key" })
        }

        const openai = new OpenAI({
            apiKey: openAIConfig?.globalAPIKey
        })

        // Fetch the file from Supabase
        const response = await fetch(uploadResult.url);
        if (!response.ok) {
            throw new Error(`Failed to fetch file from storage: ${response.statusText}`);
        }

        const fileContent = await response.blob();

        // Upload to OpenAI
        const file = await openai.files.create({
            file: new File([fileContent], filename),
            purpose: 'assistants'
        });

        // Create file record
        await db.file.create({
            data: {
                name: filename,
                blobUrl: uploadResult.url, // Keep for backward compatibility
                // @ts-ignore - storageUrl and storageProvider exist in the schema but TypeScript doesn't recognize them
                storageUrl: uploadResult.url,
                storageProvider: 'supabase',
                openAIFileId: file.id,
                userId: session?.user?.id,
            }
        });

        return NextResponse.json({ url: uploadResult.url }, { status: 201 });
    } catch (error) {
        if (error instanceof RequiresHigherPlanError) {
            return new Response("Requires Higher plan", { status: 402 })
        }

        console.error('Error in file upload:', error);
        return new Response(
            JSON.stringify({ 
                error: 'Failed to upload file',
                message: error instanceof Error ? error.message : String(error)
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}