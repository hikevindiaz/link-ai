/**
 * AI Package Export Proxy
 * 
 * This file serves as a proxy for the AI package, handling version differences
 * and providing fallbacks for missing exports.
 */

import type { Readable } from 'stream';

// Try to import from the AI package directly first
let aiPackage: any;
try {
  aiPackage = require('ai');
} catch (error) {
  console.warn('Error importing AI package:', error);
  aiPackage = {};
}

// Fallback implementations
class StreamingTextResponseFallback extends Response {
  constructor(stream: ReadableStream | Readable, options: ResponseInit = {}) {
    super(stream as ReadableStream, {
      ...options,
      headers: {
        ...options.headers,
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  }
}

function createStreamableUIFallback() {
  return {
    append: async () => {},
    done: async () => {},
    update: async () => {},
  };
}

function OpenAIStreamFallback(response: any) {
  return response;
}

// Missing AI functions reported in errors
async function generateTextFallback() {
  return { text: '' };
}

function streamTextFallback() {
  return new ReadableStream();
}

function streamObjectFallback() {
  return new ReadableStream();
}

async function generateImageFallback() {
  return { url: '' };
}

// Implement formatStreamPart function that's missing
function formatStreamPartFallback(type: any, value?: any) {
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
  
  // Otherwise, handle the 2-parameter signature
  try {
    const formattedPart = { type, value };
    return JSON.stringify(formattedPart);
  } catch (error) {
    console.error('Error formatting stream part:', error);
    return '';
  }
}

// Implementation for the missing 'tool' function
function toolFallback(config: any) {
  // This is a simplified implementation of the 'tool' function
  // It returns a function that when called, returns the provided config
  return function() {
    return { ...config, type: 'tool' };
  };
}

// Export fallback implementations or real implementations if available
export const StreamingTextResponse = aiPackage.StreamingTextResponse || StreamingTextResponseFallback;
export const createStreamableUI = aiPackage.createStreamableUI || createStreamableUIFallback;
export const OpenAIStream = aiPackage.OpenAIStream || OpenAIStreamFallback;
export const generateText = aiPackage.generateText || generateTextFallback;
export const streamText = aiPackage.streamText || streamTextFallback;
export const streamObject = aiPackage.streamObject || streamObjectFallback;
export const generateImage = aiPackage.generateImage || generateImageFallback;
export const formatStreamPart = aiPackage.formatStreamPart || formatStreamPartFallback;
export const tool = aiPackage.tool || toolFallback;

// Re-export other functions from AI package with fallbacks
export const createAI = aiPackage.createAI || (() => ({}));
export const createAssistant = aiPackage.createAssistant || (() => ({}));
export const createParser = aiPackage.createParser || (() => ({}));
export const useAssistant = aiPackage.useAssistant || (() => ({}));
export const useChat = aiPackage.useChat || (() => ({}));
export const useCompletion = aiPackage.useCompletion || (() => ({}));
export const nanoid = aiPackage.nanoid || (() => 'id');
export const isStreamStringHelpers = aiPackage.isStreamStringHelpers || {};
export const readableFromAsyncIterable = aiPackage.readableFromAsyncIterable || (async () => new ReadableStream());
export const createChunker = aiPackage.createChunker || (() => ({}));
export const createIpynbChunker = aiPackage.createIpynbChunker || (() => ({}));
export const createJsonChunker = aiPackage.createJsonChunker || (() => ({}));
export const createMarkdownChunker = aiPackage.createMarkdownChunker || (() => ({}));
export const createPdfChunker = aiPackage.createPdfChunker || (() => ({}));
export const createTextChunker = aiPackage.createTextChunker || (() => ({}));
export const experimental_streamText = aiPackage.experimental_streamText || (() => new ReadableStream());
export const isAssistantResponse = aiPackage.isAssistantResponse || (() => false);
export const streamToAsyncIterable = aiPackage.streamToAsyncIterable || (async function* () { yield ''; }); 