const WebSocket = require('ws');
const axios = require('axios');

// Simple logger
const logger = {
  info: (message, data = {}) => {
    console.log(`[INFO] ${message}`, JSON.stringify(data));
  },
  error: (message, data = {}) => {
    console.error(`[ERROR] ${message}`, JSON.stringify(data));
  }
};

// Function to search vector store using OpenAI API
async function searchVectorStore(config, query) {
  if (!config.vectorStoreIds || config.vectorStoreIds.length === 0) {
    return { results: [], message: 'No knowledge base configured' };
  }

  try {
    // Use OpenAI Files API to search through vector stores
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that searches through documents. Please search for relevant information and provide a concise summary.'
          },
          {
            role: 'user',
            content: `Search for: ${query}`
          }
        ],
        tools: [
          {
            type: 'file_search'
          }
        ],
        tool_choice: 'auto',
        max_tokens: 1000
      },
      {
        headers: {
          'Authorization': `Bearer ${config.openAIKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        }
      }
    );

    const results = response.data.choices?.[0]?.message?.content || 'No results found';
    
    return {
      results: [{ content: results }],
      query: query,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Vector store search failed', {
      error: error.message,
      query: query,
      vectorStoreIds: config.vectorStoreIds
    });
    
    return {
      results: [],
      error: 'Search failed',
      message: error.message
    };
  }
}

// Store active connections
const activeConnections = new Map();

// Constants for OpenAI session configuration
const SHOW_TIMING_MATH = false;
const LOG_EVENT_TYPES = [
    'error',
    'response.content.done',
    'rate_limits.updated',
    'response.done',
    'response.created',
    'response.output_item.added',
    'response.output_item.done',
    'response.audio.delta',
    'response.audio.done',
    'response.text.delta',
    'response.text.done',
    'input_audio_buffer.committed',
    'input_audio_buffer.speech_stopped',
    'input_audio_buffer.speech_started',
    'conversation.item.created',
    'conversation.item.input_audio_transcription.completed',
    'session.created',
    'session.updated'
];

async function handleTwilioWebSocket(ws, config) {
  let streamSid = null;
  let latestMediaTimestamp = 0;
  let lastAssistantItem = null;
  let markQueue = [];
  let responseStartTimestampTwilio = null;
  let openAiWs = null;
  let configuredVoice = 'alloy';
  let sessionReady = false;
  let audioBuffer = []; // Buffer audio deltas until streamSid is available
  let pendingTwilioMessages = []; // Buffer for Twilio messages before OpenAI is ready
  
  try {
    logger.info('WebSocket connection established', { 
      agentId: config.agentId,
      hasTools: !!config.tools && config.tools.length > 0,
      hasKnowledge: !!config.vectorStoreIds && config.vectorStoreIds.length > 0,
      hasStartMessage: !!config.startMessage
    });
    
    // CRITICAL: Set up Twilio message handler IMMEDIATELY to capture start event
    const messageHandler = async (message) => {
      try {
        const data = JSON.parse(message);
        
        // Log first message for debugging
        if (!streamSid) {
          logger.info('Early Twilio message received', { 
            event: data.event,
            hasStart: !!data.start,
            hasStreamSid: !!data.start?.streamSid,
            agentId: config.agentId
          });
        }
        
        // Always handle start event immediately (account for both Twilio formats)
        if (data.event === 'start') {
          // Twilio sometimes puts streamSid at top level, sometimes nested
          const sid = data.streamSid || data.start?.streamSid;
          if (sid) {
            streamSid = sid;
            logger.info('Incoming stream has started (captured immediately)', { 
              streamSid, 
              agentId: config.agentId,
              callSid: config.callSid || data.start?.callSid,
              from: config.from || data.start?.customParameters?.from,
              to: config.to
            });
            
            // Flush any buffered audio deltas now that we have streamSid
            if (audioBuffer.length > 0) {
              logger.info('Flushing buffered audio deltas', { 
                agentId: config.agentId,
                bufferSize: audioBuffer.length,
                streamSid: streamSid
              });
              
              for (const delta of audioBuffer) {
                const audioDelta = {
                  event: 'media',
                  streamSid: streamSid,
                  media: { payload: delta }
                };
                ws.send(JSON.stringify(audioDelta));
              }
              
              audioBuffer = []; // Clear the buffer
            }
            
            // Reset timestamps on new stream
            responseStartTimestampTwilio = null;
            latestMediaTimestamp = 0;
            return;
          }
        }
        
        // If OpenAI isn't ready yet, buffer the messages
        if (!openAiWs || openAiWs.readyState !== WebSocket.OPEN) {
          pendingTwilioMessages.push(data);
          return;
        }
        
        // Process the message normally
        processTwilioMessage(data);
      } catch (error) {
        logger.error('Error handling early Twilio message', { 
          error: error.message,
          message: message.substring(0, 200),
          agentId: config.agentId 
        });
      }
    };
    
    // Attach the message handler to the WebSocket
    ws.on('message', messageHandler);
    
    // If we have a start message from server.js, replay it immediately
    if (config.startMessage) {
      logger.info('Replaying start message from server.js', { 
        agentId: config.agentId
      });
      // Process the start message through our handler
      messageHandler(config.startMessage);
    }
    
    // Validate required configuration
    if (!config.openAIKey) {
      logger.error('No OpenAI API key provided', { agentId: config.agentId });
      ws.close(1008, 'Configuration error: Missing OpenAI key');
      return;
    }
    
    const connectionId = `${config.agentId}-${Date.now()}`;
    activeConnections.set(connectionId, { ws, config });
    
    // Connect to OpenAI Realtime API
    // Use full model for audio generation support
  const model = 'gpt-4o-realtime-preview';
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
      
      // Store configured voice for later use
      configuredVoice = openAIVoice;
      
      // Build session configuration following OpenAI documentation exactly
      const sessionUpdate = {
        type: 'session.update',
        session: {
          model: model,
          turn_detection: { 
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500,
            create_response: true
          },
          input_audio_format: 'g711_ulaw',
          output_audio_format: 'g711_ulaw', 
          input_audio_transcription: {
            model: 'whisper-1'
          },
          voice: openAIVoice,
          instructions: (config.instructions || config.prompt || 'You are a helpful AI assistant.') + ' Always respond with spoken audio.',
          modalities: ["audio", "text"], // Try audio first to prioritize audio generation
          temperature: config.temperature || 0.8,
          max_response_output_tokens: 4096,
          tool_choice: config.tools && config.tools.length > 0 ? 'auto' : 'none'
        }
      };
      
      // Add max tokens if specified
      if (config.maxTokens) {
        sessionUpdate.session.max_response_output_tokens = config.maxTokens;
      }
      
      // Add tools if available - convert file_search to custom function
      if (config.tools && config.tools.length > 0) {
        const realtimeTools = config.tools.map(tool => {
          if (tool.type === 'file_search') {
            // Convert file_search to custom function tool for Realtime API
            return {
              type: 'function',
              name: 'search_knowledge_base',
              description: 'Searches internal documents and returns relevant passages based on the query',
              parameters: {
                type: 'object',
                properties: {
                  query: {
                    type: 'string',
                    description: 'What to look for inside our documents'
                  }
                },
                required: ['query']
              }
            };
          }
          return tool;
        });
        
        sessionUpdate.session.tools = realtimeTools;
        logger.info('Adding tools to session', { 
          agentId: config.agentId,
          toolCount: realtimeTools.length,
          toolTypes: realtimeTools.map(t => t.type),
          hasVectorStores: config.vectorStoreIds?.length > 0
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
      
      // Clear any initial audio buffer to prevent false triggers
      setTimeout(() => {
        openAiWs.send(JSON.stringify({
          type: 'input_audio_buffer.clear'
        }));
      }, 50);
      
      // Send welcome message if configured
      if (config.welcomeMessage) {
        setTimeout(() => {
          const conversationItem = {
            type: 'conversation.item.create',
            item: {
              type: 'message',
              role: 'assistant',
              content: [{
                type: 'text',
                text: config.welcomeMessage
              }]
            }
          };
          openAiWs.send(JSON.stringify(conversationItem));
          
          // Now trigger generation of the welcome message
          setTimeout(() => {
            openAiWs.send(JSON.stringify({ 
              type: 'response.create'
            }));
          }, 50);
        }, 200);
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
    
    // Process Twilio messages (called from the message handler)
    const processTwilioMessage = (data) => {
      switch (data.event) {
        case 'media':
          // Update latest timestamp for timing calculations
          latestMediaTimestamp = data.media.timestamp;
          
          // Check if we need to flush buffered audio when receiving media events
          if (streamSid && audioBuffer.length > 0) {
            logger.info('Flushing buffered audio deltas on media event', { 
              agentId: config.agentId,
              bufferSize: audioBuffer.length,
              streamSid: streamSid,
              timestamp: latestMediaTimestamp
            });
            
            for (const delta of audioBuffer) {
              const audioDelta = {
                event: 'media',
                streamSid: streamSid,
                media: { payload: delta }
              };
              ws.send(JSON.stringify(audioDelta));
              sendMark(streamSid);
            }
            
            // Clear the buffer and set timing
            audioBuffer = [];
            if (!responseStartTimestampTwilio) {
              responseStartTimestampTwilio = latestMediaTimestamp;
              logger.info(`Setting start timestamp after media flush: ${responseStartTimestampTwilio}ms`, { agentId: config.agentId });
            }
          }
          
          // Forward audio to OpenAI only after session is ready
          if (openAiWs.readyState === WebSocket.OPEN && sessionReady) {
            const audioAppend = {
              type: 'input_audio_buffer.append',
              audio: data.media.payload
            };
            openAiWs.send(JSON.stringify(audioAppend));
            
            // Log first few media packets for debugging
            if (latestMediaTimestamp < 1000) {
              logger.info('Forwarding audio to OpenAI', { 
                agentId: config.agentId,
                timestamp: latestMediaTimestamp,
                payloadLength: data.media.payload?.length 
              });
            }
          } else if (!sessionReady) {
            // Log that we're skipping audio until session is ready
            if (latestMediaTimestamp < 100) {
              logger.info('Skipping audio - session not ready', { 
                agentId: config.agentId,
                timestamp: latestMediaTimestamp 
              });
            }
          }
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
    };
    
    // OpenAI WebSocket event handlers
    openAiWs.on('open', () => {
      logger.info('Connected to OpenAI Realtime API', { agentId: config.agentId });
      logger.info('DEPLOYMENT VERSION: Start message replay from server.js', { agentId: config.agentId });
      
      // Process any buffered Twilio messages now that OpenAI is ready
      while (pendingTwilioMessages.length > 0) {
        processTwilioMessage(pendingTwilioMessages.shift());
      }
      
      setTimeout(initializeSession, 100);
    });
    
    openAiWs.on('message', async (data) => {
      try {
        const response = JSON.parse(data);
        
        if (LOG_EVENT_TYPES.includes(response.type)) {
          let hasAudio = undefined;
          if (response.type === 'response.done' && response.response?.output) {
            // Check if any output item has audio content
            hasAudio = response.response.output.some(item => 
              item.content?.some(c => c.type === 'audio')
            );
          }
          
          logger.info(`OpenAI event: ${response.type}`, { 
            agentId: config.agentId,
            hasAudio: hasAudio,
            fullResponse: response.type === 'response.done' ? JSON.stringify(response.response) : undefined
          });
        }
        
        // Add more detailed logging for response events
        if (response.type === 'response.created') {
          logger.info('Response created', { 
            agentId: config.agentId,
            response: JSON.stringify(response)
          });
        }
        
        if (response.type === 'response.output_item.added') {
          logger.info('Response output item added', { 
            agentId: config.agentId,
            item: JSON.stringify(response.item)
          });
        }
        
        // Listen for session.updated - no manual response needed due to create_response: true
        if (response.type === 'session.updated') {
          logger.info('Session updated successfully', { agentId: config.agentId });
          sessionReady = true;
        }
        
        // Handle audio responses from OpenAI
        if (response.type === 'response.audio.delta' && response.delta) {
          if (!streamSid) {
            // Buffer audio deltas until streamSid is available
            audioBuffer.push(response.delta);
            logger.info('Buffering audio delta until streamSid available', { 
              agentId: config.agentId,
              bufferSize: audioBuffer.length,
              deltaLength: response.delta?.length
            });
            return;
          }
          
          const audioDelta = {
            event: 'media',
            streamSid: streamSid,
            media: { payload: response.delta }
          };
          ws.send(JSON.stringify(audioDelta));
          
          // Log successful audio forwarding (only first few)
          if (!responseStartTimestampTwilio || latestMediaTimestamp < 2000) {
            logger.info('Forwarding audio delta to Twilio', { 
              agentId: config.agentId,
              streamSid: streamSid,
              deltaLength: response.delta?.length,
              timestamp: latestMediaTimestamp
            });
          }
          
          // Track timing for interruption handling
          if (!responseStartTimestampTwilio) {
            responseStartTimestampTwilio = latestMediaTimestamp;
            logger.info(`Setting start timestamp: ${responseStartTimestampTwilio}ms`, { agentId: config.agentId });
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
        
                // Log when user speech is committed (server_vad will automatically handle response)
        if (response.type === 'input_audio_buffer.committed') {
          logger.info('User speech committed, server_vad will automatically generate audio response', { agentId: config.agentId });
        }
        
        // Handle tool calls
        if (response.type === 'response.function_call_arguments.done') {
          logger.info('Function call completed', {
            agentId: config.agentId,
            functionName: response.name,
            callId: response.call_id,
            arguments: response.arguments
          });
          
          // Handle search_knowledge_base function
          if (response.name === 'search_knowledge_base') {
            try {
              const args = JSON.parse(response.arguments);
              const searchResults = await searchVectorStore(config, args.query);
              
              // Send function output back to OpenAI
              const toolResponse = {
                type: 'conversation.item.create',
                item: {
                  type: 'function_call_output',
                  call_id: response.call_id,
                  output: JSON.stringify(searchResults)
                }
              };
              openAiWs.send(JSON.stringify(toolResponse));

              logger.info('Search results sent to OpenAI', { 
                agentId: config.agentId,
                query: args.query,
                resultCount: searchResults?.results?.length || 0
              });
            } catch (error) {
              logger.error('Error handling search function', { 
                agentId: config.agentId,
                error: error.message 
              });
              
              // Send error response
              const toolResponse = {
                type: 'conversation.item.create',
                item: {
                  type: 'function_call_output',
                  call_id: response.call_id,
                  output: JSON.stringify({ error: 'Search failed', message: error.message })
                }
              };
              openAiWs.send(JSON.stringify(toolResponse));
            }
          } else {
            // Handle other function calls (placeholder)
            const toolResponse = {
              type: 'conversation.item.create',
              item: {
                type: 'function_call_output',
                call_id: response.call_id,
                output: JSON.stringify({
                  error: 'Function not implemented',
                  function: response.name
                })
              }
            };
            openAiWs.send(JSON.stringify(toolResponse));
          }
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
                  type: 'text',
                  text: config.chatbotErrorMessage
                }]
              }
            };
            openAiWs.send(JSON.stringify(errorMessage));
            openAiWs.send(JSON.stringify({ 
              type: 'response.create'
            }));
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
    
    // Twilio message handler moved to top of function to capture start event immediately
    
    // Handle Twilio WebSocket close
    ws.on('close', () => {
      logger.info('Twilio WebSocket connection closed', { connectionId, agentId: config.agentId });
      if (openAiWs && openAiWs.readyState === WebSocket.OPEN) {
        openAiWs.close();
      }
      // Clear audio buffer to prevent memory leaks
      audioBuffer = [];
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
      // Clear audio buffer to prevent memory leaks
      audioBuffer = [];
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