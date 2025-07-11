import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// LiveKit configuration from environment variables
const LIVEKIT_URL = process.env.LIVEKIT_URL!;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY!;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET!;

// Initialize room service client
const roomService = new RoomServiceClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identity, roomName, agentId, metadata: clientMetadata } = body;

    if (!identity || !roomName) {
      return NextResponse.json(
        { error: 'Missing required fields: identity, roomName' }, 
        { status: 400 }
      );
    }

    // Validate environment variables
    if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
      console.error('Missing LiveKit environment variables');
      return NextResponse.json(
        { error: 'LiveKit configuration missing' }, 
        { status: 500 }
      );
    }

    console.log(`[LiveKit Token] Generating token for user: ${identity}, room: ${roomName}, agent: ${agentId}`);

    // Get authenticated session for agent access
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' }, 
        { status: 401 }
      );
    }

    // Fetch agent configuration from database
    let agentConfig = {};
    if (agentId) {
      try {
        const agent = await prisma.chatbot.findFirst({
          where: {
            id: agentId,
            userId: session.user.id
          },
          include: {
            model: true
          }
        });

        if (agent) {
          agentConfig = {
            agentId: agent.id,
            name: agent.name,
            systemPrompt: agent.prompt, // Use correct field name
            language: agent.language || 'en-US',
            modelId: agent.modelId,
            model: agent.model?.name,
            voice: agent.voice,
            elevenLabsVoiceId: agent.voice, // Map to ElevenLabs voice ID
            voiceName: 'Adam', // Default voice name
            voiceStability: 0.3,
            voiceSimilarity: 0.75,
            voiceStyle: 0.0,
            temperature: agent.temperature || 0.7,
            maxTokens: 4000, // Default max tokens
            source: clientMetadata?.source || 'web'
          };
          console.log(`[LiveKit Token] Agent configuration loaded: ${agent.name}`);
        } else {
          console.warn(`[LiveKit Token] Agent not found or not accessible: ${agentId}`);
        }
      } catch (error) {
        console.error('[LiveKit Token] Error fetching agent config:', error);
        // Continue without agent config - will use defaults
      }
    }

    // Create LiveKit room BEFORE generating token (matching Twilio flow)
    try {
      console.log(`[LiveKit Token] Creating room: ${roomName}`);
      
      await roomService.createRoom({
        name: roomName,
        emptyTimeout: 600, // 10 minutes
        maxParticipants: 10,
        metadata: JSON.stringify({
          ...agentConfig,
          userId: session.user.id,
          createdAt: new Date().toISOString(),
          source: 'web'
        })
      });
      
      console.log(`[LiveKit Token] ✅ Room created: ${roomName}`);
      
    } catch (error) {
      // Room might already exist, check if it's just a duplicate
      if (error.message && error.message.includes('already exists')) {
        console.log(`[LiveKit Token] Room already exists: ${roomName}`);
      } else {
        console.error('[LiveKit Token] Error creating room:', error);
        return NextResponse.json(
          { error: 'Failed to create room' }, 
          { status: 500 }
        );
      }
    }

    // Create access token with agent configuration in metadata
    const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity,
      name: identity, // Display name for the participant
      // Token is valid for 2 hours for longer conversations
      ttl: '2h',
      metadata: JSON.stringify({
        ...agentConfig,
        timestamp: Date.now(),
        userId: session.user.id
      })
    });

    // Grant permissions
    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,      // Allow publishing audio (microphone)
      canSubscribe: true,    // Allow subscribing to agent audio
      canPublishData: true,  // Allow data messages if needed
      canUpdateOwnMetadata: true,
    });

    console.log(`[LiveKit Token] ✅ Token generated successfully for room: ${roomName}`);

    return NextResponse.json({
      token: await token.toJwt(),
      wsUrl: LIVEKIT_URL,
      roomName,
      identity,
      agentConfig
    });

  } catch (error) {
    console.error('[LiveKit Token] Error generating token:', error);
    return NextResponse.json(
      { error: 'Failed to generate access token' }, 
      { status: 500 }
    );
  }
} 