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
    const blobResponse = await Promise.race<Response>([
      fetch(fileRecord.blobUrl),
      new Promise<Response>((_, reject) => 
        setTimeout(() => reject(new Error('Blob fetch timed out')), 60000)
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
    const uploadedFile = await Promise.race<{ id: string }>([
      openai.files.create({
        file: file,
        purpose: "assistants"
      }),
      new Promise<{ id: string }>((_, reject) => 
        setTimeout(() => reject(new Error('OpenAI upload timed out')), 60000)
      )
    ]);

    console.log(`File uploaded to OpenAI with ID: ${uploadedFile.id}`);

    // Update the file record with the OpenAI file ID
    await db.file.update({
      where: { id: fileId },
      data: { openAIFileId: uploadedFile.id }
    });

    console.log('Updated file record with OpenAI file ID');

    // Start vector store integration in the background
    console.log(`Starting vector store integration for file ${fileId}`);
    try {
      const vectorResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/knowledge-sources/${params.sourceId}/content/${fileId}/vector`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          openAIFileId: uploadedFile.id
        }),
      });

      if (!vectorResponse.ok) {
        const errorData = await vectorResponse.json();
        console.error('Vector store integration failed:', errorData);
        throw new Error(`Vector store integration failed: ${errorData.error || vectorResponse.statusText}`);
      }

      const vectorResult = await vectorResponse.json();
      console.log('Vector store integration completed:', vectorResult);
    } catch (error) {
      console.error('Error in vector store integration:', error);
      // Don't throw here, as we want to return success for the upload even if vector store integration fails
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'File uploaded successfully. Vector store integration is processing in the background.'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in chunked upload:', error);
    
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
        console.error('Error cleaning up failed chunked upload:', deleteError);
      }
    }

    return new Response(
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