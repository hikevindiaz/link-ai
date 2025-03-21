import fetch from 'node-fetch';

// Enhanced default settings for better voice quality
const DEFAULT_SETTINGS = {
  stability: 0.85,         // Increased for better consistency
  similarity_boost: 0.85,  // Increased for better voice matching
  style: 0,                // Default style
  use_speaker_boost: true  // Enhances voice clarity
};

export default async function handler(req, res) {
  const { voiceId } = req.query;

  if (!voiceId) {
    return res.status(400).json({ error: 'Voice ID is required' });
  }

  if (req.method === 'GET') {
    try {
      // First try to fetch the voice details to check if it exists
      const voiceResponse = await fetch(`https://api.elevenlabs.io/v1/voices/${voiceId}`, {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'User-Agent': 'OpenAssistantGPT/1.0'
        },
      });

      if (!voiceResponse.ok) {
        console.error(`Failed to fetch voice details for ${voiceId}: ${voiceResponse.status}`);
        // Return default settings instead of an error
        return res.status(200).json(DEFAULT_SETTINGS);
      }

      // Now try to fetch the voice settings
      const settingsResponse = await fetch(`https://api.elevenlabs.io/v1/voices/${voiceId}/settings`, {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'User-Agent': 'OpenAssistantGPT/1.0'
        },
      });

      if (!settingsResponse.ok) {
        console.error(`Failed to fetch voice settings for ${voiceId}: ${settingsResponse.status}`);
        // Return default settings instead of an error
        return res.status(200).json(DEFAULT_SETTINGS);
      }

      const settings = await settingsResponse.json();
      
      // Ensure all required properties exist with sensible defaults
      const enhancedSettings = {
        stability: typeof settings.stability === 'number' ? settings.stability : DEFAULT_SETTINGS.stability,
        similarity_boost: typeof settings.similarity_boost === 'number' ? settings.similarity_boost : DEFAULT_SETTINGS.similarity_boost,
        style: typeof settings.style === 'number' ? settings.style : DEFAULT_SETTINGS.style,
        use_speaker_boost: typeof settings.use_speaker_boost === 'boolean' ? settings.use_speaker_boost : DEFAULT_SETTINGS.use_speaker_boost
      };
      
      res.status(200).json(enhancedSettings);
    } catch (error) {
      console.error('Error fetching voice settings:', error);
      // Return default settings instead of an error
      res.status(200).json(DEFAULT_SETTINGS);
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 