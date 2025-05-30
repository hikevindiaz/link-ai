'use client';

import React, { useState, useEffect } from 'react';
import {
  RiCheckLine,
  RiUserLine,
  RiMessage3Line,
  RiBankCardLine,
  RiShieldCheckLine,
  RiCloseLine,
  RiArrowLeftLine,
} from '@remixicon/react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/Button';
import { Card } from '@/components/ui/card';
import { Divider } from '@/components/Divider';
import { toast } from 'sonner';
import { loadStripe } from '@stripe/stripe-js';
import { 
  Elements, 
  PaymentElement, 
  useStripe, 
  useElements 
} from '@stripe/react-stripe-js';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string);

// Helper function to get price ID for a plan
function getPriceIdForPlan(planId: string): string {
  switch (planId) {
    case 'starter':
      return process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID || '';
    case 'growth':
      return process.env.NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID || '';
    case 'scale':
      return process.env.NEXT_PUBLIC_STRIPE_SCALE_PRICE_ID || '';
    default:
      throw new Error(`Unknown plan ID: ${planId}`);
  }
}

interface CheckoutConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPlan: {
    id: string;
    name: string;
    price: string;
    description: string;
    features: string[];
    capacity: string[];
  };
  currentPlan?: {
    name: string;
    priceId: string;
    stripePriceId?: string;
  };
  paymentMethods: Array<{
    id: string;
    brand?: string;
    last4?: string;
    exp_month?: number;
    exp_year?: number;
    isDefault: boolean;
    card?: {
      brand?: string;
      last4?: string;
      exp_month?: number;
      exp_year?: number;
    };
  }>;
  onConfirm: (planId: string) => Promise<void>;
  onBack: () => void;
}

