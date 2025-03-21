'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Title, Text, Divider } from '@tremor/react';
import { pricingPlans, BETA_MODE } from '@/config/pricing';
import { CheckIcon, CreditCardIcon } from '@heroicons/react/24/outline';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { StripeProvider } from './StripeProvider';
import { PaymentMethodForm } from '@/app/(welcome)/welcome/components/PaymentMethodForm';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';

interface PricingStepProps {
  selectedPlan: string;
  onSelectPlan: (plan: string) => void;
  onPrev: () => void;
  onComplete: () => void;
  isValid: boolean;
}

export function PricingStep({ selectedPlan, onSelectPlan, onPrev, onComplete, isValid }: PricingStepProps) {
  const router = useRouter();
  const { data: session, update: updateSession } = useSession();
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(false);
  const [isCreatingSetupIntent, setIsCreatingSetupIntent] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(BETA_MODE);
  const [showFullFeatures, setShowFullFeatures] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get properly sorted features for the table
  const getAllFeatures = () => {
    const coreFeatures = [
      'Agents',
      'Messages Included',
      'SMS Messages Included',
      'Web Searches Included',
      'Documents Included',
      'Conversation Summaries Included',
      'WhatsApp Conversations Included',
      'Voice Minutes Included',
    ];
    
    const overageFeatures = [
      'Overage - Messages',
      'Overage - Web Searches',
      'Overage - Summaries',
      'Overage - WhatsApp',
      'Overage - Voice',
    ];
    
    const additionalFeatures = [
      'Branding',
      'Support',
      'Phone Numbers',
    ];
    
    return showFullFeatures ? 
      [...coreFeatures, ...overageFeatures, ...additionalFeatures] : 
      coreFeatures;
  };

  // Load payment methods on component mount
  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  // Redirect to dashboard when success dialog is shown
  useEffect(() => {
    if (!showSuccessDialog) return;
    
    // Log when redirect is scheduled
    console.log('Scheduling redirect to dashboard in 5 seconds...');
    
    // Helper function to perform the redirect in different ways
    const performRedirect = () => {
      try {
        console.log('Executing redirect to dashboard now - via window.location');
        // Add force refresh parameter to ensure session is reloaded
        window.location.href = '/dashboard?reload=true';
      } catch (error) {
        console.error('Error during redirect:', error);
        
        // Fallback to router.push
        try {
          console.log('Fallback: Using router.push for navigation');
          router.push('/dashboard');
        } catch (routerError) {
          console.error('Router push error:', routerError);
        }
      }
    };
    
    // Increase the timeout to ensure the dialog is fully visible before redirect
    const redirectTimeout = setTimeout(performRedirect, 5000); // 5 seconds timeout
    
    return () => {
      clearTimeout(redirectTimeout);
    };
  }, [showSuccessDialog, router]);

  const fetchPaymentMethods = async () => {
    try {
      setIsLoadingPaymentMethods(true);
      const response = await fetch('/api/user/payment-methods');
      const data = await response.json();

      if (data.success) {
        setPaymentMethods(data.paymentMethods || []);
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    } finally {
      setIsLoadingPaymentMethods(false);
    }
  };

  const handleAddPaymentMethod = async () => {
    try {
      setIsCreatingSetupIntent(true);
      const response = await fetch('/api/user/payment-methods', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to create setup intent');
      }

      const { clientSecret } = await response.json();
      setClientSecret(clientSecret);
      setShowPaymentForm(true);
    } catch (error) {
      console.error('Error creating setup intent:', error);
    } finally {
      setIsCreatingSetupIntent(false);
    }
  };

  const handlePaymentSuccess = () => {
    setShowPaymentForm(false);
    setClientSecret(null);
    fetchPaymentMethods();
  };

  const handlePaymentCancel = () => {
    setShowPaymentForm(false);
    setClientSecret(null);
  };

  const formatCardDetails = (method: any) => {
    if (!method) return 'New payment method';
    return `${method.brand?.charAt(0).toUpperCase()}${method.brand?.slice(1) || 'Card'} ending in ${method.last4}`;
  };

  const getFeatureValue = (planId: string, featureName: string) => {
    const plan = pricingPlans.find(p => p.id === planId);
    if (!plan) return '';
    const feature = plan.features.find(f => f.name === featureName);
    return feature ? feature.value : '';
  };
  
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onComplete();
      toast.success("Onboarding completed successfully!");
      // Redirect to dashboard after successful completion
      router.push('/dashboard');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error('Failed to complete onboarding');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Title>Choose Your Plan</Title>
        <Text>Select the plan that works best for your needs.</Text>
      </div>

      {!showPaymentForm ? (
        <>
          {/* Pricing Table */}
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Feature
                  </th>
                  {pricingPlans.map((plan) => (
                    <th key={plan.id} scope="col" className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider ${selectedPlan === plan.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                {/* Pricing row */}
                <tr className="bg-gray-50 dark:bg-gray-800/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-gray-50">
                    Price (per month)
                  </td>
                  {pricingPlans.map((plan) => (
                    <td key={plan.id} className={`px-6 py-4 whitespace-nowrap text-center text-lg font-bold ${selectedPlan === plan.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-900 dark:text-gray-50'}`}>
                      {plan.priceLabel}
                      <div className="mt-2">
                        <Button
                          variant={selectedPlan === plan.id ? "primary" : "secondary"}
                          size="sm"
                          onClick={() => onSelectPlan(plan.id)}
                          className={`w-full ${selectedPlan === plan.id ? '' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                        >
                          {selectedPlan === plan.id ? "Selected" : "Select"}
                        </Button>
                      </div>
                    </td>
                  ))}
                </tr>
                
                {/* Features rows */}
                {getAllFeatures().map((featureName) => (
                  <tr key={featureName} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-50">
                      {featureName}
                    </td>
                    {pricingPlans.map((plan) => (
                      <td key={`${plan.id}-${featureName}`} className={`px-6 py-4 whitespace-nowrap text-center text-sm ${selectedPlan === plan.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}>
                        {getFeatureValue(plan.id, featureName)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="text-center">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowFullFeatures(!showFullFeatures)}
              className="text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              {showFullFeatures ? "Show less features" : "Show all features"}
            </Button>
          </div>

          {/* Payment Methods Section */}
          <div className="mt-8 space-y-4">
            <h3 className="text-lg font-semibold">Payment Method</h3>
            
            {BETA_MODE ? (
              <Text>
                During beta, all plans are free. You can optionally add a payment method for when the beta period ends.
              </Text>
            ) : (
              <Text>
                Please add a payment method to complete your subscription.
              </Text>
            )}

            {paymentMethods.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Your payment methods</h4>
                <div className="space-y-2">
                  {paymentMethods.map((method) => (
                    <div 
                      key={method.id}
                      className="flex items-center justify-between p-3 border rounded-md hover:bg-gray-50 dark:hover:bg-gray-900"
                    >
                      <div className="flex items-center gap-2">
                        <CreditCardIcon className="h-5 w-5 text-gray-500" />
                        <span>{formatCardDetails(method)}</span>
                        {method.isDefault && (
                          <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">Default</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              variant="secondary"
              onClick={handleAddPaymentMethod}
              disabled={isCreatingSetupIntent}
              className="mt-2"
            >
              <CreditCardIcon className="h-4 w-4 mr-2" />
              {isCreatingSetupIntent ? "Creating..." : "Add Payment Method"}
            </Button>
          </div>

          {/* Terms & Conditions */}
          {!BETA_MODE && (
            <div className="flex items-center space-x-2 mt-4">
              <Checkbox 
                id="terms" 
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                className="cursor-pointer"
              />
              <label
                htmlFor="terms"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                I agree to the Terms & Conditions and Privacy Policy
              </label>
            </div>
          )}

          <div className="flex space-x-3 mt-6">
            <Button
              type="button"
              onClick={onPrev}
              variant="secondary"
              className="w-full"
            >
              Previous
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!isValid || (!BETA_MODE && !termsAccepted) || isSubmitting}
              className="w-full"
            >
              {isSubmitting ? "Processing..." : BETA_MODE ? "Complete Setup" : "Subscribe"}
            </Button>
          </div>
        </>
      ) : (
        clientSecret && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Add Payment Method</h3>
            <Card className="p-6">
              <StripeProvider clientSecret={clientSecret}>
                <PaymentMethodForm
                  clientSecret={clientSecret}
                  onSuccess={handlePaymentSuccess}
                  onCancel={handlePaymentCancel}
                />
              </StripeProvider>
            </Card>
          </div>
        )
      )}
      
      {/* Success Dialog */}
      <Dialog 
        open={showSuccessDialog} 
        onOpenChange={(open) => {
          // Only allow the dialog to be closed programmatically
          if (open === false) {
            console.log('Preventing dialog from being dismissed by user');
            return;
          }
          setShowSuccessDialog(open);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Setup Complete! 🎉</DialogTitle>
            <DialogDescription>
              Your Link AI account has been successfully set up. You'll be redirected to your dashboard in a moment.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-6">
            <div className="rounded-full bg-green-100 p-4">
              <CheckIcon className="h-10 w-10 text-green-600" />
            </div>
          </div>
          <DialogFooter className="flex flex-col space-y-2">
            <Button 
              className="w-full" 
              onClick={() => {
                console.log('Manual redirect button clicked');
                // Force a hard navigation to ensure the page is fully reloaded
                window.location.href = '/dashboard';
              }}
            >
              Go to Dashboard
            </Button>
            <p className="text-xs text-center text-gray-500">
              If you're not redirected automatically, please click the button above.
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 