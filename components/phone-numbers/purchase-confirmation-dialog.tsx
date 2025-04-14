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
import { Loader2, CheckCircle, AlertCircle, CreditCard, Info } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import axios from "axios";
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

// Load Stripe outside of component to avoid recreating it on renders
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string
);

/**
 * Stripe Payment Form Component
 * Handles credit card input and payment submission
 */
function StripePaymentForm({
  phoneNumber,
  monthlyCost,
  clientSecret,
  selectedAgentId,
  onSuccess,
  onError,
}: {
  phoneNumber: string;
  monthlyCost: number;
  clientSecret: string;
  selectedAgentId: string | null;
  onSuccess: () => void;
  onError: (message: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      // Confirm the payment with Stripe
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/dashboard/phone-numbers`,
        },
        redirect: "if_required",
      });

      if (error) {
        console.error("Payment error:", error);
        onError(error.message || "An error occurred during payment processing");
        toast({
          title: "Payment Failed",
          description: error.message || "An error occurred during payment processing",
          variant: "destructive",
        });
        return;
      } 
      
      if (paymentIntent && paymentIntent.status === "succeeded") {
        console.log("Payment succeeded, completing phone number purchase");
        
        // After successful payment, make API call to provision the phone number
        try {
          console.log("Making phone number purchase API call with data:", {
            phoneNumber,
            monthlyPrice: monthlyCost,
            country: "US",
            selectedAgentId
          });
          
          const response = await axios.post("/api/twilio/phone-numbers", {
            phoneNumber: phoneNumber,
            monthlyPrice: monthlyCost,
            country: "US", // Default to US or extract from phoneNumber
            selectedAgentId: selectedAgentId || null,
            testMode: 'development_testing_mode', // Add test mode for free purchases
            // Add proper formatting for the API
            // Don't include any undefined or null values
          });
          
          console.log("Phone number purchase API response:", response.data);
          
          if (response.data.success) {
            onSuccess();
            toast({
              title: "Purchase Successful",
              description: `Your phone number ${phoneNumber} has been purchased successfully!`,
            });
          } else {
            throw new Error(response.data.error || "Failed to provision phone number");
          }
        } catch (provisionError: any) {
          console.error("Phone number provisioning error:", provisionError);
          onError(provisionError.message || "Payment succeeded but phone number provisioning failed");
          toast({
            title: "Provisioning Failed",
            description: "Your payment was processed but we couldn't provision the phone number. Our team will contact you.",
            variant: "destructive",
          });
        }
      } else {
        console.warn("Payment intent returned but status is not succeeded:", paymentIntent?.status);
        onError("Payment process did not complete successfully");
      }
    } catch (submitError: any) {
      console.error("Form submission error:", submitError);
      onError(submitError.message || "An unexpected error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <div className="mb-6 bg-background dark:bg-gray-800 rounded-md p-4 border border-border dark:border-gray-700">
        <PaymentElement />
      </div>
      <div className="flex flex-col space-y-2">
        <Button
          type="submit"
          disabled={!stripe || !elements || isProcessing}
          className="w-full"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
            </>
          ) : (
            `Pay ${formatPrice(monthlyCost)}`
          )}
        </Button>
      </div>
    </form>
  );
}

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
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(false);
  const [hasPaymentMethod, setHasPaymentMethod] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const router = useRouter();
  
  // Compute the next billing date (one month from now)
  const nextBillingDate = formatDate(addMonths(new Date(), 1));

  // When we pass phoneNumber to StripePaymentForm, ensure it's a string
  const safePhoneNumber = phoneNumber || '';

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
    
    if (!open) {
      // Small delay to avoid visual flickering when closing
      setTimeout(() => {
        setPurchaseState("idle");
        setClientSecret(null);
        setErrorMessage(null);
      }, 300);
    }
  };

  // Check payment methods when dialog opens
  useEffect(() => {
    if (open) {
      setPurchaseState("checking_payment");
      setErrorMessage(null);
      checkPaymentMethods();
    }
  }, [open]);

  /**
   * Check if user has existing payment methods
   */
  const checkPaymentMethods = async () => {
    setIsLoadingPaymentMethods(true);
    try {
      const response = await axios.get("/api/billing/payment-methods");
      const methods = response.data.paymentMethods || [];
      console.log("Payment methods fetched:", JSON.stringify(methods, null, 2)); // Detailed logging
      setPaymentMethods(methods);
      
      if (methods.length > 0) {
        setHasPaymentMethod(true);
        // Find default payment method or use the first one
        const defaultMethod = methods.find((m: PaymentMethod) => m.isDefault) || methods[0];
        console.log("Selected payment method:", JSON.stringify(defaultMethod, null, 2)); // Detailed logging
        
        // Log specifically card details to debug
        if (defaultMethod.card) {
          console.log("Card details:", JSON.stringify(defaultMethod.card, null, 2));
        } else {
          console.log("No card property found in payment method");
        }
        
        setSelectedPaymentMethod(defaultMethod);
        setPurchaseState("confirming");
      } else {
        setHasPaymentMethod(false);
        // Create a payment intent for adding a new card
        createPaymentIntent();
      }
    } catch (error) {
      console.error("Error checking payment methods:", error);
      setErrorMessage("Failed to load payment methods. Please try again.");
      setPurchaseState("error");
    } finally {
      setIsLoadingPaymentMethods(false);
    }
  };

  /**
   * Create a payment intent for new card payment
   */
  const createPaymentIntent = async () => {
    try {
      const response = await axios.post("/api/billing/create-payment-intent", {
        amount: monthlyCost,
        phoneNumber,
        metadata: {
          type: "phone_number_purchase"
        }
      });

      if (response.data.success && response.data.clientSecret) {
        setClientSecret(response.data.clientSecret);
        setPurchaseState("ready_to_pay");
      } else {
        setErrorMessage(response.data.message || "Failed to create payment intent");
        setPurchaseState("error");
      }
    } catch (error: any) {
      console.error("Error creating payment intent:", error);
      setErrorMessage(error.response?.data?.message || "Failed to create payment intent");
      setPurchaseState("error");
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
      // If onConfirm prop is provided, call it first
      if (onConfirm) {
        try {
          console.log("Using onConfirm callback provided by parent component");
          const success = await onConfirm();
          console.log("onConfirm callback result:", success);
          
          if (success) {
            setPurchasedPhoneNumber(safePhoneNumber);
            setPurchaseState("success");
            toast({
              title: "Success",
              description: 'Phone number purchased successfully!',
            });
            return;
          } else {
            throw new Error("Failed to purchase phone number");
          }
        } catch (error: any) {
          console.error("Error in onConfirm callback:", error);
          throw error; // Rethrow to be caught by outer catch block
        }
      } else {
        // Direct API call to purchase the phone number with existing payment method
        console.log("Making direct API call to purchase phone number:", {
          phoneNumber: safePhoneNumber,
          monthlyCost,
          selectedAgentId: selectedAgentId
        });
        
        try {
          const response = await axios.post("/api/twilio/phone-numbers", {
            phoneNumber: safePhoneNumber,
            monthlyPrice: monthlyCost,
            country: "US", // Default to US
            selectedAgentId: selectedAgentId || null,
            testMode: 'development_testing_mode' // Add test mode for free purchases
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
            toast({
              title: "Success",
              description: 'Phone number purchased successfully!',
            });
          } else {
            console.error("API returned success: false", response.data);
            throw new Error(response.data.error || "Failed to purchase phone number");
          }
        } catch (error: any) {
          console.error("Error in API call:", error);
          const apiErrorMessage = error.response?.data?.error || error.message;
          console.error("API error details:", apiErrorMessage);
          throw error; // Rethrow for the outer catch
        }
      }
    } catch (error: any) {
      console.error("Error purchasing phone number:", error);
      
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

  const handleSuccess = () => {
    setPurchasedPhoneNumber(phoneNumber);
    setPurchaseState("success");
  };

  const handleError = (message: string) => {
    setErrorMessage(message);
    setPurchaseState("error");
  };

  const handleRetry = () => {
    setPurchaseState("checking_payment");
    setErrorMessage(null);
    checkPaymentMethods();
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
    // Switch to adding a new payment method form regardless
    createPaymentIntent();
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
              : `Purchase ${phoneNumber} for ${formatPrice(monthlyCost)}/month. Your first renewal will be on ${formatDate(addMonths(new Date(), 1))}.`}
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
          {purchaseState === "confirming" && selectedPaymentMethod && (
            <div className="space-y-4">
              <div className="p-4 rounded-md border border-border dark:border-gray-700 bg-background dark:bg-gray-800">
                <h3 className="text-base font-medium text-foreground dark:text-gray-100 mb-4">Purchase Details</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex justify-between">
                    <span className="text-muted-foreground dark:text-gray-400">Phone Number:</span> 
                    <span className="font-medium text-foreground dark:text-gray-100">{phoneNumber}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground dark:text-gray-400">Monthly Cost:</span> 
                    <span className="font-medium text-foreground dark:text-gray-100">{formatPrice(monthlyCost)}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground dark:text-gray-400">Billing Cycle:</span> 
                    <span className="font-medium text-foreground dark:text-gray-100">Monthly</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground dark:text-gray-400">Next Billing Date:</span> 
                    <span className="font-medium text-foreground dark:text-gray-100">{nextBillingDate}</span>
                  </li>
                </ul>
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
                  <p>Your payment method will be charged immediately and this number will be available for use right away. A Twilio subaccount will be created for you if you don't have one.</p>
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
                  `Buy Now (${formatPrice(monthlyCost)}/month)`
                )}
              </Button>
            </div>
          )}

          {/* Payment entry form for new payment method */}
          {purchaseState === "ready_to_pay" && clientSecret && (
            <>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-md p-3 flex items-start mb-4 text-sm text-blue-700 dark:text-blue-300">
                <Info className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <p>Please add a payment method to purchase this phone number. Your card will be charged immediately.</p>
                </div>
              </div>
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme: "flat",
                    variables: {
                      colorPrimary: '#0284c7',
                      colorBackground: 'var(--background)',
                      colorText: 'var(--foreground)',
                      colorDanger: '#ef4444',
                      fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
                      fontSizeSm: '0.875rem',
                      fontSizeBase: '1rem',
                      fontSizeXl: '1.125rem',
                      borderRadius: '0.5rem',
                      spacingUnit: '4px',
                    },
                    rules: {
                      '.Input': {
                        backgroundColor: 'var(--background)',
                        border: '1px solid var(--border, #e2e8f0)',
                        color: 'var(--foreground)',
                        fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
                      },
                      '.Input:focus': {
                        border: '1px solid #0284c7'
                      },
                      '.Label': {
                        color: 'var(--foreground)',
                        fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
                        fontSize: '0.875rem',
                        fontWeight: '500'
                      }
                    }
                  },
                }}
              >
                <StripePaymentForm
                  phoneNumber={safePhoneNumber}
                  monthlyCost={monthlyCost}
                  clientSecret={clientSecret}
                  selectedAgentId={selectedAgentId}
                  onSuccess={handleSuccess}
                  onError={handleError}
                />
              </Elements>
            </>
          )}

          {/* Success state */}
          {purchaseState === "success" && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
              <p className="text-lg font-semibold text-foreground dark:text-gray-100">Purchase Complete!</p>
              <p className="mt-2 text-muted-foreground dark:text-gray-400">
                Your new phone number {purchasedPhoneNumber || phoneNumber} is now active and ready to use.
              </p>
              <p className="mt-2 text-sm text-muted-foreground dark:text-gray-400">
                The phone number has been provisioned in your Twilio subaccount for better usage tracking.
              </p>
            </div>
          )}

          {/* Error state */}
          {purchaseState === "error" && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-16 w-16 text-destructive mb-4" />
              <p className="text-lg font-semibold text-foreground dark:text-gray-100">Purchase Failed</p>
              <p className="mt-2 text-muted-foreground dark:text-gray-400">
                {errorMessage || "An error occurred during the purchase process."}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          {/* Ready to pay footer */}
          {purchaseState === "ready_to_pay" && (
            <div className="flex w-full space-x-2">
              <Button 
                variant="secondary" 
                onClick={() => handleClose()}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          )}

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
              <Button 
                onClick={handleRetry}
                className="flex-1"
              >
                Try Again
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 