'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/Button';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Icons } from '@/components/icons'; // Import icons
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton

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

// Helper function to get card icon 
const getCardBrandIcon = (brand: string) => {
  const brandLower = (brand || '').toLowerCase();
  // Assuming Icons.billing is a generic card icon. Add specific brand icons to Icons if needed.
  // Adjust size/classes as needed for your icon set
  return <Icons.billing className="h-5 w-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />;
};

// Helper function to format brand name
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


export function PaymentMethodDisplay({ 
  renewalDate, // renewalDate is available but currently unused in the primary display
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
     // ... fetch logic ...
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch('/api/billing/payment-methods');
        const data = await response.json();
        if (data.success) {
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

  const goToSettings = () => {
    router.push('/dashboard/settings?tab=billing');
  };

  // Loading State
  if (isLoading) {
    return (
      // Simplified skeleton for compact view
      <div className="p-3 rounded-lg border border-border bg-background flex items-center space-x-3">
        <Skeleton className="h-6 w-6 rounded" /> 
        <div className="space-y-1.5 flex-grow">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        {showDetailsButton && <Skeleton className="h-7 w-16 rounded-xl" />} 
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      // Using Card for better visual separation of error state
      <Card className="p-3 border-orange-300 bg-orange-50 dark:border-orange-700 dark:bg-orange-900/20">
         <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
           <p className="text-sm text-orange-700 dark:text-orange-300 flex-grow">{error}</p>
            {showDetailsButton && (
              <Button 
                 variant="light" // Using light variant
                 size="sm" 
                 className="mt-1 sm:mt-0 flex-shrink-0 border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-900/40" 
                 onClick={goToSettings}
              >
                Retry / Settings
              </Button>
            )}
         </div>
      </Card>
    );
  }

  // No Payment Method State
  if (!defaultPaymentMethod) {
     return (
      // Using Card for better visual separation
      <Card className="p-3 border-yellow-300 bg-yellow-50 dark:border-yellow-600 dark:bg-yellow-900/20">
         <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex-grow">
                 <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">No Default Payment Method Found</h3>
                 <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-0.5">
                     Add a payment method to keep phone numbers active.
                 </p>
             </div>
           {showDetailsButton && (
              <Button 
                 variant="light" // Using light variant
                 size="sm" 
                 className="mt-1 sm:mt-0 flex-shrink-0 border-yellow-300 text-yellow-800 hover:bg-yellow-100 dark:border-yellow-600 dark:text-yellow-200 dark:hover:bg-yellow-800/40" 
                 onClick={goToSettings}
              >
               Add Method
             </Button>
           )}
         </div>
       </Card>
     );
  }

  // Default Payment Method Found State - Compact UI
  return (
    // Using div with border for a less heavy look than Card
    <div className="p-3 rounded-lg border border-border bg-background">
      <div className="flex items-center justify-between gap-3">
        {/* Left side: Icon + Details */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {getCardBrandIcon(defaultPaymentMethod.card.brand)}
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {formatCardBrand(defaultPaymentMethod.card.brand)} ending in {defaultPaymentMethod.card.last4}
            </p>
            <p className="text-xs text-muted-foreground">
              Expires {defaultPaymentMethod.card.exp_month}/{defaultPaymentMethod.card.exp_year}
            </p>
          </div>
        </div>
        {/* Right side: Button */}
        {showDetailsButton && (
          <Button 
             variant="light" // Use light variant for less emphasis
             size="sm" 
             className="flex-shrink-0" 
             onClick={goToSettings}
           >
            Change
          </Button>
        )}
      </div>
    </div>
  );
}
