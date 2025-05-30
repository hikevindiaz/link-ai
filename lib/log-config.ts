import { logger } from './logger';

/**
 * Configure application-wide logging settings
 * 
 * @param options Configuration options for the logger
 */
export function configureLogging(options: {
  verbosity?: 'low' | 'medium' | 'high',
  enabledModules?: string[]
}) {
  logger.configure(options);
}

/**
 * Enable debug mode for specific modules
 * 
 * @param modules Array of module names to enable (e.g., 'api', 'agent', 'ui')
 */
export function enableDebugForModules(modules: string[]) {
  logger.configure({
    verbosity: 'high',
    enabledModules: modules
  });
}

/**
 * Disable all debug logging
 */
export function disableDebugLogging() {
  logger.configure({
    verbosity: 'low',
    enabledModules: ['core']
  });
}

/**
 * Reset logging to default settings
 */
export function resetLoggingToDefaults() {
  logger.configure({
    verbosity: 'medium',
    enabledModules: ['api', 'core', 'agent']
  });
}

/**
 * Enable a production-optimized logging configuration
 * This reduces noise while preserving important information
 */
export function enableProductionLogging() {
  logger.configure({
    verbosity: 'low',
    enabledModules: ['core', 'api']
  });
}

/**
 * Apply specific filters to reduce the most common noisy logs
 */
export function applyLogFilters() {
  // Store original console methods
  const originalDebug = console.debug;
  const originalLog = console.log;
  
  // Patterns to filter out
  const noisyPatterns = [
    /\[AGENT DEBUG\] Matched agent in sidebar/,
    /Setting preview orb/,
    /Rive animation/,
    /\[AppSidebar\] Checking module/,
    /\[Fast Refresh\]/
  ];
  
  // Create filtered console.debug
  console.debug = function(...args) {
    // Check if the first argument is a string and matches any noisy pattern
    if (typeof args[0] === 'string' && noisyPatterns.some(pattern => pattern.test(args[0]))) {
      // Skip logging this message
      return;
    }
    // Otherwise, pass through to original
    originalDebug.apply(console, args);
  };
  
  // Create filtered console.log for some patterns
  console.log = function(...args) {
    // Check if the first argument is a string and matches animation patterns
    if (typeof args[0] === 'string' && 
        (args[0].includes('animation') || args[0].includes('orb')) && 
        !args[0].includes('error')) {
      // Skip logging animation messages
      return;
    }
    // Otherwise, pass through to original
    originalLog.apply(console, args);
  };
}

// Default modules that generate a lot of noise and should be disabled by default
export const noisyModules = [
  'animation',    // Animation state updates
  'ui-updates',   // UI rendering updates
  'sidebar',      // Sidebar state updates
  'matching',     // Agent matching in sidebar
  'hot-reload',   // Hot reload messages
  'rive',         // Rive animation updates
];

// Initialize with sane defaults for development
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_NODE_ENV === 'development') {
  resetLoggingToDefaults();
  
  // Apply filters for extremely noisy logs
  applyLogFilters();
} 