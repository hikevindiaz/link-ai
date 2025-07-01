const WebSocket = require('ws');
const fetch = require('node-fetch');
const FormData = require('form-data');
const { logger } = require('./logger'); // Assuming you have a logger
const prisma = require('./prisma'); // Assuming you have prisma setup

// Voice processing state for each connection
const activeVoiceConnections = new Map();

/**
 * LLM-Agnostic Voice Handler
 * Replaces OpenAI Realtime API with STT → Chat Completions → TTS pipeline
 */
async function handleLLMAgnosticVoice(ws, config) {
  const connectionId = `${config.agentId}-${Date.now()}`;
  logger.info('Starting LLM-agnostic voice handler', { 
    connectionId, 
    agentId: config.agentId,
    model: config.model 
  });

  // Initialize connection state
  const connectionState = {
    ws,
    config,
    connectionId,
    streamSid: null,
    callSid: config.callSid,
    audioBuffer: [],
    conversationHistory: [],
    currentTranscript: '',
    isProcessing: false,
    silenceTimer: null,
    lastActivity: Date.now(),
    startTime: Date.now()
  };

  activeVoiceConnections.set(connectionId, connectionState);

  // Set up message handler for Twilio WebSocket
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      await processTwilioMessage(data, connectionState);
    } catch (error) {
      logger.error('Error processing Twilio message', { 
        error: error.message, 
        connectionId 
      });
    }
  });

  // Handle connection close
  ws.on('close', () => {
    logger.info('Voice connection closed', { connectionId });
    if (connectionState.silenceTimer) {
      clearTimeout(connectionState.silenceTimer);
    }
    activeVoiceConnections.delete(connectionId);
  });

  // Handle connection error
  ws.on('error', (error) => {
    logger.error('Voice connection error', { 
      error: error.message, 
      connectionId 
    });
    activeVoiceConnections.delete(connectionId);
  });

  // Send welcome message if configured
  if (config.welcomeMessage) {
    setTimeout(async () => {
      await generateAndSendAudio(config.welcomeMessage, connectionState);
    }, 1000);
  }
}

/**
 * Process incoming Twilio messages
 */
async function processTwilioMessage(data, connectionState) {
  const { config, connectionId } = connectionState;

  switch (data.event) {
    case 'start':
      connectionState.streamSid = data.start.streamSid;
      logger.info('Voice stream started', { 
        streamSid: connectionState.streamSid, 
        connectionId 
      });
      break;

    case 'media':
      if (data.media && data.media.payload) {
        await handleAudioChunk(data.media.payload, connectionState);
      }
      break;

    case 'stop':
      logger.info('Voice stream stopped', { connectionId });
      await finalizeConversation(connectionState);
      break;

    default:
      logger.debug('Unhandled Twilio event', { event: data.event, connectionId });
      break;
  }
}

/**
 * Handle incoming audio chunks
 */
async function handleAudioChunk(audioPayload, connectionState) {
  const { config, connectionId } = connectionState;
  
  // Add audio to buffer
  connectionState.audioBuffer.push(audioPayload);
  connectionState.lastActivity = Date.now();

  // Reset silence timer
  if (connectionState.silenceTimer) {
    clearTimeout(connectionState.silenceTimer);
  }

  // Set new silence timer to process audio after silence
  connectionState.silenceTimer = setTimeout(async () => {
    if (connectionState.audioBuffer.length > 0 && !connectionState.isProcessing) {
      await processAudioBuffer(connectionState);
    }
  }, config.silenceTimeout || 1500); // Default 1.5 seconds of silence
}

/**
 * Process accumulated audio buffer
 */
