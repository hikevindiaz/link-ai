'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { AccountStep } from '@/app/(welcome)/welcome/components/AccountStep';
import { BusinessStep } from '@/app/(welcome)/welcome/components/BusinessStep';
import { PricingStep } from '@/app/(welcome)/welcome/components/PricingStep';
import OnboardingStepper from '@/app/(welcome)/welcome/components/OnboardingStepper';
import LinkAIProfileIcon from '@/components/LinkAIProfileIcon';
import { Button } from '@/components/ui/button';

interface WelcomeModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialStep?: number;
}

export function WelcomeModal({ isOpen, onOpenChange, initialStep = 0 }: WelcomeModalProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [activeStep, setActiveStep] = useState<number>(initialStep);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    account: {
      fullName: '',
      email: '', // Will be populated from session
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
    },
    business: {
      companyName: '',
      businessWebsite: '',
      companySize: '',
      industryType: '',
      businessTasks: [] as string[],
      communicationChannels: [] as string[],
    },
    billing: {
      selectedPlan: 'pro',
    },
  });

  // Update form with user data when session loads
  useEffect(() => {
    if (session?.user) {
      const updateFormWithUserData = () => {
        setFormData(prev => ({
          ...prev,
          account: {
            ...prev.account,
            email: session.user?.email || '',
            fullName: session.user?.name || prev.account.fullName,
          }
        }));
      };

      updateFormWithUserData();
    }
  }, [session]);

  // Mark steps as completed if data exists
  useEffect(() => {
    const updateCompletedSteps = () => {
      const newCompletedSteps = new Set<string>();
      
      // Check if account data is filled
      if (formData.account.fullName && 
          formData.account.email && 
          formData.account.addressLine1 && 
          formData.account.city && 
          formData.account.country) {
        newCompletedSteps.add('account');
      }
      
      // Check if business data is filled
      if (formData.business.companyName && 
          formData.business.companySize && 
          formData.business.industryType &&
          formData.business.businessTasks.length > 0 &&
          formData.business.communicationChannels.length > 0) {
        newCompletedSteps.add('business');
      }
      
      // Only update if the completedSteps array would actually change
      const newStepsArray = Array.from(newCompletedSteps);
      if (JSON.stringify(newStepsArray.sort()) !== JSON.stringify([...completedSteps].sort())) {
        setCompletedSteps(newStepsArray);
      }
    };
    
    updateCompletedSteps();
  }, [formData]);

  const handleAccountSubmit = (data: any) => {
    try {
      setFormData((prev) => ({
        ...prev,
        account: data,
      }));
      
      // Add to completed steps
      setCompletedSteps((prev) => {
        const newSet = new Set([...prev, 'account']);
        return Array.from(newSet);
      });
      
      toast.success('Account information saved successfully');
      setActiveStep(1);
    } catch (error) {
      console.error('Error in account step:', error);
      toast.error('Failed to save account information');
    }
  };

  const handleBusinessSubmit = (data: any) => {
    try {
      setFormData((prev) => ({
        ...prev,
        business: data,
      }));
      
      // Add to completed steps
      setCompletedSteps((prev) => {
        const newSet = new Set([...prev, 'business']);
        return Array.from(newSet);
      });
      
      toast.success('Business information saved successfully');
      setActiveStep(2);
    } catch (error) {
      console.error('Error in business step:', error);
      toast.error('Failed to save business information');
    }
  };

  const handlePlanSelect = (plan: string) => {
    setFormData((prev) => ({
      ...prev,
      billing: {
        ...prev.billing,
        selectedPlan: plan,
      },
    }));
  };

  const handlePrev = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const handleSubmitOnboarding = async (): Promise<boolean> => {
    try {
      setIsSubmitting(true);
      toast.loading('Setting up your account...');
      
      // Combine all form data and submit to API
      const response = await fetch('/api/user/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to complete onboarding');
      }

      // Successfully completed onboarding
      toast.dismiss();
      toast.success('Your account is all set! Welcome to Link AI');
      
      // Update all localStorage values to reflect completion
      localStorage.setItem('hasCompletedOnboarding', 'true');
      localStorage.setItem('onboardingInProgress', 'false');
      localStorage.setItem('welcomeModalShown', 'true');
      
      // Close the modal after a short delay to let the user see the success message
      setTimeout(() => {
        onOpenChange(false);
        
        // Refresh the page to show updated status
        router.refresh();
      }, 1500);
      
      return true;
    } catch (error) {
      console.error('Onboarding error:', error);
      toast.dismiss();
      toast.error(error instanceof Error ? error.message : 'An unexpected error occurred');
      setIsSubmitting(false);
      return false;
    }
  };

  // Handle skip onboarding if needed
  const handleSkipOnboarding = () => {
    toast.info('You can complete your profile later in the settings');
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-3xl p-0 overflow-hidden">
        <div className="flex flex-col bg-white dark:bg-gray-950 overflow-y-auto max-h-[80vh]">
          <div className="px-6 pt-6">
            {/* Link AI Profile Icon */}
            <div className="flex justify-center mb-4">
              <LinkAIProfileIcon size={48} />
            </div>
            
            <DialogHeader>
              <DialogTitle className="text-center text-xl sm:text-2xl">
                Welcome to Link AI, let's get started
              </DialogTitle>
              <DialogDescription className="text-center mt-2">
                Complete the steps below to set up your Link AI account and get started.
              </DialogDescription>
            </DialogHeader>

            {/* Stepper */}
            <div className="mt-6">
              <OnboardingStepper
                activeStep={activeStep}
                onStepChange={(step) => {
                  // Only allow navigation to completed steps
                  if (step <= activeStep || completedSteps.includes(['account', 'business', 'billing'][step])) {
                    setActiveStep(step);
                  }
                }}
              />
            </div>
            
            {/* Skip onboarding button */}
            <div className="flex justify-end mt-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSkipOnboarding}
                className="text-xs text-gray-500"
              >
                Skip for now
              </Button>
            </div>
          </div>

          {/* Step content */}
          <div className="p-6">
            {activeStep === 0 && (
              <AccountStep
                initialValues={formData.account}
                onNext={handleAccountSubmit}
                isSubmitting={isSubmitting}
              />
            )}

            {activeStep === 1 && (
              <BusinessStep
                initialValues={formData.business}
                onNext={handleBusinessSubmit}
                onPrev={handlePrev}
                isSubmitting={isSubmitting}
              />
            )}

            {activeStep === 2 && (
              <PricingStep
                selectedPlan={formData.billing.selectedPlan}
                onSelectPlan={handlePlanSelect}
                onPrev={handlePrev}
                onComplete={handleSubmitOnboarding}
                isValid={true}
              />
            )}
          </div>

          {/* Help section */}
          <div className="px-6 pb-6 mt-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-50">
              Need help?
            </h4>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
              Connect with a member of our team at{' '}
              <a
                href="mailto:support@getlinkai.com"
                className="font-medium text-blue-500 dark:text-blue-500"
              >
                support@getlinkai.com
              </a>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 