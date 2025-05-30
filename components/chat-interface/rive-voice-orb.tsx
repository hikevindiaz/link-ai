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
  isPreview?: boolean;
  previewColorValue?: number;
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
  RED: 2,
  ORANGE: 3,
  YELLOW: 4,
  GREEN: 5,
  CYAN: 6,
  BLUE: 7,
  PURPLE: 8,
  PINK: 9,
} as const;

const RiveVoiceOrb: React.FC<RiveVoiceOrbProps> = ({ 
  isListening,
  isUserSpeaking,
  isThinking,
  isSpeaking,
  isWaiting = false,
  isAsleep = false,
  audioLevel = 0.5,
  onClick,
  isPreview = false,
  previewColorValue
}) => {
  const { resolvedTheme } = useTheme(); 
  const { rive, RiveComponent } = useRive({
    src: '/halo.riv', 
    stateMachines: STATE_MACHINE_NAME,
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
    autoplay: true,
    onLoad: () => {
      console.log("Rive animation loaded");
    }
  });

  const listeningInput = useStateMachineInput(rive, STATE_MACHINE_NAME, LISTENING_INPUT_NAME);
  const thinkingInput = useStateMachineInput(rive, STATE_MACHINE_NAME, THINKING_INPUT_NAME);
  const speakingInput = useStateMachineInput(rive, STATE_MACHINE_NAME, SPEAKING_INPUT_NAME);
  const asleepInput = useStateMachineInput(rive, STATE_MACHINE_NAME, ASLEEP_INPUT_NAME);
  const userSpeakingInput = useStateMachineInput(rive, STATE_MACHINE_NAME, USER_SPEAKING_INPUT_NAME);
  const colorInput = useStateMachineInput(rive, STATE_MACHINE_NAME, COLOR_INPUT_NAME);
  const volumeInput = useStateMachineInput(rive, STATE_MACHINE_NAME, VOLUME_INPUT_NAME);

  useEffect(() => { 
    if (!listeningInput) return;
    
    if (isPreview) {
      console.log(`Setting preview orb listening state: ${isListening}`);
      listeningInput.value = isListening;
      return;
    }
    
    listeningInput.value = isListening && !isUserSpeaking; 
  }, [isListening, isUserSpeaking, listeningInput, isPreview]);
  
  useEffect(() => { 
    if (!thinkingInput) return;
    
    if (isPreview) {
      console.log(`Setting preview orb thinking state: ${isThinking}`);
      thinkingInput.value = isThinking;
      return;
    }
    
    thinkingInput.value = isThinking; 
  }, [isThinking, thinkingInput, isPreview]);
  
  useEffect(() => { 
    if (!speakingInput) return;
    
    if (isPreview) {
      console.log(`Setting preview orb speaking state: ${isSpeaking}`);
      speakingInput.value = isSpeaking;
      return;
    }
    
    speakingInput.value = isSpeaking; 
  }, [isSpeaking, speakingInput, isPreview]);
  
  useEffect(() => {
    if (isPreview) return;
    if (userSpeakingInput) {
      userSpeakingInput.value = isUserSpeaking;
      
      if (isUserSpeaking && speakingInput) {
        speakingInput.value = true;
      }
    }
  }, [isUserSpeaking, userSpeakingInput, speakingInput, isPreview]);
  
  useEffect(() => { 
    if (!asleepInput) return;
    
    if (isPreview) {
      console.log(`Setting preview orb asleep state: ${isAsleep || isWaiting}`);
      asleepInput.value = isAsleep || isWaiting;
      return;
    }
    
    asleepInput.value = isAsleep || isWaiting;
  }, [isAsleep, isWaiting, asleepInput, isPreview]);

  useEffect(() => {
    if (isPreview) return;
    if (volumeInput) {
      const scaledLevel = isUserSpeaking 
        ? Math.max(0.3, Math.min(1.0, audioLevel * 2))
        : Math.max(0.2, Math.min(1.0, audioLevel));
          
      volumeInput.value = scaledLevel;
      
      if (isUserSpeaking) {
        console.log(`[Orb Audio] User speaking level: ${scaledLevel.toFixed(2)} (raw: ${audioLevel.toFixed(2)})`);
      }
    }
  }, [audioLevel, volumeInput, isUserSpeaking, isPreview]);

  useEffect(() => {
    if (!rive || !colorInput) return;

    if (isPreview && previewColorValue !== undefined) {
      console.log(`Setting preview orb color: Value=${previewColorValue}, Component ID: ${isPreview ? 'preview' : 'normal'}`);
      
      const currentValue = colorInput.value;
      if (currentValue === previewColorValue) {
        const tempValue = (previewColorValue + 1) % 10;
        colorInput.value = tempValue;
        console.log(`Temporarily setting to different value: ${tempValue}`);
        setTimeout(() => {
          colorInput.value = previewColorValue;
          console.log(`Setting back to original value: ${previewColorValue}`);
        }, 50);
      } else {
        colorInput.value = previewColorValue;
      }
      
      try {
        rive.play();
        console.log("Rive animation playing after color change");
      } catch (e) {
        console.error("Failed to play Rive animation:", e);
      }
      return;
    }

    const targetColorValue = resolvedTheme === 'dark' ? RIVE_COLOR.WHITE : RIVE_COLOR.BLACK;
    
    if (colorInput.value !== targetColorValue) {
      console.log(`Setting orb color for ${resolvedTheme} theme: Value=${targetColorValue}`);
      colorInput.value = targetColorValue;
      try {
        rive.play();
      } catch (e) {
        console.error("Failed to play Rive animation:", e);
      }
    }

  }, [rive, resolvedTheme, colorInput, isPreview, previewColorValue]);

  useEffect(() => {
    if (!isPreview || !rive) return;
    
    if (asleepInput && !isAsleep && !isWaiting) asleepInput.value = false;
    if (thinkingInput && !isThinking) thinkingInput.value = false;
    if (speakingInput && !isSpeaking) speakingInput.value = false;
    if (userSpeakingInput && !isUserSpeaking) userSpeakingInput.value = false;
    
    if (volumeInput) volumeInput.value = 0.5;
  }, [isPreview, rive, asleepInput, thinkingInput, speakingInput, userSpeakingInput, volumeInput, 
      isAsleep, isWaiting, isThinking, isSpeaking, isUserSpeaking]);

  return (
    <div 
      className={`w-full h-full ${isPreview ? '' : 'cursor-pointer'}`}
      onClick={isPreview ? undefined : onClick} 
      aria-label={isPreview ? undefined : "Voice interaction control"}
      role={isPreview ? undefined : "button"}
      aria-pressed={isPreview ? undefined : isListening}
      style={{ aspectRatio: "1/1" }}
    >
      <RiveComponent className="w-full h-full" />
    </div>
  );
};

export default RiveVoiceOrb;
