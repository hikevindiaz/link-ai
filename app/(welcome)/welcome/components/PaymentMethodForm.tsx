'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Title, Card, Text } from '@tremor/react';

interface PaymentMethodFormProps {
  clientSecret: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PaymentMethodForm({ clientSecret, onSuccess, onCancel }: PaymentMethodFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js has not loaded yet
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // Submit the form data to Stripe
      const { error } = await elements.submit();
      
      if (error) {
        setErrorMessage(error.message || 'An error occurred with your card details');
        setIsProcessing(false);
        return;
      }

      // Confirm the setup intent
      const { error: confirmError } = await stripe.confirmSetup({
        elements,
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/welcome`,
        },
        redirect: 'if_required',
      });

      if (confirmError) {
        setErrorMessage(confirmError.message || 'Failed to save your payment method');
      } else {
        // Success
        onSuccess();
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Title>Add Payment Method</Title>
        <Text>Enter your card details to add a new payment method.</Text>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <PaymentElement />

        {errorMessage && (
          <div className="text-sm text-red-500 font-medium">{errorMessage}</div>
        )}

        <div className="flex justify-end space-x-3 mt-4">
          <Button
            type="button"
            onClick={onCancel}
            variant="secondary"
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!stripe || isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Add Payment Method'}
          </Button>
        </div>
      </form>
    </div>
  );
} 