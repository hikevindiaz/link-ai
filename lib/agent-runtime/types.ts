// Core types for the Unified Agent Runtime
// These types align with the existing Prisma schema while providing
// a unified interface for all channels

export type ChannelType = 'web' | 'voice' | 'phone' | 'whatsapp' | 'instagram' | 'messenger' | 'sms';

export interface ChannelCapabilities {
  supportsAudio: boolean;
  supportsVideo: boolean;
  supportsImages: boolean;
  supportsFiles: boolean;
  supportsRichText: boolean;
  supportsTypingIndicator: boolean;
  supportsDeliveryReceipts: boolean;
  supportsInterruption: boolean;
  maxMessageLength?: number;
  maxAudioDuration?: number;
  supportedAudioFormats?: string[];
  customFeatures?: string[];
}

export interface ChannelContext {
  type: ChannelType;
  sessionId: string;
  userId: string;
  chatbotId: string;
  phoneNumber?: string;
  threadId: string;
  capabilities: ChannelCapabilities;
  userLocation?: {
    country?: string;
    region?: string;
    city?: string;
    timezone?: string;
  };
  metadata?: {
    callSid?: string; // For Twilio calls
    whatsappBusinessId?: string;
    instagramUserId?: string;
    [key: string]: any;
  };
}

export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'function';
  content: string;
  type: 'text' | 'audio' | 'image' | 'function_call' | 'function_result';
  timestamp: Date;
  metadata?: {
    audioUrl?: string;
    imageUrl?: string;
    functionName?: string;
    functionArgs?: Record<string, any>;
    functionResult?: any;
    duration?: number;
    confidence?: number;
    voiceId?: string;
    attachments?: Array<{
      type: 'image' | 'file';
      url: string;
      name?: string;
      size?: number;
    }>;
    [key: string]: any; // Allow additional properties
  };
}

// This matches the Chatbot model from Prisma
export interface AgentConfig {
  id: string;
  name: string;
  userId: string;
  
  // Core AI settings
  prompt: string;
  modelId?: string;
  modelName?: string; // Will be resolved from ChatbotModel relation
  openaiKey?: string;
  temperature: number;
  maxCompletionTokens: number;
  maxPromptTokens: number;
  
  // Messages
  welcomeMessage: string;
  chatbotErrorMessage: string;
  
  // Voice settings
  voice?: string;
  language: string;
  secondLanguage?: string;
  responseRate?: string; // 'rapid' | 'normal' | 'patient'
  
  // Call settings
  silenceTimeout?: number;
  callTimeout?: number;
  checkUserPresence?: boolean;
  presenceMessage?: string;
  presenceMessageDelay?: number;
  hangUpMessage?: string;
  
  // Channel flags
  websiteEnabled: boolean;
  whatsappEnabled: boolean;
  smsEnabled: boolean;
  messengerEnabled: boolean;
  instagramEnabled: boolean;
  
  // Features
  chatHistoryEnabled: boolean;
  chatFileAttachementEnabled: boolean;
  calendarEnabled: boolean;
  calendarId?: string;
  
  // Knowledge and tools
  knowledgeSourceIds: string[];
  knowledgeConfig?: {
    knowledgeSourceIds: string[]; // Supabase knowledge source IDs for vector search
    vectorStoreIds: string[]; // Legacy OpenAI vector store IDs (deprecated)
    websiteUrls: string[];
    websiteInstructions: Array<{url: string, instructions?: string}>;
    textKnowledge: string;
    useSupabaseVectorSearch: boolean; // Use Supabase vector search
    useFileSearch: boolean; // Legacy OpenAI file search (deprecated)
    useWebSearch: boolean;
  };
  tools?: AgentTool[];
  
  // Channel-specific overrides
  channelOverrides?: {
    [K in ChannelType]?: Partial<AgentConfig>;
  };
}

export interface AgentTool {
  id: string;
  name: string;
  description: string;
  parameters: Record<string, any>;
  handler: (args: any, context: AgentContext) => Promise<any>;
}

export interface AgentContext {
  agent: AgentConfig;
  channel: ChannelContext;
  conversation: ConversationState;
  tools: Map<string, AgentTool>;
}

export interface ConversationState {
  messages: AgentMessage[];
  currentTurn?: {
    startTime: Date;
    isAgentSpeaking: boolean;
    pendingInterruption?: boolean;
  };
  metadata?: Record<string, any>;
}

export interface ConversationEvent {
  type: 'message' | 'interruption' | 'turn_start' | 'turn_end' | 'error' | 'tool_call';
  timestamp: Date;
  data: any;
}

// Channel Adapter Interface
export interface ChannelAdapter {
  type: ChannelType;
  
  // Initialize the adapter with agent config
  initialize(agent: AgentConfig): Promise<void>;
  
  // Handle incoming messages from the channel
  handleIncoming(data: any, context: ChannelContext): Promise<AgentMessage>;
  
  // Send outgoing messages to the channel
  sendOutgoing(message: AgentMessage, context: ChannelContext): Promise<void>;
  
  // Handle channel-specific events
  handleEvent?(event: any, context: ChannelContext): Promise<void>;
  
  // Clean up resources
  cleanup?(): Promise<void>;
}

// Response streaming interface for real-time channels
export interface StreamingResponse {
  onToken?: (token: string) => void;
  onAudio?: (audioChunk: ArrayBuffer) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

// AI Provider interface
export interface AIProvider {
  generate(messages: any[], options: AIProviderOptions): Promise<string>;
  generateStream(
    messages: any[], 
    options: AIProviderOptions, 
    onToken: (token: string) => void
  ): Promise<string>;
  interrupt?(sessionId: string): Promise<void>;
}

export interface AIProviderOptions {
  model: string;
  temperature: number;
  maxTokens: number;
  tools?: any[];
  toolChoice?: any;
  systemPrompt?: string;
  knowledgeSourceIds?: string[]; // Supabase knowledge source IDs for vector search
  vectorStoreIds?: string[]; // Legacy OpenAI vector store IDs (deprecated)
}

// Interface for processing messages with all context
export interface MessageProcessingInput {
  messages: AgentMessage[];
  threadId: string;
  stream?: boolean;
  userLocation?: {
    country?: string;
    region?: string;
    city?: string;
    timezone?: string;
  };
} 