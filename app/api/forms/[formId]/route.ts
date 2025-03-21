import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/forms/[formId] - Get a specific form
export async function GET(
  req: Request,
  { params }: { params: { formId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const form = await prisma.form.findUnique({
      where: {
        id: params.formId,
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
    });
    
    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }
    
    if (form.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    
    return NextResponse.json(form);
  } catch (error) {
    console.error("Error fetching form:", error);
    return NextResponse.json({ error: "Failed to fetch form" }, { status: 500 });
  }
}

// PATCH /api/forms/[formId] - Update a form
export async function PATCH(
  req: Request,
  { params }: { params: { formId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Check if form exists and belongs to user
    const existingForm = await prisma.form.findUnique({
      where: {
        id: params.formId,
      },
    });
    
    if (!existingForm) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }
    
    if (existingForm.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    
    const { name, description, status, fields } = await req.json();
    
    // Update form basic info
    const formUpdate: any = {};
    if (name !== undefined) formUpdate.name = name;
    if (description !== undefined) formUpdate.description = description;
    if (status !== undefined) formUpdate.status = status;
    
    // Start a transaction to update form and fields
    const updatedForm = await prisma.$transaction(async (tx) => {
      // Update form
      const form = await tx.form.update({
        where: {
          id: params.formId,
        },
        data: formUpdate,
      });
      
      // If fields are provided, update them
      if (fields && Array.isArray(fields)) {
        // Delete existing fields
        await tx.formField.deleteMany({
          where: {
            formId: params.formId,
          },
        });
        
        // Create new fields
        await tx.formField.createMany({
          data: fields.map((field, index) => ({
            formId: params.formId,
            name: field.name,
            description: field.description,
            type: field.type,
            required: field.required || false,
            options: field.options || [],
            position: index,
          })),
        });
      }
      
      // Return updated form with fields
      return tx.form.findUnique({
        where: {
          id: params.formId,
        },
        include: {
          fields: {
            orderBy: {
              position: 'asc',
            },
          },
        },
      });
    });
    
    return NextResponse.json(updatedForm);
  } catch (error) {
    console.error("Error updating form:", error);
    return NextResponse.json({ error: "Failed to update form" }, { status: 500 });
  }
}

// DELETE /api/forms/[formId] - Delete a form
export async function DELETE(
  req: Request,
  { params }: { params: { formId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Check if form exists and belongs to user
    const form = await prisma.form.findUnique({
      where: {
        id: params.formId,
      },
    });
    
    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }
    
    if (form.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    
    // Delete the form (cascade will handle related records)
    await prisma.form.delete({
      where: {
        id: params.formId,
      },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting form:", error);
    return NextResponse.json({ error: "Failed to delete form" }, { status: 500 });
  }
} 