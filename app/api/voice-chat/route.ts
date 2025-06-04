import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AgentRuntime, ChannelContext, AgentMessage } from '@/lib/agent-runtime';
import { logger } from '@/lib/logger';
import { ElevenLabsClient } from 'elevenlabs';

// Initialize ElevenLabs for voice synthesis
const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
const elevenlabs = elevenLabsApiKey ? new ElevenLabsClient({ apiKey: elevenLabsApiKey }) : null;

/**
 * Voice chat endpoint using the Unified Agent Runtime
 * Handles audio transcription and synthesis
 */
export async function POST(req: NextRequest) {
  logger.info('Voice chat request received', {}, 'voice-chat');
  
  try {
    // Get session for authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Extract audio and metadata
    const formData = await req.formData();
    const audioBlob = formData.get('audio') as Blob | null;
    const chatbotId = formData.get('chatbotId') as string | null;
    const threadId = formData.get('threadId') as string | null;

    if (!audioBlob) {
      logger.error('No audio blob found in request', {}, 'voice-chat');
      return NextResponse.json({ error: 'No audio data received' }, { status: 400 });
    }
    
    if (!chatbotId || !threadId) {
      logger.error('Missing required fields', { chatbotId, threadId }, 'voice-chat');
      return NextResponse.json({ error: 'Missing chatbotId or threadId' }, { status: 400 });
    }

    logger.info(`Processing voice chat for chatbot: ${chatbotId}`, {}, 'voice-chat');

    // Create agent runtime
    const runtime = await AgentRuntime.fromChatbotId(chatbotId);
    const agentConfig = runtime['config']; // Access private config
    
    // Transcribe audio using ElevenLabs if available
    let transcript = '';
    
    if (elevenlabs) {
      try {
        logger.debug('Transcribing with ElevenLabs', {}, 'voice-chat');
        const transcriptionResult = await elevenlabs.speechToText.convert({
          file: audioBlob,
          model_id: 'eleven_multilingual_v2',
        });
        
        if (transcriptionResult && typeof transcriptionResult.text === 'string') {
          transcript = transcriptionResult.text;
        }
      } catch (sttError) {
        logger.error('ElevenLabs STT error', { error: sttError }, 'voice-chat');
        return NextResponse.json({ error: 'Failed to transcribe audio' }, { status: 500 });
      }
    } else {
      logger.warn('ElevenLabs not configured, returning error', {}, 'voice-chat');
      return NextResponse.json({ error: 'Voice transcription not configured' }, { status: 503 });
    }
    
    if (!transcript) {
      logger.info('Empty transcript received', {}, 'voice-chat');
      return NextResponse.json({ 
        textResponse: "Sorry, I didn't catch that.", 
        audioBase64: null 
      });
    }
    
    // Create channel context for voice
    const channelContext: ChannelContext = {
      type: 'voice',
      sessionId: `voice-${threadId}`,
      userId: session.user.id,
      chatbotId,
      threadId,
      capabilities: {
        supportsAudio: true,
        supportsVideo: false,
        supportsImages: false,
        supportsFiles: false,
        supportsRichText: false,
        supportsTypingIndicator: false,
        supportsDeliveryReceipts: false,
        supportsInterruption: true,
        maxAudioDuration: 300 // 5 minutes
      },
      metadata: {
        userAgent: req.headers.get('user-agent'),
        userIP: req.headers.get('x-forwarded-for') || 'unknown'
      }
    };
    
    // Create user message
    const userMessage: AgentMessage = {
      id: `voice_${Date.now()}`,
      role: 'user',
      content: transcript,
      type: 'text', // Even though it came from audio, we store the text
      timestamp: new Date(),
      metadata: {
        audioUrl: undefined, // Could store the audio if needed
        confidence: undefined // ElevenLabs doesn't return confidence
      }
    };
    
    // Process message through runtime
    const response = await runtime.processMessage(userMessage, channelContext);
    
    // Synthesize response to speech if voice is configured
    let audioBase64: string | null = null;
    
    if (elevenlabs && agentConfig.voice) {
      try {
        logger.debug(`Synthesizing speech with voice: ${agentConfig.voice}`, {}, 'voice-chat');
        
        const audioResult = await elevenlabs.textToSpeech.convert(
          agentConfig.voice,
          {
            text: response.content,
            model_id: 'eleven_multilingual_v2'
          }
        );
        
        // Convert audio result to base64
        if (Buffer.isBuffer(audioResult)) {
          audioBase64 = audioResult.toString('base64');
        } else if (typeof audioResult?.pipe === 'function') {
          const chunks: Buffer[] = [];
          for await (const chunk of audioResult) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }
          const audioBuffer = Buffer.concat(chunks);
          audioBase64 = audioBuffer.toString('base64');
        }
        
        logger.info('Speech synthesis completed', {}, 'voice-chat');
      } catch (ttsError) {
        logger.error('ElevenLabs TTS error', { error: ttsError }, 'voice-chat');
        // Continue without audio
      }
    }
    
    // Return response
    return NextResponse.json({
      transcript: transcript,
      textResponse: response.content,
      audioBase64: audioBase64,
      messageId: response.id,
      timestamp: response.timestamp
    });

  } catch (error) {
    logger.error('Error in voice chat', { error: error.message }, 'voice-chat');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 