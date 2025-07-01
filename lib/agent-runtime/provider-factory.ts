import { AIProvider } from './types';
import { OpenAIProvider } from './providers/openai-provider';
import { GeminiProvider } from './providers/gemini-provider';
import { logger } from '@/lib/logger';

export type SupportedProvider = 'openai' | 'gemini';

export interface ProviderConfig {
  provider: SupportedProvider;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export class ProviderFactory {
  private static providers: Map<string, AIProvider> = new Map();
  
  /**
   * Create or get a cached provider instance
   */
  static getProvider(config: ProviderConfig): AIProvider {
    const cacheKey = `${config.provider}_${config.apiKey || 'default'}`;
    
    if (this.providers.has(cacheKey)) {
      return this.providers.get(cacheKey)!;
    }
    
    const provider = this.createProvider(config);
    this.providers.set(cacheKey, provider);
    
    return provider;
  }
  
  /**
   * Create a new provider instance
   */
  private static createProvider(config: ProviderConfig): AIProvider {
    logger.debug('Creating AI provider', { 
      provider: config.provider 
    }, 'provider-factory');
    
    switch (config.provider) {
      case 'openai':
        return new OpenAIProvider(config.apiKey);
        
      case 'gemini':
        return new GeminiProvider(config.apiKey);
        
      default:
        logger.warn('Unknown provider type, defaulting to OpenAI', { 
          provider: config.provider 
        }, 'provider-factory');
        return new OpenAIProvider(config.apiKey);
    }
  }
  
  /**
   * Get the default model for a provider
   */
  static getDefaultModel(provider: SupportedProvider): string {
    switch (provider) {
      case 'openai':
        return 'gpt-4';
      case 'gemini':
        return 'gemini-1.5-pro';
      default:
        return 'gpt-4';
    }
  }
  
  /**
   * Determine the provider from a model name
   */
  static getProviderFromModel(modelName: string): SupportedProvider {
    const model = modelName.toLowerCase();
    
    // Gemini models (check for gemini in the name)
    if (model.includes('gemini')) {
      return 'gemini';
    }
    
    // OpenAI models (check for gpt, openai, or o4 in the name)
    if (model.includes('gpt') || model.includes('openai') || model.includes('o4')) {
      return 'openai';
    }
    
    // Specific model ID patterns
    if (model.startsWith('gemini-') || model.startsWith('gemini_')) {
      return 'gemini';
    }
    
    if (model.startsWith('openai-') || model.startsWith('gpt-') || model.startsWith('o4-')) {
      return 'openai';
    }
    
    // Default to OpenAI for unknown models
    logger.debug('Unknown model, defaulting to OpenAI provider', { 
      modelName 
    }, 'provider-factory');
    return 'openai';
  }
  
  /**
   * Create provider from model name
   */
  static getProviderFromModelName(modelName: string, openaiKey?: string): AIProvider {
    const providerType = this.getProviderFromModel(modelName);
    
    // Determine which API key to use based on provider
    let apiKey: string | undefined;
    if (providerType === 'openai') {
      apiKey = openaiKey || process.env.OPENAI_API_KEY;
    } else if (providerType === 'gemini') {
      // For now, use the openaiKey field for Gemini as well, or fall back to env vars
      // Try multiple environment variable names for Google API key
      apiKey = openaiKey || 
               process.env.GOOGLE_API_KEY || 
               process.env.GOOGLE_AI_API_KEY || 
               process.env.GEMINI_API_KEY;
    }
    
    logger.debug('Creating provider from model name', { 
      modelName, 
      providerType, 
      hasApiKey: !!apiKey 
    }, 'provider-factory');
    
    return this.getProvider({
      provider: providerType,
      apiKey,
      model: modelName
    });
  }
  
  /**
   * Check if a provider is supported
   */
  static isProviderSupported(provider: string): provider is SupportedProvider {
    return ['openai', 'gemini'].includes(provider);
  }
  
  /**
   * Get list of supported providers
   */
  static getSupportedProviders(): SupportedProvider[] {
    return ['openai', 'gemini'];
  }
  
  /**
   * Clear the provider cache (useful for testing or when API keys change)
   */
  static clearCache(): void {
    this.providers.clear();
    logger.info('Provider cache cleared', {}, 'provider-factory');
  }
} 