async function processAudioBuffer(connectionState) {
  if (connectionState.isProcessing || connectionState.audioBuffer.length === 0) {
    return;
  }

  connectionState.isProcessing = true;
  const { config, connectionId } = connectionState;

  try {
    logger.info('Processing audio buffer', { 
      bufferSize: connectionState.audioBuffer.length, 
      connectionId 
    });

    // Convert audio buffer to format suitable for transcription
    const audioData = combineAudioChunks(connectionState.audioBuffer);
    connectionState.audioBuffer = []; // Clear buffer

    // Step 1: Speech-to-Text
    const transcript = await transcribeAudio(audioData, config);
    
    if (!transcript || transcript.trim().length === 0) {
      logger.debug('No transcript generated from audio', { connectionId });
      connectionState.isProcessing = false;
      return;
    }

    logger.info('Audio transcribed', { 
      transcript: transcript.substring(0, 100) + '...', 
      connectionId 
    });

    // Add user message to conversation history
    const userMessage = {
      role: 'user',
      content: transcript,
      timestamp: new Date(),
      type: 'voice'
    };
    connectionState.conversationHistory.push(userMessage);

    // Save user message to database for text chat continuity
    await saveMessageToDatabase(userMessage, connectionState);

    // Step 2: Generate AI response using LLM-agnostic approach
    const aiResponse = await generateAIResponse(
      connectionState.conversationHistory, 
      config
    );

    if (!aiResponse) {
      logger.error('No AI response generated', { connectionId });
      connectionState.isProcessing = false;
      return;
    }

    // Add assistant message to conversation history
    const assistantMessage = {
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date(),
      type: 'voice'
    };
    connectionState.conversationHistory.push(assistantMessage);

    // Save assistant message to database
    await saveMessageToDatabase(assistantMessage, connectionState);

    // Step 3: Text-to-Speech and send audio
    await generateAndSendAudio(aiResponse, connectionState);

  } catch (error) {
    logger.error('Error processing audio buffer', { 
      error: error.message, 
      connectionId 
    });
  } finally {
    connectionState.isProcessing = false;
  }
}

/**
 * Combine audio chunks into single buffer
 */
function combineAudioChunks(audioChunks) {
  // Convert base64 audio chunks to binary and combine
  const binaryChunks = audioChunks.map(chunk => Buffer.from(chunk, 'base64'));
  return Buffer.concat(binaryChunks);
}

/**
 * Transcribe audio using appropriate STT service
 */
async function transcribeAudio(audioData, config) {
  try {
    // Determine which STT service to use based on model
    const isGeminiModel = config.model && config.model.includes('gemini');
    
    if (isGeminiModel && process.env.GOOGLE_AI_API_KEY) {
      return await transcribeWithGoogleSTT(audioData, config);
    } else if (process.env.OPENAI_API_KEY) {
      return await transcribeWithOpenAISTT(audioData, config);
    } else {
      throw new Error('No STT service available');
    }
  } catch (error) {
    logger.error('Error transcribing audio', { error: error.message });
    return null;
  }
}

/**
 * Transcribe with OpenAI Whisper
 */
async function transcribeWithOpenAISTT(audioData, config) {
  const formData = new FormData();
  
  // Convert G.711 μ-law to WAV format for Whisper
  const wavBuffer = convertG711ToWav(audioData);
  formData.append('file', wavBuffer, {
    filename: 'audio.wav',
    contentType: 'audio/wav'
  });
  formData.append('model', 'whisper-1');
  formData.append('language', config.language || 'en');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.openAIKey || process.env.OPENAI_API_KEY}`,
      ...formData.getHeaders()
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error(`OpenAI STT error: ${response.statusText}`);
  }

  const result = await response.json();
  return result.text;
}

/**
 * Transcribe with Google Speech-to-Text (for Gemini models)
 */
async function transcribeWithGoogleSTT(audioData, config) {
  // Convert G.711 μ-law to format suitable for Google STT
  const base64Audio = audioData.toString('base64');
  
  const requestBody = {
    config: {
      encoding: 'MULAW',
      sampleRateHertz: 8000,
      languageCode: config.language || 'en-US',
      enableAutomaticPunctuation: true,
    },
    audio: {
      content: base64Audio
    }
  };

  const response = await fetch(
    `https://speech.googleapis.com/v1/speech:recognize?key=${process.env.GOOGLE_AI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    }
  );

  if (!response.ok) {
    throw new Error(`Google STT error: ${response.statusText}`);
  }

  const result = await response.json();
  if (result.results && result.results.length > 0) {
    return result.results[0].alternatives[0].transcript;
  }
  
  return null;
}

