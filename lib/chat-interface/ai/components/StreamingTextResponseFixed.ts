/**
 * Fixed StreamingTextResponse implementation to solve the Vercel build error:
 * "ReferenceError: Cannot access 'i' before initialization"
 */
export class StreamingTextResponseFixed extends Response {
  constructor(stream: ReadableStream, options: ResponseInit = {}) {
    // Make sure to initialize all variables before usage
    const defaultHeaders = {
      'Content-Type': 'text/plain; charset=utf-8',
    };
    
    // Combine the default headers with any provided options
    const responseOptions = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };
    
    // Call the parent constructor with properly initialized variables
    super(stream, responseOptions);
  }
} 