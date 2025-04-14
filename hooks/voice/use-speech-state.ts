import { useState, useRef, useCallback } from 'react';
import type { ProcessingState } from '../use-elevenlabs-realtime';

/**
 * Hook for managing speech recognition state with synchronized React state and ref
 * This allows for both reactive UI updates and immediate state access in callbacks
 */
export function useSpeechState(initialState: ProcessingState = 'idle') {
  const [currentState, setCurrentState] = useState<ProcessingState>(initialState);
  const currentStateRef = useRef<ProcessingState>(initialState);
  
  // Create a synchronized setState function that updates both the React state and ref
  const setSyncedState = useCallback((newState: ProcessingState) => {
    currentStateRef.current = newState; // Update ref immediately for synchronous access
    setCurrentState(newState); // Update React state for UI updates
    console.log(`STATE CHANGE: ${currentState} -> ${newState}`);
  }, [currentState]);
  
  return {
    currentState,
    setSyncedState,
    currentStateRef
  };
} 