'use client';

import React, { useEffect } from 'react';
import { useRive, Layout, Fit, Alignment, useStateMachineInput } from 'rive-react';
import { useTheme } from 'next-themes';

interface RiveVoiceOrbProps {
  isListening: boolean;
  isThinking: boolean;
  isSpeaking: boolean;
  isWaiting?: boolean;
  isAsleep?: boolean;
  isUserSpeaking?: boolean;
  audioLevel?: number;
  onClick?: () => void;
}

const STATE_MACHINE_NAME = 'default';
const LISTENING_INPUT_NAME = 'listening';
const THINKING_INPUT_NAME = 'thinking';
const SPEAKING_INPUT_NAME = 'speaking';
const ASLEEP_INPUT_NAME = 'asleep';
const USER_SPEAKING_INPUT_NAME = 'user_speaking';
const COLOR_INPUT_NAME = 'color';
const VOLUME_INPUT_NAME = 'volume';

const RIVE_COLOR = {
    BLACK: 0,
    WHITE: 1,
} as const;

const RiveVoiceOrb: React.FC<RiveVoiceOrbProps> = ({ 
  isListening,
  isUserSpeaking,
  isThinking,
  isSpeaking,
  isWaiting = false,
  isAsleep = false,
  audioLevel = 0.5,
  onClick 
}) => {
  const { resolvedTheme } = useTheme(); 
  const { rive, RiveComponent } = useRive({
    src: '/halo.riv', 
    stateMachines: STATE_MACHINE_NAME,
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
    autoplay: true,
  });

  const listeningInput = useStateMachineInput(rive, STATE_MACHINE_NAME, LISTENING_INPUT_NAME);
  const thinkingInput = useStateMachineInput(rive, STATE_MACHINE_NAME, THINKING_INPUT_NAME);
  const speakingInput = useStateMachineInput(rive, STATE_MACHINE_NAME, SPEAKING_INPUT_NAME);
  const asleepInput = useStateMachineInput(rive, STATE_MACHINE_NAME, ASLEEP_INPUT_NAME);
  const userSpeakingInput = useStateMachineInput(rive, STATE_MACHINE_NAME, USER_SPEAKING_INPUT_NAME);
  const colorInput = useStateMachineInput(rive, STATE_MACHINE_NAME, COLOR_INPUT_NAME);
  const volumeInput = useStateMachineInput(rive, STATE_MACHINE_NAME, VOLUME_INPUT_NAME);

  useEffect(() => { 
    if (listeningInput) listeningInput.value = isListening && !isUserSpeaking; 
  }, [isListening, isUserSpeaking, listeningInput]);
  
  useEffect(() => { if (thinkingInput) thinkingInput.value = isThinking; }, [isThinking, thinkingInput]);
  useEffect(() => { if (speakingInput) speakingInput.value = isSpeaking; }, [isSpeaking, speakingInput]);
  
  useEffect(() => {
    if (userSpeakingInput) {
      userSpeakingInput.value = isUserSpeaking;
      
      if (isUserSpeaking && speakingInput) {
        speakingInput.value = true;
      }
    }
  }, [isUserSpeaking, userSpeakingInput, speakingInput]);
  
  useEffect(() => { 
    if (asleepInput) {
      asleepInput.value = isAsleep || isWaiting;
    }
  }, [isAsleep, isWaiting, asleepInput]);

  useEffect(() => {
    if (volumeInput) {
      const scaledLevel = isUserSpeaking 
        ? Math.max(0.3, Math.min(1.0, audioLevel * 2))
        : Math.max(0.2, Math.min(1.0, audioLevel));
          
      volumeInput.value = scaledLevel;
      
      if (isUserSpeaking) {
        console.log(`[Orb Audio] User speaking level: ${scaledLevel.toFixed(2)} (raw: ${audioLevel.toFixed(2)})`);
      }
    }
  }, [audioLevel, volumeInput, isUserSpeaking]);

  useEffect(() => {
    if (!rive || !resolvedTheme || !colorInput) return;

    const targetColorValue = resolvedTheme === 'dark' ? RIVE_COLOR.WHITE : RIVE_COLOR.BLACK;
    
    if (colorInput.value !== targetColorValue) {
        console.log(`Setting orb color for ${resolvedTheme} theme: Value=${targetColorValue}`);
        colorInput.value = targetColorValue;
    }

  }, [rive, resolvedTheme, colorInput]);

  return (
    <div 
      className="w-80 h-80 cursor-pointer"
      onClick={onClick} 
      aria-label="Voice interaction control"
      role="button"
      aria-pressed={isListening}
    >
      <RiveComponent className="w-full h-full" />
    </div>
  );
};

export default RiveVoiceOrb;
