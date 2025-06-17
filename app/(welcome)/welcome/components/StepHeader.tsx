'use client';

import React from 'react';
import { CheckIcon } from '@heroicons/react/24/solid';
import { cn } from '@/lib/utils';

export interface Step {
  id: string;
  name: string;
  description?: string;
}

interface StepHeaderProps {
  steps: Step[];
  currentStep: string;
  onSelectStep?: (stepId: string) => void;
  completedSteps: string[];
  canNavigate?: boolean;
}

export function StepHeader({
  steps,
  currentStep,
  onSelectStep,
  completedSteps,
  canNavigate = true,
}: StepHeaderProps) {
  const getStepStatus = (stepId: string, index: number) => {
    const stepIndex = steps.findIndex((step) => step.id === stepId);
    const currentIndex = steps.findIndex((step) => step.id === currentStep);

    if (completedSteps.includes(stepId)) return 'complete';
    if (stepId === currentStep) return 'current';
    if (stepIndex < currentIndex) return 'incomplete';
    return 'upcoming';
  };

  return (
    <nav aria-label="Progress" className="my-8">
      <ol
        role="list"
        className="space-y-4 md:flex md:space-x-8 md:space-y-0"
      >
        {steps.map((step, index) => {
          const status = getStepStatus(step.id, index);
          return (
            <li key={step.id} className="md:flex-1">
              <div
                onClick={() => {
                  if (canNavigate && (completedSteps.includes(step.id) || step.id === currentStep)) {
                    onSelectStep?.(step.id);
                  }
                }}
                className={cn(
                  "group flex flex-col border-l-4 py-2 pl-4 md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4",
                  {
                    "cursor-pointer border-neutral-600 hover:border-neutral-800": canNavigate && (completedSteps.includes(step.id) || step.id === currentStep),
                    "border-neutral-600": status === 'current',
                    "border-green-600": status === 'complete',
                    "border-neutral-200": status === 'upcoming' || status === 'incomplete',
                  }
                )}
              >
                <span className="text-xs font-semibold uppercase tracking-wide">
                  {index + 1}. {step.name}
                </span>
                <span className="text-sm">{step.description}</span>
                
                {status === 'complete' && (
                  <span className="absolute right-0 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-white">
                    <CheckIcon className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only">Step {index + 1} completed</span>
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
} 