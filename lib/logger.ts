import { env } from "@/env.mjs";

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  verbosity?: 'low' | 'medium' | 'high';
  enabledModules?: string[];
}

class Logger {
  private static instance: Logger;
  private isDevelopment: boolean;
  private verbosity: 'low' | 'medium' | 'high';
  private enabledModules: string[];

  private constructor() {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      this.isDevelopment = process.env.NEXT_PUBLIC_NODE_ENV === 'development';
    } else {
      this.isDevelopment = process.env.NODE_ENV === 'development';
    }
    
    // Default options
    this.verbosity = 'medium';
    this.enabledModules = ['api', 'core'];
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }
  
  public configure(options: LoggerOptions): void {
    if (options.verbosity) {
      this.verbosity = options.verbosity;
    }
    if (options.enabledModules) {
      this.enabledModules = options.enabledModules;
    }
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const formattedData = data ? `\nData: ${JSON.stringify(data, null, 2)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${formattedData}`;
  }

  private shouldLog(level: LogLevel, module?: string): boolean {
    // In production, only log warnings and errors
    if (!this.isDevelopment) {
      return level === 'warn' || level === 'error';
    }
    
    // Check if module is enabled
    if (module && !this.enabledModules.includes(module) && !this.enabledModules.includes('all')) {
      return false;
    }
    
    // Filter based on verbosity
    if (this.verbosity === 'low') {
      return level === 'warn' || level === 'error';
    }
    
    if (this.verbosity === 'medium') {
      return level === 'info' || level === 'warn' || level === 'error';
    }
    
    // For high verbosity, log everything
    return true;
  }

  private sanitizeData(data: any): any {
    if (!data) return data;
    
    // Create a copy to avoid modifying the original
    const sanitized = JSON.parse(JSON.stringify(data));
    
    // Remove sensitive fields
    const sensitiveFields = ['id', 'userId', 'openaiId', 'openaiKey', 'phoneNumber'];
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  debug(message: string, data?: any, module?: string): void {
    if (this.shouldLog('debug', module)) {
      const modulePrefix = module ? `[${module}] ` : '';
      console.debug(this.formatMessage('debug', `${modulePrefix}${message}`, this.sanitizeData(data)));
    }
  }

  info(message: string, data?: any, module?: string): void {
    if (this.shouldLog('info', module)) {
      const modulePrefix = module ? `[${module}] ` : '';
      console.info(this.formatMessage('info', `${modulePrefix}${message}`, this.sanitizeData(data)));
    }
  }

  warn(message: string, data?: any, module?: string): void {
    if (this.shouldLog('warn', module)) {
      const modulePrefix = module ? `[${module}] ` : '';
      console.warn(this.formatMessage('warn', `${modulePrefix}${message}`, this.sanitizeData(data)));
    }
  }

  error(message: string, data?: any, module?: string): void {
    if (this.shouldLog('error', module)) {
      const modulePrefix = module ? `[${module}] ` : '';
      console.error(this.formatMessage('error', `${modulePrefix}${message}`, this.sanitizeData(data)));
    }
  }
}

// Create singleton instance
const loggerInstance = Logger.getInstance();

// Configure with default settings for development
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_NODE_ENV === 'development') {
  loggerInstance.configure({
    verbosity: 'medium',
    enabledModules: ['api', 'core', 'agent']
  });
}

export const logger = loggerInstance; 