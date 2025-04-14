import { useState, useEffect, useRef, useCallback } from 'react';

// Constants
const AUDIO_BIT_RATE = 128 * 1024; // 128 kbps
const AUDIO_SAMPLE_RATE = 16000; // 16 kHz for STT
const MIN_AUDIO_SIZE_BYTES = 10000; // Minimum audio size (10KB)
const MIN_RECORDING_TIME_MS = 2000; // Minimum recording time (2 seconds)
const SILENCE_THRESHOLD = 0.03; // Threshold for silence detection
const SILENCE_DURATION_MS = 1500; // Duration of silence to trigger auto-stop (1.5s)
const SPEECH_TIMEOUT_MS = 15000; // Maximum duration for a single speech recording (15s)

interface UseAudioRecordingProps {
  onAudioReady: (audioBlob: Blob) => void;
  onAudioLevelChange?: (level: number) => void;
  onSilenceDetected?: () => void;
  onSpeechDetected?: () => void;
  onError?: (error: string) => void;
}

export function useAudioRecording({
  onAudioReady,
  onAudioLevelChange,
  onSilenceDetected,
  onSpeechDetected,
  onError
}: UseAudioRecordingProps) {
  const [currentAudioLevel, setCurrentAudioLevel] = useState<number>(0);
  
  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isRecordingRef = useRef<boolean>(false);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Clean up audio recording resources
  const cleanupAudioRecording = useCallback(() => {
    // Stop any existing timeouts
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    
    // Stop MediaRecorder & release mic
    if (mediaRecorderRef.current) {
      try {
        // Clean up silence detection resources
        if ((mediaRecorderRef.current as any).silenceDetection) {
          const { interval, context, audioLevelCheck } = (mediaRecorderRef.current as any).silenceDetection;
          if (interval) clearInterval(interval);
          if (audioLevelCheck) audioLevelCheck();
          if (context) context.close().catch(e => console.warn("Error closing audio context:", e));
        }
        
        // Stop MediaRecorder if it's recording
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
        
        // Release microphone tracks
        mediaRecorderRef.current.stream?.getTracks().forEach(track => track.stop());
      } catch (e) {
        console.warn("Error stopping MediaRecorder or tracks:", e);
      }
      mediaRecorderRef.current = null;
    }
    
    // Reset audio level
    setCurrentAudioLevel(0);
    
    // Reset audio chunks
    audioChunksRef.current = [];
    isRecordingRef.current = false;
  }, []);
  
  // Set up audio recording
  const setupAudioRecording = useCallback(async () => {
    // Clean up any existing recording first
    cleanupAudioRecording();
    
    console.log("Setting up audio recording...");
    
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true, 
          noiseSuppression: true, 
          autoGainControl: true 
        } 
      });
      
      // Set up audio analyzer for silence detection
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContext();
      
      // Ensure the audio context is running (it may be suspended due to browser autoplay policies)
      if (audioContext.state === 'suspended') {
        try {
          await audioContext.resume();
          console.log("AudioContext resumed successfully");
        } catch (error) {
          console.warn("Failed to resume AudioContext:", error);
          if (onError) onError("Audio system suspended. Try clicking anywhere on the page.");
        }
      }
      
      const audioSource = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      audioSource.connect(analyser);
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      let silenceStartTime: number | null = null;
      let speechTimeoutId: NodeJS.Timeout | null = null;
      let isSpeakingRef = { current: false };
      let audioLevelTimeout: number | null = null;
      
      // Function to check audio levels and update state
      const checkAudioLevels = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const normalized = average / 255; // Normalize to 0-1
        
        // Send the audio level update
        setCurrentAudioLevel(normalized);
        if (onAudioLevelChange) {
          onAudioLevelChange(normalized);
        }
        
        // Schedule the next check
        audioLevelTimeout = window.setTimeout(checkAudioLevels, 50); // 20 times per second
      };
      
      // Start checking audio levels
      checkAudioLevels();
      
      // Function to check if audio is silent
      const checkSilence = () => {
        if (!isRecordingRef.current) return;
        
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const normalized = average / 255; // Normalize to 0-1
        
        // If audio is silent and we were speaking, start silence timer
        if (normalized < SILENCE_THRESHOLD && isSpeakingRef.current) {
          if (silenceStartTime === null) {
            silenceStartTime = Date.now();
          } else if (Date.now() - silenceStartTime > SILENCE_DURATION_MS) {
            // Silence longer than threshold, stop recording
            console.log('Auto-stopping recording due to silence', { silenceDuration: Date.now() - silenceStartTime });
            silenceStartTime = null;
            isSpeakingRef.current = false;
            
            if (speechTimeoutId) {
              clearTimeout(speechTimeoutId);
              speechTimeoutId = null;
            }
            
            // Only stop if we are recording and have enough audio
            if (mediaRecorderRef.current?.state === 'recording') {
              mediaRecorderRef.current.stop();
              
              // Notify parent of silence detection
              onSilenceDetected?.();
            }
          }
        } 
        // If audio is not silent, reset silence timer and set speaking flag
        else if (normalized >= SILENCE_THRESHOLD) {
          silenceStartTime = null;
          
          // If we weren't speaking before, start speech timeout
          if (!isSpeakingRef.current) {
            isSpeakingRef.current = true;
            console.log('Voice activity detected');
            
            // Notify parent of speech detection
            onSpeechDetected?.();
            
            // Set speech timeout (max duration of a single utterance)
            if (speechTimeoutId) clearTimeout(speechTimeoutId);
            speechTimeoutId = setTimeout(() => {
              console.log('Auto-stopping recording due to maximum speech duration', { maxDuration: SPEECH_TIMEOUT_MS });
              if (mediaRecorderRef.current?.state === 'recording') {
                mediaRecorderRef.current.stop();
                onSilenceDetected?.();
              }
            }, SPEECH_TIMEOUT_MS);
          }
        }
      };
      
      // Set up periodic silence check
      const silenceCheckInterval = setInterval(checkSilence, 100); // Check every 100ms
      
      // Store functions for cleanup
      const silenceDetectionRef = { 
        interval: silenceCheckInterval, 
        context: audioContext,
        audioLevelCheck: () => {
          if (audioLevelTimeout) {
            window.clearTimeout(audioLevelTimeout);
            audioLevelTimeout = null;
          }
        }
      };
      
      // Create media recorder
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: AUDIO_BIT_RATE
      });
      
      // Track recording start time for minimum duration check
      let recordingStartTime = 0;
      let totalAudioSize = 0;
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          totalAudioSize += event.data.size;
          console.log(`Received audio chunk: ${event.data.size} bytes (total: ${totalAudioSize} bytes)`);
        }
      };
      
      mediaRecorderRef.current.onstart = () => {
        console.log('MediaRecorder started.');
        audioChunksRef.current = []; // Clear previous chunks
        isRecordingRef.current = true;
        recordingStartTime = Date.now();
        totalAudioSize = 0;
      };
      
      mediaRecorderRef.current.onstop = () => {
        console.log('MediaRecorder stopped.');
        isRecordingRef.current = false;
        
        // Reset silence detection
        silenceStartTime = null;
        if (speechTimeoutId) {
          clearTimeout(speechTimeoutId);
          speechTimeoutId = null;
        }
        
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
          console.log(`Total audio collected: ${audioBlob.size} bytes`);
          
          // Only process if enough audio data and minimum recording time
          const recordingDuration = Date.now() - recordingStartTime;
          const hasMinSize = audioBlob.size >= MIN_AUDIO_SIZE_BYTES;
          const hasMinDuration = recordingDuration >= MIN_RECORDING_TIME_MS;
          
          if (hasMinSize && hasMinDuration) {
            console.log(`Audio meets requirements: size=${audioBlob.size}B, duration=${recordingDuration}ms`);
            onAudioReady(audioBlob);
          } else {
            console.log('Audio too short, not processing', { 
              size: audioBlob.size,
              minSize: MIN_AUDIO_SIZE_BYTES,
              duration: recordingDuration,
              minDuration: MIN_RECORDING_TIME_MS
            });
          }
        }
      };
      
      mediaRecorderRef.current.onerror = (event: Event) => {
        console.error('MediaRecorder error:', (event as any).error || event);
        onError?.('Microphone recording error.');
        cleanupAudioRecording();
      };
      
      // Store the silence detection refs for cleanup
      (mediaRecorderRef.current as any).silenceDetection = silenceDetectionRef;
      
      console.log("Audio recording setup complete");
      
    } catch (err: any) {
      console.error("Error accessing microphone:", err);
      onError?.(`Microphone access failed: ${err.message}`);
    }
  }, [cleanupAudioRecording, onAudioLevelChange, onAudioReady, onError, onSilenceDetected, onSpeechDetected]);
  
  // Start recording function
  const startRecording = useCallback(() => {
    if (!mediaRecorderRef.current) {
      console.warn("MediaRecorder not set up. Setting up now...");
      // Set up audio recording first
      setupAudioRecording().then(() => {
        // Then start recording with a short delay
        setTimeout(() => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'recording') {
            console.log("Starting recording after setup");
            mediaRecorderRef.current.start(500); // Collect chunks every 500ms
          }
        }, 100);
      });
      return;
    }
    
    if (mediaRecorderRef.current.state !== 'recording') {
      console.log("Starting recording...");
      mediaRecorderRef.current.start(500); // Collect chunks every 500ms
    } else {
      console.log("Recording already in progress");
    }
  }, [setupAudioRecording]);
  
  // Stop recording function
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      console.log("Stopping recording...");
      mediaRecorderRef.current.stop();
    } else {
      console.log("No active recording to stop");
    }
  }, []);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanupAudioRecording();
    };
  }, [cleanupAudioRecording]);
  
  return {
    startRecording,
    stopRecording,
    setupAudioRecording,
    cleanupAudioRecording,
    currentAudioLevel,
    isRecording: isRecordingRef.current
  };
} 