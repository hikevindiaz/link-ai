import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// POST /api/chatbots/[chatbotId]/update-theme
export async function POST(
  req: NextRequest,
  { params }: { params: { chatbotId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "You must be logged in to update a chatbot's theme." },
        { status: 401 }
      );
    }

    const chatbotId = params.chatbotId;
    
    // Parse the request body
    const body = await req.json();
    
    console.log(`[API] Updating theme for chatbot ${chatbotId}:`, body);
    
    // Extract theme data from request body
    const { 
      buttonTheme,
      chatBackgroundColor,
      bubbleColor, 
      bubbleTextColor 
    } = body;
    
    // Validate required fields
    if (!chatBackgroundColor) {
      return NextResponse.json(
        { error: "chatBackgroundColor is required" },
        { status: 400 }
      );
    }
    
    try {
      // Get the chatbot to verify ownership using Prisma client
      const chatbot = await prisma.chatbot.findUnique({
        where: { id: chatbotId },
        select: { userId: true }
      });
      
      if (!chatbot) {
        return NextResponse.json(
          { error: "Chatbot not found" },
          { status: 404 }
        );
      }
      
      // Check if the user owns this chatbot
      if (chatbot.userId !== session.user.id) {
        return NextResponse.json(
          { error: "You don't have permission to update this chatbot" },
          { status: 403 }
        );
      }
      
      // Determine the values to update
      const isDarkTheme = chatBackgroundColor === "#000000";
      
      // Normalize the buttonTheme value to ensure consistent casing
      let normalizedButtonTheme: 'light' | 'dark';
      
      if (buttonTheme) {
        // Handle various possible inputs by normalizing to lowercase and trimming
        const normalizedValue = String(buttonTheme).toLowerCase().trim();
        normalizedButtonTheme = normalizedValue === 'dark' ? 'dark' : 'light';
        
        console.log(`[API] Normalized buttonTheme from "${buttonTheme}" to "${normalizedButtonTheme}"`);
      } else {
        // If no buttonTheme provided, derive from background color
        normalizedButtonTheme = isDarkTheme ? 'dark' : 'light';
        console.log(`[API] No buttonTheme provided, derived ${normalizedButtonTheme} from background color`);
      }
      
      const themeUpdateData = {
        buttonTheme: normalizedButtonTheme,
        chatBackgroundColor,
        bubbleColor: bubbleColor || (isDarkTheme ? "#000000" : "#FFFFFF"),
        bubbleTextColor: bubbleTextColor || (isDarkTheme ? "#FFFFFF" : "#000000")
      };
      
      console.log(`[API] Finalized theme data:`, themeUpdateData);
      
      // Try with a direct update using Prisma client
      try {
        console.log(`[API] Attempting Prisma update for chatbot ${chatbotId}`);
        
        const updatedChatbot = await prisma.chatbot.update({
          where: { id: chatbotId },
          data: themeUpdateData,
          select: {
            id: true,
            buttonTheme: true,
            chatBackgroundColor: true,
            bubbleColor: true,
            bubbleTextColor: true
          } as any
        });
        
        console.log(`[API] Prisma update successful:`, updatedChatbot);
        
        return NextResponse.json({ 
          success: true, 
          message: "Theme updated successfully",
          data: updatedChatbot
        });
      } 
      // If Prisma update fails, try with raw SQL as a last resort
      catch (prismaError) {
        console.error(`[API] Prisma update failed:`, prismaError);
        
        // Try direct SQL update as fallback
        try {
          console.log(`[API] Attempting direct SQL update`);
          
          // IMPORTANT: Use "chatbots" (lowercase, plural) as the table name
          await prisma.$executeRaw`
            UPDATE "chatbots" 
            SET 
              "buttonTheme" = ${normalizedButtonTheme},
              "chatBackgroundColor" = ${chatBackgroundColor},
              "bubbleColor" = ${bubbleColor || (isDarkTheme ? "#000000" : "#FFFFFF")},
              "bubbleTextColor" = ${bubbleTextColor || (isDarkTheme ? "#FFFFFF" : "#000000")}
            WHERE "id" = ${chatbotId}
          `;
          
          // Fetch the updated chatbot to return
          const updatedChatbot = await prisma.chatbot.findUnique({
            where: { id: chatbotId },
            select: {
              id: true,
              buttonTheme: true,
              chatBackgroundColor: true,
              bubbleColor: true,
              bubbleTextColor: true
            } as any
          });
          
          console.log(`[API] SQL update successful:`, updatedChatbot);
          
          return NextResponse.json({ 
            success: true, 
            message: "Theme updated successfully with SQL",
            data: updatedChatbot
          });
        } catch (sqlError) {
          console.error(`[API] SQL update failed:`, sqlError);
          throw new Error(`Both Prisma and SQL updates failed: ${sqlError.message}`);
        }
      }
    } catch (dbError) {
      console.error("[API Error] Database error:", dbError);
      return NextResponse.json(
        { error: "Database error", details: String(dbError) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[API Error] Failed to update theme:", error);
    return NextResponse.json(
      { error: "Failed to update theme", details: String(error) },
      { status: 500 }
    );
  }
}

// Also handle PUT for flexibility
export { POST as PUT }; 