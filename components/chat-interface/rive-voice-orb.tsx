'use client';

import React, { useEffect } from 'react';
import { useRive, Layout, Fit, Alignment, useStateMachineInput } from 'rive-react';
import { useTheme } from 'next-themes';

interface RiveVoiceOrbProps {
  isListening: boolean;
  isThinking: boolean;
  isSpeaking: boolean;
  isAsleep?: boolean;
  onClick?: () => void;
}

const STATE_MACHINE_NAME = 'default';
const LISTENING_INPUT_NAME = 'listening';
const THINKING_INPUT_NAME = 'thinking';
const SPEAKING_INPUT_NAME = 'speaking';
const ASLEEP_INPUT_NAME = 'asleep';
const COLOR_INPUT_NAME = 'color';

const RIVE_COLOR = {
    BLACK: 0,
    WHITE: 1,
} as const;

const RiveVoiceOrb: React.FC<RiveVoiceOrbProps> = ({ 
  isListening,
  isThinking,
  isSpeaking,
  isAsleep = false,
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
  const colorInput = useStateMachineInput(rive, STATE_MACHINE_NAME, COLOR_INPUT_NAME);

  useEffect(() => { if (listeningInput) listeningInput.value = isListening; }, [isListening, listeningInput]);
  useEffect(() => { if (thinkingInput) thinkingInput.value = isThinking; }, [isThinking, thinkingInput]);
  useEffect(() => { if (speakingInput) speakingInput.value = isSpeaking; }, [isSpeaking, speakingInput]);
  useEffect(() => { if (asleepInput) asleepInput.value = isAsleep; }, [isAsleep, asleepInput]);

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
