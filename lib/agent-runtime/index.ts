import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { 
  AgentConfig, 
  AgentContext, 
  AgentMessage, 
  ChannelContext,
  ConversationState,
  ConversationEvent,
  StreamingResponse,
  AgentTool
} from './types';
import { ConversationManager } from './conversation-manager';
import { AIProvider } from './types';
import { OpenAIProvider } from './providers/openai-provider';
import { ToolExecutor, builtInTools } from './tool-executor';
import { AnalyticsService } from './analytics';

export class AgentRuntime {
  private config: AgentConfig;
  private conversationManager: ConversationManager;
  private aiProvider: AIProvider;
  private toolExecutor: ToolExecutor;
  private activeStreams: Map<string, StreamingResponse> = new Map();
  private analytics: AnalyticsService;
  
  constructor(config: AgentConfig) {
    this.config = config;
    this.conversationManager = new ConversationManager();
    this.aiProvider = new OpenAIProvider(); // Default to OpenAI
    this.toolExecutor = new ToolExecutor();
    this.analytics = AnalyticsService.getInstance();
    
    // Register built-in tools
    Object.values(builtInTools).forEach(tool => this.toolExecutor.registerTool(tool));
    
    // Load custom tools if any
    if (config.tools) {
      config.tools.forEach(tool => this.toolExecutor.registerTool(tool));
    }
    
    logger.info('Agent runtime initialized', { 
      agentId: config.id,
      model: config.modelName 
    }, 'agent-runtime');
  }
  
  /**
   * Create an AgentRuntime instance from a chatbot ID
   */
  static async fromChatbotId(chatbotId: string): Promise<AgentRuntime> {
    const chatbot = await prisma.chatbot.findUnique({
      where: { id: chatbotId },
      include: {
        model: true,
        knowledgeSources: true
      }
    });
    
    if (!chatbot) {
      throw new Error(`Chatbot not found: ${chatbotId}`);
    }
    
    // Convert Prisma Chatbot to AgentConfig
    const config: AgentConfig = {
      id: chatbot.id,
      name: chatbot.name,
      userId: chatbot.userId,
      
      // Core AI settings from database
      prompt: chatbot.prompt || 'You are a helpful assistant.',
      modelId: chatbot.modelId || undefined,
      modelName: chatbot.model?.name || 'gpt-3.5-turbo',
      temperature: chatbot.temperature,
      maxCompletionTokens: chatbot.maxCompletionTokens,
      maxPromptTokens: chatbot.maxPromptTokens,
      
      // Messages from database
      welcomeMessage: chatbot.welcomeMessage || 'Hello! How can I help you today?',
      chatbotErrorMessage: chatbot.chatbotErrorMessage || 'I apologize, but I encountered an error.',
      
      // Voice settings from database
      voice: chatbot.voice || undefined,
      language: chatbot.language || 'en-US',
      secondLanguage: chatbot.secondLanguage || undefined,
      responseRate: chatbot.responseRate || undefined,
      
      // Call settings from database
      silenceTimeout: chatbot.silenceTimeout || undefined,
      callTimeout: chatbot.callTimeout || undefined,
      checkUserPresence: chatbot.checkUserPresence || false,
      presenceMessage: chatbot.presenceMessage || undefined,
      presenceMessageDelay: chatbot.presenceMessageDelay || undefined,
      hangUpMessage: chatbot.hangUpMessage || undefined,
      
      // Channel flags from database
      websiteEnabled: chatbot.websiteEnabled,
      whatsappEnabled: chatbot.whatsappEnabled,
      smsEnabled: chatbot.smsEnabled,
      messengerEnabled: chatbot.messengerEnabled,
      instagramEnabled: chatbot.instagramEnabled,
      
      // Features from database
      chatHistoryEnabled: chatbot.chatHistoryEnabled,
      chatFileAttachementEnabled: chatbot.chatFileAttachementEnabled,
      calendarEnabled: chatbot.calendarEnabled,
      calendarId: chatbot.calendarId || undefined,
      
      // Knowledge sources
      knowledgeSourceIds: chatbot.knowledgeSources.map(ks => ks.id),
      
      // Tools will be loaded separately
      tools: []
    };
    
    return new AgentRuntime(config);
  }
  
