import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Icons } from '@/components/icons';
import { addMonths, formatDate } from '@/lib/date-utils';
import { formatPrice } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, CheckCircle, AlertCircle, CreditCard, Info, Calendar, DollarSign } from "lucide-react";
import axios from "axios";
import { Divider } from "@/components/Divider";
import { RiInformationLine } from "@remixicon/react";
// Remove simple-icons import and define paths directly

// Type definitions
interface PaymentMethod {
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
}

// SVG paths for credit card brands
const CARD_SVG_PATHS = {
  visa: "M9.112 8.262L5.97 15.758H3.92L2.374 9.775c-.094-.368-.175-.503-.461-.658C1.447 8.864.677 8.627 0 8.479l.046-.217h3.3c.42 0 .798.284.893.778l.817 4.344 2.018-5.122h2.038zm15.149 5.02c.008-1.979-2.736-2.088-2.717-2.972.006-.269.262-.555.822-.628.278-.035 1.043-.064 1.911.332l.34-1.59a5.063 5.063 0 00-1.814-.333c-1.917 0-3.266 1.02-3.278 2.479-.012 1.079.963 1.68 1.698 2.04.756.366 1.01.602 1.006.93-.005.502-.603.725-1.16.734-.975.015-1.54-.263-1.992-.474l-.351 1.642c.453.208 1.289.39 2.156.399 2.037 0 3.37-1.006 3.379-2.56zm5.065 2.476h1.75l-1.526-7.514h-1.616c-.365 0-.672.213-.809.541l-2.835 6.973h1.988l.394-1.09h2.425l.23 1.09zm-2.111-2.524l.996-2.75.574 2.75h-1.57zm-7.965-4.99l-1.568 7.514H16.69l1.567-7.514h-1.997z",
  mastercard: "M7.266 2.171v.913a5.81 5.81 0 00-4.485 5.946 5.81 5.81 0 004.485 5.947v.914C3.347 15.1.5 11.434.5 7.345.5 3.256 3.347-.41 7.266-.41v2.581zm17.234 12.04c-2.055 0-3.793-.62-4.491-.916a5.816 5.816 0 001.37-3.74 5.816 5.816 0 00-1.37-3.741c.698-.295 2.436-.914 4.49-.914 3.92 0 6.766 3.665 6.766 7.755 0 4.089-2.846 7.755-6.765 7.755v-2.582c2.38 0 4.304-2.371 4.304-5.173 0-2.803-1.924-5.173-4.304-5.173zm-9.983-5.859c-.176 0-.348.017-.516.05h1.03c-.168-.033-.34-.05-.514-.05zm8.925 11.818v-.913a5.81 5.81 0 004.485-5.947 5.81 5.81 0 00-4.485-5.946v-.914c3.919 2.582 6.766 6.248 6.766 10.337 0 4.089-2.847 7.754-6.766 7.754V20.17zM14.517 6.2a7.175 7.175 0 00-7.172 7.17 7.175 7.175 0 007.172 7.172 7.175 7.175 0 007.172-7.172A7.175 7.175 0 0014.517 6.2zm-7.25 1.202c.698.295 2.436.914 4.49.914 2.054 0 3.792-.619 4.49-.914a5.816 5.816 0 00-1.37 3.74 5.816 5.816 0 001.37 3.741c-.698.296-2.436.916-4.49.916-2.054 0-3.792-.62-4.49-.916a5.816 5.816 0 001.37-3.74 5.816 5.816 0 00-1.37-3.74z",
  amex: "M22.588 10.81h-1.433v-5.01L18.173 10.81h-1.64V4.346h2.23l.29 1.016h2.35c.58 0 1.341.664 1.341 1.37v4.078h-.155m-8.138 0v-2.133l-3.692-4.331h2.538l1.075 1.486 1.072-1.486h2.354l-3.349 4.331V10.81h-.001v.001h-.997v-.002m-5.225-5.04v.977h2.538v1.156H9.225v.978h2.77l1.476-1.556-1.476-1.555H9.225m.081 5.04h-2.77v-.002H2.455V4.344h2.693c1.4 0 2.27 1.447 2.27 1.447S8.9 4.347 9.724 4.347h2.539L14.42 6.41l-2.158 2.211h-.958l2.77 2.19h-4.77v-.001",
  discover: "M2.971 3.678C1.404 3.678 0 4.531 0 6.56v10.8c0 1.958 1.295 2.86 2.973 2.86h18.055c1.786 0 2.972-.913 2.972-2.86V6.56c0-2.018-1.404-2.882-2.972-2.882H2.971zm17.63 5.094c-1.69 0-3.055 1.355-3.055 3.028 0 1.672 1.366 3.026 3.055 3.026 1.69 0 3.055-1.354 3.055-3.026 0-1.673-1.366-3.028-3.055-3.028zm0 4.96c-1.09 0-1.972-.867-1.972-1.932 0-1.067.883-1.934 1.972-1.934 1.09 0 1.973.867 1.973 1.934 0 1.065-.884 1.933-1.973 1.933zM8.43 8.772a3.03 3.03 0 00-3.035 3.028c0 1.672 1.356 3.026 3.035 3.026 1.679 0 3.035-1.354 3.035-3.026a3.03 3.03 0 00-3.035-3.028zm1.212 3.068l-1.081.435v-.052c0-.507-.348-.842-.883-.842-.627 0-1.138.496-1.138 1.108s.51 1.108 1.138 1.108c.399 0 .697-.153.883-.465l.742.403c-.32.61-.953.96-1.625.96-1.09 0-1.972-.866-1.972-1.935 0-1.066.883-1.934 1.972-1.934.812 0 1.438.465 1.69 1.108l.274.106m4.23-3.059h-1.138v6.091h1.138V8.782m-2.648.071h-1.128l-2.235 3.966-2.236-3.966h-1.13v6.01h1.083v-4.208l1.863 3.206h.708l1.863-3.206v4.208h1.212v-6.01M20.6 14.774v-5.102h-1.066v.03c-.348-.071-.706-.071-1.055-.071-1.782 0-3.237 1.354-3.237 3.027 0 1.116.57 2.13 1.49 2.627l-.905 2.155h1.218l.786-1.863h1.628c.22 0 .441-.01.673-.03v1.893h1.219v-1.893h1.066v-.773H20.6z"
};

