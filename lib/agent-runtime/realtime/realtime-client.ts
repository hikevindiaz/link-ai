import WebSocket from 'ws';
import { logger } from '@/lib/logger';
import { AgentRuntime } from '../index';
import { ChannelContext, AgentMessage } from '../types';
import { EventEmitter } from 'events';

interface TwilioMediaMessage {
  event: string;
  streamSid?: string;
  media?: {
    timestamp: string;
    payload: string;
    track?: string;
  };
  start?: {
    streamSid: string;
    accountSid: string;
    callSid: string;
    tracks: string[];
    customParameters?: Record<string, string>;
  };
  mark?: {
    name: string;
  };
}

export class RealtimeClient extends EventEmitter {
  private runtime: AgentRuntime;
  private agent: any; // Chatbot from Prisma
  private openAIWs: WebSocket | null = null;
  private twilioWs: any;
  private streamSid: string | null = null;
  private callSid: string | null = null;
  private channelContext: ChannelContext | null = null;
  private isConnected = false;
  private audioBuffer: Buffer[] = [];
  private lastAssistantItem: string | null = null;
  private responseInProgress = false;

  constructor(runtime: AgentRuntime, agent: any) {
    super();
    this.runtime = runtime;
    this.agent = agent;
  }

  /**
   * Handle incoming Twilio message
   */
  async handleTwilioMessage(message: TwilioMediaMessage, twilioSocket: any) {
    this.twilioWs = twilioSocket;
    
    logger.debug('Received Twilio message', { 
      event: message.event,
      streamSid: message.streamSid 
    }, 'realtime-client');

    switch (message.event) {
      case 'start':
        await this.handleStart(message);
        break;
        
      case 'media':
        await this.handleMedia(message);
        break;
        
      case 'mark':
        this.handleMark(message);
        break;
        
      case 'stop':
        this.handleStop();
        break;
        
      default:
        logger.debug('Unhandled Twilio event', { event: message.event }, 'realtime-client');
    }
  }

  /**
   * Handle stream start
   */
  private async handleStart(message: TwilioMediaMessage) {
    if (!message.start) return;
    
    this.streamSid = message.start.streamSid;
    this.callSid = message.start.callSid;
    
    logger.info('Media stream started', { 
      streamSid: this.streamSid,
      callSid: this.callSid 
    }, 'realtime-client');

    // Create channel context for phone
    this.channelContext = {
      type: 'phone',
      sessionId: `phone-${this.callSid}`,
      userId: this.agent.userId,
      chatbotId: this.agent.id,
      threadId: `call-${this.callSid}`,
      capabilities: {
        supportsAudio: true,
        supportsVideo: false,
        supportsImages: false,
        supportsFiles: false,
        supportsRichText: false,
        supportsTypingIndicator: false,
        supportsDeliveryReceipts: false,
        supportsInterruption: true,
        maxAudioDuration: this.agent.callTimeout || 600
      },
      metadata: {
        callSid: this.callSid,
        streamSid: this.streamSid,
        phoneNumber: message.start.customParameters?.from || 'unknown'
      }
    };

    // Connect to OpenAI Realtime API
    await this.connectToOpenAI();
    
    // Send welcome message
    if (this.agent.welcomeMessage) {
      await this.sendInitialMessage();
    }
  }

