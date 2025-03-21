"use client";

import {
  RiCheckboxCircleFill,
  RiProgress5Fill,
} from '@remixicon/react';

import { cn } from '@/lib/utils';
import { ProgressBar } from '@/components/ProgressBar';

interface OnboardingStepperProps {
  activeStep: number;
  onStepChange?: (step: number) => void;
}

export const STEPS = [
  {
    label: "Account",
    description: "Enter your account details"
  },
  {
    label: "Business",
    description: "Tell us about your business"
  },
  {
    label: "Pricing",
    description: "Choose your plan & payment"
  }
];

export default function OnboardingStepper({ activeStep, onStepChange }: OnboardingStepperProps) {
  const handleStepClick = (index: number) => {
    if (onStepChange && index <= activeStep) {
      onStepChange(index);
    }
  };

  return (
    <div className="w-full mb-8">
      <div className="flex items-center space-x-2">
        {STEPS.map((step, index) => {
          // Calculate progress value based on current step
          let progressValue = 0;
          if (index < activeStep) {
            progressValue = 100;
          } else if (index === activeStep) {
            progressValue = 50;
          }
          
          return (
            <div 
              key={index} 
              className={cn(
                "w-full truncate",
                index <= activeStep ? "cursor-pointer opacity-100" : "opacity-50"
              )}
              onClick={() => handleStepClick(index)}
            >
              <ProgressBar 
                value={progressValue} 
                className="[&>*]:h-1.5" 
              />
              <div className="mt-2 flex items-center space-x-1 truncate">
                {index < activeStep ? (
                  <RiCheckboxCircleFill
                    className="size-4 shrink-0 text-indigo-500 dark:text-indigo-500"
                    aria-hidden={true}
                  />
                ) : (
                  <RiProgress5Fill
                    className={cn(
                      "size-4 shrink-0",
                      index === activeStep 
                        ? "text-indigo-500 dark:text-indigo-500" 
                        : "text-gray-400 dark:text-gray-600"
                    )}
                    aria-hidden={true}
                  />
                )}
                <div className="flex flex-col">
                  <p className={cn(
                    "truncate text-xs font-medium",
                    index <= activeStep 
                      ? "text-indigo-600 dark:text-indigo-500" 
                      : "text-gray-500 dark:text-gray-500"
                  )}>
                    {step.label}
                  </p>
                  <p className="truncate text-xs text-gray-500 dark:text-gray-500">
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
} 