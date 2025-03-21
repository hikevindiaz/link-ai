/**
 * AI Test Mock Module
 * 
 * This provides mock implementations for the ai/test module that 
 * is imported by some components. This prevents build failures
 * when the actual module is not available.
 */

// Mock streaming response
export function createStreamableUI() {
  return {
    append: async () => {},
    done: async () => {},
    update: async () => {},
  };
}

// Mock experimental stream function
export function experimental_streamText() {
  return new ReadableStream();
}

// Mock the test utilities
export const mock = {
  stream: {
    text: (text: string) => new ReadableStream(),
    json: (json: any) => new ReadableStream(),
  },
  ai: {
    completion: async () => ({ content: '', role: 'assistant' }),
    chat: async () => ({ content: '', role: 'assistant' }),
  },
  unit: {
    completion: (completion: any) => completion,
    chat: (chat: any) => chat,
  },
};

// Default export for CommonJS compatibility
export default {
  createStreamableUI,
  experimental_streamText,
  mock,
}; 