interface PurchaseConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phoneNumber: string | null;
  monthlyCost: number;
  selectedAgentId?: string | null;
  onConfirm?: () => Promise<boolean>;
}

type PurchaseState = 
  | "idle" 
  | "checking_payment" 
  | "confirming"
  | "ready_to_pay"
  | "processing"
  | "success"
  | "error";

// Define constants for the state values to avoid TypeScript literal comparison issues
const PROCESSING_STATE = "processing" as PurchaseState;

/**
 * Card Brand Icon Component
 * Returns SVG icon for credit card brands
 */
const getCardBrandIcon = (brand: string) => {
  const brandLower = (brand || '').toLowerCase();
  
  // Define colors for both light and dark modes
  const getBrandColors = () => {
    switch (brandLower) {
      case 'visa':
        return {
          bg: 'bg-[#1434CB] dark:bg-[#1434CB]',
          textColor: 'text-white',
          iconColor: '#FFFFFF'
        };
      case 'mastercard':
        return {
          bg: 'bg-[#1A1F71] dark:bg-[#1A1F71]',
          textColor: 'text-white',
          iconColor: '#FF5F00'
        };
      case 'amex':
      case 'american express':
        return {
          bg: 'bg-[#2E77BC] dark:bg-[#2E77BC]',
          textColor: 'text-white',
          iconColor: '#FFFFFF'
        };
      case 'discover':
        return {
          bg: 'bg-[#FF6000] dark:bg-[#FF6000]',
          textColor: 'text-white',
          iconColor: '#FFFFFF'
        };
      default:
        return {
          bg: 'bg-gray-200 dark:bg-gray-700',
          textColor: 'text-gray-700 dark:text-gray-200',
          iconColor: 'currentColor'
        };
    }
  };

  const { bg, textColor, iconColor } = getBrandColors();
  const iconClassName = "h-4 w-4";
  const containerClass = `flex items-center justify-center h-10 w-10 rounded-full mr-3 ${bg}`;

  switch (brandLower) {
    case 'visa':
      return (
        <div className={containerClass}>
          <svg className={`${iconClassName} ${textColor}`} viewBox="0 0 24 24" fill={iconColor}>
            <path d={CARD_SVG_PATHS.visa} />
          </svg>
        </div>
      );
    case 'mastercard':
      return (
        <div className={containerClass}>
          <svg className={`${iconClassName} ${textColor}`} viewBox="0 0 24 24" fill={iconColor}>
            <path d={CARD_SVG_PATHS.mastercard} />
          </svg>
        </div>
      );
    case 'amex':
    case 'american express':
      return (
        <div className={containerClass}>
          <svg className={`${iconClassName} ${textColor}`} viewBox="0 0 24 24" fill={iconColor}>
            <path d={CARD_SVG_PATHS.amex} />
          </svg>
        </div>
      );
    case 'discover':
      return (
        <div className={containerClass}>
          <svg className={`${iconClassName} ${textColor}`} viewBox="0 0 24 24" fill={iconColor}>
            <path d={CARD_SVG_PATHS.discover} />
          </svg>
        </div>
      );
    default:
      return (
        <div className={containerClass}>
          <CreditCard className="h-5 w-5 text-gray-500 dark:text-gray-300" />
        </div>
      );
  }
};

