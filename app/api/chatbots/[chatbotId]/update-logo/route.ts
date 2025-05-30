import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: { chatbotId: string } }
) {
  try {
    // Get user session for auth
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Extract chatbot ID from params
    const chatbotId = params.chatbotId;
    
    // Verify ownership of the chatbot
    const chatbot = await prisma.chatbot.findUnique({
      where: {
        id: chatbotId,
      },
      select: {
        id: true,
        userId: true,
      },
    });
    
    if (!chatbot) {
      return NextResponse.json({ error: 'Chatbot not found' }, { status: 404 });
    }
    
    if (chatbot.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden: You do not own this chatbot' }, { status: 403 });
    }
    
    // Get request body data
    const data = await request.json();
    const { logoUrl, iconType } = data;
    
    if (iconType !== 'logo' && iconType !== 'orb') {
      return NextResponse.json({ error: 'Invalid icon type. Must be "logo" or "orb"' }, { status: 400 });
    }
    
    // Validate logo URL when iconType is 'logo'
    if (iconType === 'logo' && !logoUrl && logoUrl !== null) {
      console.error(`Update failed: iconType is 'logo' but logoUrl is not provided: ${logoUrl}`);
      return NextResponse.json({ 
        error: 'Logo URL must be provided when icon type is "logo"',
        receivedData: { iconType, logoUrl }
      }, { status: 400 });
    }
    
    console.log(`Updating chatbot ${chatbotId} logo settings:`, {
      iconType,
      logoUrl: logoUrl ? `${logoUrl.substring(0, 30)}...` : null,
      settingToLogo: iconType === 'logo',
      willSetLogoUrl: iconType === 'logo' ? logoUrl : null
    });
    
    // Check the chatbot's current values before update
    const chatbotBefore = await prisma.chatbot.findUnique({
      where: {
        id: chatbotId,
      },
      select: {
        id: true,
        iconType: true,
        chatbotLogoURL: true,
      },
    });
    
    console.log(`Chatbot ${chatbotId} before update:`, {
      iconType: chatbotBefore?.iconType,
      chatbotLogoURL: chatbotBefore?.chatbotLogoURL ? `${chatbotBefore.chatbotLogoURL.substring(0, 30)}...` : null
    });
    
    // Directly execute SQL for maximum compatibility
    await prisma.$executeRawUnsafe(`
      UPDATE "chatbots" 
      SET "iconType" = '${iconType}'
      ${logoUrl === null ? `, "chatbotLogoURL" = NULL` : logoUrl ? `, "chatbotLogoURL" = '${logoUrl}'` : ''}
      WHERE "id" = '${chatbotId}'
    `);
    
    // Get the updated chatbot to return in the response
    const updatedChatbot = await prisma.chatbot.findUnique({
      where: {
        id: chatbotId,
      },
      select: {
        id: true,
        iconType: true,
        chatbotLogoURL: true,
      },
    });
    
    // Log the update
    console.log(`Chatbot ${chatbotId} after update:`, {
      iconType: updatedChatbot?.iconType,
      chatbotLogoURL: updatedChatbot?.chatbotLogoURL ? `${updatedChatbot.chatbotLogoURL.substring(0, 30)}...` : null,
      successfully_changed_iconType: chatbotBefore?.iconType !== updatedChatbot?.iconType,
      successfully_changed_logoUrl: chatbotBefore?.chatbotLogoURL !== updatedChatbot?.chatbotLogoURL
    });
    
    return NextResponse.json({
      success: true,
      message: 'Logo settings updated successfully',
      chatbot: {
        id: chatbotId,
        iconType: updatedChatbot?.iconType,
        chatbotLogoURL: updatedChatbot?.chatbotLogoURL,
      },
      changes: {
        iconType: {
          from: chatbotBefore?.iconType,
          to: updatedChatbot?.iconType,
          changed: chatbotBefore?.iconType !== updatedChatbot?.iconType
        },
        logoUrl: {
          from: chatbotBefore?.chatbotLogoURL ? 'URL present' : null,
          to: updatedChatbot?.chatbotLogoURL ? 'URL present' : null,
          changed: chatbotBefore?.chatbotLogoURL !== updatedChatbot?.chatbotLogoURL
        }
      }
    });
  } catch (error: any) {
    console.error('Error updating logo settings:', error);
    return NextResponse.json(
      { error: 'Failed to update logo settings', details: error.message },
      { status: 500 }
    );
  }
}

// Also handle PUT for flexibility
export { POST as PUT }; 