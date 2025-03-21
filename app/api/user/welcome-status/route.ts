import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";

// Force Node.js runtime instead of Edge Runtime
export const runtime = 'nodejs';

export async function GET() {
  try {
    // Get current session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        message: "Unauthorized"
      }, { status: 401 });
    }

    const userId = session.user.id;

    // Get raw user data without type restrictions
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        message: "User not found"
      }, { status: 404 });
    }

    // Count chatbots separately
    const chatbotCount = await db.chatbot.count({
      where: { userId }
    });

    // Count knowledge sources separately
    const knowledgeSourceCount = await db.knowledgeSource.count({
      where: { userId }
    });

    // Use type assertion for onboardingCompleted since it's not in the TypeScript types
    const onboardingCompleted = (user as any).onboardingCompleted || false;

    return NextResponse.json({
      success: true,
      onboardingCompleted,
      hasKnowledgeSource: knowledgeSourceCount > 0,
      hasChatbot: chatbotCount > 0
    });
  } catch (error) {
    console.error("[WELCOME_STATUS_ERROR]", error);
    return NextResponse.json({
      success: false,
      message: "Failed to get welcome status",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 