export interface Agent {
  id: string;
  name: string;
  status: 'draft' | 'live';
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  welcomeMessage: string;
  prompt: string;
  errorMessage: string;
  language: string;
  secondLanguage?: string;
  openaiId: string;
  modelId?: string;
  model?: {
    id: string;
    name: string;
  };
  // LLM Tab fields
  maxPromptTokens?: number;
  maxCompletionTokens?: number;
  temperature?: number;
  brainFiles?: string[];
  knowledgeSources?: Array<{
    id: string;
    name: string;
    description?: string;
    vectorStoreId?: string;
  }>;
  // Training related fields
  lastTrainedAt?: string;
  trainingStatus?: 'idle' | 'training' | 'success' | 'error';
  trainingMessage?: string;
  // Call Tab fields
  phoneNumber?: string;
  voice?: string;
  responseRate?: 'rapid' | 'normal' | 'patient';
  checkUserPresence?: boolean;
  presenceMessage?: string;
  presenceMessageDelay?: number;
  silenceTimeout?: number;
  hangUpMessage?: string;
  callTimeout?: number;
  // Widget Tab fields
  widgetSettings?: Record<string, any>;
  // Widget specific fields
  chatTitle?: string;
  chatMessagePlaceHolder?: string;
  chatInputStyle?: string;
  chatHistoryEnabled?: boolean;
  bubbleColor?: string;
  bubbleTextColor?: string;
  chatBackgroundColor?: string;
  buttonTheme?: 'light' | 'dark';
  riveOrbColor?: number;
  borderGradientColors?: string[];
  chatHeaderBackgroundColor?: string;
  chatHeaderTextColor?: string;
  userReplyBackgroundColor?: string;
  userReplyTextColor?: string;
  displayBranding?: boolean;
  chatFileAttachementEnabled?: boolean;
  chatbotLogoURL?: string | null;
  iconType?: 'orb' | 'logo';
  // Channel related fields
  websiteEnabled?: boolean;
  whatsappEnabled?: boolean;
  smsEnabled?: boolean;
  messengerEnabled?: boolean;
  instagramEnabled?: boolean;
  // Actions Tab fields (deprecated - kept for backward compatibility)
  actions?: Array<{
    id: string;
    type: string;
    config: Record<string, any>;
  }>;
  bookingEnabled?: boolean;
  inquiryEnabled?: boolean;
  webhookEnabled?: boolean;
  // Calendar integration
  calendarEnabled?: boolean;
  calendarId?: string | null;
}