// Simple logging utility for debugging widget and channel components
// Set this to true to enable debugging or false to disable it
const DEBUG_ENABLED = false;

// Logger for widget and channel components
export const logger = {
  /**
   * Log a debug message (only shown when DEBUG_ENABLED is true)
   * @param component Component name
   * @param message Message to log
   * @param data Optional data to log
   */
  debug: (component: string, message: string, data?: any) => {
    if (DEBUG_ENABLED) {
      console.debug(`[${component}] ${message}`, data || '');
    }
  },

  /**
   * Log an info message
   * @param component Component name
   * @param message Message to log
   * @param data Optional data to log
   */
  info: (component: string, message: string, data?: any) => {
    console.info(`[${component}] ${message}`, data || '');
  },

  /**
   * Log a warning message
   * @param component Component name
   * @param message Message to log
   * @param data Optional data to log
   */
  warn: (component: string, message: string, data?: any) => {
    console.warn(`[${component}] ${message}`, data || '');
  },

  /**
   * Log an error message
   * @param component Component name
   * @param message Message to log
   * @param error Error object or message
   */
  error: (component: string, message: string, error?: any) => {
    console.error(`[${component}] ${message}`, error || '');
  },

  /**
   * Group logs together for a component
   * @param component Component name
   * @param label Group label
   * @param callback Function to execute within the group
   */
  group: (component: string, label: string, callback: () => void) => {
    if (DEBUG_ENABLED) {
      console.group(`[${component}] ${label}`);
      callback();
      console.groupEnd();
    } else {
      callback();
    }
  },

  /**
   * Track component lifecycle events
   * @param component Component name
   * @param event Lifecycle event (mount, update, unmount)
   * @param data Optional data to log
   */
  lifecycle: (component: string, event: 'mount' | 'update' | 'unmount', data?: any) => {
    if (DEBUG_ENABLED) {
      console.log(`[${component}] Lifecycle: ${event}`, data || '');
    }
  }
}; 