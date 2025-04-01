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
    const blobResponse = await fetch(fileRecord.blobUrl);
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
    const uploadedFile = await openai.files.create({
      file: file,
      purpose: "assistants"
    });

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
        await Promise.race<void>([
          addFileToVectorStore(vectorStoreId, uploadedFile.id, 
            fileType.includes('pdf') ? 'pdf' : 'text'),
          new Promise<void>((_, reject) => 
            setTimeout(() => reject(new Error('Vector store addition timed out')), 8000)
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
        await db.file.delete({
          where: { id: fileId }
        });
        console.log(`Cleaned up temporary file record for ${fileId}`);
      } catch (deleteError) {
        console.error('Error cleaning up failed chunked upload:', deleteError);
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