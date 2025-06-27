import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { put } from '@vercel/blob';
import { randomUUID } from 'crypto';
import { Prisma } from "@prisma/client";
import { processContentV2, deleteContent, formatContent, VECTOR_SERVICE_VERSION } from "@/lib/vector-service";
import { createRollbackHandler } from '@/lib/rollback-system';
import { uploadToSupabase, ensureRequiredBuckets } from '@/lib/supabase';

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

// Handle file uploads with robust rollback
async function handleFileUpload(req: Request, context: z.infer<typeof routeContextSchema>) {
  // Create rollback handler
  const rollback = createRollbackHandler('file-upload');
  let fileId: string | undefined;

  try {
    console.log("=== STARTING SIMPLIFIED FILE UPLOAD PROCESS ===");
    console.log(`🔧 VECTOR SERVICE VERSION: ${VECTOR_SERVICE_VERSION}`);
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      console.log("❌ No session or user found");
      return new Response("Unauthorized", { status: 403 });
    }

    const { sourceId } = context.params;
    console.log(`✅ Session found for user: ${session.user.id}`);
    console.log(`✅ Processing file upload for knowledge source: ${sourceId}`);
    
    // Verify access to knowledge source
    const hasAccess = await verifyUserHasAccessToSource(sourceId, session.user.id);
    if (!hasAccess) {
      return new Response("Unauthorized", { status: 403 });
    }

    try {
      console.log("📋 Parsing form data...");
      const formData = await req.formData();
      const file = formData.get('file') as File;

      if (!file) {
        console.error("❌ No file provided in form data");
        return new Response(
          JSON.stringify({ error: "No file provided" }),
          { 
            status: 400,
            headers: { "Content-Type": "application/json" }
          }
        );
      }

      console.log(`✅ Received file: ${file.name}, Type: ${file.type}, Size: ${file.size} bytes`);

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

      // STEP 1: UPLOAD TO STORAGE
      console.log("📦 STEP 1: Uploading to storage...");
      await ensureRequiredBuckets();

      const uploadResult = await uploadToSupabase(
        file,
        'files',  // bucket
        'knowledge',  // folder
        session.user.id,  // userId
        file.name  // fileName
      );

      if (!uploadResult) {
        console.error("❌ STEP 1 FAILED: Failed to upload file to storage");
        throw new Error('Failed to upload file to storage');
      }
      
      // Record successful bucket upload for rollback
      rollback.recordBucketSuccess(uploadResult.url, 'files');
      console.log(`✅ STEP 1 COMPLETE: File uploaded to storage: ${uploadResult.url}`);

      // STEP 2: CREATE DATABASE RECORD
      console.log("💾 STEP 2: Creating database record...");
      const fileRecord = await db.file.create({
        data: {
          name: file.name,
          blobUrl: uploadResult.url,
          storageUrl: uploadResult.url,
          storageProvider: 'supabase',
          user: {
            connect: { id: session.user.id }
          },
          knowledgeSource: {
            connect: { id: sourceId }
          }
        }
      });
      
      fileId = fileRecord.id;
      
      // Record successful database entry for rollback
      rollback.recordDatabaseSuccess('file', fileRecord.id);
      console.log(`✅ STEP 2 COMPLETE: Database record created with ID: ${fileId}`);

      // STEP 3: CREATE SINGLE EMBEDDING JOB (NO TEXT EXTRACTION HERE)
      console.log(`🧠 STEP 3: Creating embedding job for processing...`);
      
      try {
        // Let processContentV2 handle all job checking and creation logic
        // This eliminates race conditions from double-checking
        const jobId = await processContentV2(
          sourceId,
          fileId,
          'file', // Use 'file' type so the edge function knows to extract text
          {
            content: '', // Empty content - edge function will extract
            metadata: {
              fileId: fileId,
              fileName: file.name,
              mimeType: file.type,
              storageUrl: uploadResult.url,
              storageProvider: 'supabase',
              uploadedAt: new Date().toISOString(),
              fileSize: file.size
            }
          }
        );

        if (jobId) {
          console.log(`✅ STEP 3 COMPLETE: Embedding job created: ${jobId}`);
          rollback.recordVectorSuccess(sourceId, fileId, 'file');
        } else {
          console.log(`✅ STEP 3 COMPLETE: File uploaded (vector document already exists)`);
        }
        
      } catch (vectorError) {
        console.error(`❌ STEP 3 FAILED: Embedding job creation failed`);
        console.error('Vector error details:', {
          message: vectorError instanceof Error ? vectorError.message : 'Unknown error',
          stack: vectorError instanceof Error ? vectorError.stack : undefined
        });
        
        // EXECUTE ROLLBACK
        await rollback.executeRollback(`Embedding job creation failed: ${vectorError instanceof Error ? vectorError.message : 'Unknown error'}`);
        
        // Return error to user with rollback confirmation
        throw new Error(`File processing failed at embedding job creation stage. All changes have been rolled back. Error: ${vectorError instanceof Error ? vectorError.message : 'Unknown error'}`);
      }

      // ALL STEPS SUCCESSFUL - Clear rollback data
      rollback.clear();
      console.log(`🎉 ALL STEPS COMPLETE: File upload operation successful`);

      // Return success response
      return new Response(
        JSON.stringify({
          id: fileId,
          name: file.name,
          blobUrl: uploadResult.url,
          storageUrl: uploadResult.url,
          message: 'File uploaded successfully and queued for processing'
        }),
        { 
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );

    } catch (formError) {
      console.error("Error processing form data:", formError);
      
      // Execute rollback if we have a fileId
      if (fileId) {
        await rollback.executeRollback(`Form processing error: ${formError instanceof Error ? formError.message : 'Unknown error'}`);
      }
      
      return new Response(
        JSON.stringify({ 
          error: `Error processing form data: ${formError instanceof Error ? formError.message : 'Unknown error'}` 
        }),
        { 
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

  } catch (outerError) {
    console.error("Outer catch - Critical error in file upload:", outerError);
    
    // Execute rollback if we have a fileId
    if (fileId) {
      await rollback.executeRollback(`Critical error: ${outerError instanceof Error ? outerError.message : 'Unknown error'}`);
    }
    
    return new Response(
      JSON.stringify({ 
        error: `Critical error in file upload: ${outerError instanceof Error ? outerError.message : 'Unknown error'}` 
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

    // Create content based on type with rollback protection
    if (normalizedType === "text") {
      const rollback = createRollbackHandler('text-content');
      
      try {
        // CHECKPOINT 1: DATABASE ENTRY
        console.log("💾 CHECKPOINT 1: Creating text content in database...");
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

        // Record successful database entry for rollback
        rollback.recordDatabaseSuccess('text', textContent.id);
        console.log(`✅ CHECKPOINT 1 COMPLETE: Text content created with ID: ${textContent.id}`);

        // CHECKPOINT 2: VECTOR PROCESSING
        try {
          console.log(`🧠 CHECKPOINT 2: Processing vectors for text content...`);
          const jobId = await processContentV2(sourceId, textContent.id, 'text', {
            content: body.content,
            metadata: {
              source: 'text_content',
              type: 'text'
            }
          });
          
          if (jobId) {
            console.log(`✅ CHECKPOINT 2 COMPLETE: Vector processing initiated for text content`);
          } else {
            console.log(`✅ CHECKPOINT 2 COMPLETE: Vector document already exists, skipping embedding`);
          }
          
          // Record successful vector processing for rollback
          rollback.recordVectorSuccess(sourceId, textContent.id, 'text');
          
        } catch (vectorError) {
          console.error(`❌ CHECKPOINT 2 FAILED: Vector processing failed`);
          
          // EXECUTE ROLLBACK
          await rollback.executeRollback(`Vector processing failed: ${vectorError instanceof Error ? vectorError.message : 'Unknown error'}`);
          
          throw new Error(`Text content processing failed at vector stage. All changes have been rolled back. Error: ${vectorError instanceof Error ? vectorError.message : 'Unknown error'}`);
        }

        // ALL CHECKPOINTS SUCCESSFUL
        rollback.clear();
        console.log(`🎉 ALL CHECKPOINTS COMPLETE: Text content operation successful`);

        return new Response(JSON.stringify(textContent), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
        
      } catch (error) {
        // Execute rollback for any partial operations
        await rollback.executeRollback(error instanceof Error ? error.message : 'Unknown error');
        
        return new Response(
          JSON.stringify({ 
            error: "Text content creation failed", 
            details: error instanceof Error ? error.message : "Unknown error",
            message: "All changes have been rolled back"
          }),
          { 
            status: 500,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
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

      // Update vector embeddings
      try {
        // STEP 1: Delete existing vector documents to force re-processing
        console.log(`Deleting existing vectors for text content ${textContent.id} before update`);
        await deleteContent(sourceId, 'text', textContent.id);
        
        // STEP 2: Process updated content
        const { content, metadata } = formatContent('text', { content: body.content });
        await processContentV2(sourceId, textContent.id, 'text', { content, metadata });
        console.log(`Queued updated text content ${textContent.id} for vector processing`);
      } catch (vectorError) {
        console.error(`Error queuing updated text content for vector processing:`, vectorError);
        // Don't fail the request if vector processing fails
      }

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
        await deleteContent(sourceId, 'text', id);
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