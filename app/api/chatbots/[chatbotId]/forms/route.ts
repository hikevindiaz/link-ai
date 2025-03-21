import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/chatbots/[chatbotId]/forms - Get all forms associated with a chatbot
export async function GET(
  req: Request,
  { params }: { params: { chatbotId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Check if chatbot exists and belongs to user
    const chatbot = await prisma.chatbot.findUnique({
      where: {
        id: params.chatbotId,
      },
      select: {
        userId: true,
      },
    });
    
    if (!chatbot) {
      return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });
    }
    
    if (chatbot.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    
    // Get all forms associated with the chatbot
    const chatbotForms = await prisma.chatbotForm.findMany({
      where: {
        chatbotId: params.chatbotId,
      },
      include: {
        form: {
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
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    // Format the response
    const forms = chatbotForms.map(cf => ({
      id: cf.form.id,
      name: cf.form.name,
      description: cf.form.description,
      status: cf.form.status,
      createdAt: cf.form.createdAt,
      updatedAt: cf.form.updatedAt,
      fields: cf.form.fields,
      submissionCount: cf.form._count.submissions,
    }));
    
    return NextResponse.json(forms);
  } catch (error) {
    console.error("Error fetching chatbot forms:", error);
    return NextResponse.json({ error: "Failed to fetch forms" }, { status: 500 });
  }
}

// POST /api/chatbots/[chatbotId]/forms - Associate a form with a chatbot
export async function POST(
  req: Request,
  { params }: { params: { chatbotId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { formId } = await req.json();
    
    if (!formId) {
      return NextResponse.json({ error: "Form ID is required" }, { status: 400 });
    }
    
    // Check if chatbot exists and belongs to user
    const chatbot = await prisma.chatbot.findUnique({
      where: {
        id: params.chatbotId,
      },
      select: {
        userId: true,
      },
    });
    
    if (!chatbot) {
      return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });
    }
    
    if (chatbot.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    
    // Check if form exists and belongs to user
    const form = await prisma.form.findUnique({
      where: {
        id: formId,
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
    
    // Check if association already exists
    const existingAssociation = await prisma.chatbotForm.findUnique({
      where: {
        formId_chatbotId: {
          formId,
          chatbotId: params.chatbotId,
        },
      },
    });
    
    if (existingAssociation) {
      return NextResponse.json({ error: "Form is already associated with this chatbot" }, { status: 400 });
    }
    
    // Create the association
    const chatbotForm = await prisma.chatbotForm.create({
      data: {
        formId,
        chatbotId: params.chatbotId,
      },
      include: {
        form: {
          include: {
            fields: {
              orderBy: {
                position: 'asc',
              },
            },
          },
        },
      },
    });
    
    return NextResponse.json({
      id: chatbotForm.form.id,
      name: chatbotForm.form.name,
      description: chatbotForm.form.description,
      status: chatbotForm.form.status,
      createdAt: chatbotForm.form.createdAt,
      updatedAt: chatbotForm.form.updatedAt,
      fields: chatbotForm.form.fields,
    });
  } catch (error) {
    console.error("Error associating form with chatbot:", error);
    return NextResponse.json({ error: "Failed to associate form with chatbot" }, { status: 500 });
  }
} 