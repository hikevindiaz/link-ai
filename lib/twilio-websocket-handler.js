const WebSocket = require('ws');
const prisma = require('./prisma').default;
const { logger } = require('./logger');

// Store active connections
const activeConnections = new Map();

// Constants for OpenAI session configuration
const SHOW_TIMING_MATH = false;
const LOG_EVENT_TYPES = [
    'error',
    'response.content.done',
    'rate_limits.updated',
    'response.done',
    'input_audio_buffer.committed',
    'input_audio_buffer.speech_stopped',
    'input_audio_buffer.speech_started',
    'session.created'
];

async function handleTwilioWebSocket(ws, agentId) {
  let streamSid = null;
  let latestMediaTimestamp = 0;
  let lastAssistantItem = null;
  let markQueue = [];
  let responseStartTimestampTwilio = null;
  let openAiWs = null;
  
  try {
    logger.info('WebSocket connection established', { agentId }, 'media-stream');
    
    // Verify the agent exists
    const agent = await prisma.chatbot.findUnique({
      where: { id: agentId },
      include: {
        model: true,
        twilioPhoneNumber: true
      }
    });
    
    if (!agent) {
      ws.close(1008, 'Agent not found');
      return;
    }
    
    const connectionId = `${agentId}-${Date.now()}`;
    activeConnections.set(connectionId, { ws, agentId });
    
    // Get OpenAI API key from the model
    const openAIKey = agent.model?.apiKey;
    if (!openAIKey) {
      logger.error('No OpenAI API key found for agent', { agentId }, 'media-stream');
      ws.close(1008, 'Configuration error');
      return;
    }
    
    // Connect to OpenAI Realtime API
    openAiWs = new WebSocket('wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01', {
      headers: {
        Authorization: `Bearer ${openAIKey}`,
        "OpenAI-Beta": "realtime=v1"
      }
    });
    
    // Initialize OpenAI session
    const initializeSession = () => {
      const sessionUpdate = {
        type: 'session.update',
        session: {
          turn_detection: { type: 'server_vad' },
          input_audio_format: 'g711_ulaw',
          output_audio_format: 'g711_ulaw',
          voice: 'alloy',
          instructions: agent.prompt || 'You are a helpful AI assistant.',
          modalities: ["text", "audio"],
          temperature: 0.8,
        }
      };
      
      logger.info('Sending session update to OpenAI', { agentId }, 'media-stream');
      openAiWs.send(JSON.stringify(sessionUpdate));
    };
    
    // Handle interruption when the caller's speech starts
    const handleSpeechStartedEvent = () => {
      if (markQueue.length > 0 && responseStartTimestampTwilio != null) {
        const elapsedTime = latestMediaTimestamp - responseStartTimestampTwilio;
        if (SHOW_TIMING_MATH) {
          logger.info(`Calculating elapsed time for truncation: ${latestMediaTimestamp} - ${responseStartTimestampTwilio} = ${elapsedTime}ms`, 
            { agentId }, 'media-stream');
        }
        
        if (lastAssistantItem) {
          const truncateEvent = {
            type: 'conversation.item.truncate',
            item_id: lastAssistantItem,
            content_index: 0,
            audio_end_ms: elapsedTime
          };
          if (SHOW_TIMING_MATH) {
            logger.info('Sending truncation event', { truncateEvent, agentId }, 'media-stream');
          }
          openAiWs.send(JSON.stringify(truncateEvent));
        }
        
        // Clear Twilio's audio buffer
        ws.send(JSON.stringify({
          event: 'clear',
          streamSid: streamSid
        }));
        
        // Reset
        markQueue = [];
        lastAssistantItem = null;
        responseStartTimestampTwilio = null;
      }
    };
    
    // Send mark messages to Media Streams
    const sendMark = (streamSid) => {
      if (streamSid) {
        const markEvent = {
          event: 'mark',
          streamSid: streamSid,
          mark: { name: 'responsePart' }
        };
        ws.send(JSON.stringify(markEvent));
        markQueue.push('responsePart');
      }
    };
    
    // OpenAI WebSocket event handlers
    openAiWs.on('open', () => {
      logger.info('Connected to OpenAI Realtime API', { agentId }, 'media-stream');
      setTimeout(initializeSession, 100);
    });
    
    openAiWs.on('message', (data) => {
      try {
        const response = JSON.parse(data);
        
        if (LOG_EVENT_TYPES.includes(response.type)) {
          logger.info(`OpenAI event: ${response.type}`, { agentId }, 'media-stream');
        }
        
        // Handle audio responses from OpenAI
        if (response.type === 'response.audio.delta' && response.delta) {
          const audioDelta = {
            event: 'media',
            streamSid: streamSid,
            media: { payload: response.delta }
          };
          ws.send(JSON.stringify(audioDelta));
          
          // Track timing for interruption handling
          if (!responseStartTimestampTwilio) {
            responseStartTimestampTwilio = latestMediaTimestamp;
            if (SHOW_TIMING_MATH) {
              logger.info(`Setting start timestamp for new response: ${responseStartTimestampTwilio}ms`, 
                { agentId }, 'media-stream');
            }
          }
          
          if (response.item_id) {
            lastAssistantItem = response.item_id;
          }
          
          sendMark(streamSid);
        }
        
        // Handle speech detection
        if (response.type === 'input_audio_buffer.speech_started') {
          handleSpeechStartedEvent();
        }
        
      } catch (error) {
        logger.error('Error processing OpenAI message', { 
          error: error.message, 
          agentId 
        }, 'media-stream');
      }
    });
    
    openAiWs.on('close', () => {
      logger.info('Disconnected from OpenAI Realtime API', { agentId }, 'media-stream');
    });
    
    openAiWs.on('error', (error) => {
      logger.error('OpenAI WebSocket error', { 
        error: error.message, 
        agentId 
      }, 'media-stream');
    });
    
    // Handle incoming Twilio WebSocket messages
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);
        
        switch (data.event) {
          case 'media':
            // Update latest timestamp for timing calculations
            latestMediaTimestamp = data.media.timestamp;
            if (SHOW_TIMING_MATH) {
              logger.info(`Received media with timestamp: ${latestMediaTimestamp}ms`, 
                { agentId }, 'media-stream');
            }
            
            // Forward audio to OpenAI
            if (openAiWs.readyState === WebSocket.OPEN) {
              const audioAppend = {
                type: 'input_audio_buffer.append',
                audio: data.media.payload
              };
              openAiWs.send(JSON.stringify(audioAppend));
            }
            break;
            
          case 'start':
            streamSid = data.start.streamSid;
            logger.info('Incoming stream has started', { streamSid, agentId }, 'media-stream');
            // Reset timestamps on new stream
            responseStartTimestampTwilio = null;
            latestMediaTimestamp = 0;
            break;
            
          case 'mark':
            if (markQueue.length > 0) {
              markQueue.shift();
            }
            break;
            
          default:
            logger.info('Received non-media event', { event: data.event, agentId }, 'media-stream');
            break;
        }
      } catch (error) {
        logger.error('Error handling Twilio message', { 
          error: error.message,
          agentId 
        }, 'media-stream');
      }
    });
    
    // Handle Twilio WebSocket close
    ws.on('close', () => {
      logger.info('Twilio WebSocket connection closed', { connectionId, agentId }, 'media-stream');
      if (openAiWs && openAiWs.readyState === WebSocket.OPEN) {
        openAiWs.close();
      }
      activeConnections.delete(connectionId);
    });
    
    // Handle Twilio WebSocket errors
    ws.on('error', (error) => {
      logger.error('Twilio WebSocket error', { 
        error: error.message,
        connectionId,
        agentId 
      }, 'media-stream');
      if (openAiWs && openAiWs.readyState === WebSocket.OPEN) {
        openAiWs.close();
      }
      activeConnections.delete(connectionId);
    });
    
  } catch (error) {
    logger.error('Error setting up WebSocket connection', { 
      error: error.message,
      agentId 
    }, 'media-stream');
    ws.close(1011, 'Internal server error');
    if (openAiWs && openAiWs.readyState === WebSocket.OPEN) {
      openAiWs.close();
    }
  }
}

module.exports = { handleTwilioWebSocket }; 