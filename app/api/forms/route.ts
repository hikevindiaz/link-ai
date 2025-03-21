import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/forms - Get all forms for the current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const forms = await prisma.form.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        fields: {
          orderBy: {
            position: 'asc',
          },
        },
        _count: {
          select: {
            submissions: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    return NextResponse.json(forms);
  } catch (error) {
    console.error("Error fetching forms:", error);
    return NextResponse.json({ error: "Failed to fetch forms" }, { status: 500 });
  }
}

// POST /api/forms - Create a new form
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const body = await req.json();
    console.log("Received form data:", JSON.stringify(body, null, 2));
    
    const { name, description, status, fields } = body;
    
    if (!name || !fields || !Array.isArray(fields) || fields.length === 0) {
      return NextResponse.json({ 
        error: "Invalid form data",
        details: { name, fieldsProvided: !!fields, isArray: Array.isArray(fields), length: fields?.length }
      }, { status: 400 });
    }
    
    // Process fields to ensure they have the required properties
    const processedFields = fields.map((field, index) => ({
      name: field.name,
      description: field.description || "",
      type: field.type || "text",
      required: field.required || false,
      options: Array.isArray(field.options) ? field.options : [],
      position: index,
    }));
    
    try {
      const form = await prisma.form.create({
        data: {
          name,
          description: description || "",
          status: status || "active",
          userId: session.user.id,
          fields: {
            create: processedFields,
          },
        },
        include: {
          fields: {
            orderBy: {
              position: 'asc',
            },
          },
        },
      });
      
      return NextResponse.json(form);
    } catch (dbError: any) {
      console.error("Database error creating form:", dbError);
      return NextResponse.json({ 
        error: "Database error creating form", 
        details: dbError.message 
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Error creating form:", error);
    return NextResponse.json({ 
      error: "Failed to create form",
      details: error.message
    }, { status: 500 });
  }
} 