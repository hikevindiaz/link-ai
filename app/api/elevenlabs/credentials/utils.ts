/**
 * Utility functions for handling ElevenLabs API credentials
 */

interface ElevenlabsCredentials {
  apiKey: string | null;
}

/**
 * Gets the ElevenLabs API key from environment variables
 * @returns Object containing the API key
 */
export async function getElevenlabsCredentials(): Promise<ElevenlabsCredentials> {
  // Get the API key from environment variables
  const apiKey = process.env.ELEVENLABS_API_KEY || null;

  if (!apiKey) {
    console.error('ElevenLabs API key not found in environment variables');
  }

  return { apiKey };
} 