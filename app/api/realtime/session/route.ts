import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { buildSystemPrompt } from '@/app/api/chat-interface/utils/system-prompt';

// Valid OpenAI Realtime API voices
const OPENAI_REALTIME_VOICES = [
  'alloy', 'ash', 'ballad', 'coral', 'echo', 'sage', 'shimmer', 'verse'
] as const;

// Default voice mapping for common preferences
const DEFAULT_VOICE_MAP: Record<string, string> = {
  'female': 'shimmer',
  'male': 'echo',
  'neutral': 'alloy',
  'warm': 'shimmer',
  'professional': 'echo',
  'friendly': 'alloy',
  'calm': 'sage'
};

function getValidOpenAIVoice(voice: string | null): string {
  // If no voice provided, use default
  if (!voice) return 'alloy';
  
  // If it's already a valid OpenAI voice, use it
  if (OPENAI_REALTIME_VOICES.includes(voice as any)) {
    return voice;
  }
  
  // If it looks like an ElevenLabs ID (long alphanumeric), map to default
  if (voice.length > 10 && /^[a-zA-Z0-9]+$/.test(voice)) {
    console.log(`[Realtime API] ElevenLabs voice ID detected (${voice}), mapping to default OpenAI voice`);
    return 'alloy'; // Default fallback
  }
  
  // Check if it matches any preference mapping
  const mappedVoice = DEFAULT_VOICE_MAP[voice.toLowerCase()];
  if (mappedVoice && OPENAI_REALTIME_VOICES.includes(mappedVoice as any)) {
    return mappedVoice;
  }
  
  // Final fallback
  console.log(`[Realtime API] Unknown voice "${voice}", using default: alloy`);
  return 'alloy';
}

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await req.json();
    const { chatbotId, instructions } = body;

    console.log('[Realtime API] Creating ephemeral session for user:', session.user.id);

    // Fetch chatbot configuration including voice and calendar settings
    let voiceToUse = 'alloy'; // Default fallback
    let voiceDescription = ''; // Custom voice personality/instructions
    let voiceLanguage = 'en'; // Default language
    let calendarConfig = null;
    let calendarTools: any[] = [];
    let chatbotUserId: string | null = null;
    
    if (chatbotId) {
      try {
        const chatbot = await prisma.chatbot.findUnique({
          where: { id: chatbotId },
          select: { 
            voice: true, 
            name: true,
            userId: true,
            prompt: true,
            welcomeMessage: true,
            calendarEnabled: true,
            calendarId: true,
          },
        });
        
        if (chatbot) {
          chatbotUserId = chatbot.userId;
        }
        
        // Fetch calendar configuration if enabled
        if (chatbot?.calendarEnabled && chatbot?.calendarId) {
          console.log(`[Realtime API] Calendar enabled for chatbot "${chatbot.name}", fetching configuration`);
          
          const calendar = await prisma.calendar.findUnique({
            where: {
              id: chatbot.calendarId
            }
          });
          
          if (calendar) {
            console.log(`[Realtime API] Calendar found: ${calendar.name}`);
            
            // Build calendar config from the calendar data
            calendarConfig = {
              defaultCalendarId: chatbot.calendarId,
              askForDuration: (calendar as any).askForDuration ?? true,
              askForNotes: (calendar as any).askForNotes ?? true,
              defaultDuration: (calendar as any).defaultDuration || 30,
              bufferBetweenAppointments: (calendar as any).bufferBetweenAppointments || 15,
              maxBookingsPerSlot: (calendar as any).maxBookingsPerSlot || 1,
              minimumAdvanceNotice: (calendar as any).minimumAdvanceNotice || 60,
              requirePhoneNumber: (calendar as any).requirePhoneNumber ?? true,
              defaultLocation: (calendar as any).defaultLocation || null,
              bookingPrompt: (calendar as any).bookingPrompt || 'I can help you schedule appointments on our calendar.',
              confirmationMessage: (calendar as any).confirmationMessage || 'I\'ve successfully scheduled your appointment! You will receive a confirmation email.',
            };
            
            // Import and get calendar tools
            const { getCalendarTools } = await import('../../chat-interface/tools/calendar-tools');
            calendarTools = getCalendarTools(calendarConfig);
            
            console.log(`[Realtime API] Calendar tools configured:`, calendarTools.length, 'tools');
          }
        }
        
        if (chatbot?.voice) {
          voiceToUse = chatbot.voice;
          console.log(`[Realtime API] Raw voice from chatbot "${chatbot.name}": ${voiceToUse}`);
          
          // Check if this is a custom voice ID (not a standard OpenAI voice)
          if (!OPENAI_REALTIME_VOICES.includes(voiceToUse as any)) {
            // Try to fetch custom voice from UserVoice table
            const customVoice = await prisma.userVoice.findUnique({
              where: { 
                id: voiceToUse 
              }
            });
            
            if (customVoice) {
              console.log(`[Realtime API] Found custom voice "${customVoice.name}"`);
              voiceToUse = (customVoice as any).openaiVoice || 'alloy';
              voiceDescription = (customVoice as any).description || '';
              voiceLanguage = (customVoice as any).language || 'en';
              console.log(`[Realtime API] Custom voice settings:`, {
                openaiVoice: voiceToUse,
                description: voiceDescription?.substring(0, 100) + '...',
                language: voiceLanguage
              });
            }
          }
        } else {
          console.log(`[Realtime API] No voice configured for chatbot "${chatbot?.name || chatbotId}", using default: ${voiceToUse}`);
        }
      } catch (dbError) {
        console.error('[Realtime API] Error fetching chatbot voice config:', dbError);
        console.log('[Realtime API] Falling back to default voice:', voiceToUse);
      }
    }

    // Convert to valid OpenAI Realtime API voice
    const finalVoice = getValidOpenAIVoice(voiceToUse);
    console.log(`[Realtime API] Final voice for session: ${finalVoice}`);
    
    // Build enhanced instructions with voice personality
    let systemInstructions = instructions;
    let chatbotDetails: any = null;
    let companyName = 'the company';
    
    if (!systemInstructions && chatbotId) {
      // Fetch chatbot's base prompt if no custom instructions provided
      const chatbot = await prisma.chatbot.findUnique({
        where: { id: chatbotId },
        select: { 
          prompt: true,
          welcomeMessage: true,
          name: true,
          userId: true
        }
      });
      chatbotDetails = chatbot;
      
      // Fetch user/company information
      if (chatbot?.userId) {
        try {
          const user = await prisma.user.findUnique({
            where: {
              id: chatbot.userId
            },
            select: {
              companyName: true
            }
          });
          
          if (user?.companyName) {
            companyName = user.companyName;
          }
        } catch (error) {
          console.error('[Realtime API] Error fetching user/company data:', error);
        }
      }
      
      // Build system prompt using the utility function
      systemInstructions = buildSystemPrompt({
        chatbotName: chatbot?.name || 'AI Assistant',
        companyName,
        basePrompt: chatbot?.prompt || 'You are a helpful AI assistant.',
        calendarEnabled: !!calendarConfig,
        calendarConfig,
        useFileSearch: false, // Realtime API doesn't support file search yet
        useWebSearch: false, // Realtime API doesn't support web search yet
        websiteInstructions: [],
        knowledge: '' // Knowledge is included in the base prompt for voice
      });
    }
    
    // Enhance instructions with voice personality and language if available
    if (voiceDescription || voiceLanguage !== 'en') {
      const enhancementParts = [];
      
      // Add voice personality
      if (voiceDescription) {
        enhancementParts.push(`Voice Personality and Style:\n${voiceDescription}`);
      }
      
      // Add language preference
      if (voiceLanguage && voiceLanguage !== 'en') {
        enhancementParts.push(`Language Preference: Please respond primarily in ${voiceLanguage} unless the user explicitly requests another language.`);
      }
      
      if (enhancementParts.length > 0) {
        const voiceEnhancements = enhancementParts.join('\n\n');
        systemInstructions = voiceEnhancements + '\n\n' + systemInstructions;
        console.log(`[Realtime API] Enhanced instructions with voice personality and language`);
      }
    }

    // Create ephemeral session with OpenAI REST API
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview-2024-12-17',
        voice: finalVoice, // Use the validated OpenAI voice
        instructions: systemInstructions, // Pass the enhanced instructions
        // Add modalities
        modalities: ['text', 'audio'],
        // Configure turn detection
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
        },
        // Enable input audio transcription
        input_audio_transcription: {
          model: 'whisper-1'
        },
        // Add calendar tools if available
        ...(calendarTools.length > 0 ? { tools: calendarTools } : {}),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Realtime API] OpenAI API error:', response.status, errorData);
      
      return NextResponse.json({
        error: 'OpenAI API Error',
        message: errorData.error?.message || `HTTP ${response.status}`,
        status: response.status
      }, { status: response.status });
    }

    const sessionData = await response.json();

    console.log('[Realtime API] Ephemeral session created:', {
      sessionId: sessionData.id,
      expiresAt: sessionData.expires_at,
    });

    // Return the session details including the client secret
    return NextResponse.json({
      session_id: sessionData.id,
      client_secret: sessionData.client_secret,
      expires_at: sessionData.expires_at,
      model: sessionData.model,
      voice: finalVoice, // The actual OpenAI voice being used
      instructions: sessionData.instructions,
      chatbot_details: chatbotDetails ? {
        name: chatbotDetails.name,
        welcomeMessage: chatbotDetails.welcomeMessage,
        originalVoice: voiceToUse, // The voice ID from chatbot (might be custom voice ID)
      } : null,
      enhanced_instructions: systemInstructions, // Include the actual instructions used
      voice_config: {
        openaiVoice: finalVoice,
        description: voiceDescription,
        language: voiceLanguage,
      },
      calendar_config: calendarConfig,
      calendar_tools: calendarTools,
      chatbot_user_id: chatbotUserId // Add the chatbot's user ID for function calls
    });

  } catch (error: any) {
    console.error('[Realtime API] Error creating session:', error);
    
    return NextResponse.json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to create realtime session'
    }, { status: 500 });
  }
}

// GET endpoint to check session status (optional)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const sessionId = url.searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Note: OpenAI doesn't currently provide a direct endpoint to check session status
    // This could be enhanced when available
    return NextResponse.json({
      message: 'Session status checking not yet implemented'
    });

  } catch (error) {
    console.error('[Realtime API] Error checking session:', error);
    return NextResponse.json({
      error: 'Internal Server Error'
    }, { status: 500 });
  }
}