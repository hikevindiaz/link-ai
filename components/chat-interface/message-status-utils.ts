// Utility functions for dynamic message status

export interface MessageStatus {
  message: string;
  isToolUsage: boolean;
}

// Check if a user message is actually a request vs just a conversational response
const isActualRequest = (query: string): boolean => {
  const trimmed = query.toLowerCase().trim();
  
  // Short responses that are clearly not requests
  const conversationalResponses = [
    'ok', 'okay', 'yes', 'yeah', 'yep', 'sure', 'no', 'nope', 'thanks', 'thank you', 
    'good', 'great', 'perfect', 'nice', 'cool', 'awesome', 'got it', 'understood',
    'right', 'correct', 'exactly', 'true', 'false', 'maybe', 'perhaps', 'hi', 
    'hello', 'hey', 'bye', 'goodbye', 'see you', 'later', 'lol', 'haha', 'hmm',
    'interesting', 'wow', 'amazing', 'wonderful', 'excellent', 'fine', 'alright'
  ];
  
  // Check if it's just a short conversational response
  if (conversationalResponses.includes(trimmed)) {
    return false;
  }
  
  // Check if it's just punctuation or very short (likely not a real request)
  if (trimmed.length < 3 || /^[!@#$%^&*(),.?":{}|<>]*$/.test(trimmed)) {
    return false;
  }
  
  // Check for question words or action verbs that indicate a request
  const requestIndicators = [
    'can you', 'could you', 'would you', 'please', 'help', 'find', 'search', 
    'look up', 'tell me', 'show me', 'what', 'how', 'where', 'when', 'why', 
    'who', 'which', 'explain', 'describe', 'compare', 'analyze', 'calculate',
    'create', 'make', 'build', 'generate', 'write', 'send', 'get', 'fetch',
    'check', 'verify', 'confirm', 'book', 'schedule', 'plan', 'organize'
  ];
  
  // Check if it contains request indicators
  const hasRequestIndicator = requestIndicators.some(indicator => 
    trimmed.includes(indicator)
  );
  
  // If it's longer than 10 characters and has request indicators, likely a request
  if (trimmed.length > 10 && hasRequestIndicator) {
    return true;
  }
  
  // If it's a longer message (>15 chars) without obvious conversational markers, probably a request
  if (trimmed.length > 15) {
    const conversationalMarkers = ['just', 'well', 'actually', 'honestly', 'i think', 'i feel', 'i guess'];
    const hasConversationalMarker = conversationalMarkers.some(marker => trimmed.includes(marker));
    return !hasConversationalMarker;
  }
  
  return false;
};

// Extract key topics and generate contextual thinking messages
export const getContextualThinkingMessage = (userQuery: string): string => {
  const query = userQuery.toLowerCase().trim();
  
  // First check if this is actually a request worth contextualizing
  if (!isActualRequest(query)) {
    return "Thinking...";
  }
  
  // Remove common question words and patterns
  const cleanQuery = query
    .replace(/^(can you|could you|please|would you|help me|i need|i want|find|search|look up|tell me about|what is|what are|how|where|when|why)\s*/gi, '')
    .replace(/\s*(for me|please|thanks|thank you)\s*$/gi, '')
    .replace(/^(the|a|an)\s+/gi, '');
  
  // Restaurant-related queries
  if (query.includes('restaurant') || query.includes('food') || query.includes('eat') || query.includes('dining')) {
    if (query.includes('best')) {
      return `Searching for the best restaurants...`;
    }
    return `Finding restaurant information...`;
  }
  
  // Weather queries
  if (query.includes('weather') || query.includes('temperature') || query.includes('forecast')) {
    return `Checking weather information...`;
  }
  
  // Location-based queries
  if (query.includes('near me') || query.includes('in ') || query.includes('location')) {
    const locationMatch = query.match(/in\s+([a-zA-Z\s]+?)(?:\s|$)/);
    if (locationMatch) {
      return `Searching for information in ${locationMatch[1].trim()}...`;
    }
    return `Finding local information...`;
  }
  
  // Price/cost queries
  if (query.includes('price') || query.includes('cost') || query.includes('how much')) {
    return `Looking up pricing information...`;
  }
  
  // Comparison queries
  if (query.includes('compare') || query.includes('vs') || query.includes('versus') || query.includes('difference')) {
    return `Comparing options...`;
  }
  
  // Product/service queries
  if (query.includes('product') || query.includes('service') || query.includes('buy')) {
    return `Researching product information...`;
  }
  
  // General search with topic extraction - but only for substantial queries
  if (cleanQuery.length > 5) {
    // Extract the main topic (first few significant words)
    const topicWords = cleanQuery.split(' ').filter(word => word.length > 2).slice(0, 3).join(' ');
    if (topicWords.length > 4) {
      return `Researching ${topicWords}...`;
    }
  }
  
  return "Processing your request...";
};

// Generate contextual tool messages based on user query
export const getContextualToolMessage = (toolName: string, userQuery?: string): string => {
  if (!userQuery || !isActualRequest(userQuery)) {
    // Fallback to generic messages if no user query or not a real request
    const defaultMessages: Record<string, string> = {
      // Search tools
      'google_search': 'Searching the web...',
      'googleSearch': 'Going online...',
      'web_search': 'Going online...',
      'search': 'Searching for information...',
      
      // Weather tools
      'getWeather': 'Getting weather information...',
      'weather': 'Checking weather conditions...',
      
      // Document tools
      'createDocument': 'Creating document...',
      'updateDocument': 'Updating document...',
      'search_knowledge': 'Searching knowledge base...',
      
      // Calendar tools
      'schedule_appointment': 'Scheduling appointment...',
      'check_calendar': 'Checking calendar...',
      'create_event': 'Creating calendar event...',
      
      // Default
      'default': 'Processing request...'
    };
    return defaultMessages[toolName] || defaultMessages['default'];
  }
  
  const query = userQuery.toLowerCase().trim();
  
  // Context-aware search messages
  if (toolName === 'google_search' || toolName === 'googleSearch' || toolName === 'web_search' || toolName === 'search') {
    // Extract search intent and topic
    if (query.includes('restaurant') || query.includes('food') || query.includes('eat') || query.includes('dining')) {
      if (query.includes('best')) {
        return 'Searching for the best restaurants...';
      }
      if (query.includes('near')) {
        return 'Finding nearby restaurants...';
      }
      return 'Finding restaurant recommendations...';
    }
    
    if (query.includes('weather') || query.includes('temperature') || query.includes('forecast')) {
      return 'Getting current weather information...';
    }
    
    if (query.includes('price') || query.includes('cost') || query.includes('how much')) {
      return 'Looking up current pricing...';
    }
    
    if (query.includes('news') || query.includes('latest') || query.includes('recent')) {
      return 'Finding the latest information...';
    }
    
    if (query.includes('compare') || query.includes('vs') || query.includes('versus')) {
      return 'Gathering comparison data...';
    }
    
    if (query.includes('review') || query.includes('rating')) {
      return 'Finding reviews and ratings...';
    }
    
    if (query.includes('location') || query.includes('address') || query.includes('where is')) {
      return 'Finding location information...';
    }
    
    if (query.includes('contact') || query.includes('phone') || query.includes('email')) {
      return 'Looking up contact information...';
    }
    
    if (query.includes('hours') || query.includes('open') || query.includes('closed')) {
      return 'Checking business hours...';
    }
    
    // Extract main topic for general searches
    const cleanQuery = query
      .replace(/^(can you|could you|please|would you|help me|find|search|look up|tell me about|what is|what are|who is|where is|when is|how to|how do)\s*/gi, '')
      .replace(/\s*(for me|please|thanks|thank you)\s*$/gi, '')
      .replace(/^(the|a|an)\s+/gi, '');
    
    // Only extract topics from substantial queries
    if (cleanQuery.length > 5) {
      const topicWords = cleanQuery.split(' ').filter(word => word.length > 2).slice(0, 4).join(' ');
      if (topicWords.length > 4) {
        return `Searching for ${topicWords}...`;
      }
    }
    
    return 'Searching the web...';
  }
  
  // Weather tool context
  if (toolName === 'getWeather' || toolName === 'weather') {
    if (query.includes('today')) {
      return 'Getting today\'s weather...';
    }
    if (query.includes('tomorrow')) {
      return 'Checking tomorrow\'s forecast...';
    }
    if (query.includes('week')) {
      return 'Getting weekly forecast...';
    }
    return 'Getting weather information...';
  }
  
  // Document tools context
  if (toolName === 'createDocument') {
    if (query.includes('resume') || query.includes('cv')) {
      return 'Creating your resume...';
    }
    if (query.includes('letter')) {
      return 'Writing your letter...';
    }
    if (query.includes('report')) {
      return 'Generating report...';
    }
    return 'Creating document...';
  }
  
  if (toolName === 'updateDocument') {
    return 'Updating your document...';
  }
  
  if (toolName === 'search_knowledge') {
    const topicMatch = query.match(/about\s+([a-zA-Z\s]+)/);
    if (topicMatch) {
      return `Searching knowledge about ${topicMatch[1].trim()}...`;
    }
    return 'Searching knowledge base...';
  }
  
  // Calendar tools context
  if (toolName === 'schedule_appointment' || toolName === 'create_event') {
    if (query.includes('meeting')) {
      return 'Scheduling your meeting...';
    }
    if (query.includes('appointment')) {
      return 'Booking your appointment...';
    }
    if (query.includes('reminder')) {
      return 'Setting up reminder...';
    }
    return 'Creating calendar event...';
  }
  
  if (toolName === 'check_calendar') {
    if (query.includes('today')) {
      return 'Checking today\'s schedule...';
    }
    if (query.includes('tomorrow')) {
      return 'Checking tomorrow\'s agenda...';
    }
    if (query.includes('week')) {
      return 'Reviewing weekly schedule...';
    }
    return 'Checking your calendar...';
  }
  
  // Default fallback with some context awareness
  if (query.includes('analyze') || query.includes('analysis')) {
    return 'Analyzing your request...';
  }
  
  if (query.includes('calculate') || query.includes('compute')) {
    return 'Calculating results...';
  }
  
  if (query.includes('generate') || query.includes('create')) {
    return 'Generating content...';
  }
  
  return 'Processing your request...';
};

// Get status message based on tool name and user query
export const getStatusMessage = (toolName?: string, userQuery?: string): { title: string } => {
  // If no tool name, use query-based message
  if (!toolName && userQuery) {
    const contextualMessage = getContextualThinkingMessage(userQuery);
    return { title: contextualMessage };
  }
  
  // Tool-specific messages
  switch (toolName) {
    case 'getWeather':
    case 'weather':
      return { title: 'Checking weather...' };
    case 'aviationstack':
    case 'aviation':
      return { title: 'Searching flights...' };
    case 'google_search':
    case 'googleSearch':
    case 'web_search':
      return { title: 'Searching the web...' };
    case 'check_availability':
      return { title: 'Checking calendar...' };
    case 'book_appointment':
      return { title: 'Booking appointment...' };
    case 'view_appointment':
      return { title: 'Looking up appointment...' };
    case 'modify_appointment':
      return { title: 'Updating appointment...' };
    case 'cancel_appointment':
      return { title: 'Cancelling appointment...' };
    default:
      return { title: 'Thinking...' };
  }
};

export const getToolNameFromInvocation = (toolInvocations?: any[]): string | undefined => {
  if (!toolInvocations || toolInvocations.length === 0) {
    return undefined;
  }

  // Get the most recent tool invocation that's in progress
  // Check for various states that indicate the tool is being used
  const activeInvocation = toolInvocations.find(
    (invocation) => 
      invocation.state === 'call' || 
      invocation.state === 'partial-call' ||
      invocation.state === 'calling' ||
      invocation.state === 'pending' ||
      invocation.state === 'running' ||
      !invocation.state || // Sometimes state might be undefined during initial call
      (invocation.state !== 'result' && invocation.state !== 'error')
  );

  const toolName = activeInvocation?.toolName;
  
  return toolName;
}; 