/**
 * Generate AI response using LLM-agnostic approach
 */
async function generateAIResponse(conversationHistory, config) {
  try {
    // Prepare messages for LLM
    const messages = [
      {
        role: 'system',
        content: config.instructions || config.prompt || 'You are a helpful voice assistant. Keep responses concise and conversational.'
      },
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    ];

    // Determine which LLM to use
    const isGeminiModel = config.model && config.model.includes('gemini');
    
    if (isGeminiModel && process.env.GOOGLE_AI_API_KEY) {
      return await generateWithGemini(messages, config);
    } else if (process.env.OPENAI_API_KEY) {
      return await generateWithOpenAI(messages, config);
    } else {
      throw new Error('No LLM service available');
    }
  } catch (error) {
    logger.error('Error generating AI response', { error: error.message });
    return 'I apologize, but I encountered an error processing your request.';
  }
}

/**
 * Generate response with OpenAI Chat Completions
 */
async function generateWithOpenAI(messages, config) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.openAIKey || process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: mapModelName(config.model, 'openai'),
      messages,
      temperature: config.temperature || 0.8,
      max_tokens: config.maxTokens || 150, // Keep responses concise for voice
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const result = await response.json();
  return result.choices[0]?.message?.content || '';
}

/**
 * Generate response with Gemini
 */
