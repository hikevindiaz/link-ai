import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { getOpenAIClient } from '@/lib/openai';
import { ensureVectorStore } from '@/lib/knowledge-vector-integration';
import { addFileToVectorStore } from '@/lib/vector-store';

export async function POST(
  req: Request,
  { params }: { params: { sourceId: string; contentId: string } }
) {
  let fileId: string | undefined;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new Response("Unauthorized", { status: 403 });
    }

    const { sourceId, contentId } = params;
    const { fileId: requestFileId, fileName, fileType, fileSize, blobUrl } = await req.json();

    if (!requestFileId || !fileName || !fileType || !fileSize || !blobUrl) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    fileId = requestFileId;

    // Get the file from the blob URL
    const response = await fetch(blobUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch file from blob storage');
    }
    const fileBlob = await response.blob();
    const file = new File([fileBlob], fileName, { type: fileType });

    // Upload to OpenAI
    const openai = getOpenAIClient();
    const uploadedFile = await openai.files.create({
      file,
      purpose: "assistants"
    });

    // Ensure vector store exists
    const vectorStoreId = await ensureVectorStore(sourceId);
    if (!vectorStoreId) {
      throw new Error('Failed to create or get vector store');
    }

    // Add file to vector store
    try {
      await addFileToVectorStore(vectorStoreId, uploadedFile.id);
      console.log(`Successfully added file ${uploadedFile.id} to vector store ${vectorStoreId}`);
    } catch (vectorError) {
      console.error('Error adding file to vector store:', vectorError);
      // Clean up the OpenAI file since vector store integration failed
      try {
        await openai.files.del(uploadedFile.id);
        console.log(`Cleaned up OpenAI file ${uploadedFile.id} after vector store integration failed`);
      } catch (deleteError) {
        console.error('Error cleaning up OpenAI file:', deleteError);
      }
      throw vectorError;
    }

    // Update the file record with the OpenAI file ID
    await db.file.update({
      where: { id: fileId },
      data: { 
        openAIFileId: uploadedFile.id
      }
    });

    return new Response(JSON.stringify({ 
      success: true,
      message: 'File uploaded and added to vector store successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in chunked upload process:', error);
    
    // Clean up any temporary file records
    if (fileId) {
      try {
        const existingFile = await db.file.findUnique({
          where: { id: fileId }
        });
        
        if (existingFile) {
          await db.file.delete({
            where: { id: fileId }
          });
          console.log(`Cleaned up file record for ${fileId}`);
        }
      } catch (deleteError) {
        console.error("Error cleaning up failed file upload:", deleteError);
      }
    }
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Failed to upload file",
        details: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
} 