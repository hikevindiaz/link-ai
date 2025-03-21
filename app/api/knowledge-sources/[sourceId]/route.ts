import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

const routeContextSchema = z.object({
  params: z.object({
    sourceId: z.string(),
  }),
});

const updateSourceSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  description: z.string().optional(),
});

// Verify user has access to the knowledge source
async function verifyUserHasAccessToSource(sourceId: string, userId: string) {
  try {
    // @ts-ignore - The knowledgeSource model exists in the schema but TypeScript doesn't know about it yet
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

// GET handler to fetch a specific knowledge source
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

    try {
      // Verify user has access to the knowledge source
      const hasAccess = await verifyUserHasAccessToSource(sourceId, session.user.id);
      if (!hasAccess) {
        return new Response("Unauthorized", { status: 403 });
      }

      // Fetch the knowledge source
      // @ts-ignore - The knowledgeSource model exists in the schema but TypeScript doesn't know about it yet
      const source = await db.knowledgeSource.findUnique({
        where: {
          id: sourceId,
        },
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!source) {
        return new Response("Knowledge source not found", { status: 404 });
      }

      return new Response(JSON.stringify(source), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (dbError: unknown) {
      // Check if the error is because the table doesn't exist
      if (dbError instanceof Prisma.PrismaClientKnownRequestError && dbError.code === 'P2021') {
        console.error("Database table does not exist:", dbError);
        return new Response("Database tables not created. Please run 'npx prisma db push'", { status: 500 });
      }
      throw dbError;
    }
  } catch (error) {
    console.error("Error fetching knowledge source:", error);
    return new Response(`Internal Server Error: ${error instanceof Error ? error.message : 'Unknown error'}`, { status: 500 });
  }
}

// PATCH handler to update a knowledge source
export async function PATCH(
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

    try {
      // Verify user has access to the knowledge source
      const hasAccess = await verifyUserHasAccessToSource(sourceId, session.user.id);
      if (!hasAccess) {
        return new Response("Unauthorized", { status: 403 });
      }

      // Parse request body
      const json = await req.json();
      const body = updateSourceSchema.parse(json);

      // Update the knowledge source
      // @ts-ignore - The knowledgeSource model exists in the schema but TypeScript doesn't know about it yet
      const updatedSource = await db.knowledgeSource.update({
        where: {
          id: sourceId,
        },
        data: {
          name: body.name,
          description: body.description,
        },
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return new Response(JSON.stringify(updatedSource), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (dbError: unknown) {
      // Check if the error is because the table doesn't exist
      if (dbError instanceof Prisma.PrismaClientKnownRequestError && dbError.code === 'P2021') {
        console.error("Database table does not exist:", dbError);
        return new Response("Database tables not created. Please run 'npx prisma db push'", { status: 500 });
      }
      throw dbError;
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(error.errors), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.error("Error updating knowledge source:", error);
    return new Response(`Internal Server Error: ${error instanceof Error ? error.message : 'Unknown error'}`, { status: 500 });
  }
}

// DELETE handler to delete a knowledge source
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

    try {
      // Verify user has access to the knowledge source
      const hasAccess = await verifyUserHasAccessToSource(sourceId, session.user.id);
      if (!hasAccess) {
        return new Response("Unauthorized", { status: 403 });
      }

      // Delete the knowledge source (this will cascade delete all related content)
      // @ts-ignore - The knowledgeSource model exists in the schema but TypeScript doesn't know about it yet
      await db.knowledgeSource.delete({
        where: {
          id: sourceId,
        },
      });

      return new Response(null, { status: 204 });
    } catch (dbError: unknown) {
      // Check if the error is because the table doesn't exist
      if (dbError instanceof Prisma.PrismaClientKnownRequestError && dbError.code === 'P2021') {
        console.error("Database table does not exist:", dbError);
        return new Response("Database tables not created. Please run 'npx prisma db push'", { status: 500 });
      }
      throw dbError;
    }
  } catch (error) {
    console.error("Error deleting knowledge source:", error);
    return new Response(`Internal Server Error: ${error instanceof Error ? error.message : 'Unknown error'}`, { status: 500 });
  }
} 