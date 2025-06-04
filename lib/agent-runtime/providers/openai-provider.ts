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
  async generate(messages: any[], options: AIProviderOptions): Promise<string> {
    try {
      logger.debug('Generating OpenAI response', { 
        model: options.model,
        messageCount: messages.length 
      }, 'openai-provider');
      
      const completion = await this.client.chat.completions.create({
        model: this.resolveModel(options.model),
        messages,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        tools: options.tools,
        tool_choice: options.toolChoice
      });
      
      const response = completion.choices[0]?.message?.content || '';
      
      logger.debug('OpenAI response generated', { 
        responseLength: response.length,
        finishReason: completion.choices[0]?.finish_reason
      }, 'openai-provider');
      
      return response;
      
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
        streamId 
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
      
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          fullResponse += content;
          onToken(content);
        }
        
        // Check for tool calls
        const toolCalls = chunk.choices[0]?.delta?.tool_calls;
        if (toolCalls) {
          // Handle tool calls in streaming response
          logger.debug('Tool call detected in stream', { toolCalls }, 'openai-provider');
        }
      }
      
      logger.debug('OpenAI stream completed', { 
        streamId,
        responseLength: fullResponse.length 
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
    // Map custom model names to OpenAI model names
    const modelMap: Record<string, string> = {
      'gpt-4.1-mini-2025-04-14': 'gpt-4-1106-preview', // Map to actual OpenAI model
      'gpt-4-mini': 'gpt-4-1106-preview',
      'gpt-3.5': 'gpt-3.5-turbo',
      'gpt-4': 'gpt-4-1106-preview'
    };
    
    return modelMap[model] || model;
  }
} 