/**
 * Helper function to format card brand names
 */
const formatCardBrand = (brand?: string) => {
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
  
  const lowercaseBrand = brand.toLowerCase();
  return brandMap[lowercaseBrand] || brand.charAt(0).toUpperCase() + brand.slice(1);
};

/**
 * Helper function to detect country from phone number
 */
const detectCountryFromPhoneNumber = (phoneNumber: string): string => {
  if (!phoneNumber.startsWith('+')) return 'US';
  
  // Remove the + and get the first few digits
  const number = phoneNumber.substring(1);
  
  // Common country codes
  if (number.startsWith('1787') || number.startsWith('1939')) return 'PR'; // Puerto Rico
  if (number.startsWith('1')) return 'US'; // United States
  if (number.startsWith('44')) return 'GB'; // United Kingdom
  if (number.startsWith('33')) return 'FR'; // France
  if (number.startsWith('49')) return 'DE'; // Germany
  if (number.startsWith('34')) return 'ES'; // Spain
  if (number.startsWith('39')) return 'IT'; // Italy
  if (number.startsWith('61')) return 'AU'; // Australia
  if (number.startsWith('81')) return 'JP'; // Japan
  
  // Default to US if we can't detect
  return 'US';
};

/**
 * Main Purchase Confirmation Dialog Component
 */
