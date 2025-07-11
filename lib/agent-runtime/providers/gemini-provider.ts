import { GoogleGenerativeAI, GenerativeModel, ChatSession } from '@google/generative-ai';
import { logger } from '@/lib/logger';
import { AIProvider, AIProviderOptions } from '../types';

export class GeminiProvider implements AIProvider {
  private client: GoogleGenerativeAI;
  private activeStreams: Map<string, AbortController> = new Map();
  
  constructor(apiKey?: string) {
    // Try multiple environment variable names for Google API key
    const googleApiKey = apiKey || 
                        process.env.GOOGLE_API_KEY || 
                        process.env.GOOGLE_AI_API_KEY || 
                        process.env.GEMINI_API_KEY || 
                        '';
    
    if (!googleApiKey) {
      throw new Error('Google API key is required. Please set GOOGLE_API_KEY environment variable.');
    }
    
    this.client = new GoogleGenerativeAI(googleApiKey);
    
    logger.debug('Gemini provider initialized', { 
      hasApiKey: !!googleApiKey,
      keyLength: googleApiKey.length 
    }, 'gemini-provider');
  }
  
  /**
   * Generate a non-streaming response
   */
  async generate(messages: any[], options: AIProviderOptions): Promise<any> {
    try {
      logger.debug('Generating Gemini response', { 
        model: options.model,
        messageCount: messages.length,
        toolCount: options.tools?.length || 0
      }, 'gemini-provider');
      
      const model = this.client.getGenerativeModel({ 
        model: this.resolveModel(options.model) 
      });
      
      // Convert OpenAI-style messages to Gemini format
      const geminiMessages = this.convertMessagesToGemini(messages);
      
      const chat = model.startChat({
        history: geminiMessages.history,
        generationConfig: {
          temperature: options.temperature,
          maxOutputTokens: options.maxTokens,
        },
      });
      
      const result = await chat.sendMessage(geminiMessages.currentMessage);
      const response = result.response.text();
      
      logger.debug('Gemini response generated', { 
        responseLength: response.length,
        responseType: typeof response,
        responsePreview: response.substring(0, 100)
      }, 'gemini-provider');
      
      // Return in OpenAI-compatible format for consistency
      return {
        message: {
          content: response,
          tool_calls: null // Gemini doesn't support tool calls yet
        },
        finish_reason: 'stop'
      };
      
    } catch (error) {
      logger.error('Error generating Gemini response', { 
        error: error.message,
        model: options.model 
      }, 'gemini-provider');
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
      logger.debug('Starting Gemini stream', { 
        model: options.model,
        streamId 
      }, 'gemini-provider');
      
      const model = this.client.getGenerativeModel({ 
        model: this.resolveModel(options.model) 
      });
      
      // Convert OpenAI-style messages to Gemini format
      const geminiMessages = this.convertMessagesToGemini(messages);
      
      console.log(`[Gemini Stream] Creating chat session for model: ${this.resolveModel(options.model)}`);
      console.log(`[Gemini Stream] History length: ${geminiMessages.history.length}`);
      console.log(`[Gemini Stream] Current message: ${geminiMessages.currentMessage.substring(0, 100)}...`);
      
      const chat = model.startChat({
        history: geminiMessages.history,
        generationConfig: {
          temperature: options.temperature,
          maxOutputTokens: options.maxTokens,
        },
      });
      
      console.log(`[Gemini Stream] Sending message stream...`);
      const result = await chat.sendMessageStream(geminiMessages.currentMessage);
      let fullResponse = '';
      let chunkCount = 0;
      
      console.log(`[Gemini Stream] Starting to process stream chunks...`);
      
      for await (const chunk of result.stream) {
        if (abortController.signal.aborted) {
          console.log(`[Gemini Stream] Stream aborted`);
          throw new Error('Stream interrupted');
        }
        
        chunkCount++;
        const chunkText = chunk.text();
        console.log(`[Gemini Stream] Chunk ${chunkCount}: "${chunkText}" (${chunkText.length} chars)`);
        
        if (chunkText) {
          fullResponse += chunkText;
          
          // Send the chunk directly to maintain real streaming
          onToken(chunkText);
        }
      }
      
      console.log(`[Gemini Stream] Stream completed. Total chunks: ${chunkCount}, Total length: ${fullResponse.length}`);
      
      logger.debug('Gemini stream completed', { 
        streamId,
        responseLength: fullResponse.length,
        chunkCount 
      }, 'gemini-provider');
      
      return fullResponse;
      
    } catch (error) {
      if (error.message === 'Stream interrupted') {
        logger.info('Gemini stream interrupted', { streamId }, 'gemini-provider');
        throw error;
      }
      
      console.error(`[Gemini Stream] Error:`, error);
      logger.error('Error in Gemini stream', { 
        error: error.message,
        streamId 
      }, 'gemini-provider');
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
        logger.info('Interrupted stream', { streamId, sessionId }, 'gemini-provider');
      }
    }
  }
  
  /**
   * Convert OpenAI-style messages to Gemini format
   */
  private convertMessagesToGemini(messages: any[]): { history: any[], currentMessage: string } {
    const history: any[] = [];
    let currentMessage = '';
    
    // Process messages - Gemini uses alternating user/model format
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      
      if (message.role === 'system') {
        // System messages can be included as user messages with special formatting
        if (i === 0) {
          currentMessage = `System: ${message.content}\n\n`;
        }
        continue;
      }
      
      if (message.role === 'user') {
        if (i === messages.length - 1) {
          // This is the current message to send
          currentMessage += message.content;
        } else {
          // Add to history
          history.push({
            role: 'user',
            parts: [{ text: message.content }]
          });
        }
      } else if (message.role === 'assistant') {
        history.push({
          role: 'model',
          parts: [{ text: message.content }]
        });
      }
    }
    
    return { history, currentMessage };
  }
  
  /**
   * Resolve model name to ensure compatibility with Gemini models
   */
  private resolveModel(model: string): string {
    // Map custom model names and display names to Gemini model names
    const modelMap: Record<string, string> = {
      // Display names to Gemini API model names
      'Gemini 1.5 Pro': 'gemini-1.5-pro',
      'Gemini 1.5 Flash': 'gemini-1.5-flash',
      'Gemini 2.0 Flash (Experimental)': 'gemini-2.0-flash-exp',
      'Gemini 2.0 Flash Thinking (Experimental)': 'gemini-2.0-flash-thinking-exp-01-21',
      'Gemini 2.5 Flash': 'gemini-2.0-flash-exp', // Map to available model for now
      'Gemini 2.5 Flash-Lite Preview': 'gemini-2.0-flash-exp', // Map to available model for now
      'Gemini Pro (Legacy)': 'gemini-1.5-pro',
      'Gemini Flash (Legacy)': 'gemini-1.5-flash',
      
      // OpenAI to Gemini mappings
      'gpt-4': 'gemini-1.5-pro',
      'gpt-4-turbo': 'gemini-1.5-pro',
      'gpt-3.5-turbo': 'gemini-1.5-flash',
      'gpt-4-mini': 'gemini-1.5-flash',
      
      // Legacy Gemini names
      'gemini-pro': 'gemini-1.5-pro',
      'gemini-flash': 'gemini-1.5-flash',
      
      // Exact Gemini model names (API names)
      'gemini-1.5-pro': 'gemini-1.5-pro',
      'gemini-1.5-flash': 'gemini-1.5-flash',
      'gemini-2.0-flash-exp': 'gemini-2.0-flash-exp',
      'gemini-2.0-flash-thinking-exp': 'gemini-2.0-flash-thinking-exp-01-21',
      'gemini-2.5-flash': 'gemini-2.0-flash-exp', // Map to available model for now
      'gemini-2.5-flash-lite-preview': 'gemini-2.0-flash-exp' // Map to available model for now
    };
    
    const resolvedModel = modelMap[model] || 'gemini-1.5-pro';
    
    // Log the mapping for debugging
    if (modelMap[model]) {
      logger.debug(`Mapped Gemini model "${model}" to "${resolvedModel}"`, {}, 'gemini-provider');
    } else {
      logger.warn(`Unknown Gemini model "${model}", using default: ${resolvedModel}`, {}, 'gemini-provider');
    }
    
    return resolvedModel;
  }
} 