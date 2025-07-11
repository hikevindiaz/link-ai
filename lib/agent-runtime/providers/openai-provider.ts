import OpenAI from 'openai';
import { logger } from '@/lib/logger';
import { AIProvider, AIProviderOptions } from '../types';

export class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private activeStreams: Map<string, AbortController> = new Map();
  
  constructor(apiKey?: string) {
    this.client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY
    });
  }
  
  /**
   * Generate a non-streaming response
   */
  async generate(messages: any[], options: AIProviderOptions): Promise<any> {
    try {
      logger.debug('Generating OpenAI response', { 
        model: options.model,
        messageCount: messages.length,
        toolCount: options.tools?.length || 0
      }, 'openai-provider');
      
      const completion = await this.client.chat.completions.create({
        model: this.resolveModel(options.model),
        messages,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        tools: options.tools,
        tool_choice: options.toolChoice
      });
      
      const choice = completion.choices[0];
      const finishReason = choice?.finish_reason;
      
      // Return the full choice so the agent runtime can handle tool calls
      logger.debug('OpenAI response generated', { 
        finishReason,
        hasContent: !!choice?.message?.content,
        hasToolCalls: !!choice?.message?.tool_calls
      }, 'openai-provider');
      
      return choice;
      
    } catch (error) {
      logger.error('Error generating OpenAI response', { 
        error: error.message,
        model: options.model 
      }, 'openai-provider');
      throw error;
    }
  }
  
  /**
   * Generate a streaming response
   */
  async generateStream(
    messages: any[], 
    options: AIProviderOptions, 
    onToken: (token: string) => void
  ): Promise<string> {
    const streamId = `stream_${Date.now()}`;
    const abortController = new AbortController();
    this.activeStreams.set(streamId, abortController);
    
    try {
      logger.debug('Starting OpenAI stream', { 
        model: options.model,
        streamId,
        toolCount: options.tools?.length || 0
      }, 'openai-provider');
      
      const stream = await this.client.chat.completions.create({
        model: this.resolveModel(options.model),
        messages,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        stream: true,
        tools: options.tools,
        tool_choice: options.toolChoice
      }, {
        signal: abortController.signal
      });
      
      let fullResponse = '';
      let toolCalls: any[] = [];
      let isToolCallComplete = false;
      
      for await (const chunk of stream) {
        const choice = chunk.choices[0];
        
        // Handle regular content
        const content = choice?.delta?.content;
        if (content) {
          fullResponse += content;
          onToken(content);
        }
        
        // Handle tool calls
        const deltaToolCalls = choice?.delta?.tool_calls;
        if (deltaToolCalls) {
          logger.debug('🔧 Tool call delta detected', { 
            deltaToolCalls,
            streamId 
          }, 'openai-provider');
          
          // Process tool call deltas
          for (const deltaCall of deltaToolCalls) {
            if (deltaCall.index !== undefined) {
              // Initialize tool call if needed
              if (!toolCalls[deltaCall.index]) {
                toolCalls[deltaCall.index] = {
                  id: deltaCall.id,
                  type: 'function',
                  function: {
                    name: deltaCall.function?.name || '',
                    arguments: deltaCall.function?.arguments || ''
                  }
                };
              } else {
                // Append to existing tool call
                if (deltaCall.function?.arguments) {
                  toolCalls[deltaCall.index].function.arguments += deltaCall.function.arguments;
                }
              }
            }
          }
        }
        
        // Check if stream is finishing
        if (choice?.finish_reason === 'tool_calls' && toolCalls.length > 0) {
          isToolCallComplete = true;
          logger.info('🔧 Tool calls ready for execution', { 
            toolCallCount: toolCalls.length,
            toolCalls: toolCalls.map(tc => ({
              id: tc.id,
              name: tc.function.name,
              argumentsLength: tc.function.arguments.length
            }))
          }, 'openai-provider');
          break;
        }
      }
      
      // If we have tool calls to execute, this is not a normal streaming response
      if (isToolCallComplete && toolCalls.length > 0) {
        logger.info('🚫 Tool calls detected - returning empty response for tool handling', { 
          streamId,
          toolCallCount: toolCalls.length
        }, 'openai-provider');
        
        // For now, return empty response - tool handling should be done at a higher level
        // The agent runtime needs to handle tool calls differently for streaming
        return '';
      }
      
      logger.debug('OpenAI stream completed', { 
        streamId,
        responseLength: fullResponse.length,
        hadToolCalls: toolCalls.length > 0
      }, 'openai-provider');
      
      return fullResponse;
      
    } catch (error) {
      if (error.name === 'AbortError') {
        logger.info('OpenAI stream interrupted', { streamId }, 'openai-provider');
        throw new Error('Stream interrupted');
      }
      
      logger.error('Error in OpenAI stream', { 
        error: error.message,
        streamId 
      }, 'openai-provider');
      throw error;
      
    } finally {
      this.activeStreams.delete(streamId);
    }
  }
  
  /**
   * Interrupt an active stream
   */
  async interrupt(sessionId: string): Promise<void> {
    // Find and abort any streams for this session
    for (const [streamId, controller] of this.activeStreams.entries()) {
      if (streamId.includes(sessionId)) {
        controller.abort();
        this.activeStreams.delete(streamId);
        logger.info('Interrupted stream', { streamId, sessionId }, 'openai-provider');
      }
    }
  }
  
  /**
   * Resolve model name to ensure compatibility
   */
  private resolveModel(model: string): string {
    // Map custom model names and display names to OpenAI model names
    const modelMap: Record<string, string> = {
      // Display names to OpenAI model IDs
      'GPT-4o Mini': 'gpt-4o-mini',
      'GPT-4 Mini': 'gpt-4o-mini', 
      'GPT-4': 'gpt-4-turbo',
      'GPT-4 Turbo': 'gpt-4-turbo',
      'GPT-3.5 Turbo': 'gpt-3.5-turbo',
      'GPT-3.5': 'gpt-3.5-turbo',
      'GPT-4 (Legacy)': 'gpt-4-1106-preview',
      'GPT-3.5 Turbo (Legacy)': 'gpt-3.5-turbo',
      'GPT-4.1 Nano': 'gpt-4.1-nano',
      'O4 Mini': 'gpt-4o-mini',
      
      // Model IDs to OpenAI model names
      'gpt-4o-mini-2024-07-18': 'gpt-4o-mini', // Link Core Smart - correct model
      'gpt-4.1-nano-2025-04-14': 'gpt-4.1-nano', // Link Core Fast
      'o4-mini-2025-04-16': 'gpt-4o-mini', // Legacy mapping
      'gpt-4.1-mini-2025-04-14': 'gpt-4o-mini', // Fix invalid model
      'gpt-4o-mini-realtime-preview': 'gpt-4o-realtime-preview',
      
      // Legacy mappings
      'gpt-4-mini': 'gpt-4o-mini',
      'gpt-3.5': 'gpt-3.5-turbo',
      'gpt-4': 'gpt-4-turbo',
      
      // OpenAI model mappings
      'openai-gpt-4': 'gpt-4-turbo',
      'openai-gpt-4-turbo': 'gpt-4-turbo',
      'openai-gpt-4-mini': 'gpt-4o-mini',
      'openai-gpt-3.5-turbo': 'gpt-3.5-turbo',
      'openai-gpt-3.5': 'gpt-3.5-turbo'
    };
    
    const resolvedModel = modelMap[model] || model;
    
    // Log the mapping for debugging
    if (modelMap[model]) {
      console.log(`[OpenAI Provider] Mapped model "${model}" to "${resolvedModel}"`);
    }
    
    return resolvedModel;
  }
} 