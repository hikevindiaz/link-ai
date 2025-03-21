// Global type declarations to help with compatibility issues

// Declare the AI module with properly fixed types
declare module 'ai' {
  // StreamingTextResponse implementation that avoids "Cannot access 'i' before initialization" error
  export class StreamingTextResponse extends Response {
    constructor(stream: ReadableStream, options?: ResponseInit);
  }

  // Export streamText with a simplified signature
  export function streamText(options: any): Promise<AsyncIterable<string>>;
  
  // Export createStreamableUI with a simplified signature
  export function createStreamableUI(): {
    append: (content: string) => void;
    done: () => void;
    stream: ReadableStream;
  };
  
  // Message type with flexible properties
  export type Message = {
    id?: string;
    role: string;
    content: string;
    [key: string]: any;
  };
  
  // Add formatStreamPart with both signatures
  export function formatStreamPart(part: any): string;
  export function formatStreamPart(type: string, value: any): string;
  
  // Tool function definition
  export function tool(config: any): Function;
  
  // Assistant message types
  export interface AssistantMessage {
    id: string;
    role: 'assistant';
    content: any;
    [key: string]: any;
  }
  
  export interface DataMessage {
    [key: string]: any;
  }
  
  // Utility functions with relaxed types
  export function nanoid(): string;
  export function createParser(): any;
  export function experimental_streamText(): any;
}

// Augment the ReadableStream interface for async iteration
interface ReadableStream<R = any> {
  [Symbol.asyncIterator](): AsyncIterableIterator<R>;
}

// Augment the global namespace for compatibility
declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_VERCEL_COMPATIBLE?: string;
    NEXT_DISABLE_EXPERIMENTAL_STREAMING?: string;
    NEXT_PUBLIC_USE_FIXED_STREAMING?: string;
  }
} 