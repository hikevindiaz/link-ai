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
    console.log('🔧 Starting tool registration', {
      agentId: config.id,
      availableTools: Object.keys(builtInTools),
      knowledgeConfig: {
        useWebSearch: config.knowledgeConfig?.useWebSearch || false,
        websiteInstructionsCount: config.knowledgeConfig?.websiteInstructions?.length || 0,
        knowledgeSourceIds: config.knowledgeConfig?.knowledgeSourceIds?.length || 0
      }
    });
    
    Object.entries(builtInTools).forEach(([key, tool]) => {
      // Only register Google search tool if web search is configured
      if (key === 'googleSearch') {
        if (config.knowledgeConfig?.useWebSearch && config.knowledgeConfig?.websiteInstructions?.length > 0) {
          this.toolExecutor.registerTool(tool);
          console.log('✅ Google search tool registered', { 
            agentId: config.id,
            websiteCount: config.knowledgeConfig.websiteInstructions.length,
            websiteInstructions: config.knowledgeConfig.websiteInstructions.map(w => w.url)
          });
        } else {
          console.log('❌ Google search tool NOT registered - web search not configured', { 
            agentId: config.id,
            useWebSearch: config.knowledgeConfig?.useWebSearch || false,
            websiteInstructionsCount: config.knowledgeConfig?.websiteInstructions?.length || 0,
            websiteInstructions: config.knowledgeConfig?.websiteInstructions || []
          });
        }
      } else if (key === 'aviationStack') {
        // Only register AviationStack tool if enabled
        if (config.aviationStackEnabled) {
          this.toolExecutor.registerTool(tool);
          console.log('✅ AviationStack tool registered', { 
            agentId: config.id,
            toolName: tool.name,
            toolId: tool.id
          });
        } else {
          console.log('❌ AviationStack tool NOT registered - not enabled', { 
            agentId: config.id,
            aviationStackEnabled: config.aviationStackEnabled || false
          });
        }
      } else if (key === 'weather') {
        // Register weather tool unconditionally - it's a common use case
        this.toolExecutor.registerTool(tool);
        console.log('✅ Weather tool registered', { 
          agentId: config.id,
          toolName: tool.name,
          toolId: tool.id
        });
      } else {
        // Register all other built-in tools unconditionally
        this.toolExecutor.registerTool(tool);
        console.log('✅ Built-in tool registered', { 
          agentId: config.id,
          toolName: tool.name,
          toolId: tool.id
        });
      }
    });
    
    // Load custom tools if any
    if (config.tools) {
      config.tools.forEach(tool => this.toolExecutor.registerTool(tool));
    }
    
    console.log('🚀 Agent runtime initialized', { 
      agentId: config.id,
      model: config.modelName,
      totalToolsRegistered: this.toolExecutor.getTools().size,
      registeredToolNames: Array.from(this.toolExecutor.getTools().keys()),
      hasGoogleSearch: this.toolExecutor.getTools().has('google_search')
    });
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
      aviationStackEnabled: (chatbot as any).aviationStackEnabled || false,
      
      // Knowledge sources
      knowledgeSourceIds: chatbot.knowledgeSources.map(ks => ks.id),
      knowledgeConfig,
      
      // Tools will be loaded separately
      tools: []
    };
    
    // Cache the configuration for future requests
    this.configCache.set(chatbotId, { config, timestamp: now });
    console.log(`[Agent Runtime] Configuration loaded and cached in ${Date.now() - startTime}ms`);
    
    // DEBUG: Log configuration before creating runtime
    console.log('🔧 Creating AgentRuntime with config', {
      chatbotId,
      configId: config.id,
      modelName: config.modelName,
      knowledgeConfig: {
        useWebSearch: config.knowledgeConfig?.useWebSearch || false,
        websiteInstructionsCount: config.knowledgeConfig?.websiteInstructions?.length || 0,
        knowledgeSourceIds: config.knowledgeConfig?.knowledgeSourceIds?.length || 0
      }
    });
    
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

      // Detect user language and add language-specific instructions
      const detectedLanguage = this.detectUserLanguage(userQuery, channelConfig.language, channelConfig.secondLanguage);
      const languageInstructions = channelConfig.language !== detectedLanguage || channelConfig.secondLanguage 
        ? `\n\n--- LANGUAGE INSTRUCTION FOR THIS MESSAGE ---
The user appears to be communicating in: ${detectedLanguage}
IMPORTANT: Respond in the same language the user is using (${detectedLanguage}).
If user is speaking Spanish, respond in Spanish.
If user is speaking English, respond in English.
Match the user's language preference for this conversation.
--- END LANGUAGE INSTRUCTION ---`
        : '';

      // Build enhanced system prompt with vector context and language instructions
      let enhancedPrompt = channelConfig.prompt;
      if (vectorContext) {
        enhancedPrompt = `${vectorContext}\n\n--- ORIGINAL SYSTEM PROMPT ---\n${channelConfig.prompt}${languageInstructions}`;
      } else {
        enhancedPrompt = `${channelConfig.prompt}${languageInstructions}`;
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
   * Generate response with proper tool call handling
   */
  private async generateWithToolCalls(
    messages: any[],
    options: any,
    streaming?: StreamingResponse
  ): Promise<{ content: string; toolInvocations?: any[] }> {
    console.log('🌟 generateWithToolCalls called', {
      messageCount: messages.length,
      hasTools: !!options.tools,
      toolCount: options.tools?.length || 0,
      toolNames: options.tools?.map((t: any) => t.function.name) || []
    });
    
    let currentMessages = [...messages];
    let iterationCount = 0;
    const maxIterations = 10; // Prevent infinite loops
    let toolInvocations: any[] = []; // Collect tool invocations
    
    while (iterationCount < maxIterations) {
      iterationCount++;
      
      console.log('🔄 AI generation iteration', {
        iteration: iterationCount,
        messageCount: currentMessages.length,
        agentId: this.config.id
      });
      
      const choice = await this.aiProvider.generate(currentMessages, options);
      const finishReason = choice?.finish_reason;
      
      console.log('🤖 AI Provider Response', {
        hasChoice: !!choice,
        finishReason,
        hasMessage: !!choice?.message,
        hasToolCalls: !!choice?.message?.tool_calls,
        toolCallCount: choice?.message?.tool_calls?.length || 0
      });
      
      // If no tool calls, return the response
      if (finishReason !== 'tool_calls') {
        const response = choice?.message?.content || '';
        
        console.log('🎯 Final response generated', { 
          responseLength: response.length,
          finishReason,
          iterations: iterationCount,
          toolInvocationsCount: toolInvocations.length
        });
        
        // If streaming was requested, simulate streaming by sending the full response
        if (streaming && streaming.onToken) {
          // Send response in chunks to simulate streaming
          const chunkSize = 10;
          for (let i = 0; i < response.length; i += chunkSize) {
            const chunk = response.slice(i, i + chunkSize);
            streaming.onToken(chunk);
            // Small delay to simulate streaming
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        }
        
        // Notify streaming complete
        if (streaming?.onComplete) {
          streaming.onComplete();
        }
        
        return { 
          content: response,
          toolInvocations: toolInvocations.length > 0 ? toolInvocations : undefined
        };
      }
      
      // Handle tool calls
      const toolCalls = choice?.message?.tool_calls;
      if (toolCalls && toolCalls.length > 0) {
        console.log('🔧 Tool calls detected', { 
          toolCallCount: toolCalls.length,
          toolCalls: toolCalls.map(tc => ({
            id: tc.id,
            name: tc.function.name,
            argumentsLength: tc.function.arguments.length
          })),
          iteration: iterationCount
        });
        
        // Add the assistant's message with tool calls
        currentMessages.push({
          role: 'assistant',
          content: null,
          tool_calls: toolCalls
        });
        
        // Execute each tool call
        for (const toolCall of toolCalls) {
          try {
            const args = JSON.parse(toolCall.function.arguments);
            
            console.log('🔧 Executing tool', {
              toolName: toolCall.function.name,
              toolId: toolCall.id,
              args: args
            });
            
                         // Create a context for tool execution
             const context = {
               agent: this.config,
               channel: {
                 type: 'web' as const,
                 sessionId: `session_${Date.now()}`,
                 userId: this.config.userId,
                 chatbotId: this.config.id,
                 threadId: `thread_${Date.now()}`,
                 capabilities: {
                   supportsAudio: false,
                   supportsVideo: false,
                   supportsImages: false,
                   supportsFiles: false,
                   supportsRichText: true,
                   supportsTypingIndicator: false,
                   supportsDeliveryReceipts: false,
                   supportsInterruption: false
                 }
               },
              conversation: {
                id: `conv_${Date.now()}`,
                sessionId: `session_${Date.now()}`,
                messages: [],
                createdAt: new Date(),
                updatedAt: new Date(),
                isActive: true,
                metadata: {}
              },
              tools: this.toolExecutor.getTools()
            };
            
            // Execute the tool
            const result = await this.toolExecutor.executeTool(
              toolCall.function.name,
              args,
              context
            );
            
            console.log('✅ Tool executed successfully', {
              toolName: toolCall.function.name,
              toolId: toolCall.id,
              resultType: typeof result
            });
            
            // Collect tool invocation data for UI rendering
            toolInvocations.push({
              toolCallId: toolCall.id,
              toolName: toolCall.function.name,
              args: args,
              state: 'result',
              result: result
            });
            
            // Add tool result message
            currentMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(result)
            });
            
          } catch (error) {
            console.error('❌ Tool execution failed', {
              toolName: toolCall.function.name,
              toolId: toolCall.id,
              error: error.message
            });
            
            // Add error result
            currentMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify({
                error: `Tool execution failed: ${error.message}`,
                success: false
              })
            });
          }
        }
        
        // Continue the loop to get the final response
        continue;
      }
      
      // Shouldn't reach here, but just in case
      break;
    }
    
    // If we've exceeded max iterations, return an error
    console.error('Exceeded maximum iterations in tool call loop', {
      maxIterations,
      finalIteration: iterationCount,
      agentId: this.config.id
    });
    
    return { 
      content: 'I apologize, but I encountered an issue while processing your request. Please try again.',
      toolInvocations: toolInvocations.length > 0 ? toolInvocations : undefined
    };
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

    // Add language handling instructions
    if (chatbot.language || chatbot.secondLanguage) {
      systemPrompt += `\n\n# Language Guidelines

## Language Configuration:
- **Primary Language**: ${chatbot.language || 'en-US'}
- **Secondary Language**: ${chatbot.secondLanguage || 'Not configured'}

## Language Response Strategy:
- **ALWAYS respond in the same language the user is speaking**
- If user speaks in English, respond in English
- If user speaks in Spanish, respond in Spanish
- If user speaks in your primary language (${chatbot.language || 'en-US'}), respond in that language
- If user speaks in your secondary language (${chatbot.secondLanguage || 'none'}), respond in that language
- If you're unsure of the user's language, default to your primary language (${chatbot.language || 'en-US'})
- Maintain consistent language throughout the conversation unless the user switches languages

## Language Detection:
- Pay attention to the language of the user's message
- Look for language indicators like vocabulary, grammar, and sentence structure
- Common language patterns:
  - English: "Hello", "How are you?", "Can you help me?"
  - Spanish: "Hola", "¿Cómo estás?", "¿Puedes ayudarme?"
  - Detect and match the user's language preference

## Important Notes:
- Be fluent and natural in both languages
- Maintain your personality and tone regardless of language
- Don't mention language switching unless specifically asked
- If user mixes languages, respond in the dominant language of their message`;
    }

    // Add comprehensive response strategy
    systemPrompt += `\n\n# Response Strategy Guidelines

## Knowledge Priority (in order):
1. **FIRST PRIORITY**: Use your knowledge base content (documents, Q&A, files, etc.) when available
2. **SECOND PRIORITY**: Use live search tools when configured and appropriate
3. **THIRD PRIORITY**: Use general knowledge for non-business questions or when no specific knowledge is available

## When to Use Different Knowledge Sources:
- **Business-specific questions**: Always check knowledge base first, then use live search if configured
- **General questions**: Use general knowledge (weather, facts, definitions, etc.)
- **Current events**: Use live search tools if configured and relevant
- **Mixed questions**: Combine knowledge base + general knowledge as appropriate

## Response Approach:
- **ALWAYS provide a helpful answer** - never say "I don't know" without offering alternatives
- If knowledge base has no match: Use general knowledge and mention you can help with business-specific questions
- If live search is configured: Use it for current information when relevant
- Be natural and conversational while maintaining accuracy`;

    // Add channel-specific context
    if (channelContext?.type) {
      switch (channelContext.type) {
        case 'phone':
          systemPrompt += '\n\nYou are on a phone call. Keep responses conversational and concise.';
          break;
        case 'whatsapp':
          systemPrompt += '\n\nYou are communicating via WhatsApp. Use emojis when appropriate and keep messages friendly.';
          break;
        case 'instagram':
          systemPrompt += '\n\nYou are communicating via Instagram. Keep messages brief and engaging.';
          break;
        case 'messenger':
          systemPrompt += '\n\nYou are communicating via Facebook Messenger. Be friendly and conversational.';
          break;
        case 'sms':
          systemPrompt += '\n\nYou are communicating via SMS. Keep messages brief and clear.';
          break;
      }
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
   * Generate Google search tool prompt based on configured websites
   */
  private static generateGoogleSearchPrompt(websiteInstructions: Array<{url: string, instructions?: string}>): string {
    return `# Google Search Tool - EXTREMELY RESTRICTED USE
I have access to the google_search tool but it should RARELY be used. This tool is ONLY for the specific website instructions below.

## FORBIDDEN - DO NOT USE GOOGLE SEARCH FOR:
- General questions that can be answered with general knowledge
- Business questions not related to the configured websites
- Explanations, definitions, or how-to questions
- Any question that can be answered without live web data
- Questions about your capabilities or general topics
- Weather, news, facts, or information available in general knowledge
- ANY question when you can provide a helpful response using general knowledge

## ONLY USE GOOGLE SEARCH WHEN:
- The user's question EXPLICITLY asks for information from one of the configured websites below
- The user specifically mentions wanting current/live information from these exact websites
- The question cannot be answered AT ALL without live data from these specific sites

## Configured Search Instructions:${websiteInstructions.map(site => 
  `\n- **${site.url}**${site.instructions ? `: ${site.instructions}` : ': ONLY when users specifically ask for current information from this exact website'}`
).join('')}

## DEFAULT RESPONSE STRATEGY:
1. **ALWAYS TRY FIRST**: Provide a helpful response using general knowledge
2. **PREFER**: Answer with your training data and general knowledge
3. **ONLY IF IMPOSSIBLE**: Use google_search for the specific configured websites above
4. **NEVER**: Use google_search as a fallback for general questions

## REMEMBER:
- You are knowledgeable and can answer most questions without web search
- Users prefer quick, helpful responses over web searches
- Only search when the user specifically needs current data from configured websites
- When in doubt, provide a helpful response with general knowledge instead of searching`;
  }
  
  /**
   * Get tool system prompts for enabled tools
   */
  private getToolSystemPrompts(): string[] {
    const prompts: string[] = [];
    
    // Get all registered tools
    const tools = this.toolExecutor.getTools();
    
    for (const [name, tool] of tools) {
      // Handle Google search tool specially - it needs dynamic prompt generation
      if (name === 'google_search' && this.config.knowledgeConfig?.websiteInstructions?.length) {
        const googlePrompt = AgentRuntime.generateGoogleSearchPrompt(
          this.config.knowledgeConfig.websiteInstructions
        );
        prompts.push(googlePrompt);
      } else if (tool.systemPrompt) {
        // Add the tool's static system prompt if it has one
        prompts.push(tool.systemPrompt);
      }
    }
    
    return prompts;
  }

  /**
   * Load calendar tools for this agent
   */
  async loadCalendarTools(calendar: any): Promise<void> {
    // Import calendar tools dynamically to avoid circular dependencies
    try {
      const { getCalendarTools } = await import('./tools/calendar-tools');
      
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

      // Get calendar tools in AgentTool format
      const calendarTools = getCalendarTools(calendarConfig);
      
      // Register calendar tools
      calendarTools.forEach(tool => {
        this.toolExecutor.registerTool(tool);
      });

      logger.info('Calendar tools loaded', { 
        calendarId: calendar.id,
        toolCount: calendarTools.length,
        toolNames: calendarTools.map(t => t.name)
      }, 'agent-runtime');
    } catch (error) {
      logger.error('Failed to load calendar tools', { error: error.message }, 'agent-runtime');
    }
  }

  /**
   * Unified message processing method that handles all channels with Supabase vector search
   */
  /**
   * Detect the language of a user message
   */
  private detectUserLanguage(userMessage: string, primaryLanguage: string, secondaryLanguage?: string): string {
    if (!userMessage || userMessage.trim().length === 0) {
      return primaryLanguage;
    }

    const message = userMessage.toLowerCase().trim();
    
    // Common Spanish patterns
    const spanishPatterns = [
      /\b(hola|buenos?\s*d[ií]as?|buenas?\s*tardes?|buenas?\s*noches?)\b/,
      /\b(gracias?|por\s*favor|disculpe?|perdón|lo\s*siento)\b/,
      /\b(s[ií]|no|qu[eé]|c[oó]mo|cu[aá]ndo|d[oó]nde|por\s*qu[eé])\b/,
      /\b(puedes?|puede?|ayuda|ayudar|necesito|quiero)\b/,
      /\b(est[aá]s?|es|son|tiene?|tengo|hacer|decir)\b/,
      /\b(restaurantes?|mejores|informaci[oó]n|lugar|lugares)\b/,
      /¿[^?]*\?/,
      /\b(en|la|el|los|las|de|del|para|con|por|sobre)\b/
    ];

    // Common English patterns
    const englishPatterns = [
      /\b(hello|hi|hey|good\s*morning|good\s*afternoon|good\s*evening)\b/,
      /\b(thank\s*you|thanks|please|excuse\s*me|sorry|help)\b/,
      /\b(yes|no|what|how|when|where|why|who|which)\b/,
      /\b(can\s*you|could\s*you|would\s*you|i\s*need|i\s*want)\b/,
      /\b(are|is|am|have|has|do|does|will|would|could)\b/,
      /\b(restaurants?|best|information|place|places)\b/,
      /\b(the|and|or|but|in|on|at|for|with|about)\b/
    ];

    let spanishScore = 0;
    let englishScore = 0;

    // Count Spanish patterns
    for (const pattern of spanishPatterns) {
      const matches = message.match(pattern);
      if (matches) {
        spanishScore += matches.length;
      }
    }

    // Count English patterns
    for (const pattern of englishPatterns) {
      const matches = message.match(pattern);
      if (matches) {
        englishScore += matches.length;
      }
    }

    // Determine language based on scores
    if (spanishScore > englishScore) {
      // Return Spanish if it's configured as primary or secondary
      if (primaryLanguage?.includes('es') || primaryLanguage?.includes('ES')) {
        return primaryLanguage;
      } else if (secondaryLanguage?.includes('es') || secondaryLanguage?.includes('ES')) {
        return secondaryLanguage;
      }
      // Default to Spanish language code if detected but not configured
      return 'es-ES';
    } else if (englishScore > spanishScore) {
      // Return English if it's configured as primary or secondary
      if (primaryLanguage?.includes('en') || primaryLanguage?.includes('EN')) {
        return primaryLanguage;
      } else if (secondaryLanguage?.includes('en') || secondaryLanguage?.includes('EN')) {
        return secondaryLanguage;
      }
      // Default to English language code if detected but not configured
      return 'en-US';
    }

    // Default to primary language if no clear detection
    return primaryLanguage;
  }

  /**
   * Determine if a user query requires knowledge search using lightweight intent detection
   */
  private async determineIntentForKnowledgeSearch(userQuery: string): Promise<boolean> {
    // Skip intent detection for very short queries
    if (userQuery.length < 5) {
      return false;
    }
    
    // Common patterns that don't need knowledge search
    const casualPatterns = [
      /^(hi|hello|hey|hola|buenos?\s+d[ií]as?|buenas\s+tardes?|buenas\s+noches?)[\s\W]*$/i,
      /^(how\s+are\s+you|c[oó]mo\s+est[aá]s?|qu[eé]\s+tal)[\s\W]*$/i,
      /^(thanks?|gracias?|thank\s+you)[\s\W]*$/i,
      /^(bye|goodbye|adi[oó]s?|hasta\s+luego)[\s\W]*$/i,
      /^(yes|no|s[ií]|okay|ok|bien|bueno)[\s\W]*$/i,
      /^(good|bien|perfecto|perfect|great|excelente)[\s\W]*$/i
    ];
    
    // Check if query matches casual patterns
    for (const pattern of casualPatterns) {
      if (pattern.test(userQuery.trim())) {
        console.log('[Intent Detection] ❌ Casual greeting/response detected - skipping knowledge search');
        return false;
      }
    }
    
    // Quick intent classification using gpt-4.1-nano for speed
    try {
      const intentPrompt = `Analyze this user message and determine if it requires searching through knowledge/documents to answer properly.

User message: "${userQuery}"

Respond with only "NO" ONLY if the message is clearly:
- A simple greeting (hi, hello, hey)
- A farewell (bye, goodbye, see you)
- A simple acknowledgment (thanks, ok, yes, no)
- Basic politeness (how are you, good morning)

For ALL other messages including questions, requests for information, or anything that might benefit from specific knowledge, respond with "YES".

When in doubt, respond with "YES" to ensure comprehensive answers.

Response:`;

      const response = await this.aiProvider.generate(
        [{ role: 'user', content: intentPrompt }],
        {
          model: 'gpt-4.1-nano', // Use fastest model for intent detection
          temperature: 0,
          maxTokens: 5
        }
      );
      
      // Extract content from response object (now returns object instead of string)
      const responseContent = typeof response === 'string' ? response : response?.message?.content || '';
      const needsKnowledge = responseContent.trim().toUpperCase().includes('YES');
      console.log(`[Intent Detection] ${needsKnowledge ? '✅ Knowledge search needed' : '❌ General conversation'} for: "${userQuery.substring(0, 50)}..."`);
      
      return needsKnowledge;
      
    } catch (error) {
      console.error('[Intent Detection] Error in intent classification:', error);
      // Default to knowledge search on error to be safe
      return true;
    }
  }

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
      
      // Check if vector search should be explicitly skipped
      const skipVectorSearch = channelContext.metadata?.skipVectorSearch === true;
      
      // Smart intent detection to decide if vector search is needed
      const needsKnowledgeSearch = await this.determineIntentForKnowledgeSearch(userQuery);
      
      // Start vector search immediately (don't await yet) - unless skipped for voice or intent
      const vectorSearchPromise = (async () => {
        if (skipVectorSearch) {
          console.log('[Agent Runtime] Skipping vector search - explicitly disabled');
          return '';
        }
        
        if (!needsKnowledgeSearch) {
          console.log('[Agent Runtime] Skipping vector search - general conversation detected');
          return '';
        }
        
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

      // Detect user language and add language-specific instructions
      const detectedLanguage = this.detectUserLanguage(userQuery, this.config.language, this.config.secondLanguage);
      
      console.log('[DEBUG] Language Detection:', {
        userQuery: userQuery.substring(0, 100),
        primaryLanguage: this.config.language,
        secondaryLanguage: this.config.secondLanguage,
        detectedLanguage: detectedLanguage,
        willAddLanguageInstructions: this.config.language !== detectedLanguage || this.config.secondLanguage
      });
      
      // Create strong language instructions that MUST be followed
      const languageInstructions = `\n\n🚨 CRITICAL LANGUAGE INSTRUCTION - HIGHEST PRIORITY 🚨
The user is writing in: ${detectedLanguage}
YOU MUST RESPOND IN: ${detectedLanguage}

${detectedLanguage.includes('en') || detectedLanguage.includes('EN') ? 
'The user is speaking ENGLISH. You MUST respond in ENGLISH only.' : 
detectedLanguage.includes('es') || detectedLanguage.includes('ES') ? 
'El usuario está hablando en ESPAÑOL. DEBES responder SOLO en ESPAÑOL.' : 
`The user is speaking in ${detectedLanguage}. You MUST respond in ${detectedLanguage}.`}

This is a MANDATORY instruction that overrides ALL other language settings.
DO NOT respond in any other language regardless of your default configuration.
🚨 END CRITICAL LANGUAGE INSTRUCTION 🚨`;

      // Build enhanced system prompt with vector context and language instructions
      let enhancedSystemPrompt = this.config.prompt;
      
      // Add tool system prompts
      const toolPrompts = this.getToolSystemPrompts();
      if (toolPrompts.length > 0) {
        enhancedSystemPrompt += '\n\n' + toolPrompts.join('\n\n');
      }
      
      if (vectorContext) {
        // Put language instructions FIRST, then vector context, then original prompt
        enhancedSystemPrompt = `${languageInstructions}\n\n${vectorContext}\n\n--- ORIGINAL SYSTEM PROMPT ---\n${enhancedSystemPrompt}`;
        console.log('[DEBUG] Enhanced system prompt with PRIORITY language instructions and vector context');
      } else {
        // Put language instructions FIRST for maximum priority
        enhancedSystemPrompt = `${languageInstructions}\n\n${enhancedSystemPrompt}\n\n--- FALLBACK INSTRUCTIONS ---
Since no specific knowledge base content was found for this query:
1. Provide a helpful answer using general knowledge - you are knowledgeable and capable
2. For business-specific questions, explain what you can help with based on your knowledge base
3. NEVER use search tools as a fallback for general questions
4. ONLY use search tools if the user EXPLICITLY asks for current information from configured websites
5. When in doubt, provide a helpful response with general knowledge instead of searching
6. Maintain your personality and conversational style`;
        console.log('[DEBUG] No vector context - using PRIORITY language instructions with fallback');
      }

      // Update the system message with enhanced prompt
      if (aiMessages.length > 0 && aiMessages[0].role === 'system') {
        aiMessages[0].content = enhancedSystemPrompt;
        console.log('[DEBUG] Updated system message with enhanced prompt');
      }

      // Add vector store IDs for file search if available (legacy support)
      const toolDefinitions = this.toolExecutor.getToolDefinitions();
      
      // DEBUG: Log detailed tool information
      console.log('🔍 Tool Definitions Retrieved', {
        agentId: this.config.id,
        totalRegisteredTools: this.toolExecutor.getTools().size,
        registeredToolNames: Array.from(this.toolExecutor.getTools().keys()),
        toolDefinitionCount: toolDefinitions.length,
        toolDefinitionNames: toolDefinitions.map(def => def.function.name),
        hasGoogleSearchTool: this.toolExecutor.getTools().has('google_search'),
        hasGoogleSearchDefinition: toolDefinitions.some(def => def.function.name === 'google_search')
      });
      
      const aiOptions: any = {
        model: this.config.modelName || 'gpt-4o-mini',
        temperature: this.config.temperature,
        maxTokens: this.config.maxCompletionTokens,
        tools: toolDefinitions,
        toolChoice: 'auto',
        knowledgeSourceIds: this.config.knowledgeConfig?.knowledgeSourceIds || []
      };
      
      // DEBUG: Log AI options including tools
      console.log('🤖 AI Generation Options', {
        agentId: this.config.id,
        model: aiOptions.model,
        toolCount: toolDefinitions.length,
        toolNames: toolDefinitions.map(def => def.function.name),
        hasGoogleSearch: toolDefinitions.some(def => def.function.name === 'google_search'),
        toolChoice: aiOptions.toolChoice,
        temperature: aiOptions.temperature,
        maxTokens: aiOptions.maxTokens
      });

      // Legacy OpenAI vector store support
      if (this.config.knowledgeConfig?.useFileSearch && this.config.knowledgeConfig.vectorStoreIds?.length > 0) {
        aiOptions.vectorStoreIds = this.config.knowledgeConfig.vectorStoreIds;
      }

      // Generate response with optional streaming and tool call handling
      let responseContent: string;
      let toolInvocations: any[] | undefined;
      
      // Use non-streaming mode if tools are available to properly handle tool calls
      if (streaming && (!toolDefinitions || toolDefinitions.length === 0)) {
        // Use streaming generation only when no tools are available
        console.log('🔄 Using streaming generation (no tools)', {
          agentId: this.config.id,
          toolCount: toolDefinitions.length
        });
        
        responseContent = await this.aiProvider.generateStream(
          aiMessages, 
          aiOptions,
          streaming.onToken || (() => {})
        );
        
        // Notify streaming complete
        streaming.onComplete?.();
      } else {
        // Use non-streaming generation for tool calls or when explicitly requested
        console.log('🔄 Using non-streaming generation', {
          agentId: this.config.id,
          reason: toolDefinitions.length > 0 ? 'tools_available' : 'no_streaming_requested',
          toolCount: toolDefinitions.length,
          hasStreaming: !!streaming
        });
        
        const result = await this.generateWithToolCalls(aiMessages, aiOptions, streaming);
        responseContent = result.content;
        toolInvocations = result.toolInvocations;
      }

      // Create assistant message
      const assistantMessage: AgentMessage = {
        id: this.generateMessageId(),
        role: 'assistant',
        content: responseContent,
        type: 'text',
        timestamp: new Date(),
        toolInvocations: toolInvocations
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