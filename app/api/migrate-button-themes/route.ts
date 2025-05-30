import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// Admin-only endpoint that can be run to migrate existing chatbots 
// to use the new buttonTheme field

export async function POST(req: NextRequest) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Check if user is admin (adjust based on your auth logic)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });
    
    if (user?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }
    
    // Get all chatbots without buttonTheme set
    const chatbotsToUpdate = await prisma.chatbot.findMany({
      where: {
        OR: [
          { buttonTheme: null },
          { buttonTheme: "" }
        ]
      },
      select: {
        id: true,
        chatBackgroundColor: true
      }
    });
    
    console.log(`Found ${chatbotsToUpdate.length} chatbots to update with button theme`);
    
    // Process updates in batches
    const updatePromises = chatbotsToUpdate.map(chatbot => {
      const isDarkTheme = chatbot.chatBackgroundColor === "#000000";
      return prisma.chatbot.update({
        where: { id: chatbot.id },
        data: {
          buttonTheme: isDarkTheme ? "dark" : "light"
        }
      });
    });
    
    // Execute all updates
    const results = await Promise.all(updatePromises);
    
    return NextResponse.json({
      success: true,
      message: `Successfully migrated ${results.length} chatbots to use buttonTheme`,
      dark: results.filter(r => r.buttonTheme === "dark").length,
      light: results.filter(r => r.buttonTheme === "light").length
    });
    
  } catch (error) {
    console.error("[API Error] Failed to migrate button themes:", error);
    return NextResponse.json(
      { error: "Failed to migrate button themes", details: (error as Error).message },
      { status: 500 }
    );
  }
} 