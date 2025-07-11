'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { AccountStep } from '@/app/(welcome)/welcome/components/AccountStep';
import { BusinessStep } from '@/app/(welcome)/welcome/components/BusinessStep';
import { Button } from '@/components/Button';
import { CheckoutConfirmationDialog } from '@/components/billing/checkout-confirmation-dialog';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import { RiLogoutBoxLine } from '@remixicon/react';

// Logo URLs from reference
const LOGO_URLS = {
  dark: 'https://ugnyocjdcpdlneirkfiq.supabase.co/storage/v1/object/public/brand-assets/logos/link-ai-icon-dark.png',
  light: 'https://ugnyocjdcpdlneirkfiq.supabase.co/storage/v1/object/public/brand-assets/logos/link-ai-icon-light.png',
};

// Simplified pricing plans for onboarding
const simplifiedPlans = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$69/month',
    description: 'Perfect for individuals and small businesses',
    features: [
      '1 AI Agent',
      '2,000 Messages/month',
      'Basic integrations',
      'Email support'
    ]
  },
  {
    id: 'growth',
    name: 'Growth',
    price: '$199/month',
    description: 'Ideal for growing teams',
    features: [
      '5 AI Agents',
      '12,000 Messages/month',
      'Advanced integrations',
      'Priority support'
    ],
    recommended: true
  },
  {
    id: 'scale',
    name: 'Scale',
    price: '$499/month',
    description: 'Built for larger organizations',
    features: [
      '10 AI Agents',
      '25,000 Messages/month',
      'Custom integrations',
      'Phone & email support'
    ]
  }
];

interface FormData {
  account: any;
  business: any;
  billing: {
    selectedPlan: string;
  };
}

