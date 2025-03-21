'use client'

import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, MicOff, Volume2 } from 'lucide-react';
import GradientAgentSphere from './gradientagentsphere';

interface VoiceChatInterfaceProps {
  onClose: () => void;
  textColor?: string;
  backgroundColor?: string;
  borderGradientColors?: string[];
  gradientColors?: string[];
  chatbotName?: string;
}

interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

export default function VoiceChatInterface({
  onClose,
  textColor = "#FFFFFF",
  backgroundColor = "#000000",
  borderGradientColors = ["#2563EB", "#7E22CE", "#F97316"],
  gradientColors = ["#022597", "#000001", "#1a56db"],
  chatbotName = "Link AI"
}: VoiceChatInterfaceProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [currentResponse, setCurrentResponse] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversation, setConversation] = useState<ConversationTurn[]>([]);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [hasWelcomed, setHasWelcomed] = useState(false);
  const [isWelcomeComplete, setIsWelcomeComplete] = useState(false);
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);
  
  const sphereRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const welcomePlayedRef = useRef(false);

  // Create gradient colors for conic gradient (border)
  const [color1, color2, color3] = borderGradientColors;
  const conicGradient = `conic-gradient(from var(--border-angle), ${color1}, ${color2}, ${color3}, ${color2}, ${color1})`;

  // Request microphone permission on component mount
  useEffect(() => {
    const checkMicrophonePermission = async () => {
      try {
        // Request microphone access immediately when component mounts
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        setHasMicPermission(true);
        
        // Initialize speech recognition after getting permission
        initializeSpeechRecognition();
      } catch (err) {
        console.error('Error accessing microphone:', err);
        setHasMicPermission(false);
        setError('Could not access your microphone. Please check your browser permissions and try again.');
      }
    };
    
    checkMicrophonePermission();
    
    return () => {
      // Clean up microphone stream on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Initialize audio context and prepare for voice interaction
  useEffect(() => {
    console.log("Component mounted, setting isClosing to false");
    setIsClosing(false); // Ensure isClosing is false on mount
    
    // Create audio element for playback
    const audioElement = new Audio();
    audioElement.addEventListener('ended', () => {
      setIsSpeaking(false);
      setIsAnimating(false);
    });
    audioElementRef.current = audioElement;

    // Create AudioContext
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      setAudioContext(context);
    } catch (err) {
      setError('Your browser does not support the Web Audio API. Please try a different browser.');
    }

    // Start conversation with a welcome message (only once)
    setTimeout(() => {
      if (!welcomePlayedRef.current) {
        console.log("Playing welcome message");
        setIsSpeaking(true);
        setIsAnimating(true);
        const welcomeMessage = "Hi there! I'm your AI assistant. How can I help you today?";
        setConversation([{ role: 'assistant', content: welcomeMessage }]);
        setCurrentResponse(welcomeMessage);
        speakText(welcomeMessage)
          .then(() => {
            setIsWelcomeComplete(true);
            setIsSpeaking(false);
            setIsAnimating(false);
          })
          .catch((err) => {
            console.error("Error playing welcome message:", err);
            setIsWelcomeComplete(true);
            setIsSpeaking(false);
            setIsAnimating(false);
          });
        welcomePlayedRef.current = true;
      }
    }, 500);

    return () => {
      console.log("Component unmounting, cleaning up resources");
      // Clean up
      setIsClosing(true);
      
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.src = '';
      }
      
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors when stopping recognition
        }
      }
      
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      
      if (audioContext) {
        audioContext.close();
      }
      
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Initialize Web Speech API for recognition
  const initializeSpeechRecognition = () => {
    try {
      // Check for browser support with more detailed logging
      console.log("Checking speech recognition support...");
      const SpeechRecognition = window.SpeechRecognition || 
                               (window as any).webkitSpeechRecognition || 
                               (window as any).mozSpeechRecognition || 
                               (window as any).msSpeechRecognition;
      
      console.log("SpeechRecognition API available:", !!SpeechRecognition);
      
      if (SpeechRecognition) {
        console.log("Creating new SpeechRecognition instance");
        const recognition = new SpeechRecognition();
        
        // Log the recognition object to verify it was created correctly
        console.log("Recognition instance created:", recognition);
        
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        recognition.onstart = () => {
          console.log('Speech recognition has started');
          setIsListening(true);
        };
        
        recognition.onresult = (event: any) => {
          console.log('Speech recognition result received', event);
          const result = event.results[0];
          const transcriptText = result[0].transcript;
          setTranscript(transcriptText);
          
          if (result.isFinal) {
            stopListening();
            processUserInput(transcriptText);
          }
        };
        
        recognition.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          console.log('Speech recognition error details:', event);
          setError(`Speech recognition error: ${event.error}`);
          setIsListening(false);
          recognitionRef.current = null;
        };
        
        recognition.onend = () => {
          console.log('Speech recognition ended');
          setIsListening(false);
          recognitionRef.current = null;
        };
        
        recognitionRef.current = recognition;
      } else {
        console.warn('Speech Recognition API not found in this browser');
        setError('Speech recognition is not supported in your browser. Please try Chrome or Edge.');
      }
    } catch (err) {
      console.error('Error initializing speech recognition:', err);
      setError('Could not initialize speech recognition. Please try a different browser.');
    }
  };

  // Handle component closing
  const handleClose = () => {
    setIsClosing(true);
    
    // Stop all audio processes
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore errors when stopping recognition
      }
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    // Call the onClose callback
    onClose();
  };

  // Function to toggle listening state
  const toggleListening = async () => {
    console.log('toggleListening called. isListening:', isListening);
    if (isListening) {
      stopListening();
    } else {
      await startListening();
    }
  };

  // Function to start listening
  const startListening = async () => {
    console.log("startListening called with states:", {
      isSpeaking,
      isProcessing,
      isClosing,
      hasMicPermission
    });
    
    // If isClosing is true but we're trying to start listening, something is wrong
    // Let's reset it to false and continue
    if (isClosing) {
      console.log("WARNING: isClosing was true when trying to start listening. Resetting to false.");
      setIsClosing(false);
    }
    
    if (isSpeaking || isProcessing || isClosing) return;

    setError(null);

    // Ensure microphone permission is granted
    if (!hasMicPermission) {
      try {
        console.log("Requesting microphone permission...");
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        setHasMicPermission(true);
        console.log("Microphone permission granted");
      } catch (err) {
        console.error('Error accessing microphone:', err);
        setError('Could not access your microphone. Please check your browser permissions.');
        return;
      }
    }

    // For testing purposes, always use MediaRecorder fallback
    console.log("TESTING MODE: Always using MediaRecorder fallback");
    setTranscript('Listening...');
    useMediaRecorderFallback();
  };

  // Extract MediaRecorder fallback to a separate function for reuse
  const useMediaRecorderFallback = () => {
    console.log("Starting MediaRecorder fallback...");
    
    // Double-check isClosing state before proceeding
    if (isClosing) {
      console.log("Cannot start MediaRecorder because isClosing is true");
      return;
    }
    
    // Set listening state immediately for UI feedback
    setIsListening(true);
    
    // TESTING MODE: Simulate recording without actually using MediaRecorder
    const useFakeRecording = true; // Set to false to use real MediaRecorder
    
    if (useFakeRecording) {
      console.log("Using fake recording for testing");
      
      // Create a flag to track if this recording session was cancelled
      let isCancelled = false;
      
      // Simulate recording for 3 seconds then process a fake response
      const recordingTimeout = setTimeout(() => {
        if (isCancelled) {
          console.log("Fake recording was cancelled");
          return;
        }
        
        console.log("Fake recording complete, simulating audio processing");
        setIsListening(false);
        
        // Simulate processing delay
        const processingTimeout = setTimeout(async () => {
          if (isCancelled) {
            console.log("Fake processing was cancelled");
            return;
          }
          
          // Use a simulated transcript
          const simulatedTranscript = "This is a test message from the simulated recording.";
          console.log("Simulated transcript:", simulatedTranscript);
          setTranscript(simulatedTranscript);
          
          // Process the simulated transcript
          await processUserInput(simulatedTranscript);
        }, 500);
        
        // Clean up the processing timeout if component unmounts
        return () => {
          clearTimeout(processingTimeout);
          isCancelled = true;
        };
      }, 3000);
      
      // Clean up the recording timeout if component unmounts
      return () => {
        clearTimeout(recordingTimeout);
        isCancelled = true;
      };
      
      return; // Skip the real MediaRecorder implementation
    }
    
    // Real MediaRecorder implementation (only used if useFakeRecording is false)
    audioChunksRef.current = [];
    if (streamRef.current) {
      console.log('Initializing MediaRecorder fallback...');
      
      try {
        const mediaRecorder = new MediaRecorder(streamRef.current);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.addEventListener('dataavailable', (event) => {
          console.log('MediaRecorder data available', event.data.size);
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        });

        mediaRecorder.addEventListener('stop', async () => {
          console.log('MediaRecorder stopped, processing audio...');
          if (audioChunksRef.current.length > 0) {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            console.log('Audio blob created, size:', audioBlob.size);
            await processAudio(audioBlob);
          } else {
            console.warn('No audio data collected');
            setError('No audio was recorded. Please try again.');
            setIsListening(false);
          }
        });

        console.log('Starting MediaRecorder...');
        mediaRecorder.start();

        // Automatically stop recording after 10 seconds if user doesn't stop it
        setTimeout(() => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording' && !isClosing) {
            console.log('Auto-stopping MediaRecorder after timeout');
            stopListening();
          }
        }, 10000);
      } catch (err) {
        console.error('Error initializing MediaRecorder:', err);
        setError('Could not initialize audio recording. Please try a different browser.');
        setIsListening(false);
      }
    } else {
      console.error('No media stream available for MediaRecorder');
      setError('Microphone access is required. Please allow microphone access and try again.');
      setIsListening(false);
    }
  };

  // Function to stop listening
  const stopListening = () => {
    setIsListening(false);
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore errors when stopping recognition
      }
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  // Function to process recorded audio (fallback method)
  const processAudio = async (audioBlob: Blob) => {
    try {
      console.log('Processing audio blob of size:', audioBlob.size);
      
      // For testing purposes, we'll simulate a successful transcription
      // In a production environment, you would send this to your backend
      console.log('Simulating successful transcription for testing');
      
      // Simulate a short processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Use a simulated transcript
      const simulatedTranscript = "This is a simulated transcript for testing purposes.";
      setTranscript(simulatedTranscript);
      
      // Process the simulated transcript
      await processUserInput(simulatedTranscript);
      
    } catch (err) {
      console.error('Error processing audio:', err);
      setError('Error processing your speech. Please try again.');
      setIsListening(false);
    }
  };

  // Function to transcribe audio using Deepgram (fallback method)
  const transcribeAudio = async (audioData: string) => {
    try {
      console.log('Transcribing audio data...');
      // In a real implementation, you would call your backend API that interfaces with Deepgram
      // For now, we'll simulate with a timeout
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate successful transcription
      const simulatedTranscript = "This is a simulated transcript from the transcribeAudio function.";
      console.log('Simulated transcript:', simulatedTranscript);
      setTranscript(simulatedTranscript);
      
      // Process the transcript
      await processUserInput(simulatedTranscript);
      
    } catch (err) {
      console.error('Error transcribing audio:', err);
      setError('Error transcribing your speech. Please try again.');
      setIsListening(false);
    }
  };

  // Function to process user input
  const processUserInput = async (userInput: string) => {
    if (!userInput.trim() || isClosing) return;
    
    setIsProcessing(true);
    
    // Add user message to conversation
    const updatedConversation = [
      ...conversation,
      { role: 'user' as const, content: userInput }
    ];
    setConversation(updatedConversation);
    
    // Generate AI response
    await generateAIResponse(updatedConversation);
  };

  // Function to generate AI response using OpenAI with streaming
  const generateAIResponse = async (conversationHistory: ConversationTurn[]) => {
    try {
      setIsSpeaking(true);
      setIsAnimating(true);
      setCurrentResponse('');
      
      // In a real implementation, you would call your backend API that interfaces with OpenAI
      // and use streaming to get tokens as they're generated
      
      // For demo purposes, we'll simulate streaming with chunks
      const aiResponseChunks = [
        "I'm your AI assistant. ",
        "I can help you with information, ",
        "answer questions, ",
        "or assist with various tasks. ",
        "What would you like to know or discuss today?"
      ];
      
      let fullResponse = '';
      let audioQueue: string[] = [];
      
      // Process each chunk with a delay to simulate streaming
      for (let i = 0; i < aiResponseChunks.length; i++) {
        if (isClosing) break;
        
        // Add chunk to full response
        fullResponse += aiResponseChunks[i];
        setCurrentResponse(fullResponse);
        
        // Add chunk to audio queue
        audioQueue.push(aiResponseChunks[i]);
        
        // If this is the first chunk or we've accumulated enough chunks, start speaking
        if (i === 0 || (i % 2 === 0 && i > 0)) {
          const textToSpeak = audioQueue.join('');
          audioQueue = [];
          
          // Speak the accumulated text
          if (i === 0) {
            // For the first chunk, wait for speech to start
            await speakText(textToSpeak);
          } else {
            // For subsequent chunks, don't wait
            speakText(textToSpeak, false);
          }
        }
        
        // Simulate delay between chunks
        if (i < aiResponseChunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      // Speak any remaining chunks
      if (audioQueue.length > 0 && !isClosing) {
        speakText(audioQueue.join(''), false);
      }
      
      // Add assistant response to conversation
      setConversation([
        ...conversationHistory,
        { role: 'assistant' as const, content: fullResponse }
      ]);
      
      setIsProcessing(false);
      
    } catch (err) {
      console.error('Error generating AI response:', err);
      setError('Error generating AI response. Please try again.');
      setIsSpeaking(false);
      setIsAnimating(false);
      setIsProcessing(false);
      
      // Auto-restart listening after error
      if (!isClosing && hasMicPermission) {
        setTimeout(() => {
          startListening();
        }, 1000);
      }
    }
  };

  // Function to synthesize speech using ElevenLabs TTS API
  const speakText = async (text: string, waitForEnd = true): Promise<void> => {
    if (!text.trim() || isClosing) return Promise.resolve();
    return new Promise(async (resolve, reject) => {
      try {
        const response = await fetch('/api/elevenlabs/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voice: 'elevenlabs-female' })
        });
        if (!response.ok) {
          console.error('Error fetching ElevenLabs audio:', response.statusText);
          resolve();
          return;
        }
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        if (audioElementRef.current) {
          audioElementRef.current.src = audioUrl;
          if (waitForEnd) {
            const handler = () => {
              audioElementRef.current?.removeEventListener('ended', handler);
              resolve();
            };
            audioElementRef.current.addEventListener('ended', handler);
          }
          audioElementRef.current.play();
          if (!waitForEnd) {
            resolve();
          }
        } else {
          // Fallback: create a new Audio instance
          const audio = new Audio(audioUrl);
          audio.onended = () => {
            setIsSpeaking(false);
            setIsAnimating(false);
            resolve();
          };
          audio.onerror = (err) => {
            console.error('ElevenLabs audio playback error:', err);
            resolve();
          };
          audio.play();
          if (!waitForEnd) {
            resolve();
          }
        }
      } catch (err) {
        console.error('Error in ElevenLabs speakText:', err);
        resolve();
      }
    });
  };

  // Effect for sphere animation during speaking
  useEffect(() => {
    if (!sphereRef.current) return;
    
    let animationFrame: number;
    let scale = 1;
    let growing = true;
    
    const animate = () => {
      if (!isAnimating || !sphereRef.current) return;
      
      if (growing) {
        scale += 0.003;
        if (scale >= 1.1) growing = false;
      } else {
        scale -= 0.003;
        if (scale <= 0.95) growing = true;
      }
      
      sphereRef.current.style.transform = `scale(${scale})`;
      animationFrame = requestAnimationFrame(animate);
    };
    
    if (isAnimating) {
      animationFrame = requestAnimationFrame(animate);
    } else if (sphereRef.current) {
      sphereRef.current.style.transform = 'scale(1)';
    }
    
    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [isAnimating]);

  // Effect to initialize speech synthesis voices
  useEffect(() => {
    // Load voices
    const loadVoices = () => {
      window.speechSynthesis.getVoices();
    };
    
    loadVoices();
    
    // Chrome needs this event to load voices
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    
    return () => {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Determine the status message to display
  const getStatusMessage = () => {
    if (error) return error;
    if (isListening) return "Listening...";
    if (isProcessing) return "Processing...";
    if (isSpeaking) return currentResponse;
    if (transcript) return transcript;
    if (!hasMicPermission) return "Please allow microphone access to continue";
    return "Click the microphone to start speaking";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div 
        className="relative animate-border rounded-xl p-[1px] shadow-xl w-full max-w-md mx-4"
        style={{ 
          background: conicGradient
        }}
      >
        <div 
          className="relative rounded-[10px] p-6 flex flex-col items-center"
          style={{ backgroundColor }}
        >
          {/* Close button */}
          <button 
            onClick={handleClose}
            className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-gray-800 transition-colors"
          >
            <X size={20} color={textColor} />
          </button>
          
          {/* Gradient Sphere */}
          <div 
            ref={sphereRef}
            className="transition-transform duration-200 mb-8"
          >
            <GradientAgentSphere size={180} gradientColors={gradientColors} />
          </div>
          
          {/* Status Text */}
          <div className="min-h-16 text-center mb-6 max-w-xs">
            {error ? (
              <p className="text-red-400">{error}</p>
            ) : (
              <div className="flex items-center gap-2 justify-center">
                {isSpeaking && <Volume2 size={20} color={textColor} className="animate-pulse flex-shrink-0" />}
                {isListening && <Mic size={20} color={textColor} className="animate-pulse flex-shrink-0" />}
                <p style={{ color: textColor }}>{getStatusMessage()}</p>
              </div>
            )}
          </div>
          
          {/* Microphone Button */}
          <button
            onClick={toggleListening}
            disabled={isSpeaking || isProcessing || !hasMicPermission}
            className={`
              animate-border rounded-full p-[1px] transition-transform 
              ${!(isSpeaking || isProcessing || !hasMicPermission) ? 'hover:scale-[1.05] active:scale-[0.98]' : 'opacity-50 cursor-not-allowed'}
            `}
            style={{ 
              background: conicGradient
            }}
          >
            <div 
              className="flex items-center justify-center w-16 h-16 rounded-full"
              style={{ backgroundColor }}
            >
              {isListening ? (
                <MicOff size={28} color={textColor} className="animate-pulse" />
              ) : (
                <Mic size={28} color={textColor} />
              )}
            </div>
          </button>
          
          {/* Microphone Permission Button - Only show if permission is denied */}
          {hasMicPermission === false && (
            <button
              onClick={async () => {
                try {
                  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                  streamRef.current = stream;
                  setHasMicPermission(true);
                  initializeSpeechRecognition();
                  setError(null);
                } catch (err) {
                  setError('Microphone access denied. Please enable it in your browser settings.');
                }
              }}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            >
              Allow Microphone Access
            </button>
          )}
          
          {/* Powered by text */}
          <div className="mt-6 text-xs opacity-70" style={{ color: textColor }}>
            Powered by Link AI
          </div>
        </div>
      </div>
      
      {/* CSS for border animation */}
      <style jsx global>{`
        @property --border-angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        
        @keyframes border {
          to {
            --border-angle: 360deg;
          }
        }
        
        .animate-border {
          animation: border 4s linear infinite;
        }
      `}</style>
    </div>
  );
} 