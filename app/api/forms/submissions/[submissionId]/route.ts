import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/forms/submissions/[submissionId] - Get a specific submission
export async function GET(
  req: Request,
  { params }: { params: { submissionId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get the submission with its form and field values
    const submission = await prisma.formSubmission.findUnique({
      where: {
        id: params.submissionId,
      },
      include: {
        form: {
          select: {
            userId: true,
            name: true,
          },
        },
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
    });
    
    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }
    
    // Check if the user owns the form
    if (submission.form.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    
    // Format the response
    const data: Record<string, any> = {};
    submission.fieldValues.forEach(fieldValue => {
      data[fieldValue.field.name] = fieldValue.value;
    });
    
    return NextResponse.json({
      id: submission.id,
      formId: submission.formId,
      formName: submission.form.name,
      chatbotId: submission.chatbotId,
      chatbotName: submission.chatbot.name,
      threadId: submission.threadId,
      createdAt: submission.createdAt,
      data,
    });
  } catch (error) {
    console.error("Error fetching submission:", error);
    return NextResponse.json({ error: "Failed to fetch submission" }, { status: 500 });
  }
}

// DELETE /api/forms/submissions/[submissionId] - Delete a submission
export async function DELETE(
  req: Request,
  { params }: { params: { submissionId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get the submission to check ownership
    const submission = await prisma.formSubmission.findUnique({
      where: {
        id: params.submissionId,
      },
      include: {
        form: {
          select: {
            userId: true,
          },
        },
      },
    });
    
    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }
    
    // Check if the user owns the form
    if (submission.form.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    
    // Delete the submission (cascade will handle field values)
    await prisma.formSubmission.delete({
      where: {
        id: params.submissionId,
      },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting submission:", error);
    return NextResponse.json({ error: "Failed to delete submission" }, { status: 500 });
  }
} 