export function PurchaseConfirmationDialog({
  open,
  onOpenChange,
  phoneNumber,
  monthlyCost,
  selectedAgentId,
  onConfirm
}: PurchaseConfirmationDialogProps) {
  const { toast } = useToast();
  const [purchaseState, setPurchaseState] = useState<PurchaseState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [purchasedPhoneNumber, setPurchasedPhoneNumber] = useState<string | null>(null);
  const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(false);
  const [hasPaymentMethod, setHasPaymentMethod] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState<{
    renewalDate: Date | null;
    proratedAmount: number;
    daysRemaining: number;
    totalDays: number;
    subscriptionStatus?: string;
  } | null>(null);
  const router = useRouter();
  
  // When we pass phoneNumber to StripePaymentForm, ensure it's a string
  const safePhoneNumber = phoneNumber || '';

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
    
    if (!open) {
      // Small delay to avoid visual flickering when closing
      setTimeout(() => {
        setPurchaseState("idle");
        setErrorMessage(null);
        setSubscriptionInfo(null);
      }, 300);
    }
  };

  // Check payment methods and subscription info when dialog opens
  useEffect(() => {
    if (open) {
      setPurchaseState("checking_payment");
      setErrorMessage(null);
      checkPaymentMethodsAndSubscription();
    }
  }, [open]);

  /**
   * Check if user has existing payment methods and subscription info
   */
  const checkPaymentMethodsAndSubscription = async () => {
    setIsLoadingPaymentMethods(true);
    try {
      // Fetch both payment methods and subscription info in parallel
      const [paymentResponse, subscriptionResponse] = await Promise.all([
        axios.get("/api/billing/payment-methods"),
        axios.get("/api/billing/subscription-info")
      ]);
      
      const methods = paymentResponse.data.paymentMethods || [];
      console.log("Payment methods fetched:", JSON.stringify(methods, null, 2));
      setPaymentMethods(methods);
      
      // Calculate proration based on subscription info
      if (subscriptionResponse.data.subscription) {
        const subscription = subscriptionResponse.data.subscription;
        const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
        const currentPeriodStart = new Date(subscription.current_period_start * 1000);
        
        // For trial subscriptions, we need to calculate based on the actual billing period (monthly)
        // not the trial period duration
        let totalDaysInPeriod = Math.ceil((currentPeriodEnd.getTime() - currentPeriodStart.getTime()) / (1000 * 60 * 60 * 24));
        let daysRemaining = Math.ceil((currentPeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        
        // Special handling for trial subscriptions
        if (subscription.status === 'trialing') {
          // For trials, use a standard 30-day billing period for proration calculation
          // since the user will be billed monthly after the trial ends
          totalDaysInPeriod = 30; // Standard monthly billing period
          // Keep the actual days remaining in trial for display
        }
        
        const proratedAmount = (monthlyCost * daysRemaining / totalDaysInPeriod);
        
        console.log('[Proration Debug]', {
          subscriptionStatus: subscription.status,
          originalPeriod: Math.ceil((currentPeriodEnd.getTime() - currentPeriodStart.getTime()) / (1000 * 60 * 60 * 24)),
          adjustedTotalDays: totalDaysInPeriod,
          daysRemaining,
          monthlyCost,
          proratedAmount: proratedAmount.toFixed(2)
        });
        
        setSubscriptionInfo({
          renewalDate: currentPeriodEnd,
          proratedAmount,
          daysRemaining,
          totalDays: totalDaysInPeriod,
          subscriptionStatus: subscription.status
        });
      }
      
      if (methods.length > 0) {
        setHasPaymentMethod(true);
        // Find default payment method or use the first one
        const defaultMethod = methods.find((m: PaymentMethod) => m.isDefault) || methods[0];
        console.log("Selected payment method:", JSON.stringify(defaultMethod, null, 2));
        
        setSelectedPaymentMethod(defaultMethod);
        setPurchaseState("confirming");
      } else {
        setHasPaymentMethod(false);
        setPurchaseState("error");
        setErrorMessage("You need a payment method to purchase phone numbers.");
      }
    } catch (error: any) {
      console.error("Error checking payment methods and subscription:", error);
      
      if (error.response?.status === 404 || error.response?.data?.error?.includes("subscription")) {
        setErrorMessage("You need an active subscription to purchase phone numbers.");
      } else {
        setErrorMessage("Failed to load payment methods. Please try again.");
      }
      setPurchaseState("error");
    } finally {
      setIsLoadingPaymentMethods(false);
    }
  };

  /**
   * Handle purchase with existing payment method
   * Creates a Twilio subaccount if user doesn't have one
   */
  const handlePurchaseWithExistingMethod = async () => {
    if (!selectedPaymentMethod) {
      setErrorMessage("No payment method selected");
      return;
    }

    setPurchaseState("processing");
    console.log("Starting purchase with existing payment method for:", safePhoneNumber);

    try {
      // FIXED: Do the actual purchase FIRST, then call onConfirm only if successful
        console.log("Making direct API call to purchase phone number:", {
          phoneNumber: safePhoneNumber,
          monthlyCost,
          selectedAgentId: selectedAgentId
        });
        
          const response = await axios.post("/api/twilio/phone-numbers", {
            phoneNumber: safePhoneNumber,
            monthlyPrice: monthlyCost,
            country: detectCountryFromPhoneNumber(safePhoneNumber),
            selectedAgentId: selectedAgentId || null,
          });

          console.log("Phone number purchase API response:", response.data);

          if (response.data.success) {
            // Refresh phone number status to ensure it's properly provisioned
            try {
              await axios.post("/api/twilio/phone-numbers/refresh-all-statuses");
              console.log("Refreshed phone number statuses");
            } catch (refreshError) {
              console.warn("Failed to refresh phone number statuses:", refreshError);
              // Continue anyway as this is not critical
            }
            
            setPurchasedPhoneNumber(safePhoneNumber);
            setPurchaseState("success");
        
        // ONLY call onConfirm after successful purchase
        if (onConfirm) {
          try {
            console.log("Calling onConfirm after successful purchase");
            await onConfirm();
          } catch (onConfirmError) {
            console.warn("onConfirm callback failed, but purchase was successful:", onConfirmError);
            // Don't fail the entire process if onConfirm fails
          }
        }
        
            toast({
              title: "Success",
              description: 'Phone number purchased successfully!',
            });
          } else {
            console.error("API returned success: false", response.data);
            throw new Error(response.data.error || "Failed to purchase phone number");
      }
    } catch (error: any) {
      console.error("Error purchasing phone number:", error);
      
      // Check if the error indicates a missing payment method
      if (error.response?.data?.requiresPaymentMethod) {
        setErrorMessage(error.response.data.error || "You need a payment method to purchase phone numbers.");
        setPurchaseState("error");
        
        toast({
          title: "Payment Method Required",
          description: "Please add a payment method to purchase phone numbers. Go to Settings > Billing to add one.",
          variant: "destructive",
        });
        return;
      }
      
      // Extract most informative error message
      let errorMsg = "Failed to purchase phone number. Please try again.";
      
      if (error.response?.data?.error) {
        errorMsg = error.response.data.error;
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      // Log detailed error for debugging
      console.error("Purchase error details:", {
        message: errorMsg,
        responseData: error.response?.data,
        status: error.response?.status
      });
      
      setErrorMessage(errorMsg);
      setPurchaseState("error");
      
      toast({
        title: "Purchase Failed",
        description: errorMsg,
        variant: "destructive"
      });
    }
  };

  const handleRetry = () => {
    setPurchaseState("checking_payment");
    setErrorMessage(null);
    checkPaymentMethodsAndSubscription();
  };

  const handleClose = () => {
    if (purchaseState !== "processing") {
      onOpenChange(false);
    }
  };

  const handleCompleteSuccess = () => {
    onOpenChange(false);
    window.location.href = "/dashboard/phone-numbers";
  };

  const handleAddPaymentMethod = () => {
    // Redirect to settings to add payment method
    router.push("/dashboard/settings?tab=billing");
  };

  if (!phoneNumber && purchaseState !== 'success') {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px] dark:border-gray-800 max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground dark:text-gray-100">
            {purchaseState === "success"
              ? "Purchase Successful!"
              : purchaseState === "error"
              ? "Purchase Failed"
              : "Confirm Phone Number Purchase"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground dark:text-gray-400">
            {purchaseState === "success"
              ? `You've successfully purchased ${purchasedPhoneNumber || phoneNumber}`
              : purchaseState === "error"
              ? errorMessage || "An error occurred during the purchase process."
              : purchaseState === "checking_payment" || purchaseState === "processing"
              ? "Please wait while we process your request..."
              : subscriptionInfo
              ? `Pay ${formatPrice(subscriptionInfo.proratedAmount)} today, then ${formatPrice(monthlyCost)}/month starting ${formatDate(subscriptionInfo.renewalDate!)}`
              : "Confirm your phone number purchase"}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Loading state */}
          {purchaseState === "checking_payment" && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-foreground dark:text-gray-100">Checking payment information...</p>
            </div>
          )}

          {/* Confirmation state with existing payment method */}
          {purchaseState === "confirming" && selectedPaymentMethod && subscriptionInfo && (
            <div className="space-y-4">
              <div className="p-4 rounded-md border border-border dark:border-gray-700 bg-background dark:bg-gray-800">
                <h3 className="text-base font-medium text-foreground dark:text-gray-100 mb-4">Purchase Details</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Phone Number</span>
                    <span className="font-medium text-gray-900 dark:text-gray-50">{safePhoneNumber}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Monthly Cost</span>
                    <span className="font-medium text-gray-900 dark:text-gray-50">{formatPrice(monthlyCost)}</span>
                  </div>
                  
                  {subscriptionInfo && (
                    <>
                      <Divider />
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">Due Today (Prorated)</span>
                        <span className="font-semibold text-gray-900 dark:text-gray-50">{formatPrice(subscriptionInfo.proratedAmount)}</span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {subscriptionInfo.daysRemaining} of {subscriptionInfo.totalDays} days remaining in billing period
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Payment method card display */}
              <div className="p-4 rounded-md border border-border dark:border-gray-700 bg-background dark:bg-gray-800">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-base font-medium text-foreground dark:text-gray-100">Payment Method</h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleAddPaymentMethod} 
                    className="text-sm text-primary hover:text-primary/80"
                  >
                    Change
                  </Button>
                </div>
                <div className="flex items-center p-3 rounded-md bg-accent/50 dark:bg-gray-700">
                  {selectedPaymentMethod && (
                    (selectedPaymentMethod.card?.brand || selectedPaymentMethod.brand) 
                      ? getCardBrandIcon((selectedPaymentMethod.card?.brand || selectedPaymentMethod.brand) as string)
                      : getCardBrandIcon('default')
                  )}
                  <div className="flex flex-col justify-center">
                    <p className="font-medium text-foreground dark:text-gray-100 text-base">
                      {selectedPaymentMethod 
                        ? `${formatCardBrand(selectedPaymentMethod.card?.brand || selectedPaymentMethod.brand)} •••• ${selectedPaymentMethod.card?.last4 || selectedPaymentMethod.last4 || '****'}`
                        : 'Card •••• ****'
                      }
                    </p>
                    {selectedPaymentMethod && 
                     (selectedPaymentMethod.card?.exp_month || selectedPaymentMethod.exp_month) && 
                     (selectedPaymentMethod.card?.exp_year || selectedPaymentMethod.exp_year) && (
                      <p className="text-sm text-muted-foreground dark:text-gray-400 -mt-0.5">
                        Expires {selectedPaymentMethod.card?.exp_month || selectedPaymentMethod.exp_month}/
                        {((selectedPaymentMethod.card?.exp_year || selectedPaymentMethod.exp_year) || '').toString().slice(-2)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Information notice */}
              <div className="flex items-start p-3 rounded-md bg-blue-50 dark:bg-blue-900/20 text-sm text-blue-700 dark:text-blue-300">
                <Info className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium mb-1">How billing works:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    {subscriptionInfo.subscriptionStatus === 'trialing' ? (
                      <>
                        <li>You'll be charged {formatPrice(subscriptionInfo.proratedAmount)} today (prorated for {subscriptionInfo.daysRemaining} days of a 30-day period)</li>
                        <li>After your trial ends on {formatDate(subscriptionInfo.renewalDate!)}, {formatPrice(monthlyCost)} will be added to your monthly bill</li>
                        <li>The phone number will be available immediately and continue working after your trial</li>
                      </>
                    ) : (
                      <>
                        <li>You'll be charged {formatPrice(subscriptionInfo.proratedAmount)} today (prorated for {subscriptionInfo.daysRemaining} days)</li>
                        <li>Starting {formatDate(subscriptionInfo.renewalDate!)}, {formatPrice(monthlyCost)} will be added to your monthly bill</li>
                        <li>The phone number will be available immediately after purchase</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>

              {/* Add divider before important information */}
              <Divider className="my-3" />
              
              <div className="rounded-lg bg-indigo-50 dark:bg-indigo-900/20 p-3 border border-indigo-200 dark:border-indigo-800">
                <div className="flex">
                  <RiInformationLine className="h-5 w-5 text-indigo-400 flex-shrink-0" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-indigo-800 dark:text-indigo-200">
                      WhatsApp Configuration
                    </h3>
                    <p className="mt-1 text-xs text-indigo-700 dark:text-indigo-300">
                      After purchase, you can configure this phone number to work with WhatsApp for messaging your customers. Enable the WhatsApp integration from the integrations page to get started.
                    </p>
                  </div>
                </div>
              </div>

              {/* Purchase button */}
              <Button 
                className="w-full mt-4" 
                onClick={handlePurchaseWithExistingMethod}
                disabled={purchaseState === PROCESSING_STATE}
              >
                {purchaseState === PROCESSING_STATE ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                  </>
                ) : (
                  `Pay ${formatPrice(subscriptionInfo.proratedAmount)} Now`
                )}
              </Button>
            </div>
          )}

          {/* Success state */}
          {purchaseState === "success" && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
              <p className="text-lg font-semibold text-foreground dark:text-gray-100">Purchase Complete!</p>
              <p className="mt-2 text-muted-foreground dark:text-gray-400">
                Your new phone number {purchasedPhoneNumber || phoneNumber} is now active and ready to use.
              </p>
              <div className="mt-4 p-3 rounded-md bg-gray-50 dark:bg-gray-800 text-sm">
                <p className="text-muted-foreground dark:text-gray-400">
                  The phone number has been added to your subscription and will appear on your next invoice.
                </p>
              </div>
            </div>
          )}

          {/* Error state */}
          {purchaseState === "error" && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-16 w-16 text-destructive mb-4" />
              <p className="text-lg font-semibold text-foreground dark:text-gray-100">
                {errorMessage?.includes("payment method") ? "Payment Method Required" : "Purchase Failed"}
              </p>
              <p className="mt-2 text-muted-foreground dark:text-gray-400">
                {errorMessage || "An error occurred during the purchase process."}
              </p>
              {/* Show specific help for payment method issues */}
              {errorMessage?.includes("payment method") && (
                <Button
                  variant="primary"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    router.push("/dashboard/settings?tab=billing");
                  }}
                >
                  Add Payment Method
                </Button>
              )}
              {/* Show help for subscription issues */}
              {errorMessage?.includes("subscription") && (
                <Button
                  variant="primary"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    router.push("/dashboard/settings?tab=billing");
                  }}
                >
                  View Subscription
                </Button>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {/* Idle/checking footer */}
          {(purchaseState === "idle" || purchaseState === "checking_payment") && (
            <Button 
              variant="secondary" 
              onClick={() => handleClose()}
              disabled={isLoadingPaymentMethods}
            >
              Cancel
            </Button>
          )}

          {/* Confirming footer */}
          {purchaseState === "confirming" && (
            <Button 
              variant="secondary" 
              onClick={() => handleClose()}
              disabled={purchaseState === PROCESSING_STATE}
            >
              Cancel
            </Button>
          )}

          {/* Success footer */}
          {purchaseState === "success" && (
            <Button onClick={handleCompleteSuccess}>View My Phone Numbers</Button>
          )}

          {/* Error footer */}
          {purchaseState === "error" && (
            <div className="flex w-full space-x-2">
              <Button 
                variant="secondary" 
                onClick={() => handleClose()}
                className="flex-1"
              >
                Close
              </Button>
              {!errorMessage?.includes("payment method") && !errorMessage?.includes("subscription") && (
                <Button 
                  onClick={handleRetry}
                  className="flex-1"
                >
                  Try Again
                </Button>
              )}
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 