// Payment Form Component for adding new payment method
function PaymentMethodForm({ 
  clientSecret, 
  onSuccess, 
  onCancel,
  planName,
  planPrice 
}: { 
  clientSecret: string; 
  onSuccess: () => void; 
  onCancel: () => void;
  planName: string;
  planPrice: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message || "An error occurred");
      setProcessing(false);
      return;
    }

    const { error: confirmError, setupIntent } = await stripe.confirmSetup({
      elements,
      clientSecret,
      confirmParams: {
        return_url: `${window.location.origin}/dashboard/settings?tab=billing`,
      },
      redirect: 'if_required',
    });

    if (confirmError) {
      setError(confirmError.message || "An error occurred while confirming your payment method");
      setProcessing(false);
    } else if (setupIntent) {
      // Save the payment method to the database
      try {
        const response = await fetch('/api/billing/payment-methods/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ setupIntentId: setupIntent.id }),
        });

        const data = await response.json();
        
        if (data.success) {
          onSuccess();
        } else {
          setError(data.message || 'Failed to save payment method');
          setProcessing(false);
        }
      } catch (err) {
        setError('Failed to save payment method');
        setProcessing(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg">
        <div className="flex items-center gap-3 mb-2">
          <RiShieldCheckLine className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <span className="font-medium text-indigo-900 dark:text-indigo-100">
            Secure Payment
          </span>
        </div>
        <p className="text-sm text-indigo-700 dark:text-indigo-300">
          Your payment information is securely processed by Stripe. We never store your card details.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <PaymentElement />
        
        {error && (
          <div className="text-red-500 text-sm mt-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            {error}
          </div>
        )}
        
        <div className="flex gap-3 pt-4">
          <Button 
            type="button" 
            variant="secondary" 
            onClick={onCancel}
            disabled={processing}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={!stripe || !elements || processing}
            className="flex-1"
          >
            {processing ? (
              <>
                <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              `Subscribe to ${planName}`
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

export function CheckoutConfirmationDialog({ 
  open, 
  onOpenChange, 
  selectedPlan, 
  currentPlan,
  paymentMethods, 
  onConfirm, 
  onBack 
}: CheckoutConfirmationDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [setupIntentClientSecret, setSetupIntentClientSecret] = useState<string | null>(null);
  const [billingPreview, setBillingPreview] = useState<{
    isChangingPlan: boolean;
    dueToday: number;
    monthlyAmount: number;
    nextBillingDate?: string;
    trialEndDate?: string;
    firstBillingDate?: string;
    prorationAdjustments?: Array<{
      description: string;
      amount: number;
    }>;
    currency: string;
    isTrial: boolean;
    firstBillingAmount?: number;
  } | null>(null);

  const hasPaymentMethods = paymentMethods.length > 0;
  const defaultPaymentMethod = paymentMethods.find(pm => pm.isDefault) || paymentMethods[0];
  const isChangingPlan = !!currentPlan;

  // Fetch billing preview when dialog opens
  useEffect(() => {
    if (open) {
      fetchBillingPreview();
    }
  }, [open, selectedPlan.id]);

  const fetchBillingPreview = async () => {
    try {
      const response = await fetch('/api/billing/calculate-proration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newPriceId: getPriceIdForPlan(selectedPlan.id),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setBillingPreview(data);
      } else {
        console.error('Failed to fetch billing preview');
      }
    } catch (error) {
      console.error('Error fetching billing preview:', error);
    }
  };

  // Format card brand
  const formatCardBrand = (brand: string | undefined) => {
    if (!brand) return 'Card';
    const brandMap: Record<string, string> = {
      'visa': 'Visa',
      'mastercard': 'Mastercard', 
      'amex': 'American Express',
      'discover': 'Discover',
      'jcb': 'JCB',
      'diners': 'Diners Club',
      'unionpay': 'UnionPay'
    };
    return brandMap[brand.toLowerCase()] || brand.charAt(0).toUpperCase() + brand.slice(1);
  };

  const handleAddPaymentMethod = async () => {
    try {
      setIsProcessing(true);
      
      const response = await fetch('/api/billing/create-setup-intent', {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create setup intent');
      }
      
      const { clientSecret } = await response.json();
      
      if (!clientSecret) {
        throw new Error('No client secret returned from the server');
      }
      
      setSetupIntentClientSecret(clientSecret);
      setShowPaymentForm(true);
      
    } catch (error: any) {
      console.error('Error creating setup intent:', error);
      toast.error(error.message || 'Failed to set up payment method');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentMethodSuccess = () => {
    toast.success('Payment method added successfully');
    setShowPaymentForm(false);
    setSetupIntentClientSecret(null);
    // The parent component should refresh payment methods
    window.location.reload(); // Simple refresh for now
  };

  const handlePaymentMethodCancel = () => {
    setShowPaymentForm(false);
    setSetupIntentClientSecret(null);
  };

  const handleConfirmCheckout = async () => {
    try {
      setIsProcessing(true);
      setError(null);

      // Call the new API endpoint for direct charging
      const response = await fetch('/api/billing/confirm-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: getPriceIdForPlan(selectedPlan.id),
          planId: selectedPlan.id
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to process subscription');
      }

      // Show success animation
      setIsSuccess(true);
      
      // Success! Close dialog and refresh the page
      toast.success(result.message || 'Subscription updated successfully!');
      
      // Wait for animation to complete
      setTimeout(() => {
        onConfirm(selectedPlan.id);
        onOpenChange(false);
        setIsSuccess(false);
      }, 1500);
      
    } catch (error) {
      console.error('Error confirming checkout:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold">
              {showPaymentForm ? 'Add Payment Method' : 'Confirm Your Plan'}
            </DialogTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0"
            >
              <RiCloseLine className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="py-6">
          {isSuccess ? (
            // Success animation
            <div className="text-center py-12">
              <div className="relative inline-flex">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-32 w-32 rounded-full bg-green-100 dark:bg-green-900/20 animate-ping" />
                </div>
                <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                  <RiCheckLine className="h-16 w-16 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900 dark:text-gray-50">
                Success!
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Your {selectedPlan.name} subscription has been activated.
              </p>
            </div>
          ) : showPaymentForm && setupIntentClientSecret ? (
            <div className="space-y-6">
              <Button
                variant="ghost"
                onClick={() => setShowPaymentForm(false)}
                className="mb-4 p-0 h-auto font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
              >
                <RiArrowLeftLine className="h-4 w-4 mr-1" />
                Back to checkout
              </Button>

              <Elements 
                stripe={stripePromise} 
                options={{ 
                  clientSecret: setupIntentClientSecret,
                  appearance: {
                    theme: 'stripe',
                    variables: {
                      colorPrimary: '#6366f1',
                      colorBackground: '#ffffff',
                      colorText: '#1f2937',
                      colorDanger: '#ef4444',
                      fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
                      borderRadius: '6px',
                    },
                    labels: 'floating',
                  },
                  loader: 'auto',
                }}
              >
                <PaymentMethodForm 
                  clientSecret={setupIntentClientSecret}
                  onSuccess={handlePaymentMethodSuccess}
                  onCancel={handlePaymentMethodCancel}
                  planName={selectedPlan.name}
                  planPrice={selectedPlan.price}
                />
              </Elements>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Plan Summary */}
              <Card className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                      {selectedPlan.name} Plan
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedPlan.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-50">
                      {selectedPlan.price}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      per month
                    </div>
                  </div>
                </div>

                <Divider className="my-4" />

                {/* Core Capacity */}
                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 dark:text-gray-50 mb-3">
                    Core Capacity:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedPlan.capacity.map((item, index) => (
                      <div key={index} className="flex items-center gap-3">
                        {index === 0 && <RiUserLine className="h-4 w-4 text-gray-500" />}
                        {index === 1 && <RiMessage3Line className="h-4 w-4 text-gray-500" />}
                        <span className="text-sm text-gray-700 dark:text-gray-300">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Included Features */}
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-50 mb-3">
                    Included Features:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedPlan.features.slice(0, 4).map((feature) => (
                      <div key={feature} className="flex items-center gap-2">
                        <RiCheckLine className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                      </div>
                    ))}
                  </div>
                  {selectedPlan.features.length > 4 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      +{selectedPlan.features.length - 4} more features included
                    </p>
                  )}
                </div>
              </Card>

              {/* Billing Summary */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4">
                  Billing Summary
                </h3>
                
                {billingPreview ? (
                  billingPreview.isTrial ? (
                    <div className="space-y-3">
                      {/* Trial Information */}
                      <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <RiCheckLine className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                          <span className="font-medium text-indigo-900 dark:text-indigo-100">
                            {billingPreview.isChangingPlan ? 'Trial Plan Update' : '14-Day Free Trial'}
                          </span>
                        </div>
                        <p className="text-sm text-indigo-700 dark:text-indigo-300">
                          {billingPreview.isChangingPlan 
                            ? 'Your trial will continue with the updated plan. No charges until trial ends.'
                            : 'Start with a free trial. Cancel anytime before the trial ends to avoid any charges.'
                          }
                        </p>
                      </div>
                      
                      {/* Trial Details */}
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Free trial
                        </span>
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">
                          $0.00
                        </span>
                      </div>
                      
                      <Divider className="my-3" />
                      
                      {/* Due Today */}
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-900 dark:text-gray-50">
                          Due today
                        </span>
                        <span className="font-bold text-lg text-green-600 dark:text-green-400">
                          $0.00
                        </span>
                      </div>
                      
                      <Divider className="my-3" />
                      
                      {/* Trial End / First Billing */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            Trial ends
                          </span>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-50">
                            {billingPreview.trialEndDate 
                              ? new Date(billingPreview.trialEndDate).toLocaleDateString('en-US', {
                                  month: 'long',
                                  day: 'numeric',
                                  year: 'numeric'
                                })
                              : 'N/A'
                            }
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            First billing charge
                          </span>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-50">
                            ${billingPreview.firstBillingAmount?.toFixed(2) || billingPreview.monthlyAmount.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Important Note about Add-ons */}
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg mt-3">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          <strong>Note:</strong> The first billing charge shown above covers the base {selectedPlan.name} plan only. 
                          Phone numbers and other add-ons will be billed separately and may result in a higher total charge.
                        </p>
                      </div>
                    </div>
                  ) : billingPreview.isChangingPlan ? (
                    <div className="space-y-3">
                      {/* Plan Change Information */}
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <RiCheckLine className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                          <span className="font-medium text-yellow-900 dark:text-yellow-100">
                            Plan Change
                          </span>
                        </div>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                          Your plan will be updated immediately with prorated billing adjustments.
                        </p>
                      </div>
                      
                      {/* All Line Items */}
                      {billingPreview.prorationAdjustments?.map((adjustment, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {adjustment.description}
                          </span>
                          <span className={`text-sm font-medium ${
                            adjustment.amount < 0 
                              ? 'text-green-600 dark:text-green-400' 
                              : 'text-gray-900 dark:text-gray-50'
                          }`}>
                            {adjustment.amount < 0 ? '-' : '+'}${Math.abs(adjustment.amount).toFixed(2)}
                          </span>
                        </div>
                      ))}
                      
                      {/* If no proration adjustments, show a message */}
                      {(!billingPreview.prorationAdjustments || billingPreview.prorationAdjustments.length === 0) && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            Plan upgrade charge
                          </span>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-50">
                            +${billingPreview.dueToday.toFixed(2)}
                          </span>
                        </div>
                      )}
                      
                      <Divider className="my-3" />
                      
                      {/* Due Today */}
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-900 dark:text-gray-50">
                          Due today
                        </span>
                        <span className="font-bold text-lg text-gray-900 dark:text-gray-50">
                          ${billingPreview.dueToday.toFixed(2)}
                        </span>
                      </div>
                      
                      {/* Warning if amount seems high */}
                      {billingPreview.dueToday > billingPreview.monthlyAmount * 1.2 && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                          <p className="text-sm text-yellow-700 dark:text-yellow-300">
                            <strong>Note:</strong> This charge includes prorated adjustments for your plan change. 
                            Your regular monthly billing will be ${billingPreview.monthlyAmount.toFixed(2)}.
                          </p>
                        </div>
                      )}
                      
                      <Divider className="my-3" />
                      
                      {/* Next Billing */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            Next billing date
                          </span>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-50">
                            {billingPreview.nextBillingDate 
                              ? new Date(billingPreview.nextBillingDate).toLocaleDateString('en-US', {
                                  month: 'long',
                                  day: 'numeric',
                                  year: 'numeric'
                                })
                              : 'N/A'
                            }
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            Monthly charge
                          </span>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-50">
                            ${billingPreview.monthlyAmount.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Note about separate billing */}
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg mt-3">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          <strong>Note:</strong> Phone numbers and other add-ons are billed separately 
                          and will appear as additional line items on your invoice.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* New Subscription Trial */}
                      <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <RiCheckLine className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                          <span className="font-medium text-indigo-900 dark:text-indigo-100">
                            14-Day Free Trial
                          </span>
                        </div>
                        <p className="text-sm text-indigo-700 dark:text-indigo-300">
                          Start with a free trial. Cancel anytime during the trial period to avoid any charges.
                        </p>
                      </div>
                      
                      {/* Free Trial */}
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          14-day free trial
                        </span>
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">
                          $0.00
                        </span>
                      </div>
                      
                      <Divider className="my-3" />
                      
                      {/* Due Today */}
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-900 dark:text-gray-50">
                          Due today
                        </span>
                        <span className="font-bold text-lg text-green-600 dark:text-green-400">
                          $0.00
                        </span>
                      </div>
                      
                      <Divider className="my-3" />
                      
                      {/* Trial End / Billing Start */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            Trial ends
                          </span>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-50">
                            {billingPreview.trialEndDate 
                              ? new Date(billingPreview.trialEndDate).toLocaleDateString('en-US', {
                                  month: 'long',
                                  day: 'numeric',
                                  year: 'numeric'
                                })
                              : 'N/A'
                            }
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            First billing charge
                          </span>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-50">
                            ${billingPreview.firstBillingAmount?.toFixed(2) || billingPreview.monthlyAmount.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                      Calculating billing...
                    </span>
                  </div>
                )}
              </Card>

              {/* Payment Method Section */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                    Payment Method
                  </h3>
                  {hasPaymentMethods && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleAddPaymentMethod}
                    >
                      Add New
                    </Button>
                  )}
                </div>

                {hasPaymentMethods ? (
                  <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <RiBankCardLine className="h-6 w-6 text-gray-500" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-gray-50">
                        {formatCardBrand(defaultPaymentMethod.card?.brand || defaultPaymentMethod.brand)} 
                        ••••{defaultPaymentMethod.card?.last4 || defaultPaymentMethod.last4}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Expires {defaultPaymentMethod.card?.exp_month || defaultPaymentMethod.exp_month}/
                        {defaultPaymentMethod.card?.exp_year || defaultPaymentMethod.exp_year}
                      </div>
                    </div>
                    {defaultPaymentMethod.isDefault && (
                      <span className="text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-full">
                        Default
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <RiBankCardLine className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="font-medium text-gray-900 dark:text-gray-50 mb-2">
                      No payment method found
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Add a payment method to complete your subscription
                    </p>
                    <Button
                      onClick={handleAddPaymentMethod}
                    >
                      Add Payment Method
                    </Button>
                  </div>
                )}
              </Card>

              {/* Terms and Action Buttons */}
              {hasPaymentMethods && (
                <>
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {billingPreview?.isTrial ? (
                        <>
                          <p className="mb-2">
                            <strong>Free Trial:</strong> {billingPreview.isChangingPlan 
                              ? 'Your trial will continue with the updated plan. No charges until your trial ends.'
                              : 'Start with a 14-day free trial. You can cancel anytime during the trial period.'
                            }
                          </p>
                          <p>
                            After the trial ends on {billingPreview.trialEndDate 
                              ? new Date(billingPreview.trialEndDate).toLocaleDateString('en-US', {
                                  month: 'long',
                                  day: 'numeric',
                                  year: 'numeric'
                                })
                              : 'the trial end date'
                            }, you'll be charged ${billingPreview.firstBillingAmount?.toFixed(2) || billingPreview.monthlyAmount.toFixed(2)} for the base plan. 
                            Cancel anytime with no long-term commitments.
                          </p>
                        </>
                      ) : isChangingPlan ? (
                        <>
                          <p className="mb-2">
                            <strong>Plan Change:</strong> Your plan will be updated immediately. 
                            You'll be charged a prorated amount for the difference.
                          </p>
                          <p>
                            Your next billing cycle will be at the new plan rate of {selectedPlan.price}/month.
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="mb-2">
                            <strong>Free Trial:</strong> Start with a 14-day free trial. 
                            You can cancel anytime during the trial period.
                          </p>
                          <p>
                            After the trial, you'll be charged {selectedPlan.price}/month. 
                            Cancel anytime with no long-term commitments.
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="secondary"
                      onClick={onBack}
                      disabled={isProcessing}
                      className="flex-1"
                    >
                      Back to Plans
                    </Button>
                    <Button
                      onClick={handleConfirmCheckout}
                      disabled={isProcessing}
                      className="flex-1"
                    >
                      {isProcessing ? (
                        <>
                          <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </>
                      ) : billingPreview?.isTrial ? (
                        billingPreview.isChangingPlan 
                          ? `Update to ${selectedPlan.name}`
                          : `Start ${selectedPlan.name} Trial`
                      ) : isChangingPlan ? (
                        `Switch to ${selectedPlan.name}`
                      ) : (
                        `Start ${selectedPlan.name} Trial`
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 