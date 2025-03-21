/**
 * AI Package Compatibility Layer
 * 
 * This file provides compatibility functions for different versions of the AI package.
 * It ensures that exports like OpenAIStream, StreamingTextResponse, and createStreamableUI
 * are available regardless of which AI package version is installed.
 */

export function createStreamableUI() {
  // Basic fallback for createStreamableUI
  return {
    append: async () => {},
    done: async () => {},
    update: async () => {},
    // Add any additional properties needed
  };
}

export function OpenAIStream(response: any) {
  // Simple passthrough for OpenAIStream
  return response;
}

export class StreamingTextResponse extends Response {
  constructor(stream: any, options: ResponseInit = {}) {
    super(stream, {
      ...options,
      headers: {
        ...options.headers,
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  }
} 