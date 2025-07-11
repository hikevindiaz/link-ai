'use client';

import React, { useEffect } from 'react';
import { useRive, Layout, Fit, Alignment, useStateMachineInput } from 'rive-react';
import { useTheme } from 'next-themes';

interface RiveGlintProps {
  isListening?: boolean;
  isThinking?: boolean;
  isSpeaking?: boolean;
  isAsleep?: boolean;
  onClick?: () => void;
  className?: string;
}

const STATE_MACHINE_NAME = 'default';
const LISTENING_INPUT_NAME = 'listening';
const THINKING_INPUT_NAME = 'thinking';
const SPEAKING_INPUT_NAME = 'speaking';
const ASLEEP_INPUT_NAME = 'asleep';

const RiveGlint: React.FC<RiveGlintProps> = ({ 
  isListening = false,
  isThinking = false,
  isSpeaking = false,
  isAsleep = false,
  onClick,
  className = "w-16 h-16"
}) => {
  const { resolvedTheme } = useTheme(); 
  const { rive, RiveComponent } = useRive({
    src: '/glint-2.0.riv', 
    stateMachines: STATE_MACHINE_NAME,
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
    autoplay: true,
    onLoad: () => {
      console.log("Glint animation loaded");
    }
  });

  const listeningInput = useStateMachineInput(rive, STATE_MACHINE_NAME, LISTENING_INPUT_NAME);
  const thinkingInput = useStateMachineInput(rive, STATE_MACHINE_NAME, THINKING_INPUT_NAME);
  const speakingInput = useStateMachineInput(rive, STATE_MACHINE_NAME, SPEAKING_INPUT_NAME);
  const asleepInput = useStateMachineInput(rive, STATE_MACHINE_NAME, ASLEEP_INPUT_NAME);

  useEffect(() => { 
    if (listeningInput) {
      listeningInput.value = isListening;
    }
  }, [isListening, listeningInput]);
  
  useEffect(() => { 
    if (thinkingInput) {
      thinkingInput.value = isThinking;
    }
  }, [isThinking, thinkingInput]);
  
  useEffect(() => { 
    if (speakingInput) {
      speakingInput.value = isSpeaking;
    }
  }, [isSpeaking, speakingInput]);
  
  useEffect(() => { 
    if (asleepInput) {
      asleepInput.value = isAsleep;
    }
  }, [isAsleep, asleepInput]);

  return (
    <div 
      className={`${className} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick} 
      aria-label={onClick ? "Loading animation" : undefined}
      role={onClick ? "button" : undefined}
      style={{ aspectRatio: "1/1" }}
    >
      <RiveComponent className="w-full h-full" />
    </div>
  );
};

export default RiveGlint; 