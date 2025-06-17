'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/Button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableRow 
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { RiAddLine, RiDeleteBin6Line, RiCheckboxCircleFill } from '@remixicon/react';

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

interface PaymentMethodsSectionProps {
  onAddPaymentMethod: () => void;
  onDeletePaymentMethod: (id: string, details: { brand: string; last4: string }) => void;
  isLoading?: boolean;
}

// Loading component with neutral theme
function PaymentMethodsLoading() {
  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-start sm:justify-between sm:space-x-10">
        <div>
          <h2 className="font-semibold text-neutral-900 dark:text-neutral-50">
            Payment method
          </h2>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-600 mb-4"></div>
        <h3 className="text-base font-medium text-neutral-900 dark:text-neutral-50 mb-2">
          Loading payment methods
        </h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center">
          Please wait while we retrieve your saved payment methods.
        </p>
      </div>
    </div>
  );
}

export function PaymentMethodsSection({ 
  onAddPaymentMethod, 
  onDeletePaymentMethod,
  isLoading = false 
}: PaymentMethodsSectionProps) {
  const { data: session } = useSession();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isPaymentMethodsLoading, setIsPaymentMethodsLoading] = useState(true);

  // All hooks must come before any conditional returns
  useEffect(() => {
    if (!isLoading) {
      fetchPaymentMethods();
    }
  }, [isLoading]);

  const fetchPaymentMethods = async () => {
    try {
      setIsPaymentMethodsLoading(true);
      const response = await fetch('/api/billing/payment-methods');
      const data = await response.json();
      
      if (data.success) {
        setPaymentMethods(data.paymentMethods);
      } else {
        toast.error('Failed to load payment methods');
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      toast.error('Failed to load payment methods');
    } finally {
      setIsPaymentMethodsLoading(false);
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

  const handleSetDefault = async (paymentMethodId: string) => {
    try {
      const response = await fetch('/api/billing/set-default-payment-method', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethodId }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Default payment method updated');
        fetchPaymentMethods();
      } else {
        toast.error(data.message || 'Failed to update default payment method');
      }
    } catch (error) {
      console.error('Error setting default payment method:', error);
      toast.error('Failed to update default payment method');
    }
  };

  // Show loading state from parent
  if (isLoading) {
    return <PaymentMethodsLoading />;
  }

  // Show loading state from internal fetch
  if (isPaymentMethodsLoading) {
    return (
      <div className="space-y-6">
        <div className="sm:flex sm:items-start sm:justify-between sm:space-x-10">
          <div>
            <h2 className="font-semibold text-neutral-900 dark:text-neutral-50">
              Payment method
            </h2>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-600 mb-4"></div>
          <h3 className="text-base font-medium text-neutral-900 dark:text-neutral-50 mb-2">
            Loading payment methods
          </h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center">
            Please wait while we retrieve your saved payment methods.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-start sm:justify-between sm:space-x-10">
        <div>
          <h2 className="font-semibold text-neutral-900 dark:text-neutral-50">
            Payment method
          </h2>
          <p className="mt-2 text-sm/6 text-neutral-500 dark:text-neutral-500">
            Payments will be taken from the card listed below, and you can
            update it by adding a new card through the menu on the right.
          </p>
        </div>
        <Button onClick={onAddPaymentMethod} className="mt-4 whitespace-nowrap">
          Add new card
        </Button>
      </div>

      {paymentMethods.length === 0 ? (
        <div className="text-center py-8">
          <div className="flex justify-center mb-4">
            <svg className="h-12 w-12 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <h4 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50 mb-2">
            No payment methods
          </h4>
          <p className="text-sm text-neutral-500 dark:text-neutral-500 mb-6">
            Add a payment method to manage your subscription and purchase phone numbers.
          </p>
          <Button onClick={onAddPaymentMethod}>
            <RiAddLine className="h-4 w-4 mr-2" />
            Add your first payment method
          </Button>
        </div>
      ) : (
        <Table className="mt-10">
          <TableHead>
            <TableRow className="border-b border-neutral-200 dark:border-neutral-800">
              <TableCell className="text-xs font-medium uppercase text-neutral-500 dark:text-neutral-500">
                Provider
              </TableCell>
              <TableCell className="text-xs font-medium uppercase text-neutral-500 dark:text-neutral-500">
                Status
              </TableCell>
              <TableCell className="text-xs font-medium uppercase text-neutral-500 dark:text-neutral-500">
                Type
              </TableCell>
              <TableCell className="text-xs font-medium uppercase text-neutral-500 dark:text-neutral-500">
                Number (Last 4)
              </TableCell>
              <TableCell className="text-xs font-medium uppercase text-neutral-500 dark:text-neutral-500">
                Exp. Date
              </TableCell>
              <TableCell className="text-right text-xs font-medium uppercase text-neutral-500 dark:text-neutral-500">
                <span className="sr-only">Edit</span>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paymentMethods.map((method) => (
              <TableRow key={method.id}>
                <TableCell className="py-2.5">
                  {formatCardBrand(method.card.brand)}
                </TableCell>
                <TableCell className="flex items-center gap-1.5 py-2.5">
                  <RiCheckboxCircleFill
                    className="size-4 text-emerald-500 dark:text-emerald-500"
                    aria-hidden={true}
                  />
                  {method.isDefault ? 'Default' : 'Active'}
                </TableCell>
                <TableCell className="py-2.5">Credit</TableCell>
                <TableCell className="py-2.5">{method.card.last4}</TableCell>
                <TableCell className="py-2.5">
                  {method.card.exp_month}/{method.card.exp_year}
                </TableCell>
                <TableCell className="py-2.5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {!method.isDefault && (
                      <button
                        onClick={() => handleSetDefault(method.id)}
                        className="font-medium text-neutral-600 hover:text-neutral-500 dark:text-neutral-400 dark:hover:text-neutral-300"
                      >
                        Set Default
                      </button>
                    )}
                    {method.isDefault ? (
                      <Tooltip>
                        <TooltipTrigger>
                          <span
                            className="font-medium text-neutral-400 cursor-not-allowed dark:text-neutral-600"
                          >
                            Cannot Delete
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">
                            This is your default payment method and cannot be deleted while you have an active subscription. 
                            Add another payment method and set it as default to delete this one.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <button
                        onClick={() => onDeletePaymentMethod(method.id, {
                          brand: method.card.brand,
                          last4: method.card.last4
                        })}
                        className="font-medium text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
} 