const prisma = require('./prisma');
const axios = require('axios');

// Logger
const logger = {
  info: (message, data = {}) => {
    console.log(`[INFO] ${message}`, JSON.stringify(data));
  },
  error: (message, data = {}) => {
    console.error(`[ERROR] ${message}`, JSON.stringify(data));
  }
};

// Retrieve call configuration from database
async function getCallConfig(callSid) {
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
      const config = JSON.parse(configMessage.response);
      logger.info('Retrieved call configuration from database', { 
        callSid, 
        agentId: config.agentId 
      });
      return config;
    }
    
    logger.error('No call configuration found', { callSid, threadId });
    return null;
  } catch (error) {
    logger.error('Failed to retrieve call configuration', { 
      error: error.message, 
      callSid 
    });
    return null;
  }
}

// Alternative: Retrieve configuration via API call to main app
async function getCallConfigViaAPI(callSid) {
  try {
    const apiUrl = process.env.MAIN_APP_URL || 'https://dashboard.getlinkai.com';
    const response = await axios.get(`${apiUrl}/api/twilio/call-config/${callSid}`, {
      headers: {
        'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data) {
      logger.info('Retrieved call configuration via API', { 
        callSid, 
        agentId: response.data.agentId 
      });
      return response.data;
    }
    
    return null;
  } catch (error) {
    logger.error('Failed to retrieve call configuration via API', { 
      error: error.message, 
      callSid 
    });
    return null;
  }
}

// Get agent configuration with all details
async function getAgentConfiguration(agentId) {
  try {
    const agent = await prisma.chatbot.findUnique({
      where: { id: agentId },
      include: {
        model: true,
        knowledgeSources: {
          select: {
            id: true,
            name: true,
            description: true,
            vectorStoreId: true,
            websiteContents: true,
            qaContents: true,
            textContents: true
          }
        },
        assistantSettings: true
      }
    });
    
    if (!agent) {
      logger.error('Agent not found', { agentId });
      return null;
    }
    
    // Get OpenAI API key from chatbot itself (not from model)
    const openAIKey = agent.openaiKey || process.env.OPENAI_API_KEY;
    
    if (!openAIKey) {
      logger.error('No OpenAI API key found', { agentId });
      return null;
    }
    
    // Extract vector store IDs from knowledge sources
    const vectorStoreIds = agent.knowledgeSources
      ?.filter(ks => ks.vectorStoreId)
      .map(ks => ks.vectorStoreId) || [];
    
    // Build tools array
    const tools = [];
    
    // Add file search tool if there are knowledge sources
    if (vectorStoreIds.length > 0) {
      tools.push({
        type: 'file_search',
        file_search: {
          vector_store_ids: vectorStoreIds
        }
      });
    }
    
    // Add custom tools from assistant settings
    if (agent.assistantSettings?.tools) {
      const customTools = Array.isArray(agent.assistantSettings.tools) 
        ? agent.assistantSettings.tools 
        : [agent.assistantSettings.tools];
      tools.push(...customTools);
    }
    
    // Get voice settings
    const voiceSettings = await getVoiceSettings(agent.voice);
    
    // Build comprehensive instructions including voice personality
    let fullInstructions = agent.prompt || "You are a helpful AI assistant.";
    if (voiceSettings.personality) {
      fullInstructions = `${fullInstructions}\n\nVoice Personality: ${voiceSettings.personality}`;
    }
    if (voiceSettings.accent) {
      fullInstructions = `${fullInstructions}\n\nSpeak with a ${voiceSettings.accent} accent.`;
    }
    
    return {
      agent,
      openAIKey,
      voiceSettings,
      fullInstructions,
      tools,
      vectorStoreIds
    };
  } catch (error) {
    logger.error('Failed to get agent configuration', { 
      error: error.message, 
      agentId 
    });
    return null;
  }
}

// Map voice ID to OpenAI voice settings
async function getVoiceSettings(voiceId, defaultVoice = 'alloy') {
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
      // Parse any custom settings from labels if available
      let personality, accent, speed, pitch;
      
      if (voice.labels) {
        // Parse JSONB labels
        const labels = typeof voice.labels === 'string' 
          ? JSON.parse(voice.labels) 
          : voice.labels;
          
        personality = labels.personality;
        accent = labels.accent;
        speed = labels.speed;
        pitch = labels.pitch;
      }
      
      // Determine OpenAI voice - check if we have an OpenAI voice mapping
      let openAIVoice = defaultVoice;
      if (labels && labels.openAIVoice) {
        openAIVoice = labels.openAIVoice;
      } else if (voice.voiceId && validVoices.includes(voice.voiceId)) {
        openAIVoice = voice.voiceId;
      }
      
      return {
        openAIVoice,
        personality,
        accent,
        speed,
        pitch
      };
    }
  } catch (error) {
    logger.error('Failed to lookup voice', { 
      error: error.message, 
      voiceId 
    });
  }
  
  return { openAIVoice: defaultVoice };
}

module.exports = {
  getCallConfig,
  getCallConfigViaAPI,
  getAgentConfiguration,
  getVoiceSettings
}; 