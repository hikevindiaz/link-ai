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
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Ensure vector store exists
    const vectorStoreId = await ensureVectorStore(sourceId);
    if (!vectorStoreId) {
      return NextResponse.json({ error: "Failed to create vector store" }, { status: 500 });
    }

    // Add file to vector store
    await addFileToVectorStore(vectorStoreId, file.openAIFileId);

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
    });
  } catch (error) {
    console.error("[VECTOR_POST]", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Failed to add file to vector store",
    }, { status: 500 });
  }
} 