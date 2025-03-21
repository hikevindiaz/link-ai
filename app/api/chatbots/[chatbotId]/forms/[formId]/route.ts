import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// DELETE /api/chatbots/[chatbotId]/forms/[formId] - Remove association between a chatbot and a form
export async function DELETE(
  req: Request,
  { params }: { params: { chatbotId: string; formId: string } }
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
    
    // Check if association exists
    const existingAssociation = await prisma.chatbotForm.findUnique({
      where: {
        formId_chatbotId: {
          formId: params.formId,
          chatbotId: params.chatbotId,
        },
      },
    });
    
    if (!existingAssociation) {
      return NextResponse.json({ error: "Form is not associated with this chatbot" }, { status: 404 });
    }
    
    // Remove the association
    await prisma.chatbotForm.delete({
      where: {
        formId_chatbotId: {
          formId: params.formId,
          chatbotId: params.chatbotId,
        },
      },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing form association:", error);
    return NextResponse.json({ error: "Failed to remove form association" }, { status: 500 });
  }
} 