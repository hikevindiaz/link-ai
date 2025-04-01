import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { getOpenAIClient } from '@/lib/openai';
import { ensureVectorStore, updateChatbotsWithKnowledgeSource } from '@/lib/knowledge-vector-integration';
import { addFileToVectorStore } from '@/lib/vector-store';
import { put } from '@vercel/blob';

export async function POST(
  req: Request,
  { params }: { params: { sourceId: string; contentId: string } }
) {
  let fileId: string | undefined;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { fileId: requestFileId, fileName, fileType, fileSize } = await req.json();
    fileId = requestFileId;

    console.log(`Starting chunked upload for file ${fileId} (${fileName})`);

    // Get the file record to get the blob URL
    const fileRecord = await db.file.findUnique({
      where: { id: fileId }
    });

    if (!fileRecord?.blobUrl) {
      throw new Error('File record not found or missing blob URL');
    }

    console.log(`Found file record with blob URL: ${fileRecord.blobUrl}`);

    // Get the file from the blob URL
    const blobResponse = await Promise.race([
      fetch(fileRecord.blobUrl) as Promise<Response>,
      new Promise<Response>((_, reject) => 
        setTimeout(() => reject(new Error('Blob fetch timed out')), 30000)
      )
    ]);

    if (!blobResponse.ok) {
      throw new Error(`Failed to fetch file from blob storage: ${blobResponse.status} ${blobResponse.statusText}`);
    }
    const blobData = await blobResponse.blob();
    
    console.log(`Successfully fetched file from blob storage, size: ${blobData.size} bytes`);
    
    // Convert blob to File object
    const file = new File([blobData], fileName, { type: fileType });

    // Upload to OpenAI with increased timeout
    console.log('Uploading file to OpenAI...');
    const openai = getOpenAIClient();
    const uploadedFile = await Promise.race([
      openai.files.create({
        file: file,
        purpose: "assistants"
      }) as Promise<{ id: string }>,
      new Promise<{ id: string }>((_, reject) => 
        setTimeout(() => reject(new Error('OpenAI upload timed out')), 30000)
      )
    ]);

    console.log(`File uploaded to OpenAI with ID: ${uploadedFile.id}`);

    // Update the file record with the OpenAI file ID
    await db.file.update({
      where: { id: fileId },
      data: { openAIFileId: uploadedFile.id }
    });

    console.log('Updated file record with OpenAI file ID');

    // Ensure vector store exists and add the file
    console.log(`Ensuring vector store exists for knowledge source ${params.sourceId}`);
    const vectorStoreId = await ensureVectorStore(params.sourceId);
    
    if (vectorStoreId) {
      console.log(`Vector store ${vectorStoreId} found or created. Adding file ${uploadedFile.id} to vector store.`);
      
      try {
        // Add the file to vector store with timeout
        await Promise.race([
          addFileToVectorStore(vectorStoreId, uploadedFile.id, 
            fileType.includes('pdf') ? 'pdf' : 'text') as Promise<void>,
          new Promise<void>((_, reject) => 
            setTimeout(() => reject(new Error('Vector store addition timed out')), 30000)
          )
        ]);
        
        console.log(`File added to vector store successfully`);
        
        // Update chatbots only after file has been added to vector store
        console.log(`Updating chatbots with knowledge source ${params.sourceId}`);
        await updateChatbotsWithKnowledgeSource(params.sourceId);
        
        console.log(`Vector store integration complete for file ${fileId}`);
      } catch (vectorError) {
        console.error(`Error integrating file with vector store:`, vectorError);
        // Don't throw here, we'll still return success since the file was uploaded
      }
    } else {
      console.error(`Failed to create or find vector store for knowledge source ${params.sourceId}`);
    }

    return new NextResponse(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in chunked upload:', error);
    
    // If we have a fileId, try to clean up the temporary file record
    if (fileId) {
      try {
        // First check if the file exists
        const existingFile = await db.file.findUnique({
          where: { id: fileId }
        });
        
        if (existingFile) {
          await db.file.delete({
            where: { id: fileId }
          });
          console.log(`Cleaned up file record for ${fileId}`);
        } else {
          console.log(`File record ${fileId} does not exist, skipping cleanup`);
        }
      } catch (deleteError) {
        console.error('Error cleaning up failed chunked upload:', deleteError);
        // Don't throw here, we want to return the original error
      }
    }

    return new NextResponse(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to process chunked upload'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
} 