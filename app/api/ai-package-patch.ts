/**
 * Global AI Package Patch
 * 
 * This file provides fixed implementations of AI package components
 * to avoid build errors in production environments.
 */

import { formatStreamPart as localFormatStreamPart } from '@/lib/chat-interface/ai/compatibility';

// Create a proxy for the ai package that includes formatStreamPart
const aiProxy = new Proxy(require('ai'), {
  get(target, prop) {
    if (prop === 'formatStreamPart') {
      return localFormatStreamPart;
    }
    return target[prop];
  }
});

// Re-export the patched ai package
module.exports = aiProxy;

// Fixed StreamingTextResponse implementation that avoids the 'i' initialization error
export class StreamingTextResponse extends Response {
  constructor(stream: ReadableStream, options: ResponseInit = {}) {
    // Define all variables before using them
    const defaultHeaders = {
      'Content-Type': 'text/plain; charset=utf-8',
    };
    
    // Create the response options object separately
    const responseOptions = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };
    
    // Call parent constructor with prepared variables
    super(stream, responseOptions);
  }
}

// Fixed implementation of createStreamableUI
export function createStreamableUI() {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  
  const stream = new ReadableStream({
    start(c) {
      controller = c;
    },
  });

  return {
    append: (content: string) => {
      if (controller) {
        controller.enqueue(encoder.encode(content));
      }
    },
    done: () => {
      if (controller) {
        controller.close();
      }
    },
    stream,
  };
}

// Safe implementation of formatStreamPart
export function formatStreamPart(type: any, value?: any): string {
  // Single argument signature
  if (value === undefined) {
    const part = type;
    if (typeof part === 'string') {
      return part;
    }
    
    if (part?.text !== undefined) {
      return part.text;
    }
    
    try {
      return JSON.stringify(part);
    } catch (error) {
      console.error('Error stringifying stream part:', error);
      return '';
    }
  }
  
  // Two argument signature
  try {
    const formattedPart = { type, value };
    return JSON.stringify(formattedPart);
  } catch (error) {
    console.error('Error formatting stream part:', error);
    return '';
  }
}

// Implementation of the tool function that's missing from our patch
export function tool(config: any) {
  // This is a simplified implementation of the 'tool' function
  // It returns a function that when called, returns the provided config
  // with a type property set to 'tool'
  return function() {
    return { ...config, type: 'tool' };
  };
}

// Simplified streamText function
export async function streamText(options: any) {
  const { model, messages, system, maxTokens, temperature, tools } = options;
  
  try {
    // Process messages for compatibility
    const processedMessages = messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content
    }));
    
    // Add system message if provided
    const allMessages = system 
      ? [{ role: 'system', content: system }, ...processedMessages]
      : processedMessages;
    
    // Create a streaming response
    const response = await model.chat({
      messages: allMessages,
      maxTokens,
      temperature,
      tools
    });
    
    // Return a compatible async iterable
    return {
      async *[Symbol.asyncIterator]() {
        if (typeof response.textStream === 'function') {
          for await (const chunk of response.textStream()) {
            yield chunk;
          }
        } else if (response.choices && response.choices[0]?.delta?.content) {
          yield response.choices[0].delta.content;
        } else if (typeof response === 'string') {
          yield response;
        }
      }
    };
  } catch (error) {
    console.error('Error in streamText:', error);
    return {
      async *[Symbol.asyncIterator]() {
        yield "Sorry, there was an error generating a response. Please try again.";
      }
    };
  }
}

// Export a default object with all fixed implementations
export default {
  StreamingTextResponse,
  createStreamableUI,
  formatStreamPart,
  streamText,
  tool
}; 