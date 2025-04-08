import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { put } from '@vercel/blob';
import OpenAI from "openai";
import { randomUUID } from 'crypto';
import { Prisma } from "@prisma/client";
import { ensureVectorStore, updateChatbotsWithKnowledgeSource } from "@/lib/knowledge-vector-integration";
import { getOpenAIClient } from "@/lib/openai";
import { addFileToVectorStore } from "@/lib/vector-store";

const routeContextSchema = z.object({
  params: z.object({
    sourceId: z.string(),
  }),
});

// Schema for content creation/update
const contentSchema = z.object({
  content: z.string().min(1, "Content is required"),
  type: z.enum(["text", "TextContent"]), // Accept both formats for backward compatibility
  id: z.string().optional(), // Optional for updates
});

// Verify user has access to the knowledge source
async function verifyUserHasAccessToSource(sourceId: string, userId: string) {
  try {
    const count = await db.knowledgeSource.count({
      where: {
        id: sourceId,
        userId: userId,
      },
    });

    return count > 0;
  } catch (error: unknown) {
    // If the table doesn't exist, no one has access
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
      return false;
    }
    throw error;
  }
}

// Generate a simple ID for files
function generateFileId() {
  return `file_${randomUUID().replace(/-/g, '')}`;
}

// GET handler to fetch content for a knowledge source
export async function GET(
  req: Request,
  context: z.infer<typeof routeContextSchema>
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new Response("Unauthorized", { status: 403 });
    }

    // Validate route params
    const { params } = routeContextSchema.parse(context);
    const { sourceId } = params;

    // Verify user has access to the knowledge source
    const hasAccess = await verifyUserHasAccessToSource(sourceId, session.user.id);
    if (!hasAccess) {
      return new Response("Unauthorized", { status: 403 });
    }

    // Get content type from query params
    const url = new URL(req.url);
    const type = url.searchParams.get("type");

    // Fetch content based on type
    let content = [];
    if (type === "text") {
      content = await db.textContent.findMany({
        where: {
          knowledgeSourceId: sourceId,
        },
        orderBy: {
          updatedAt: "desc",
        },
      });
    } else if (type === "file") {
      content = await db.file.findMany({
        where: {
          knowledgeSourceId: sourceId,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    } else if (type === "website") {
      content = await db.websiteContent.findMany({
        where: {
          knowledgeSourceId: sourceId,
        },
        orderBy: {
          updatedAt: "desc",
        },
      });
    } else if (type === "qa") {
      content = await db.qAContent.findMany({
        where: {
          knowledgeSourceId: sourceId,
        },
        orderBy: {
          updatedAt: "desc",
        },
      });
    } else if (type === "catalog") {
      content = await db.catalogContent.findMany({
        where: {
          knowledgeSourceId: sourceId,
        },
        orderBy: {
          updatedAt: "desc",
        },
      });
    } else {
      // If no type specified, return all content
      const textContent = await db.textContent.findMany({
        where: { knowledgeSourceId: sourceId },
      });
      const files = await db.file.findMany({
        where: { knowledgeSourceId: sourceId },
      });
      const websites = await db.websiteContent.findMany({
        where: { knowledgeSourceId: sourceId },
      });
      const qa = await db.qAContent.findMany({
        where: { knowledgeSourceId: sourceId },
      });
      const catalog = await db.catalogContent.findMany({
        where: { knowledgeSourceId: sourceId },
      });

      content = [
        ...textContent.map(item => ({ ...item, contentType: "text" })),
        ...files.map(item => ({ ...item, contentType: "file" })),
        ...websites.map(item => ({ ...item, contentType: "website" })),
        ...qa.map(item => ({ ...item, contentType: "qa" })),
        ...catalog.map(item => ({ ...item, contentType: "catalog" })),
      ];
    }

    return new Response(JSON.stringify(content), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching content:", error);
    return new Response(`Internal Server Error: ${error instanceof Error ? error.message : 'Unknown error'}`, { status: 500 });
  }
}

// Handle file uploads
async function handleFileUpload(req: Request, context: z.infer<typeof routeContextSchema>) {
  let fileId: string | undefined;

  try {
    console.log("Starting file upload handling");
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new Response("Unauthorized", { status: 403 });
    }

    const { sourceId } = context.params;
    console.log(`Processing file upload for knowledge source: ${sourceId}`);
    
    try {
      const formData = await req.formData();
      const file = formData.get('file') as File;

      if (!file) {
        console.error("No file provided in form data");
        return new Response(
          JSON.stringify({ error: "No file provided" }),
          { 
            status: 400,
            headers: { "Content-Type": "application/json" }
          }
        );
      }

      console.log(`Received file: ${file.name}, Type: ${file.type}, Size: ${file.size} bytes`);

      // Check file type
      const allowedTypes = [
        'application/pdf', // PDF
        'text/csv', // CSV
        'text/plain', // TXT
        'application/vnd.ms-excel', // XLS
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
        'application/msword', // DOC
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
      ];

      if (!allowedTypes.includes(file.type)) {
        console.error(`Unsupported file type: ${file.type}`);
        return new Response(
          JSON.stringify({ 
            error: `File type not supported. Allowed types: PDF, CSV, TXT, XLS, XLSX, DOC, DOCX` 
          }),
          { 
            status: 400,
            headers: { "Content-Type": "application/json" }
          }
        );
      }

      // Check file size (10MB limit)
      const MAX_SIZE = 10 * 1024 * 1024; // 10MB
      if (file.size > MAX_SIZE) {
        return new Response(
          JSON.stringify({ 
            error: `File size exceeds the 10MB limit` 
          }),
          { 
            status: 400,
            headers: { "Content-Type": "application/json" }
          }
        );
      }

      // Import the uploadToSupabase function and ensure required buckets exist
      const { uploadToSupabase, ensureRequiredBuckets } = await import('@/lib/supabase');
      await ensureRequiredBuckets();

      // Upload to Supabase
      const uploadResult = await uploadToSupabase(
        file,
        'files',  // bucket
        'knowledge',  // folder
        session.user.id,  // userId
        file.name  // fileName
      );

      if (!uploadResult) {
        throw new Error('Failed to upload file to storage');
      }

      // Upload to OpenAI
      const openai = getOpenAIClient();
      const uploadedFile = await openai.files.create({
        file,
        purpose: "assistants"
      });

      // Create the file record with the actual OpenAI file ID
      fileId = crypto.randomUUID();
      await db.file.create({
        data: {
          id: fileId,
          userId: session.user.id,
          name: file.name,
          openAIFileId: uploadedFile.id,
          blobUrl: uploadResult.url, // Keep for backwards compatibility
          // @ts-ignore - storageUrl and storageProvider exist in the schema but TypeScript doesn't recognize them
          storageUrl: uploadResult.url,
          storageProvider: 'supabase',
          createdAt: new Date(),
          knowledgeSourceId: sourceId
        }
      });

      // Ensure vector store exists and add file to it
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

      // Return success response
      return new Response(
        JSON.stringify({
          id: fileId,
          name: file.name,
          openAIFileId: uploadedFile.id,
          blobUrl: uploadResult.url,
          storageUrl: uploadResult.url,
          message: 'File uploaded and added to vector store successfully'
        }),
        { 
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    } catch (formDataError) {
      console.error("Error processing form data:", formDataError);
      return new Response(
        JSON.stringify({ 
          error: "Error processing upload data",
          details: formDataError instanceof Error ? formDataError.message : "Unknown error"
        }),
        { 
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  } catch (error) {
    console.error("Error in handleFileUpload:", error);
    return new Response(
      JSON.stringify({ 
        error: "Failed to process file upload", 
        details: error instanceof Error ? error.message : "Unknown error"
      }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}

// POST handler to create new content or upload files
export async function POST(
  req: Request,
  context: z.infer<typeof routeContextSchema>
) {
  try {
    // Check if this is a file upload (multipart form data)
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      return handleFileUpload(req, context);
    }

    // If not a file upload, handle as regular content creation
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new Response("Unauthorized", { status: 403 });
    }

    // Validate route params
    const { params } = routeContextSchema.parse(context);
    const { sourceId } = params;

    // Verify user has access to the knowledge source
    const hasAccess = await verifyUserHasAccessToSource(sourceId, session.user.id);
    if (!hasAccess) {
      return new Response("Unauthorized", { status: 403 });
    }

    // Parse request body
    const json = await req.json();
    const body = contentSchema.parse(json);

    // Normalize the type value
    const normalizedType = body.type.toLowerCase() === "textcontent" ? "text" : body.type;

    // Create content based on type
    if (normalizedType === "text") {
      const textContent = await db.textContent.create({
        data: {
          content: body.content,
          knowledgeSource: {
            connect: {
              id: sourceId,
            },
          },
        },
      });

      return new Response(JSON.stringify(textContent), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    } else {
      return new Response(JSON.stringify({ error: "Invalid content type" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(error.errors), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.error("Error creating content:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// PUT handler to update existing content
export async function PUT(
  req: Request,
  context: z.infer<typeof routeContextSchema>
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new Response("Unauthorized", { status: 403 });
    }

    // Validate route params
    const { params } = routeContextSchema.parse(context);
    const { sourceId } = params;

    // Verify user has access to the knowledge source
    const hasAccess = await verifyUserHasAccessToSource(sourceId, session.user.id);
    if (!hasAccess) {
      return new Response("Unauthorized", { status: 403 });
    }

    // Parse request body
    const json = await req.json();
    const body = contentSchema.parse(json);

    if (!body.id) {
      return new Response(JSON.stringify({ error: "Content ID is required for updates" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Normalize the type value
    const normalizedType = body.type.toLowerCase() === "textcontent" ? "text" : body.type;

    // Update content based on type
    if (normalizedType === "text") {
      const textContent = await db.textContent.update({
        where: {
          id: body.id,
          knowledgeSourceId: sourceId,
        },
        data: {
          content: body.content,
        },
      });

      return new Response(JSON.stringify(textContent), {
        headers: { "Content-Type": "application/json" },
      });
    } else {
      return new Response(JSON.stringify({ error: "Invalid content type" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(error.errors), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.error("Error updating content:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// DELETE handler to delete content
export async function DELETE(
  req: Request,
  context: z.infer<typeof routeContextSchema>
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new Response("Unauthorized", { status: 403 });
    }

    // Validate route params
    const { params } = routeContextSchema.parse(context);
    const { sourceId } = params;

    // Verify user has access to the knowledge source
    const hasAccess = await verifyUserHasAccessToSource(sourceId, session.user.id);
    if (!hasAccess) {
      return new Response("Unauthorized", { status: 403 });
    }

    // Parse request body
    const json = await req.json();
    const { id, type } = json;

    if (!id) {
      return new Response(JSON.stringify({ error: "Content ID is required for deletion" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log(`Attempting to delete content: ${id} of type: ${type} from source: ${sourceId}`);

    // Delete content based on type
    if (type === "text" || type === "TextContent") {
      try {
        // First handle vector store cleanup
        const { handleTextContentDeletion } = await import('@/lib/knowledge-vector-integration');
        await handleTextContentDeletion(sourceId, id);
        console.log(`Handled vector store cleanup for text content ${id}`);
        
        // Then delete from database
        try {
          // @ts-ignore - The textContent model exists in the schema but TypeScript doesn't know about it yet
          await db.textContent.delete({
            where: {
              id: id,
              knowledgeSourceId: sourceId,
            },
          });
          
          console.log(`Successfully deleted text content ${id} from database and updated vector store`);
          return new Response(null, { status: 204 });
        } catch (dbError) {
          console.error("Error deleting text content:", dbError);
          
          // Try raw SQL as a fallback
          try {
            await db.$executeRaw`
              DELETE FROM "text_contents"
              WHERE id = ${id} AND "knowledgeSourceId" = ${sourceId}
            `;
            
            console.log(`Successfully deleted text content with raw SQL: ${id}`);
            return new Response(null, { status: 204 });
          } catch (sqlError) {
            console.error("SQL delete error:", sqlError);
            return new Response(JSON.stringify({ 
              error: "Failed to delete content", 
              details: String(sqlError) 
            }), { 
              status: 500,
              headers: { "Content-Type": "application/json" }
            });
          }
        }
      } catch (error) {
        console.error("Error handling text content deletion:", error);
        return new Response(JSON.stringify({ 
          error: "Failed to delete content and update vector store",
          details: error instanceof Error ? error.message : "Unknown error"
        }), { 
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    } else {
      return new Response(JSON.stringify({ error: "Invalid content type for deletion" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Error in DELETE handler:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Failed to delete content" 
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
} 