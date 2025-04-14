import { useState, useEffect, useRef, useCallback } from 'react';

// Constants
const STT_REST_API_URL = '/api/openai/stt';
const STT_MODEL = 'gpt-4o-mini-transcribe';

interface UseOpenAiSpeechRecognitionProps {
  onTranscriptReceived: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
}

export function useOpenAiSpeechRecognition({
  onTranscriptReceived,
  onError
}: UseOpenAiSpeechRecognitionProps) {
  const [isApiKeyLoading, setIsApiKeyLoading] = useState<boolean>(true);
  const sttRequestInProgressRef = useRef<boolean>(false);
  
  // Load API key on mount
  useEffect(() => {
    let isMounted = true;
    let apiKeyCheckAttempted = false; // Add flag to prevent repeated API calls
    
    const checkApiKey = async () => {
      // Only try to check once per component lifecycle
      if (apiKeyCheckAttempted) return;
      apiKeyCheckAttempted = true;
      
      try {
        // We just need to verify the API key exists, but we don't need to store it
        // It's handled by the API endpoint
        const response = await fetch('/api/openai/check-api-key');
        
        if (!isMounted) return;
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API key validation failed: ${response.status} ${errorText}`);
        }
        
        setIsApiKeyLoading(false);
      } catch (err: any) {
        if (!isMounted) return;
        console.error("Error checking OpenAI API key:", err);
        onError?.(`Failed to access OpenAI: ${err.message}`);
        setIsApiKeyLoading(false); // Still set to false so the app can continue
      }
    };
    
    checkApiKey();
    
    return () => {
      isMounted = false;
    };
  }, []); // Remove onError from dependencies to avoid re-fetching
  
  // Process audio blob and send to OpenAI for transcription
  const processAudioBlob = useCallback(async (audioBlob: Blob) => {
    if (sttRequestInProgressRef.current) return;
    
    try {
      sttRequestInProgressRef.current = true;
      
      console.log("Starting OpenAI speech recognition processing");
      
      // Create form data with the audio
      const formData = new FormData();
      
      // Get the actual MIME type from the blob
      const actualType = audioBlob.type || 'audio/webm';
      
      // Choose proper filename extension based on MIME type
      let filename = 'audio';
      if (actualType.includes('webm')) filename += '.webm';
      else if (actualType.includes('mp4')) filename += '.mp4';
      else if (actualType.includes('wav')) filename += '.wav';
      else if (actualType.includes('ogg')) filename += '.ogg';
      else filename += '.webm'; // Default to webm
      
      console.log(`Sending audio for OpenAI STT processing with type ${actualType} as ${filename}`, { 
        size: audioBlob.size, 
        type: audioBlob.type 
      });
      
      // Append with correct filename
      formData.append('file', audioBlob, filename);
      formData.append('model', STT_MODEL);
      formData.append('response_format', 'json');
      
      // Send to our OpenAI STT proxy endpoint
      const response = await fetch(STT_REST_API_URL, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        let errorMsg = '';
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorData.details || `Status ${response.status}`;
        } catch (e) {
          errorMsg = `Status ${response.status}: ${response.statusText}`;
        }
        throw new Error(`OpenAI STT API error: ${errorMsg}`);
      }
      
      const result = await response.json();
      
      // Process the transcription result - OpenAI returns { text: "transcript" }
      if (result.text && result.text.trim()) {
        console.log("OpenAI STT Result:", result.text);
        
        // Send the transcript to the parent component
        onTranscriptReceived(result.text, true);
      } else {
        console.log("No valid text from OpenAI STT");
        onTranscriptReceived("", true); // Send empty string as final to trigger state change
      }
      
    } catch (error) {
      console.error('Error processing speech with OpenAI:', error);
      onError?.(`Speech recognition error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      sttRequestInProgressRef.current = false;
    }
  }, [onTranscriptReceived, onError]);
  
  return {
    isApiKeyLoading,
    processAudioBlob
  };
} 