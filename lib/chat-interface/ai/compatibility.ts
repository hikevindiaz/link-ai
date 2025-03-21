/**
 * Compatibility layer for AI package versions
 * 
 * This file provides compatibility between different versions of the AI package
 * to avoid the "Cannot access 'i' before initialization" error in Vercel builds.
 */

import { StreamingTextResponseFixed } from './components/StreamingTextResponseFixed';
import { myProvider } from './providers';

// Re-export the fixed version
export { StreamingTextResponseFixed as StreamingTextResponse };

/**
 * Implementation of formatStreamPart that was missing from the AI package
 * This formats different parts of the stream in a standard way
 * @param type The type of stream part or the content itself
 * @param value The value of the stream part (optional)
 */
export function formatStreamPart(type: any, value?: any): string {
  // If called with a single argument, treat it as the content
  if (value === undefined) {
    const part = type;
    if (typeof part === 'string') {
      return part;
    }
    
    if (part.text !== undefined) {
      return part.text;
    }
    
    try {
      return JSON.stringify(part);
    } catch (error) {
      console.error('Error stringifying stream part:', error);
      return '';
    }
  }
  
  // Otherwise, handle the 2-parameter signature (used in assistant-response.ts)
  try {
    const formattedPart = { type, value };
    return JSON.stringify(formattedPart);
  } catch (error) {
    console.error('Error formatting stream part:', error);
    return '';
  }
}

// Simplified compatible streamText function
export async function streamTextCompatible({
  model, 
  messages, 
  system,
  maxTokens,
  temperature,
  tools
}: {
  model: any;
  messages: any[];
  system?: string;
  maxTokens?: number;
  temperature?: number;
  tools?: any;
}) {
  try {
    // Process messages to ensure compatibility
    const processedMessages = messages.map(msg => ({
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
    
    // Convert the response to an async iterable that yields chunks
    return {
      async *[Symbol.asyncIterator]() {
        if (typeof response.textStream === 'function') {
          // If response has a textStream method (new API versions)
          for await (const chunk of response.textStream()) {
            yield chunk;
          }
        } else if (response.choices && response.choices[0]?.delta?.content) {
          // If response is OpenAI-like format
          yield response.choices[0].delta.content;
        } else if (typeof response === 'string') {
          // If response is just a string
          yield response;
        }
      }
    };
  } catch (error) {
    console.error('Error in streamTextCompatible:', error);
    return {
      async *[Symbol.asyncIterator]() {
        yield "Sorry, there was an error generating a response. Please try again.";
      }
    };
  }
}

// Helper for creating streamable UI that works with our fixed response
export function createCompatibleStreamableUI() {
  // Create a readable stream with a controller we can use
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  
  const stream = new ReadableStream({
    start(c) {
      controller = c;
    },
  });

  return {
    /**
     * Append content to the stream
     */
    append: (content: string) => {
      if (controller) {
        controller.enqueue(encoder.encode(content));
      }
    },
    
    /**
     * Mark the stream as done
     */
    done: () => {
      if (controller) {
        controller.close();
      }
    },
    
    /**
     * The underlying stream
     */
    stream,
  };
} 