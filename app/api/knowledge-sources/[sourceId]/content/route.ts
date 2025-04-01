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

    // Parse the multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return new Response("No file provided", { status: 400 });
    }

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

    try {
      // Upload file to Vercel Blob
      const blob = await put(file.name, file, {
        access: 'public',
      });

      // Upload file to OpenAI for vector search
      const openai = getOpenAIClient();
      const uploadedFile = await openai.files.create({
        file: file,
        purpose: "assistants"
      });

      // Generate a file ID
      const fileId = generateFileId();

      // Create the file record in the database
      try {
        await db.$executeRaw`
          INSERT INTO "files" (
            "id", 
            "name", 
            "blobUrl", 
            "openAIFileId", 
            "userId", 
            "knowledgeSourceId", 
            "created_at"
          ) 
          VALUES (
            ${fileId}, 
            ${file.name}, 
            ${blob.url}, 
            ${uploadedFile.id}, 
            ${session.user.id}, 
            ${sourceId}, 
            ${new Date()}
          )
        `;

        // Ensure the source has a vector store and add the file to it
        try {
          // Wait for vector store operations to complete (don't use promise chaining)
          console.log(`Ensuring vector store exists for knowledge source ${sourceId}`);
          const vectorStoreId = await ensureVectorStore(sourceId);
          
          if (vectorStoreId) {
            console.log(`Vector store ${vectorStoreId} found or created. Adding file ${uploadedFile.id} to vector store.`);
            
            // Add the file explicitly to the vector store
            const { addFileToVectorStore } = await import('@/lib/vector-store');
            await addFileToVectorStore(vectorStoreId, uploadedFile.id, 
              file.type.includes('pdf') ? 'pdf' : 'text');
            
            // Update chatbots only after file has been added to vector store
            console.log(`File added to vector store. Updating chatbots with knowledge source.`);
            await updateChatbotsWithKnowledgeSource(sourceId);
            
            console.log(`Vector store integration complete for file ${fileId} (${file.name})`);
          } else {
            console.error(`Failed to create or find vector store for knowledge source ${sourceId}`);
          }
        } catch (vectorError) {
          console.error(`Error integrating file with vector store:`, vectorError);
          // Even though there was an error with vector store, we'll still return success 
          // since the file was uploaded successfully
        }

        // Return the file data
        return new Response(
          JSON.stringify({
            id: fileId,
            name: file.name,
            url: blob.url,
            openAIFileId: uploadedFile.id
          }),
          { 
            status: 200,
            headers: { "Content-Type": "application/json" }
          }
        );
      } catch (dbError) {
        console.error("Database error creating file:", dbError);
        return new Response(
          JSON.stringify({ 
            error: "Failed to save file to database", 
            details: String(dbError) 
          }),
          { 
            status: 500,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
    } catch (blobError) {
      console.error("Error uploading to Vercel Blob:", blobError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to upload file to storage", 
          details: String(blobError) 
        }),
        { 
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  } catch (error) {
    console.error("Error handling file upload:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Failed to upload file" 
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