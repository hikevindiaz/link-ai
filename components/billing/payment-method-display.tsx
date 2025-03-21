'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/Button';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface PaymentMethod {
  id: string;
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  isDefault: boolean;
}

interface PaymentMethodDisplayProps {
  renewalDate?: string;
  showDetailsButton?: boolean;
}

export function PaymentMethodDisplay({ 
  renewalDate, 
  showDetailsButton = true 
}: PaymentMethodDisplayProps) {
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<PaymentMethod | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/billing/payment-methods');
      const data = await response.json();
      
      if (data.success) {
        // Find the default payment method
        const defaultMethod = data.paymentMethods?.find((method: PaymentMethod) => method.isDefault);
        setDefaultPaymentMethod(defaultMethod || null);
      } else {
        setError('Could not retrieve payment information');
      }
    } catch (error) {
      console.error('Failed to fetch payment methods:', error);
      setError('Failed to load payment information');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCardBrand = (brand: string) => {
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

  const goToSettings = () => {
    router.push('/dashboard/settings?tab=billing');
  };

  const displayRenewalInfo = () => {
    if (renewalDate) {
      if (defaultPaymentMethod) {
        return (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Your subscription will renew on {new Date(renewalDate).toLocaleDateString()} using {formatCardBrand(defaultPaymentMethod.card.brand)} ending in {defaultPaymentMethod.card.last4}.
          </p>
        );
      } else {
        return (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Your subscription will be cancelled on {new Date(renewalDate).toLocaleDateString()} if no payment method is added.
          </p>
        );
      }
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card className="p-4 mb-4 animate-pulse">
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4 mb-4 border-orange-300 bg-orange-50 dark:bg-orange-900/20">
        <p className="text-sm text-orange-600 dark:text-orange-400">{error}</p>
        {showDetailsButton && (
          <Button variant="light" className="mt-2" onClick={goToSettings}>
            Update Payment Method
          </Button>
        )}
      </Card>
    );
  }

  return (
    <Card className={`p-4 mb-4 ${!defaultPaymentMethod ? 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20' : ''}`}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">
            {defaultPaymentMethod 
              ? 'Payment Method' 
              : 'No Payment Method Found'}
          </h3>
          {showDetailsButton && (
            <Button variant="light" className="mt-2 text-sm py-1 px-3" onClick={goToSettings}>
              {defaultPaymentMethod ? 'Change' : 'Add Payment Method'}
            </Button>
          )}
        </div>
        
        {defaultPaymentMethod ? (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {formatCardBrand(defaultPaymentMethod.card.brand)} ending in {defaultPaymentMethod.card.last4}
            </p>
            {displayRenewalInfo()}
          </>
        ) : (
          <>
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              Add a payment method to maintain active phone numbers.
            </p>
            {displayRenewalInfo()}
          </>
        )}
      </div>
    </Card>
  );
} 