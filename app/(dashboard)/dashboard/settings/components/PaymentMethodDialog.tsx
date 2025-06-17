import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';

interface PaymentMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'add' | 'delete';
  paymentMethodId?: string;
  paymentMethodDetails?: {
    brand: string;
    last4: string;
  };
  onConfirm: () => Promise<void>;
}

export function PaymentMethodDialog({
  open,
  onOpenChange,
  type,
  paymentMethodId,
  paymentMethodDetails,
  onConfirm,
}: PaymentMethodDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = async () => {
    try {
      setIsProcessing(true);
      await onConfirm();
      // The parent component will handle success and error messages
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in the parent component
      console.error('Error in payment method action:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Guard against invalid state
  if (type === 'delete' && (!paymentMethodId || !paymentMethodDetails)) {
    return null;
  }

  // Format the card details safely
  const formatCardDetails = () => {
    if (!paymentMethodDetails) return '';
    
    // Common card brands with better display names
    const brandMap: Record<string, string> = {
      'visa': 'Visa',
      'mastercard': 'Mastercard',
      'amex': 'American Express',
      'discover': 'Discover',
      'jcb': 'JCB',
      'diners': 'Diners Club',
      'unionpay': 'UnionPay'
    };
    
    let displayBrand = 'Card';
    if (paymentMethodDetails.brand) {
      displayBrand = brandMap[paymentMethodDetails.brand.toLowerCase()] || 
                    paymentMethodDetails.brand.charAt(0).toUpperCase() + 
                    paymentMethodDetails.brand.slice(1);
    }
    
    const last4 = paymentMethodDetails.last4 || '****';
    
    return `${displayBrand} ending in ${last4}`;
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !isProcessing && onOpenChange(value)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {type === 'add' ? 'Add New Payment Method' : 'Delete Payment Method'}
          </DialogTitle>
          <DialogDescription>
            {type === 'add' 
              ? 'You are about to add a new payment method to your account.' 
              : `You are about to delete the payment method: ${formatCardDetails()}.`}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {type === 'add' ? (
            <>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Adding a new payment method will:
              </p>
              <ul className="mt-2 ml-5 list-disc text-sm text-neutral-500 dark:text-neutral-400 space-y-1">
                <li>Allow you to purchase phone numbers</li>
                <li>Enable automatic billing for your subscription</li>
                <li>Make future purchases simpler without re-entering your card</li>
              </ul>
              <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
                Your payment information is securely processed and stored by Stripe. 
                We never store your full card details on our servers.
              </p>
            </>
          ) : (
            <>
              <div className="rounded-xl bg-yellow-50 p-4 dark:bg-yellow-900/20">
                <div className="flex">
                  <Icons.warning className="h-5 w-5 text-yellow-400 dark:text-yellow-500" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                      Warning
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                      <p>
                        Deleting this payment method may have the following consequences:
                      </p>
                      <ul className="mt-1 list-disc pl-5 space-y-1">
                        <li>Subscription payments may fail if this is your only payment method</li>
                        <li>Phone numbers may be suspended if payment can't be processed</li>
                        <li>You'll need to add a new payment method for future purchases</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
                This action cannot be undone. Are you sure you want to proceed?
              </p>
            </>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="light" 
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button 
            variant={type === 'delete' ? 'destructive' : 'primary'}
            onClick={handleConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2"></div>
                {type === 'add' ? 'Processing...' : 'Deleting...'}
              </>
            ) : (
              type === 'add' ? 'Continue to Payment' : 'Delete Payment Method'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 