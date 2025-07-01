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
  AgentTool,
  MessageProcessingInput
} from './types';
import { ConversationManager } from './conversation-manager';
import { AIProvider } from './types';
import { ProviderFactory, SupportedProvider } from './provider-factory';
import { ToolExecutor, builtInTools } from './tool-executor';
import { AnalyticsService } from './analytics';

export class AgentRuntime {
  private config: AgentConfig;
  private conversationManager: ConversationManager;
  private aiProvider: AIProvider;
  private toolExecutor: ToolExecutor;
  private activeStreams: Map<string, StreamingResponse> = new Map();
  private analytics: AnalyticsService;
  
  // Static caches for performance optimization
  private static configCache = new Map<string, { config: AgentConfig; timestamp: number }>();
  private static CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  
  constructor(config: AgentConfig) {
    this.config = config;
    this.conversationManager = new ConversationManager();
    
    // Initialize AI provider based on model name
    this.aiProvider = ProviderFactory.getProviderFromModelName(
      config.modelName || 'gpt-4',
      config.openaiKey
    );
    
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
   * Create an AgentRuntime instance from a chatbot ID with full context
   */
  static async fromChatbotId(
    chatbotId: string, 
    channelContext?: Partial<ChannelContext>
  ): Promise<AgentRuntime> {
    // Check cache first for performance optimization
    const now = Date.now();
    const cached = this.configCache.get(chatbotId);
    
    if (cached && (now - cached.timestamp) < this.CACHE_TTL) {
      console.log(`[Agent Runtime] Using cached configuration for ${chatbotId} (${((now - cached.timestamp) / 1000).toFixed(1)}s old)`);
      return new AgentRuntime(cached.config);
    }
    
    console.log(`[Agent Runtime] Loading fresh configuration for ${chatbotId}`);
    const startTime = Date.now();
    
    const chatbot = await prisma.chatbot.findUnique({
      where: { id: chatbotId },
      include: {
        model: true,
        knowledgeSources: {
          include: {
            textContents: true,
            websiteContents: true,
            qaContents: true
          }
        },
        calendar: true,
        user: {
          select: {
            companyName: true
          }
        }
      }
    });
    
    if (!chatbot) {
      throw new Error(`Chatbot not found: ${chatbotId}`);
    }

    // Process knowledge sources
    const knowledgeConfig = await this.processKnowledgeSources(chatbot.knowledgeSources);
    
    // Build system prompt with all context
    const systemPrompt = await this.buildSystemPrompt(chatbot, channelContext);
    
    // Convert Prisma Chatbot to AgentConfig
    const config: AgentConfig = {
      id: chatbot.id,
      name: chatbot.name,
      userId: chatbot.userId,
      
      // Core AI settings from database
      prompt: systemPrompt, // Use the built system prompt
      modelId: chatbot.modelId || undefined,
      modelName: chatbot.model?.name || 'gpt-4o-mini',
      openaiKey: chatbot.openaiKey || undefined,
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
      knowledgeConfig,
      
      // Tools will be loaded separately
      tools: []
    };
    
    // Cache the configuration for future requests
    this.configCache.set(chatbotId, { config, timestamp: now });
    console.log(`[Agent Runtime] Configuration loaded and cached in ${Date.now() - startTime}ms`);
    
    const runtime = new AgentRuntime(config);
    
    // Load calendar tools if enabled
    if (chatbot.calendarEnabled && chatbot.calendar) {
      await runtime.loadCalendarTools(chatbot.calendar);
    }
    
    return runtime;
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
      
      // Get user query for vector search
      const userQuery = message.content || '';
      
      // START PARALLEL PROCESSING: Vector search + message preparation
      const vectorSearchPromise = (async () => {
        if (channelConfig.knowledgeConfig?.useSupabaseVectorSearch && 
            channelConfig.knowledgeConfig?.knowledgeSourceIds?.length > 0) {
          
          try {
            const { searchVectorDocuments, formatVectorResultsForPrompt } = await import('./supabase-vector-search');
            
            let vectorResults = await searchVectorDocuments(
              channelConfig.knowledgeConfig.knowledgeSourceIds,
              userQuery,
              { matchThreshold: 0.6, matchCount: 8, contentTypes: ['text', 'qa', 'file', 'catalog', 'website'] }
            );
            
            if (vectorResults.length === 0) {
              vectorResults = await searchVectorDocuments(
                channelConfig.knowledgeConfig.knowledgeSourceIds,
                userQuery,
                { matchThreshold: 0.4, matchCount: 8, contentTypes: ['text', 'qa', 'file', 'catalog', 'website'] }
              );
            }

            if (vectorResults.length > 0) {
              return formatVectorResultsForPrompt(vectorResults);
            }
          } catch (vectorError) {
            logger.error('Error performing vector search', { error: vectorError.message }, 'agent-runtime');
          }
        }
        return '';
      })();

      // Prepare base AI messages (in parallel with vector search)
      const baseAiMessages = await this.prepareAIMessages(conversation, channelConfig);
      
      // Wait for vector search to complete
      const vectorContext = await vectorSearchPromise;

      // Build enhanced system prompt with vector context
      let enhancedPrompt = channelConfig.prompt;
      if (vectorContext) {
        enhancedPrompt = `${vectorContext}\n\n--- ORIGINAL SYSTEM PROMPT ---\n${channelConfig.prompt}`;
      }

      // Update system message with enhanced prompt
      const aiMessages = baseAiMessages;
      if (aiMessages.length > 0 && aiMessages[0].role === 'system') {
        aiMessages[0].content = enhancedPrompt;
      }
      
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

  /**
   * Process knowledge sources and extract relevant information for Supabase vector storage
   */
  private static async processKnowledgeSources(knowledgeSources: any[]): Promise<any> {
    let knowledgeSourceIds: string[] = [];
    let websiteUrls: string[] = [];
    let websiteInstructions: Array<{url: string, instructions?: string}> = [];
    let textKnowledge = '';

    // Extract knowledge source IDs for Supabase vector search
    knowledgeSourceIds = knowledgeSources
      .map(source => source.id)
      .filter(id => id && typeof id === 'string' && id.trim() !== '');

    console.log(`[Agent Runtime] Processing ${knowledgeSources.length} knowledge sources:`, knowledgeSourceIds);

    // Process each knowledge source
    for (const source of knowledgeSources) {
      // Check if source has vector documents in Supabase
      const hasVectorContent = await this.checkVectorContent(source.id);
      
      if (hasVectorContent) {
        console.log(`[Agent Runtime] Knowledge source ${source.id} has vector content in Supabase`);
      }

      // Process text contents (fallback for non-vectorized content)
      if (source.textContents && source.textContents.length > 0) {
        // Only include non-vectorized text content as fallback
        const nonVectorizedText = source.textContents
          .filter((text: any) => !text.vectorDocumentId)
          .map((text: any) => 
            `YOU ARE THE COMPANY/BUSINESS ITSELF. The following is our official company information that should be conveyed in first person always and never in the third person (we/us/our) Always begin each response with "As a company, we believe, Our, etc:":\n\n${text.content}`
          ).join('\n\n---\n\n');
        
        if (nonVectorizedText) {
          textKnowledge += nonVectorizedText;
          console.log(`[Agent Runtime] Added ${source.textContents.length} non-vectorized text contents as fallback`);
        }
      }

      // Process Q&A contents (fallback for non-vectorized content)
      if (source.qaContents && source.qaContents.length > 0) {
        const nonVectorizedQA = source.qaContents
          .filter((qa: any) => !qa.vectorDocumentId)
          .map((qa: any) => 
            `Q: ${qa.question}\nA: As a company, we respond: ${qa.answer}`
          ).join('\n\n');
        
        if (nonVectorizedQA) {
          textKnowledge += nonVectorizedQA;
          console.log(`[Agent Runtime] Added ${source.qaContents.length} non-vectorized Q&A contents as fallback`);
        }
      }

      // Process website contents for live search
      if (source.websiteContents && source.websiteContents.length > 0) {
        const liveSearchUrls = source.websiteContents
          .filter((web: any) => web.searchType === 'live' || !web.searchType)
          .map((web: any) => ({
            url: web.url,
            instructions: web.instructions
          }));
        
        if (liveSearchUrls.length > 0) {
          websiteUrls = [...websiteUrls, ...liveSearchUrls.map(w => w.url)];
          websiteInstructions = [...websiteInstructions, ...liveSearchUrls];
          console.log(`[Agent Runtime] Added ${liveSearchUrls.length} website URLs for live search`);
        }
      }
    }

    // Use Supabase vector search instead of OpenAI vector stores
    const useSupabaseVectorSearch = knowledgeSourceIds.length > 0;
    const useWebSearch = websiteUrls.length > 0;

    console.log(`[Agent Runtime] Knowledge processing complete:`, {
      knowledgeSourceIds: knowledgeSourceIds.length,
      useSupabaseVectorSearch,
      useWebSearch,
      fallbackTextLength: textKnowledge.length
    });

    return {
      knowledgeSourceIds, // Use Supabase knowledge source IDs instead of vectorStoreIds
      websiteUrls,
      websiteInstructions,
      textKnowledge,
      useSupabaseVectorSearch, // Use Supabase instead of OpenAI file search
      useWebSearch
    };
  }

  /**
   * Check if a knowledge source has vector content in Supabase
   */
  private static async checkVectorContent(knowledgeSourceId: string): Promise<boolean> {
    try {
      // Import Supabase client dynamically to avoid circular dependencies
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { data, error } = await supabase
        .from('vector_documents')
        .select('id')
        .eq('knowledge_source_id', knowledgeSourceId)
        .limit(1);

      if (error) {
        console.warn(`[Agent Runtime] Error checking vector content for ${knowledgeSourceId}:`, error);
        return false;
      }

      return (data && data.length > 0);
    } catch (error) {
      console.warn(`[Agent Runtime] Failed to check vector content:`, error);
      return false;
    }
  }

  /**
   * Build system prompt with all context
   */
  private static async buildSystemPrompt(chatbot: any, channelContext?: Partial<ChannelContext>): Promise<string> {
    const companyName = chatbot.user?.companyName || 'our company';
    const chatbotName = chatbot.name || 'Assistant';
    const basePrompt = chatbot.prompt || 'You are a helpful assistant.';
    
    let systemPrompt = basePrompt;

    // Add company context
    systemPrompt += `\n\nYou are ${chatbotName}, representing ${companyName}.`;

    // Add channel-specific context
    if (channelContext?.type) {
      switch (channelContext.type) {
        case 'voice':
        case 'phone':
          systemPrompt += '\n\nYou are currently in a voice conversation. Keep responses concise and conversational.';
          break;
        case 'web':
          systemPrompt += '\n\nYou are helping users through our website chat interface.';
          break;
        case 'whatsapp':
          systemPrompt += '\n\nYou are communicating via WhatsApp. Keep messages friendly and mobile-appropriate.';
          break;
        case 'sms':
          systemPrompt += '\n\nYou are communicating via SMS. Keep messages brief and clear.';
          break;
      }
    }

    // Add calendar context if enabled
    if (chatbot.calendarEnabled && chatbot.calendar) {
      systemPrompt += '\n\nYou can help users schedule appointments. Use the calendar tools when users want to book, view, or manage appointments.';
    }

    // Add location context if available
    if (channelContext?.userLocation) {
      const location = channelContext.userLocation;
      systemPrompt += `\n\nUser location context: ${[location.city, location.region, location.country].filter(Boolean).join(', ')}`;
      if (location.timezone) {
        systemPrompt += ` (Timezone: ${location.timezone})`;
      }
    }

    return systemPrompt;
  }

  /**
   * Load calendar tools for this agent
   */
  async loadCalendarTools(calendar: any): Promise<void> {
    // Import calendar tools dynamically to avoid circular dependencies
    try {
      const { getCalendarTools } = await import('../../app/api/chat-interface/tools/calendar-tools');
      
      const calendarConfig = {
        defaultCalendarId: calendar.id,
        askForDuration: calendar.askForDuration ?? true,
        askForNotes: calendar.askForNotes ?? true,
        defaultDuration: calendar.defaultDuration || 30,
        bufferBetweenAppointments: calendar.bufferBetweenAppointments || 15,
        maxBookingsPerSlot: calendar.maxBookingsPerSlot || 1,
        minimumAdvanceNotice: calendar.minimumAdvanceNotice || 60,
        requirePhoneNumber: calendar.requirePhoneNumber ?? true,
        defaultLocation: calendar.defaultLocation || null,
        bookingPrompt: calendar.bookingPrompt || 'I can help you schedule appointments on our calendar.',
        confirmationMessage: calendar.confirmationMessage || 'I\'ve successfully scheduled your appointment! You will receive a confirmation email.',
      };

      const calendarToolDefinitions = getCalendarTools(calendarConfig);
      
      // Convert OpenAI function definitions to AgentTools
      const calendarTools: AgentTool[] = calendarToolDefinitions.map(toolDef => ({
        id: toolDef.name,
        name: toolDef.name,
        description: toolDef.description,
        parameters: toolDef.parameters,
        handler: async (args: any, context: AgentContext) => {
          // Import calendar handlers dynamically
          const { 
            handleCheckAvailability,
            handleBookAppointment,
            handleViewAppointment,
            handleModifyAppointment,
            handleCancelAppointment
          } = await import('../../app/api/chat-interface/handlers/calendar');
          
          switch (toolDef.name) {
            case 'check_availability':
              return await handleCheckAvailability(args, calendarConfig);
            case 'book_appointment':
              return await handleBookAppointment(args, calendarConfig, context.agent.userId);
            case 'view_appointment':
              return await handleViewAppointment(args);
            case 'modify_appointment':
              return await handleModifyAppointment(args, calendarConfig);
            case 'cancel_appointment':
              return await handleCancelAppointment(args);
            default:
              throw new Error(`Unknown calendar tool: ${toolDef.name}`);
          }
        }
      }));
      
      // Register calendar tools
      calendarTools.forEach(tool => {
        this.toolExecutor.registerTool(tool);
      });

      logger.info('Calendar tools loaded', { 
        calendarId: calendar.id,
        toolCount: calendarTools.length 
      }, 'agent-runtime');
    } catch (error) {
      logger.error('Failed to load calendar tools', { error: error.message }, 'agent-runtime');
    }
  }

  /**
   * Unified message processing method that handles all channels with Supabase vector search
   */
  async processMessages(input: MessageProcessingInput, channelContext: ChannelContext, streaming?: StreamingResponse): Promise<any> {
    try {
      logger.info('Processing messages', { 
        threadId: input.threadId,
        messageCount: input.messages.length,
        channel: channelContext.type 
      }, 'agent-runtime');

      // Convert input messages to AgentMessages
      const agentMessages: AgentMessage[] = input.messages.map(msg => ({
        id: msg.id || this.generateMessageId(),
        role: msg.role,
        content: msg.content,
        type: 'text',
        timestamp: new Date(msg.timestamp || Date.now())
      }));

      // Get or create conversation
      const conversation = await this.conversationManager.getOrCreateConversation(
        input.threadId,
        channelContext
      );

      // Add messages to conversation
      conversation.messages.push(...agentMessages);

      // Get user query for vector search
      const userQuery = agentMessages[agentMessages.length - 1]?.content || '';
      
      // START PARALLEL PROCESSING: Vector search runs in parallel with message prep
      let vectorContext = '';
      
      // Start vector search immediately (don't await yet)
      const vectorSearchPromise = (async () => {
        if (this.config.knowledgeConfig?.useSupabaseVectorSearch && 
            this.config.knowledgeConfig?.knowledgeSourceIds?.length > 0) {
          
          logger.info('Performing Supabase vector search', { 
            knowledgeSourceCount: this.config.knowledgeConfig.knowledgeSourceIds.length,
            queryPreview: userQuery.substring(0, 100)
          }, 'agent-runtime');
          
          try {
            // Import the vector search utility
            const { searchVectorDocuments, formatVectorResultsForPrompt } = await import('./supabase-vector-search');
            
            // Search for relevant vector documents
            let vectorResults = await searchVectorDocuments(
              this.config.knowledgeConfig.knowledgeSourceIds,
              userQuery,
              {
                matchThreshold: 0.6,
                matchCount: 8,
                contentTypes: ['text', 'qa', 'file', 'catalog', 'website']
              }
            );
            
            // If no results with 0.6 threshold, try with lower threshold
            if (vectorResults.length === 0) {
              console.log('[DEBUG] No results with 0.6 threshold, trying with 0.4 for website content...');
              vectorResults = await searchVectorDocuments(
                this.config.knowledgeConfig.knowledgeSourceIds,
                userQuery,
                {
                  matchThreshold: 0.4,
                  matchCount: 8,
                  contentTypes: ['text', 'qa', 'file', 'catalog', 'website']
                }
              );
            }

            if (vectorResults.length > 0) {
              console.log('[DEBUG] Vector Results Found:', vectorResults.map(r => ({
                content: r.content.substring(0, 100),
                similarity: r.similarity,
                content_type: r.content_type
              })));
              
              const contentTypeBreakdown = vectorResults.reduce((acc, r) => {
                acc[r.content_type] = (acc[r.content_type] || 0) + 1;
                return acc;
              }, {});
              console.log('[DEBUG] Content types found:', contentTypeBreakdown);
              
              const context = formatVectorResultsForPrompt(vectorResults);
              console.log('[DEBUG] Formatted vector context length:', context.length);
              
              logger.info('Vector search successful', { 
                resultCount: vectorResults.length,
                contentTypes: contentTypeBreakdown
              }, 'agent-runtime');
              
              return context;
            } else {
              logger.info('No relevant vector documents found', {}, 'agent-runtime');
              return '';
            }
          } catch (vectorError) {
            logger.error('Error performing vector search', { error: vectorError.message }, 'agent-runtime');
            return '';
          }
        }
        return '';
      })();

      // Prepare base AI messages (in parallel with vector search)
      const aiMessages = await this.prepareAIMessages(conversation, this.config);
      
      // Wait for vector search to complete
      vectorContext = await vectorSearchPromise;
      
      console.log('[DEBUG] Parallel processing complete - vector context ready');

      // Build enhanced system prompt with vector context
      let enhancedSystemPrompt = this.config.prompt;
      if (vectorContext) {
        enhancedSystemPrompt = `${vectorContext}\n\n--- ORIGINAL SYSTEM PROMPT ---\n${this.config.prompt}`;
        console.log('[DEBUG] Enhanced system prompt with vector context');
      }

      // Update the system message with enhanced prompt
      if (aiMessages.length > 0 && aiMessages[0].role === 'system') {
        aiMessages[0].content = enhancedSystemPrompt;
        console.log('[DEBUG] Updated system message with enhanced prompt');
      }

      // Add vector store IDs for file search if available (legacy support)
      const aiOptions: any = {
        model: this.config.modelName || 'gpt-4o-mini',
        temperature: this.config.temperature,
        maxTokens: this.config.maxCompletionTokens,
        tools: this.toolExecutor.getToolDefinitions(),
        toolChoice: 'auto',
        knowledgeSourceIds: this.config.knowledgeConfig?.knowledgeSourceIds || []
      };

      // Legacy OpenAI vector store support
      if (this.config.knowledgeConfig?.useFileSearch && this.config.knowledgeConfig.vectorStoreIds?.length > 0) {
        aiOptions.vectorStoreIds = this.config.knowledgeConfig.vectorStoreIds;
      }

      // Generate response with optional streaming
      let responseContent: string;
      
      if (streaming) {
        // Use streaming generation
        responseContent = await this.aiProvider.generateStream(
          aiMessages, 
          aiOptions,
          streaming.onToken || (() => {})
        );
        
        // Notify streaming complete
        streaming.onComplete?.();
      } else {
        // Use non-streaming generation
        responseContent = await this.aiProvider.generate(aiMessages, aiOptions);
      }

      // Create assistant message
      const assistantMessage: AgentMessage = {
        id: this.generateMessageId(),
        role: 'assistant',
        content: responseContent,
        type: 'text',
        timestamp: new Date()
      };

      // Add to conversation and save
      conversation.messages.push(assistantMessage);
      await this.conversationManager.saveMessage(assistantMessage, channelContext);

      // Track analytics
      this.analytics.trackMessage(input.threadId, assistantMessage);

      logger.info('Message processing completed', { 
        threadId: input.threadId,
        responseLength: responseContent.length,
        usedVectorSearch: !!vectorContext
      }, 'agent-runtime');

      return assistantMessage;
    } catch (error) {
      logger.error('Error processing messages', { 
        error: error.message,
        threadId: input.threadId 
      }, 'agent-runtime');
      
      // Notify streaming error if streaming is enabled
      if (streaming?.onError) {
        streaming.onError(error as Error);
      }
      
      throw error;
    }
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