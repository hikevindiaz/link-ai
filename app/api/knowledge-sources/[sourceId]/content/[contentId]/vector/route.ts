import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureVectorStore } from "@/lib/knowledge-vector-integration";
import { addFileToVectorStore } from "@/lib/vector-store";

export async function POST(
  req: Request,
  { params }: { params: { sourceId: string; contentId: string } }
) {
  try {
    // Check for user session
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sourceId, contentId } = params;
    const { openAIFileId } = await req.json(); // Get the OpenAI file ID from request body
    
    console.log(`Starting vector store integration for file ${contentId} with OpenAI ID ${openAIFileId}`);

    // Get the file details
    const file = await db.file.findUnique({
      where: {
        id: contentId,
        knowledgeSourceId: sourceId,
      },
      include: {
        knowledgeSource: true,
      },
    });

    if (!file) {
      console.error(`File ${contentId} not found in source ${sourceId}`);
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Use the OpenAI file ID from the request body instead of the database
    if (!openAIFileId) {
      console.error(`No OpenAI file ID provided for file ${contentId}`);
      return NextResponse.json({ error: "No OpenAI file ID provided" }, { status: 400 });
    }

    // Ensure vector store exists
    const vectorStoreId = await ensureVectorStore(sourceId);
    if (!vectorStoreId) {
      console.error(`Failed to create/get vector store for source ${sourceId}`);
      return NextResponse.json({ error: "Failed to create vector store" }, { status: 500 });
    }

    console.log(`Using vector store: ${vectorStoreId} for file ${openAIFileId}`);

    // Add file to vector store
    try {
      console.log(`Adding file ${openAIFileId} to vector store ${vectorStoreId}`);
      await addFileToVectorStore(vectorStoreId, openAIFileId);
      console.log(`Successfully added file ${openAIFileId} to vector store ${vectorStoreId}`);
    } catch (vectorError) {
      console.error(`Error adding file ${openAIFileId} to vector store ${vectorStoreId}:`, vectorError);
      return NextResponse.json({
        error: vectorError instanceof Error ? vectorError.message : "Failed to add file to vector store",
        details: vectorError instanceof Error ? vectorError.stack : undefined
      }, { status: 500 });
    }

    // Update the knowledge source's vectorStoreUpdatedAt timestamp
    await db.knowledgeSource.update({
      where: { id: sourceId },
      data: {
        vectorStoreUpdatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "File added to vector store successfully",
      details: {
        fileId: contentId,
        openAIFileId: openAIFileId,
        vectorStoreId
      }
    });
  } catch (error) {
    console.error("[VECTOR_POST]", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Failed to add file to vector store",
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 