import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  handleCheckAvailability,
  handleBookAppointment,
  handleViewAppointment,
  handleModifyAppointment,
  handleCancelAppointment
} from '@/app/api/chat-interface/handlers/calendar';

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { functionName, args, calendarConfig, chatbotUserId } = body;

    console.log('[Calendar API] Function call:', functionName, 'with args:', args);

    let result;
    switch (functionName) {
      case 'check_availability':
        result = await handleCheckAvailability(args, calendarConfig);
        break;
        
      case 'book_appointment':
        if (!chatbotUserId) {
          throw new Error('Chatbot user ID not provided');
        }
        result = await handleBookAppointment(args, calendarConfig, chatbotUserId);
        break;
        
      case 'view_appointment':
        result = await handleViewAppointment(args);
        break;
        
      case 'modify_appointment':
        result = await handleModifyAppointment(args, calendarConfig);
        break;
        
      case 'cancel_appointment':
        result = await handleCancelAppointment(args);
        break;
        
      default:
        throw new Error(`Unknown function: ${functionName}`);
    }

    return NextResponse.json({ result });
  } catch (error: any) {
    console.error('[Calendar API] Error:', error);
    return NextResponse.json({
      error: 'Calendar operation failed',
      message: error.message || 'Unknown error'
    }, { status: 500 });
  }
} 