// Total substeps: AccountStep (3) + BusinessStep (4) + Pricing (1) = 8
const TOTAL_SUBSTEPS = 8;

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const { theme, systemTheme } = useTheme();
  const [activeStep, setActiveStep] = useState(0);
  const [currentGlobalStep, setCurrentGlobalStep] = useState(1); // Track global progress 1-8
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successStep, setSuccessStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    account: {
      email: '',
    },
    business: {},
    billing: {
      selectedPlan: '',
    },
  });

  // Success messages for the progress animation
  const successMessages = [
    "Setting up your account...",
    "Activating your subscription...",
    "Preparing your dashboard...",
    "Almost ready...",
    "Welcome to Link AI!"
  ];

  // Determine the current theme - for white background, always use dark icon
  const logoUrl = LOGO_URLS.dark;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.email) {
      setFormData(prev => ({
        ...prev,
        account: {
          ...prev.account,
          email: session.user.email,
        },
      }));
    }
  }, [session]);

  // Fetch payment methods when checkout dialog opens
  useEffect(() => {
    if (showCheckoutDialog) {
      fetchPaymentMethods();
    }
  }, [showCheckoutDialog]);

  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch('/api/billing/payment-methods');
      if (response.ok) {
        const data = await response.json();
        setPaymentMethods(data.paymentMethods || []);
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      setPaymentMethods([]);
    }
  };

  // Save account data to backend
  const saveAccountData = async (data: any) => {
    try {
      const response = await fetch('/api/onboarding/save-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 'account',
          data: data,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save progress');
      }
    } catch (error) {
      console.error('Error saving account data:', error);
      // Don't show error to user, just log it
    }
  };

  // Save business data to backend
  const saveBusinessData = async (data: any) => {
    try {
      const response = await fetch('/api/onboarding/save-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 'business',
          data: data,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save progress');
      }
    } catch (error) {
      console.error('Error saving business data:', error);
      // Don't show error to user, just log it
    }
  };

  const handleAccountSubmit = async (data: any) => {
    setFormData(prev => ({
      ...prev,
      account: { ...prev.account, ...data },
    }));
    
    // Save account data
    await saveAccountData(data);
    
    setActiveStep(1);
    setCurrentGlobalStep(4); // After AccountStep (3 substeps), we're at step 4
  };

  const handleBusinessSubmit = async (data: any) => {
    setFormData(prev => ({
      ...prev,
      business: data,
    }));
    
    // Save business data
    await saveBusinessData(data);
    
    setActiveStep(2);
    setCurrentGlobalStep(8); // After BusinessStep (4 substeps), we're at step 8
  };

  const handlePlanSelect = (planId: string) => {
    setFormData(prev => ({
      ...prev,
      billing: { selectedPlan: planId },
    }));
    setShowCheckoutDialog(true);
  };

  const handleCompleteOnboarding = async () => {
    setIsSubmitting(true);
    try {
      // Submit final onboarding completion
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedPlan: formData.billing.selectedPlan,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Show success animation
        setShowSuccess(true);
        setShowCheckoutDialog(false);
        
        // Update local storage
        localStorage.setItem('hasCompletedOnboarding', 'true');
        localStorage.setItem('onboardingInProgress', 'false');
        
        // Force session update to get the latest onboardingCompleted status
        await update();
        
        // Animate through success messages
        const progressMessages = async () => {
          for (let i = 0; i < successMessages.length; i++) {
            setSuccessStep(i);
            await new Promise(resolve => setTimeout(resolve, 1200)); // 1.2 seconds per message
          }
          
          // Multiple session refresh attempts to ensure JWT is updated
          let refreshAttempts = 0;
          const maxRefreshAttempts = 3;
          
          const checkAndRedirect = async () => {
            refreshAttempts++;
            
            try {
              // Force session refresh
              await update();
              
              // Add a small delay for session propagation
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Check if session is updated
              const currentSession = await fetch('/api/auth/session').then(r => r.json());
              
              if (currentSession?.user?.onboardingCompleted || refreshAttempts >= maxRefreshAttempts) {
                // Session is updated or max attempts reached, proceed to dashboard
                setTimeout(() => {
                  window.location.href = '/dashboard';
                }, 200);
              } else {
                // Try again
                setTimeout(checkAndRedirect, 1000);
              }
            } catch (error) {
              console.error('Session refresh error:', error);
              // Fallback: redirect anyway after max attempts
              if (refreshAttempts >= maxRefreshAttempts) {
                setTimeout(() => {
                  window.location.href = '/dashboard';
                }, 200);
              } else {
                setTimeout(checkAndRedirect, 1000);
              }
            }
          };
          
          // Start the check and redirect process
          checkAndRedirect();
        };
        
        progressMessages();
      } else {
        setShowSuccess(false);
        toast.error(data.error || 'Failed to complete onboarding');
      }
    } catch (error) {
      setShowSuccess(false);
      toast.error('Failed to complete onboarding');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin h-8 w-8 border-4 border-neutral-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Calculate progress percentage based on global steps
  const progressPercentage = (currentGlobalStep / TOTAL_SUBSTEPS) * 100;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-white dark:bg-black relative">
      {/* Logout button - absolute positioned */}
      <Button
        variant="secondary"
        size="sm"
        onClick={() => signOut({ callbackUrl: '/login' })}
        className="absolute top-4 right-4 flex items-center gap-2"
      >
        <RiLogoutBoxLine className="h-4 w-4" />
        <span className="hidden sm:inline">Logout</span>
      </Button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-3xl"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image
              src={logoUrl}
              alt="Link AI"
              width={20}
              height={20}
              className="object-contain"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-50">
            Welcome to Link AI
          </h1>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400">
            Let's get your account set up in just a few steps
          </p>
        </div>

        {/* Simple Progress Bar */}
        <div className="mb-8 max-w-md mx-auto">
          <div className="w-full bg-neutral-200 dark:bg-neutral-800 rounded-full h-2">
            <motion.div
              className="bg-neutral-600 dark:bg-neutral-400 h-2 rounded-full"
              initial={{ width: "12.5%" }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="max-w-2xl mx-auto w-full">
          {showSuccess ? (
            // Success animation screen
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12 space-y-8"
            >
              {/* Success checkmark with pulse animation */}
              <div className="relative inline-flex">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-32 w-32 rounded-full bg-green-100 dark:bg-green-900/20 animate-pulse" />
                </div>
                <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  >
                    <svg 
                      className="h-16 w-16 text-green-600 dark:text-green-400" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={3} 
                        d="M5 13l4 4L19 7" 
                      />
                    </svg>
                  </motion.div>
                </div>
              </div>

              {/* Success title */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <h2 className="text-3xl font-bold text-neutral-900 dark:text-neutral-50 mb-4">
                  Success!
                </h2>
                <p className="text-lg text-neutral-600 dark:text-neutral-400">
                  Your account has been created successfully
                </p>
              </motion.div>

              {/* Progress messages */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="space-y-4"
              >
                <div className="w-full max-w-md mx-auto bg-neutral-200 dark:bg-neutral-800 rounded-full h-2">
                  <motion.div
                    className="bg-neutral-600 dark:bg-neutral-400 h-2 rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: `${((successStep + 1) / successMessages.length) * 100}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
                
                <motion.p
                  key={successStep}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.5 }}
                  className="text-neutral-700 dark:text-neutral-300 font-medium"
                >
                  {successMessages[successStep]}
                </motion.p>
              </motion.div>

              {/* Additional details */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="text-sm text-neutral-500 dark:text-neutral-500 space-y-2"
              >
                <p>✓ 14-day free trial activated</p>
                <p>✓ Account settings configured</p>
                <p>✓ Ready to create your first AI agent</p>
              </motion.div>
            </motion.div>
          ) : (
            <AnimatePresence mode="wait">
              {activeStep === 0 && (
                <motion.div
                  key="account"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <AccountStep
                    initialValues={formData.account}
                    onNext={handleAccountSubmit}
                    isSubmitting={false}
                    onSubstepChange={(substep) => setCurrentGlobalStep(substep + 1)}
                    onSaveProgress={saveAccountData}
                  />
                </motion.div>
              )}

              {activeStep === 1 && (
                <motion.div
                  key="business"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <BusinessStep
                    initialValues={formData.business}
                    onNext={handleBusinessSubmit}
                    onPrev={() => {
                      setActiveStep(0);
                      setCurrentGlobalStep(3); // Go back to last step of AccountStep
                    }}
                    isSubmitting={false}
                    onSubstepChange={(substep) => setCurrentGlobalStep(4 + substep)}
                    onSaveProgress={saveBusinessData}
                  />
                </motion.div>
              )}

              {activeStep === 2 && (
                <motion.div
                  key="pricing"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50 mb-2">
                      Choose Your Plan
                    </h2>
                    <p className="text-neutral-600 dark:text-neutral-400">
                      All plans include a 14-day free trial.
                    </p>
                  </div>

                  {/* Simplified Plan Cards */}
                  <div className="grid gap-4 sm:grid-cols-3">
                    {simplifiedPlans.map((plan) => (
                      <div
                        key={plan.id}
                        className={`relative rounded-xl border-2 p-6 cursor-pointer transition-all ${
                          formData.billing.selectedPlan === plan.id
                            ? 'border-neutral-400 bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-900'
                            : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-700 dark:hover:border-neutral-600'
                        }`}
                        onClick={() => handlePlanSelect(plan.id)}
                      >
                        {plan.recommended && (
                          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                            <span className="bg-neutral-900 dark:bg-neutral-100 text-white dark:text-black px-3 py-1 rounded-full text-xs font-medium">
                              Recommended
                            </span>
                          </div>
                        )}
                        
                        <h3 className="font-semibold text-neutral-900 dark:text-neutral-50">
                          {plan.name}
                        </h3>
                        <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 mt-2">
                          {plan.price}
                        </p>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                          {plan.description}
                        </p>
                        <ul className="mt-4 space-y-2">
                          {plan.features.map((feature, index) => (
                            <li key={index} className="text-sm text-neutral-600 dark:text-neutral-400">
                              ✓ {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex justify-between items-center pt-6">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setActiveStep(1);
                        setCurrentGlobalStep(7); // Go back to last step of BusinessStep
                      }}
                    >
                      Back
                    </Button>
                    <div className="text-center">
                      <a
                        href="https://www.getlinkai.com/pricing"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 underline underline-offset-4"
                      >
                        View detailed pricing
                      </a>
                    </div>
                    <Button
                      onClick={() => handlePlanSelect(formData.billing.selectedPlan || 'growth')}
                      disabled={!formData.billing.selectedPlan}
                    >
                      Continue
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

        {/* Help Text */}
        <p className="text-center text-sm text-neutral-500 dark:text-neutral-500 mt-8">
          Need help? Contact{' '}
          <a href="mailto:support@getlinkai.com" className="text-neutral-900 dark:text-neutral-100 hover:text-neutral-700 dark:hover:text-neutral-300 underline underline-offset-4">
            support@getlinkai.com
          </a>
        </p>
      </motion.div>

      {/* Checkout Confirmation Dialog */}
      {showCheckoutDialog && formData.billing.selectedPlan && (
        <CheckoutConfirmationDialog
          open={showCheckoutDialog}
          onOpenChange={setShowCheckoutDialog}
          selectedPlan={{
            id: formData.billing.selectedPlan,
            name: simplifiedPlans.find(p => p.id === formData.billing.selectedPlan)?.name || '',
            price: simplifiedPlans.find(p => p.id === formData.billing.selectedPlan)?.price || '',
            description: simplifiedPlans.find(p => p.id === formData.billing.selectedPlan)?.description || '',
            features: simplifiedPlans.find(p => p.id === formData.billing.selectedPlan)?.features || [],
            capacity: [],
          }}
          currentPlan={null}
          paymentMethods={paymentMethods}
          onConfirm={async () => {
            setShowCheckoutDialog(false);
            await handleCompleteOnboarding();
          }}
          onBack={() => setShowCheckoutDialog(false)}
          skipBillingPreview={true}
        />
      )}
    </div>
  );
} 