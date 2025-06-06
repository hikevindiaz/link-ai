import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

export interface VoiceSettings {
  openAIVoice: string;
  personality?: string;
  accent?: string;
  speed?: number;
  pitch?: number;
}

export interface CallConfig {
  agentId: string;
  openAIKey: string;
  model: string;
  voice: VoiceSettings;
  instructions: string;
  temperature: number;
  maxTokens?: number;
  tools: any[];
  knowledge: any[];
  vectorStoreIds: string[];
  callSid: string;
  from: string;
  to: string;
  // Additional agent settings
  welcomeMessage?: string;
  chatbotErrorMessage?: string;
  silenceTimeout?: number;
  callTimeout?: number;
  checkUserPresence?: boolean;
  presenceMessage?: string;
  presenceMessageDelay?: number;
  hangUpMessage?: string;
}

// Store call configuration temporarily using existing database
// We'll use the Message model with a special threadId format
export async function storeCallConfig(callSid: string, config: CallConfig): Promise<void> {
  const threadId = `call-config-${callSid}`;
  const ttl = 300; // 5 minutes
  
  try {
    // Get the actual user ID for this agent
    const agent = await prisma.chatbot.findUnique({
      where: { id: config.agentId },
      select: { userId: true }
    });

    // Store as a message with special thread ID
    await prisma.message.create({
      data: {
        threadId,
        message: 'CALL_CONFIG',
        response: JSON.stringify(config),
        from: 'system',
        userId: agent?.userId!, // Use actual user ID (should be valid)
        chatbotId: config.agentId,
      }
    });
    
    // Schedule cleanup
    setTimeout(async () => {
      try {
        await prisma.message.deleteMany({
          where: { threadId }
        });
      } catch (error) {
        // Ignore cleanup errors
      }
    }, ttl * 1000);
    
    logger.info('Stored call configuration', { callSid, agentId: config.agentId }, 'call-config');
  } catch (error) {
    logger.error('Failed to store call configuration', { error, callSid }, 'call-config');
    throw error;
  }
}

// Retrieve call configuration
export async function getCallConfig(callSid: string): Promise<CallConfig | null> {
  const threadId = `call-config-${callSid}`;
  
  try {
    const configMessage = await prisma.message.findFirst({
      where: { 
        threadId,
        message: 'CALL_CONFIG'
      },
      orderBy: { createdAt: 'desc' }
    });
    
    if (configMessage && configMessage.response) {
      return JSON.parse(configMessage.response);
    }
    
    return null;
  } catch (error) {
    logger.error('Failed to retrieve call configuration', { error, callSid }, 'call-config');
    return null;
  }
}

// Map voice ID to OpenAI voice settings
export async function getVoiceSettings(voiceId: string | null, defaultVoice: string = 'alloy'): Promise<VoiceSettings> {
  if (!voiceId) {
    return { openAIVoice: defaultVoice };
  }
  
  // Check if it's already a valid OpenAI voice
  const validVoices = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'sage', 'shimmer', 'verse'];
  if (validVoices.includes(voiceId)) {
    return { openAIVoice: voiceId };
  }
  
  // Look up voice in database
  try {
    const voice = await prisma.userVoice.findUnique({
      where: { id: voiceId }
    });
    
    if (voice) {
      // Parse any custom settings from description if available
      let personality, accent, speed, pitch;
      
      if (voice.description) {
        // Simple parsing of description for settings
        // Format: "personality: friendly, accent: british, speed: 1.2, pitch: 0.8"
        const settings = voice.description.match(/(\w+):\s*([^,]+)/g);
        if (settings) {
          settings.forEach(setting => {
            const [key, value] = setting.split(':').map(s => s.trim());
            switch(key.toLowerCase()) {
              case 'personality':
                personality = value;
                break;
              case 'accent':
                accent = value;
                break;
              case 'speed':
                speed = parseFloat(value);
                break;
              case 'pitch':
                pitch = parseFloat(value);
                break;
            }
          });
        }
      }
      
      return {
        openAIVoice: voice.openaiVoice || defaultVoice,
        personality,
        accent,
        speed,
        pitch
      };
    }
  } catch (error) {
    logger.error('Failed to lookup voice', { error, voiceId }, 'call-config');
  }
  
  return { openAIVoice: defaultVoice };
} 