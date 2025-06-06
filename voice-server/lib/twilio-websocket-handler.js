const WebSocket = require('ws');

// Simple logger
const logger = {
  info: (message, data = {}) => {
    console.log(`[INFO] ${message}`, JSON.stringify(data));
  },
  error: (message, data = {}) => {
    console.error(`[ERROR] ${message}`, JSON.stringify(data));
  }
};

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

async function handleTwilioWebSocket(ws, config) {
  let streamSid = null;
  let latestMediaTimestamp = 0;
  let lastAssistantItem = null;
  let markQueue = [];
  let responseStartTimestampTwilio = null;
  let openAiWs = null;
  
  try {
    logger.info('WebSocket connection established', { 
      agentId: config.agentId,
      hasTools: !!config.tools && config.tools.length > 0,
      hasKnowledge: !!config.vectorStoreIds && config.vectorStoreIds.length > 0
    });
    
    // Validate required configuration
    if (!config.openAIKey) {
      logger.error('No OpenAI API key provided', { agentId: config.agentId });
      ws.close(1008, 'Configuration error: Missing OpenAI key');
      return;
    }
    
    const connectionId = `${config.agentId}-${Date.now()}`;
    activeConnections.set(connectionId, { ws, config });
    
    // Connect to OpenAI Realtime API
    // Always use the correct OpenAI Realtime model (ignore database model IDs)
  const model = 'gpt-4o-mini-realtime-preview-2024-12-17';
    openAiWs = new WebSocket(`wss://api.openai.com/v1/realtime?model=${model}`, {
      headers: {
        Authorization: `Bearer ${config.openAIKey}`,
        "OpenAI-Beta": "realtime=v1"
      }
    });
    
    // Initialize OpenAI session
    const initializeSession = () => {
      // Extract voice settings
      let openAIVoice = 'alloy';
      if (config.voice) {
        if (typeof config.voice === 'string') {
          openAIVoice = config.voice;
        } else if (config.voice.openAIVoice) {
          openAIVoice = config.voice.openAIVoice;
        }
      }
      
      // Validate voice is a known OpenAI voice
      const validVoices = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'sage', 'shimmer', 'verse'];
      if (!validVoices.includes(openAIVoice)) {
        logger.info('Unknown voice, defaulting to alloy', { 
          voice: openAIVoice,
          agentId: config.agentId 
        });
        openAIVoice = 'alloy';
      }
      
      // Build session configuration
      const sessionUpdate = {
        type: 'session.update',
        session: {
          turn_detection: { type: 'server_vad' },
          input_audio_format: 'g711_ulaw',
          output_audio_format: 'g711_ulaw',
          voice: openAIVoice,
          instructions: config.instructions || config.prompt || 'You are a helpful AI assistant.',
          modalities: ["text", "audio"],
          temperature: config.temperature || 0.8,
        }
      };
      
      // Add max tokens if specified
      if (config.maxTokens) {
        sessionUpdate.session.max_response_output_tokens = config.maxTokens;
      }
      
      // Add tools if available
      if (config.tools && config.tools.length > 0) {
        // Fix tools that are missing the required 'name' parameter
        const fixedTools = config.tools.map(tool => {
          if (tool.type === 'file_search' && !tool.name) {
            return {
              ...tool,
              name: 'file_search'
            };
          }
          return tool;
        });
        
        sessionUpdate.session.tools = fixedTools;
        sessionUpdate.session.tool_choice = 'auto';
        logger.info('Adding tools to session', { 
          agentId: config.agentId,
          toolCount: fixedTools.length,
          toolTypes: fixedTools.map(t => t.type)
        });
      }
      
      logger.info('Sending session update to OpenAI', { 
        agentId: config.agentId,
        voice: openAIVoice,
        instructionLength: sessionUpdate.session.instructions.length,
        hasTools: !!sessionUpdate.session.tools,
        temperature: sessionUpdate.session.temperature,
        model: model
      });
      
      openAiWs.send(JSON.stringify(sessionUpdate));
      
      // Send welcome message if configured
      if (config.welcomeMessage) {
        setTimeout(() => {
          const conversationItem = {
            type: 'conversation.item.create',
            item: {
              type: 'message',
              role: 'assistant',
              content: [{
                type: 'input_text',
                text: config.welcomeMessage
              }]
            }
          };
          openAiWs.send(JSON.stringify(conversationItem));
          
          // Request response
          openAiWs.send(JSON.stringify({ type: 'response.create' }));
        }, 500);
      }
    };
    
    // Handle interruption when the caller's speech starts
    const handleSpeechStartedEvent = () => {
      if (markQueue.length > 0 && responseStartTimestampTwilio != null) {
        const elapsedTime = latestMediaTimestamp - responseStartTimestampTwilio;
        if (SHOW_TIMING_MATH) {
          logger.info(`Calculating elapsed time for truncation: ${elapsedTime}ms`, { agentId: config.agentId });
        }
        
        if (lastAssistantItem) {
          const truncateEvent = {
            type: 'conversation.item.truncate',
            item_id: lastAssistantItem,
            content_index: 0,
            audio_end_ms: elapsedTime
          };
          if (SHOW_TIMING_MATH) {
            logger.info('Sending truncation event', { truncateEvent, agentId: config.agentId });
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
      logger.info('Connected to OpenAI Realtime API', { agentId: config.agentId });
      setTimeout(initializeSession, 100);
    });
    
    openAiWs.on('message', (data) => {
      try {
        const response = JSON.parse(data);
        
        if (LOG_EVENT_TYPES.includes(response.type)) {
          logger.info(`OpenAI event: ${response.type}`, { agentId: config.agentId });
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
              logger.info(`Setting start timestamp: ${responseStartTimestampTwilio}ms`, { agentId: config.agentId });
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
        
        // Handle tool calls
        if (response.type === 'response.function_call_arguments.done') {
          logger.info('Function call completed', {
            agentId: config.agentId,
            functionName: response.name,
            callId: response.call_id
          });
          
          // TODO: Implement tool execution logic here
          // For now, we'll send a placeholder response
          const toolResponse = {
            type: 'conversation.item.create',
            item: {
              type: 'function_call_output',
              call_id: response.call_id,
              output: JSON.stringify({
                error: 'Tool execution not yet implemented'
              })
            }
          };
          openAiWs.send(JSON.stringify(toolResponse));
        }
        
        // Handle errors
        if (response.type === 'error') {
          logger.error('OpenAI error', { 
            error: response.error,
            agentId: config.agentId 
          });
          
          // Send error message to user if appropriate
          if (config.chatbotErrorMessage) {
            const errorMessage = {
              type: 'conversation.item.create',
              item: {
                type: 'message',
                role: 'assistant',
                content: [{
                  type: 'input_text',
                  text: config.chatbotErrorMessage
                }]
              }
            };
            openAiWs.send(JSON.stringify(errorMessage));
            openAiWs.send(JSON.stringify({ type: 'response.create' }));
          }
        }
        
      } catch (error) {
        logger.error('Error processing OpenAI message', { 
          error: error.message, 
          agentId: config.agentId 
        });
      }
    });
    
    openAiWs.on('close', () => {
      logger.info('Disconnected from OpenAI Realtime API', { agentId: config.agentId });
    });
    
    openAiWs.on('error', (error) => {
      logger.error('OpenAI WebSocket error', { 
        error: error.message, 
        agentId: config.agentId 
      });
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
              logger.info(`Received media timestamp: ${latestMediaTimestamp}ms`, { agentId: config.agentId });
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
            logger.info('Incoming stream has started', { 
              streamSid, 
              agentId: config.agentId,
              callSid: config.callSid,
              from: config.from,
              to: config.to
            });
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
            logger.info('Received non-media event', { event: data.event, agentId: config.agentId });
            break;
        }
      } catch (error) {
        logger.error('Error handling Twilio message', { 
          error: error.message,
          agentId: config.agentId 
        });
      }
    });
    
    // Handle Twilio WebSocket close
    ws.on('close', () => {
      logger.info('Twilio WebSocket connection closed', { connectionId, agentId: config.agentId });
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
        agentId: config.agentId 
      });
      if (openAiWs && openAiWs.readyState === WebSocket.OPEN) {
        openAiWs.close();
      }
      activeConnections.delete(connectionId);
    });
    
  } catch (error) {
    logger.error('Error setting up WebSocket connection', { 
      error: error.message,
      agentId: config.agentId 
    });
    ws.close(1011, 'Internal server error');
    if (openAiWs && openAiWs.readyState === WebSocket.OPEN) {
      openAiWs.close();
    }
  }
}

// Cleanup function for graceful shutdown
async function cleanup() {
  logger.info('Cleaning up active connections...');
  for (const [connectionId, connection] of activeConnections) {
    try {
      connection.ws.close();
    } catch (error) {
      logger.error('Error closing connection', { connectionId, error: error.message });
    }
  }
}

// Handle process termination
process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);

module.exports = { handleTwilioWebSocket }; 