async function generateWithGemini(messages, config) {
  // Convert OpenAI format to Gemini format
  const contents = messages
    .filter(msg => msg.role !== 'system')
    .map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

  const systemInstruction = messages.find(msg => msg.role === 'system')?.content;

  const requestBody = {
    contents,
    generationConfig: {
      temperature: config.temperature || 0.8,
      maxOutputTokens: config.maxTokens || 150,
    }
  };

  if (systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  const modelName = mapModelName(config.model, 'gemini');
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${process.env.GOOGLE_AI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.statusText}`);
  }

  const result = await response.json();
  return result.candidates[0]?.content?.parts[0]?.text || '';
}

/**
 * Generate and send audio response
 */
async function generateAndSendAudio(text, connectionState) {
  try {
    const { config, streamSid, ws, connectionId } = connectionState;
    
    if (!streamSid) {
      logger.error('No streamSid available for audio response', { connectionId });
      return;
    }

    logger.info('Generating audio for text', { 
      textLength: text.length, 
      connectionId 
    });

    // Determine which TTS service to use
    const isGeminiModel = config.model && config.model.includes('gemini');
    let audioBuffer;

    if (isGeminiModel && process.env.GOOGLE_AI_API_KEY) {
      audioBuffer = await generateAudioWithGoogleTTS(text, config);
    } else if (process.env.OPENAI_API_KEY) {
      audioBuffer = await generateAudioWithOpenAITTS(text, config);
    } else {
      throw new Error('No TTS service available');
    }

    // Convert audio to G.711 μ-law format for Twilio
    const g711Audio = convertToG711(audioBuffer);
    
    // Split audio into chunks and send to Twilio
    await sendAudioToTwilio(g711Audio, streamSid, ws);

  } catch (error) {
    logger.error('Error generating audio', { 
      error: error.message, 
      connectionId: connectionState.connectionId 
    });
  }
}

/**
 * Generate audio with OpenAI TTS
 */
async function generateAudioWithOpenAITTS(text, config) {
  const voice = mapVoiceForTTS(config.voice, 'openai');
  
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.openAIKey || process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1',
      voice: voice,
      input: text,
      response_format: 'wav'
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI TTS error: ${response.statusText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

/**
 * Generate audio with Google Text-to-Speech
 */
async function generateAudioWithGoogleTTS(text, config) {
  const voice = mapVoiceForTTS(config.voice, 'google');
  
  const requestBody = {
    input: { text },
    voice: {
      languageCode: config.language || 'en-US',
      name: voice,
    },
    audioConfig: {
      audioEncoding: 'LINEAR16',
      sampleRateHertz: 8000,
    }
  };

  const response = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.GOOGLE_AI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    }
  );

  if (!response.ok) {
    throw new Error(`Google TTS error: ${response.statusText}`);
  }

  const result = await response.json();
  return Buffer.from(result.audioContent, 'base64');
}

/**
 * Send audio chunks to Twilio
 */
async function sendAudioToTwilio(audioBuffer, streamSid, ws) {
  const chunkSize = 320; // 20ms chunks for G.711
  const base64Audio = audioBuffer.toString('base64');
  
  for (let i = 0; i < base64Audio.length; i += chunkSize) {
    const chunk = base64Audio.substring(i, i + chunkSize);
    
    const mediaMessage = {
      event: 'media',
      streamSid: streamSid,
      media: {
        payload: chunk
      }
    };
    
    ws.send(JSON.stringify(mediaMessage));
    
    // Small delay to prevent overwhelming Twilio
    await new Promise(resolve => setTimeout(resolve, 20));
  }
}

/**
 * Save message to database for text chat continuity
 */
async function saveMessageToDatabase(message, connectionState) {
  try {
    const { config, callSid } = connectionState;
    
    // Create a thread ID based on call SID for voice conversations
    const threadId = `voice_${callSid}`;
    
    await prisma.message.create({
      data: {
        content: message.content,
        role: message.role,
        type: 'voice',
        threadId: threadId,
        chatbotId: config.agentId,
        userId: config.userId || 'voice_caller',
        metadata: {
          callSid: callSid,
          timestamp: message.timestamp,
          channel: 'voice'
        }
      }
    });
    
    logger.debug('Message saved to database', { 
      threadId, 
      role: message.role,
      connectionId: connectionState.connectionId 
    });
    
  } catch (error) {
    logger.error('Error saving message to database', { 
      error: error.message,
      connectionId: connectionState.connectionId 
    });
  }
}

/**
 * Finalize conversation when call ends
 */
async function finalizeConversation(connectionState) {
  try {
    const { config, callSid, conversationHistory } = connectionState;
    
    // Save conversation summary
    if (conversationHistory.length > 0) {
      const summary = await generateConversationSummary(conversationHistory, config);
      
      await prisma.conversationSummary.create({
        data: {
          callSid: callSid,
          chatbotId: config.agentId,
          summary: summary,
          messageCount: conversationHistory.length,
          duration: Date.now() - connectionState.startTime,
          channel: 'voice'
        }
      });
    }
    
    logger.info('Voice conversation finalized', { 
      callSid, 
      messageCount: conversationHistory.length 
    });
    
  } catch (error) {
    logger.error('Error finalizing conversation', { 
      error: error.message,
      callSid: connectionState.callSid 
    });
  }
}

/**
 * Generate conversation summary
 */
async function generateConversationSummary(conversationHistory, config) {
  try {
    const messages = [
      {
        role: 'system',
        content: 'Summarize this voice conversation in 1-2 sentences, highlighting key topics and outcomes.'
      },
      {
        role: 'user',
        content: conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')
      }
    ];

    return await generateAIResponse(messages, config);
  } catch (error) {
    logger.error('Error generating conversation summary', { error: error.message });
    return 'Voice conversation completed.';
  }
}

/**
 * Utility functions for audio processing
 */
function convertG711ToWav(g711Buffer) {
  // Implement G.711 μ-law to WAV conversion
  // This is a simplified version - you may need a more robust implementation
  const wavHeader = Buffer.alloc(44);
  // Write WAV header
  wavHeader.write('RIFF', 0);
  wavHeader.writeUInt32LE(36 + g711Buffer.length * 2, 4);
  wavHeader.write('WAVE', 8);
  wavHeader.write('fmt ', 12);
  wavHeader.writeUInt32LE(16, 16);
  wavHeader.writeUInt16LE(1, 20); // PCM
  wavHeader.writeUInt16LE(1, 22); // Mono
  wavHeader.writeUInt32LE(8000, 24); // Sample rate
  wavHeader.writeUInt32LE(16000, 28); // Byte rate
  wavHeader.writeUInt16LE(2, 32); // Block align
  wavHeader.writeUInt16LE(16, 34); // Bits per sample
  wavHeader.write('data', 36);
  wavHeader.writeUInt32LE(g711Buffer.length * 2, 40);
  
  // Convert μ-law to PCM (simplified)
  const pcmBuffer = Buffer.alloc(g711Buffer.length * 2);
  for (let i = 0; i < g711Buffer.length; i++) {
    const sample = mulawToPcm(g711Buffer[i]);
    pcmBuffer.writeInt16LE(sample, i * 2);
  }
  
  return Buffer.concat([wavHeader, pcmBuffer]);
}

function convertToG711(wavBuffer) {
  // Convert WAV/PCM to G.711 μ-law
  // This is a simplified version
  const dataStart = 44; // Skip WAV header
  const pcmData = wavBuffer.slice(dataStart);
  const g711Buffer = Buffer.alloc(pcmData.length / 2);
  
  for (let i = 0; i < pcmData.length; i += 2) {
    const sample = pcmData.readInt16LE(i);
    g711Buffer[i / 2] = pcmToMulaw(sample);
  }
  
  return g711Buffer;
}

function mulawToPcm(mulaw) {
  // μ-law to PCM conversion
  const sign = (mulaw & 0x80) ? -1 : 1;
  const exponent = (mulaw & 0x70) >> 4;
  const mantissa = mulaw & 0x0F;
  
  let sample = mantissa * 2 + 33;
  sample <<= exponent + 2;
  sample *= sign;
  
  return Math.max(-32768, Math.min(32767, sample));
}

function pcmToMulaw(pcm) {
  // PCM to μ-law conversion
  const BIAS = 0x84;
  const CLIP = 8159;
  
  let sign = (pcm >> 8) & 0x80;
  if (sign) pcm = -pcm;
  if (pcm > CLIP) pcm = CLIP;
  
  pcm += BIAS;
  let exponent = 7;
  for (let exp_lut = [0, 0, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3]; 
       exponent > 0; exponent--) {
    if (pcm & (1 << (exponent + 7))) break;
  }
  
  let mantissa = (pcm >> (exponent + 3)) & 0x0F;
  return ~(sign | (exponent << 4) | mantissa);
}

/**
 * Map model names to appropriate service models
 */
function mapModelName(modelName, provider) {
  if (provider === 'openai') {
    if (modelName?.includes('gemini')) return 'gpt-4o-mini';
    return modelName || 'gpt-4o-mini';
  } else if (provider === 'gemini') {
    if (modelName?.includes('gemini-2.5-flash')) return 'gemini-2.0-flash-exp';
    if (modelName?.includes('gemini')) return 'gemini-1.5-flash';
    return 'gemini-1.5-flash';
  }
  return modelName;
}

/**
 * Map voice settings for TTS services
 */
function mapVoiceForTTS(voice, provider) {
  if (provider === 'openai') {
    const voiceMap = {
      'alloy': 'alloy',
      'echo': 'echo',
      'fable': 'fable',
      'onyx': 'onyx',
      'nova': 'nova',
      'shimmer': 'shimmer'
    };
    return voiceMap[voice] || 'alloy';
  } else if (provider === 'google') {
    const voiceMap = {
      'alloy': 'en-US-Standard-A',
      'echo': 'en-US-Standard-B',
      'fable': 'en-US-Standard-C',
      'onyx': 'en-US-Standard-D',
      'nova': 'en-US-Wavenet-A',
      'shimmer': 'en-US-Wavenet-B'
    };
    return voiceMap[voice] || 'en-US-Standard-A';
  }
  return voice;
}

module.exports = {
  handleLLMAgnosticVoice,
  activeVoiceConnections
}; 