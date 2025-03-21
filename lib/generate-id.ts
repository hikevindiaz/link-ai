import { customAlphabet } from 'nanoid/non-secure';

/**
 * Generates a 7-character random string to use for IDs. Not secure.
 */
export const generateId = customAlphabet(
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  7,
);

/**
 * Simple UUID generation function
 * This provides a basic implementation to avoid build errors
 */
export function generateUUID(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

// Export a default function for CommonJS compatibility
export default generateUUID;