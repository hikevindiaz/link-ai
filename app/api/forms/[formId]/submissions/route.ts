import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/forms/[formId]/submissions - Get all submissions for a form
export async function GET(
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
      select: {
        userId: true,
      },
    });
    
    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }
    
    if (form.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    
    // Get all submissions for the form with their field values
    const submissions = await prisma.formSubmission.findMany({
      where: {
        formId: params.formId,
      },
      include: {
        chatbot: {
          select: {
            id: true,
            name: true,
          },
        },
        fieldValues: {
          include: {
            field: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    // Transform the data to make it more usable in the frontend
    const formattedSubmissions = submissions.map(submission => {
      const data: Record<string, any> = {};
      
      // Convert field values to a more usable format
      submission.fieldValues.forEach(fieldValue => {
        data[fieldValue.field.name] = fieldValue.value;
      });
      
      return {
        id: submission.id,
        formId: submission.formId,
        chatbotId: submission.chatbotId,
        chatbotName: submission.chatbot.name,
        threadId: submission.threadId,
        createdAt: submission.createdAt,
        data,
      };
    });
    
    return NextResponse.json(formattedSubmissions);
  } catch (error) {
    console.error("Error fetching submissions:", error);
    return NextResponse.json({ error: "Failed to fetch submissions" }, { status: 500 });
  }
}

// POST /api/forms/[formId]/submissions - Create a new submission
export async function POST(
  req: Request,
  { params }: { params: { formId: string } }
) {
  try {
    const { chatbotId, threadId, fieldValues } = await req.json();
    
    if (!chatbotId || !fieldValues || typeof fieldValues !== 'object') {
      return NextResponse.json({ error: "Invalid submission data" }, { status: 400 });
    }
    
    // Check if form exists
    const form = await prisma.form.findUnique({
      where: {
        id: params.formId,
      },
      include: {
        fields: true,
      },
    });
    
    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }
    
    // Check if chatbot exists and is associated with the form
    const chatbotForm = await prisma.chatbotForm.findUnique({
      where: {
        formId_chatbotId: {
          formId: params.formId,
          chatbotId,
        },
      },
    });
    
    if (!chatbotForm) {
      return NextResponse.json({ error: "Chatbot is not associated with this form" }, { status: 400 });
    }
    
    // Validate required fields
    const requiredFields = form.fields.filter(field => field.required);
    for (const field of requiredFields) {
      if (!fieldValues[field.id] && fieldValues[field.id] !== 0) {
        return NextResponse.json({ 
          error: `Missing required field: ${field.name}` 
        }, { status: 400 });
      }
    }
    
    // Create submission and field values
    const submission = await prisma.formSubmission.create({
      data: {
        formId: params.formId,
        chatbotId,
        threadId,
        fieldValues: {
          create: Object.entries(fieldValues).map(([fieldId, value]) => ({
            fieldId,
            value: String(value),
          })),
        },
      },
      include: {
        fieldValues: {
          include: {
            field: true,
          },
        },
      },
    });
    
    // Format the response
    const data: Record<string, any> = {};
    submission.fieldValues.forEach(fieldValue => {
      data[fieldValue.field.name] = fieldValue.value;
    });
    
    return NextResponse.json({
      id: submission.id,
      formId: submission.formId,
      chatbotId: submission.chatbotId,
      threadId: submission.threadId,
      createdAt: submission.createdAt,
      data,
    });
  } catch (error) {
    console.error("Error creating submission:", error);
    return NextResponse.json({ error: "Failed to create submission" }, { status: 500 });
  }
} 