  /**
   * Connect to OpenAI Realtime API
   */
  private async connectToOpenAI() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      logger.error('Missing OpenAI API key', {}, 'realtime-client');
      return;
    }

    try {
      this.openAIWs = new WebSocket('wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'OpenAI-Beta': 'realtime=v1'
        }
      });

      this.openAIWs.on('open', () => {
        logger.info('Connected to OpenAI Realtime API', {}, 'realtime-client');
        this.isConnected = true;
        this.configureSession();
      });

      this.openAIWs.on('message', (data: Buffer) => {
        this.handleOpenAIMessage(JSON.parse(data.toString()));
      });

      this.openAIWs.on('close', () => {
        logger.info('OpenAI connection closed', {}, 'realtime-client');
        this.isConnected = false;
      });

      this.openAIWs.on('error', (error) => {
        logger.error('OpenAI WebSocket error', { error: error.message }, 'realtime-client');
      });

    } catch (error) {
      logger.error('Failed to connect to OpenAI', { error: error.message }, 'realtime-client');
    }
  }

  /**
   * Configure OpenAI session with agent settings
   */
  private configureSession() {
    if (!this.openAIWs || !this.isConnected) return;

    const sessionConfig = {
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions: this.agent.prompt || 'You are a helpful assistant on a phone call.',
        voice: this.mapVoiceToOpenAI(this.agent.voice),
        input_audio_format: 'g711_ulaw',
        output_audio_format: 'g711_ulaw',
        input_audio_transcription: {
          model: 'whisper-1'
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: this.agent.silenceTimeout ? this.agent.silenceTimeout * 1000 : 500
        },
        tools: this.getToolDefinitions(),
        tool_choice: 'auto',
        temperature: this.agent.temperature || 0.8
      }
    };

    this.openAIWs.send(JSON.stringify(sessionConfig));
    logger.debug('Session configured', { voice: sessionConfig.session.voice }, 'realtime-client');
  }

  /**
   * Send initial welcome message
   */
  private async sendInitialMessage() {
    if (!this.openAIWs || !this.isConnected || !this.channelContext) return;

    // Create a conversation item for the welcome message
    const item = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'assistant',
        content: [{
          type: 'input_text',
          text: this.agent.welcomeMessage
        }]
      }
    };

    this.openAIWs.send(JSON.stringify(item));
    
    // Request response generation
    this.openAIWs.send(JSON.stringify({ type: 'response.create' }));
    
    // Save welcome message to conversation
    const welcomeMsg: AgentMessage = {
      id: `welcome_${Date.now()}`,
      role: 'assistant',
      content: this.agent.welcomeMessage,
      type: 'text',
      timestamp: new Date()
    };
    
    await this.runtime.getConversationManager().saveMessage(welcomeMsg, this.channelContext);
  }

  /**
   * Handle incoming media from Twilio
   */
  private async handleMedia(message: TwilioMediaMessage) {
    if (!message.media || !this.openAIWs || !this.isConnected) return;

    // Forward audio to OpenAI
    const audioAppend = {
      type: 'input_audio_buffer.append',
      audio: message.media.payload
    };

    this.openAIWs.send(JSON.stringify(audioAppend));
  }

  /**
   * Handle OpenAI message
   */
  private async handleOpenAIMessage(message: any) {
    logger.debug('OpenAI message received', { type: message.type }, 'realtime-client');

    switch (message.type) {
      case 'error':
        logger.error('OpenAI error', message.error, 'realtime-client');
        break;

      case 'session.created':
      case 'session.updated':
        logger.info('Session updated', {}, 'realtime-client');
        break;

      case 'conversation.item.created':
        if (message.item.role === 'user') {
          await this.handleUserTranscript(message.item);
        }
        break;

      case 'response.audio.delta':
        if (message.delta) {
          this.streamAudioToTwilio(message.delta);
        }
        break;

      case 'response.audio_transcript.delta':
        // Handle incremental transcript if needed
        break;

      case 'response.audio_transcript.done':
        if (message.transcript) {
          await this.handleAssistantTranscript(message.transcript);
        }
        break;

      case 'response.done':
        this.handleResponseComplete();
        break;

      case 'conversation.item.input_audio_transcription.completed':
        if (message.transcript) {
          await this.handleUserTranscript({
            content: [{ type: 'text', text: message.transcript }]
          });
        }
        break;

      case 'response.function_call_arguments.done':
        await this.handleFunctionCall(message);
        break;
    }
  }

  /**
   * Handle user transcript
   */
  private async handleUserTranscript(item: any) {
    if (!this.channelContext) return;

    const text = item.content?.[0]?.text || item.content?.[0]?.transcript || '';
    if (!text) return;

    logger.info('User said', { text }, 'realtime-client');

    // Create user message
    const userMessage: AgentMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text,
      type: 'text',
      timestamp: new Date(),
      metadata: {
        confidence: item.content?.[0]?.confidence
      }
    };

    // Process through runtime (without generating response, as OpenAI Realtime handles that)
    const conversation = await this.runtime.getConversationManager().getOrCreateConversation(
      this.channelContext.sessionId,
      this.channelContext
    );
    
    conversation.messages.push(userMessage);
    await this.runtime.getConversationManager().saveMessage(userMessage, this.channelContext);
  }

  /**
   * Handle assistant transcript
   */
  private async handleAssistantTranscript(transcript: string) {
    if (!this.channelContext || !transcript) return;

    logger.info('Assistant said', { transcript }, 'realtime-client');

    // Create assistant message
    const assistantMessage: AgentMessage = {
      id: `assistant_${Date.now()}`,
      role: 'assistant',
      content: transcript,
      type: 'text',
      timestamp: new Date(),
      metadata: {
        voiceId: this.agent.voice
      }
    };

    // Save to conversation
    const conversation = await this.runtime.getConversationManager().getOrCreateConversation(
      this.channelContext.sessionId,
      this.channelContext
    );
    
    conversation.messages.push(assistantMessage);
    await this.runtime.getConversationManager().saveMessage(assistantMessage, this.channelContext);
  }

  /**
   * Stream audio to Twilio
   */
  private streamAudioToTwilio(audioData: string) {
    if (!this.twilioWs || !this.streamSid) return;

    const mediaMessage = {
      event: 'media',
      streamSid: this.streamSid,
      media: {
        payload: audioData
      }
    };

    this.twilioWs.send(JSON.stringify(mediaMessage));
  }

  /**
   * Handle response complete
   */
  private handleResponseComplete() {
    this.responseInProgress = false;
    
    // Send a mark to track playback
    if (this.twilioWs && this.streamSid) {
      const mark = {
        event: 'mark',
        streamSid: this.streamSid,
        mark: {
          name: 'response_end'
        }
      };
      this.twilioWs.send(JSON.stringify(mark));
    }
  }

  /**
   * Handle function call from OpenAI
   */
  private async handleFunctionCall(message: any) {
    const { name, arguments: args } = message;
    
    try {
      const parsedArgs = JSON.parse(args);
      const toolExecutor = this.runtime.getToolExecutor();
      
      // Execute the tool
      const result = await toolExecutor.executeTool(name, parsedArgs, {
        agent: this.agent,
        channel: this.channelContext!,
        conversation: await this.runtime.getConversationManager().getOrCreateConversation(
          this.channelContext!.sessionId,
          this.channelContext!
        ),
        tools: toolExecutor.getTools()
      });

      // Send result back to OpenAI
      const functionOutput = {
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: message.call_id,
          output: JSON.stringify(result)
        }
      };

      this.openAIWs?.send(JSON.stringify(functionOutput));
      
      // Request a new response
      this.openAIWs?.send(JSON.stringify({ type: 'response.create' }));
      
    } catch (error) {
      logger.error('Error executing function', { error: error.message, name }, 'realtime-client');
    }
  }

  /**
   * Handle mark from Twilio
   */
  private handleMark(message: TwilioMediaMessage) {
    logger.debug('Mark received', { name: message.mark?.name }, 'realtime-client');
  }

  /**
   * Handle stream stop
   */
  private handleStop() {
    logger.info('Media stream stopped', { streamSid: this.streamSid }, 'realtime-client');
    this.disconnect();
  }

  /**
   * Disconnect and cleanup
   */
  disconnect() {
    if (this.openAIWs) {
      this.openAIWs.close();
      this.openAIWs = null;
    }
    
    this.isConnected = false;
    this.emit('disconnected');
  }

  /**
   * Map agent voice to OpenAI voice
   */
  private mapVoiceToOpenAI(voice?: string): string {
    // Map ElevenLabs or other voice IDs to OpenAI voices
    const voiceMap: Record<string, string> = {
      'rachel': 'alloy',
      'josh': 'echo',
      'sarah': 'shimmer',
      // Add more mappings as needed
    };

    if (voice && voiceMap[voice.toLowerCase()]) {
      return voiceMap[voice.toLowerCase()];
    }

    // Default voice
    return 'alloy';
  }

  /**
   * Get tool definitions for OpenAI
   */
  private getToolDefinitions(): any[] {
    const toolExecutor = this.runtime.getToolExecutor();
    return toolExecutor.getToolDefinitions();
  }
} 