  /**
   * Process a message from any channel
   */
  async processMessage(
    message: AgentMessage,
    context: ChannelContext,
    streaming?: StreamingResponse
  ): Promise<AgentMessage> {
    const startTime = Date.now();
    
    try {
      // Start tracking if new conversation
      const conversation = await this.conversationManager.getOrCreateConversation(
        context.sessionId,
        context
      );
      
      if (conversation.messages.length === 0) {
        this.analytics.startConversation(context.sessionId, context);
      }
      
      // Add user message to conversation
      conversation.messages.push(message);
      await this.conversationManager.saveMessage(message, context);
      
      // Track user message
      this.analytics.trackMessage(context.sessionId, message);
      
      logger.info('Processing message', { 
        sessionId: context.sessionId,
        channel: context.type,
        messageLength: message.content.length 
      }, 'agent-runtime');
      
      // Apply channel-specific overrides
      const channelConfig = this.getChannelConfig(context.type);
      
      // Prepare messages for AI
      const aiMessages = await this.prepareAIMessages(conversation, channelConfig);
      
      // Get AI response
      let responseContent: string;
      
      if (streaming) {
        responseContent = await this.aiProvider.generateStream(
          aiMessages,
          {
            model: channelConfig.modelName || 'gpt-4',
            temperature: channelConfig.temperature,
            maxTokens: channelConfig.maxCompletionTokens,
            tools: this.toolExecutor.getToolDefinitions(),
            toolChoice: 'auto'
          },
          streaming.onToken || (() => {})
        );
      } else {
        responseContent = await this.aiProvider.generate(
          aiMessages,
          {
            model: channelConfig.modelName || 'gpt-4',
            temperature: channelConfig.temperature,
            maxTokens: channelConfig.maxCompletionTokens,
            tools: this.toolExecutor.getToolDefinitions(),
            toolChoice: 'auto'
          }
        );
      }
      
      // Create assistant message
      const assistantMessage: AgentMessage = {
        id: `assistant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: 'assistant',
        content: responseContent,
        type: 'text',
        timestamp: new Date()
      };
      
      // Add to conversation and save
      conversation.messages.push(assistantMessage);
      await this.conversationManager.saveMessage(assistantMessage, context);
      
      // Track assistant message with response time
      const responseTime = Date.now() - startTime;
      this.analytics.trackMessage(context.sessionId, assistantMessage, responseTime);
      
      // Notify streaming complete
      if (streaming?.onComplete) {
        streaming.onComplete();
      }
      
      logger.info('Message processed successfully', { 
        sessionId: context.sessionId,
        responseTime 
      }, 'agent-runtime');
      
      return assistantMessage;
      
    } catch (error) {
      logger.error('Error processing message', { 
        error: error.message,
        sessionId: context.sessionId 
      }, 'agent-runtime');
      
      // Track error
      this.analytics.trackError(context.sessionId, error as Error);
      
      if (streaming?.onError) {
        streaming.onError(error as Error);
      }
      
      // Return error message
      const errorMessage: AgentMessage = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: this.config.chatbotErrorMessage || 'I apologize, but I encountered an error processing your message.',
        type: 'text',
        timestamp: new Date(),
        metadata: { error: error.message }
      };
      
      await this.conversationManager.saveMessage(errorMessage, context);
      
      return errorMessage;
    }
  }
  
  /**
   * Handle interruption (for voice/phone channels)
   */
  async handleInterruption(channelContext: ChannelContext): Promise<void> {
    const sessionId = `${channelContext.type}-${channelContext.threadId}`;
    const streamKey = `${sessionId}-stream`;
    
    // Cancel any active streams
    const activeStream = this.activeStreams.get(streamKey);
    if (activeStream) {
      logger.info('Interrupting active stream', { sessionId }, 'agent-runtime');
      // Signal interruption to AI provider
      await this.aiProvider.interrupt?.(sessionId);
      this.activeStreams.delete(streamKey);
    }
    
    // Update conversation state
    const conversation = await this.conversationManager.getConversation(sessionId);
    if (conversation?.currentTurn) {
      conversation.currentTurn.pendingInterruption = true;
    }
    
    this.emitEvent({
      type: 'interruption',
      timestamp: new Date(),
      data: { context: channelContext }
    });
  }
  
  /**
   * Generate AI response with optional streaming
   */
  private async generateResponse(
    context: AgentContext,
    streaming?: StreamingResponse
  ): Promise<AgentMessage> {
    const { conversation, agent, channel } = context;
    
    // Prepare messages for AI
    const messages = this.prepareMessagesForAI(conversation, agent);
    
    // Add knowledge context if available
    if (agent.knowledgeSourceIds.length > 0) {
      // This will be implemented when we add knowledge source support
      logger.debug('Knowledge sources available but not yet implemented', {
        knowledgeSourceIds: agent.knowledgeSourceIds
      }, 'agent-runtime');
    }
    
    // Get tool definitions if any tools are registered
    const tools = this.toolExecutor.getToolDefinitions();
    
    // Generate response based on channel capabilities
    if (channel.capabilities.supportsAudio && agent.voice) {
      // Generate audio response for voice-enabled channels
      return this.generateAudioResponse(messages, context, streaming, tools);
    } else {
      // Generate text response
      return this.generateTextResponse(messages, context, streaming, tools);
    }
  }
  
  /**
   * Generate text response
   */
  private async generateTextResponse(
    messages: any[],
    context: AgentContext,
    streaming?: StreamingResponse,
    tools?: any[]
  ): Promise<AgentMessage> {
    const { agent, channel } = context;
    
    const options = {
      model: agent.modelName || 'gpt-3.5-turbo',
      temperature: agent.temperature,
      maxTokens: agent.maxCompletionTokens,
      tools: tools?.length ? tools : undefined,
      toolChoice: tools?.length ? 'auto' : undefined
    };
    
    if (streaming?.onToken) {
      // Stream the response
      const streamKey = `${channel.type}-${channel.threadId}-stream`;
      this.activeStreams.set(streamKey, streaming);
      
      try {
        const content = await this.aiProvider.generateStream(
          messages,
          options,
          (token) => streaming.onToken?.(token)
        );
        
        return {
          id: this.generateMessageId(),
          role: 'assistant',
          content,
          type: 'text',
          timestamp: new Date()
        };
      } finally {
        this.activeStreams.delete(streamKey);
        streaming.onComplete?.();
      }
    } else {
      // Non-streaming response
      const content = await this.aiProvider.generate(messages, options);
      
      return {
        id: this.generateMessageId(),
        role: 'assistant',
        content,
        type: 'text',
        timestamp: new Date()
      };
    }
  }
  
  /**
   * Generate audio response (for voice-enabled channels)
   */
  private async generateAudioResponse(
    messages: any[],
    context: AgentContext,
    streaming?: StreamingResponse,
    tools?: any[]
  ): Promise<AgentMessage> {
    // This will be implemented in Phase 2 when we add voice support
    logger.warn('Audio response not yet implemented, falling back to text', {
      voice: context.agent.voice
    }, 'agent-runtime');
    return this.generateTextResponse(messages, context, streaming, tools);
  }
  
  /**
   * Check if a channel is enabled for this agent
   */
  private isChannelEnabled(channelType: ChannelContext['type']): boolean {
    switch (channelType) {
      case 'web':
        return this.config.websiteEnabled;
      case 'whatsapp':
        return this.config.whatsappEnabled;
      case 'sms':
        return this.config.smsEnabled;
      case 'messenger':
        return this.config.messengerEnabled;
      case 'instagram':
        return this.config.instagramEnabled;
      case 'voice':
      case 'phone':
        // Voice and phone are enabled if the agent has a phone number
        return true; // Will be checked at a higher level
      default:
        return false;
    }
  }
  
  /**
   * Get list of enabled channels
   */
  private getEnabledChannels(): string[] {
    const channels: string[] = [];
    if (this.config.websiteEnabled) channels.push('web');
    if (this.config.whatsappEnabled) channels.push('whatsapp');
    if (this.config.smsEnabled) channels.push('sms');
    if (this.config.messengerEnabled) channels.push('messenger');
    if (this.config.instagramEnabled) channels.push('instagram');
    return channels;
  }
  
  /**
   * Get effective config with channel overrides
   */
  private getEffectiveConfig(channelType: ChannelContext['type']): AgentConfig {
    const override = this.config.channelOverrides?.[channelType];
    if (override) {
      return { ...this.config, ...override };
    }
    return this.config;
  }
  
  /**
   * Prepare conversation messages for AI
   */
  private prepareMessagesForAI(conversation: ConversationState, agent: AgentConfig): any[] {
    const messages = [
      { role: 'system', content: agent.prompt }
    ];
    
    // Add conversation history (limit to recent messages based on token limit)
    const recentMessages = conversation.messages.slice(-20); // Adjust based on token limits
    recentMessages.forEach(msg => {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      }
    });
    
    return messages;
  }
  
  /**
   * Register built-in tools
   */
  private registerBuiltInTools(): void {
    // Register date/time tool
    this.toolExecutor.registerTool(builtInTools.getCurrentDateTime);
    
    // Register calculator tool
    this.toolExecutor.registerTool(builtInTools.calculate);
    
    // Additional built-in tools can be added here
  }
  
  /**
   * Emit conversation event
   */
  private emitEvent(event: ConversationEvent): void {
    // Event emission logic (can be extended with event emitters or webhooks)
    logger.debug('Conversation event', event, 'agent-runtime');
  }
  
  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Get the conversation manager instance
   */
  getConversationManager(): ConversationManager {
    return this.conversationManager;
  }
  
  /**
   * Get the tool executor instance
   */
  getToolExecutor(): ToolExecutor {
    return this.toolExecutor;
  }
  
  /**
   * End a conversation
   */
  async endConversation(sessionId: string, resolved: boolean = true): Promise<void> {
    await this.analytics.endConversation(sessionId, resolved);
    logger.info('Conversation ended', { sessionId, resolved }, 'agent-runtime');
  }
  
  /**
   * Get analytics service
   */
  getAnalytics(): AnalyticsService {
    return this.analytics;
  }
  
  /**
   * Get channel-specific configuration
   */
  private getChannelConfig(channelType: ChannelContext['type']): AgentConfig {
    const override = this.config.channelOverrides?.[channelType];
    if (override) {
      return { ...this.config, ...override };
    }
    return this.config;
  }
  
  /**
   * Prepare messages for AI including system prompt and conversation history
   */
  private async prepareAIMessages(conversation: ConversationState, config: AgentConfig): Promise<any[]> {
    const messages: any[] = [
      { role: 'system', content: config.prompt }
    ];
    
    // Add conversation history (limit to recent messages based on token limit)
    const recentMessages = conversation.messages.slice(-20); // Adjust based on token limits
    
    for (const msg of recentMessages) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      } else if (msg.type === 'function_call' && msg.metadata?.functionName) {
        // Include function calls in the conversation
        messages.push({
          role: 'assistant',
          content: null,
          function_call: {
            name: msg.metadata.functionName,
            arguments: JSON.stringify(msg.metadata.functionArgs || {})
          }
        });
      } else if (msg.type === 'function_result') {
        // Include function results
        messages.push({
          role: 'function',
          name: msg.metadata?.functionName || 'unknown',
          content: JSON.stringify(msg.metadata?.functionResult || {})
        });
      }
    }
    
    return messages;
  }
}

// Export types and components
export * from './types';
export { ConversationManager } from './conversation-manager';
export { ToolExecutor, builtInTools } from './tool-executor';
export { OpenAIProvider } from './providers/openai-provider';

// Export channel adapters
export { BaseChannelAdapter } from './channels/base-adapter';
export { WebChatAdapter } from './channels/web-adapter';
export { WhatsAppAdapter } from './channels/whatsapp-adapter';
export { SMSAdapter } from './channels/sms-adapter';

// Export analytics
export { AnalyticsService } from './analytics'; 