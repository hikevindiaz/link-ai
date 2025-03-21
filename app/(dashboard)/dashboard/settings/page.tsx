'use client';

import { Button } from '@/components/Button';
import { Divider } from '@/components/Divider';
import { Input } from '@/components/Input';
import { Label } from '@/components/Label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { useState, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableRow 
} from '@/components/ui/table';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { loadStripe } from '@stripe/stripe-js';
import { 
  Elements, 
  PaymentElement, 
  useStripe, 
  useElements 
} from '@stripe/react-stripe-js';
import { PaymentMethodDialog } from './components/PaymentMethodDialog';
import { InvoiceList } from "@/components/billing/invoice-list";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string);

// Payment Form Component
function PaymentMethodForm({ clientSecret, onSuccess, onCancel }: { 
  clientSecret: string; 
  onSuccess: () => void; 
  onCancel: () => void 
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

    const { error: confirmError } = await stripe.confirmSetup({
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
    } else {
      // If no redirect happened, the setup was successful
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      
      {error && (
        <div className="text-red-500 text-sm mt-2">
          {error}
        </div>
      )}
      
      <div className="flex gap-2 justify-end mt-4">
        <Button 
          type="button" 
          variant="light" 
          onClick={onCancel}
          disabled={processing}
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={!stripe || !elements || processing}
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
            'Save Payment Method'
          )}
        </Button>
      </div>
    </form>
  );
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [marketingEnabled, setMarketingEnabled] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [currentPlan, setCurrentPlan] = useState<any>(null);
  const [isAddingPaymentMethod, setIsAddingPaymentMethod] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [isAddPaymentMethodDialogOpen, setIsAddPaymentMethodDialogOpen] = useState<boolean>(false);
  const [isDeletePaymentMethodDialogOpen, setIsDeletePaymentMethodDialogOpen] = useState<boolean>(false);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string | null>(null);
  const [selectedPaymentMethodDetails, setSelectedPaymentMethodDetails] = useState<{ brand: string; last4: string } | null>(null);

  // New state variables for account details
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');

  // New state variables for business information
  const [companyName, setCompanyName] = useState('');
  const [businessWebsite, setBusinessWebsite] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [industryType, setIndustryType] = useState('');

  // Mock usage data
  const usageData = [
    { resource: 'Messages', usage: '3,450', maximum: '12,000', percentage: 28 },
    { resource: 'SMS Messages', usage: '85', maximum: '150', percentage: 56 },
    { resource: 'Web Searches', usage: '320', maximum: '500', percentage: 64 },
    { resource: 'Documents', usage: '2', maximum: '3', percentage: 66 },
    { resource: 'Conversation Summaries', usage: '210', maximum: '400', percentage: 52 },
  ];

  // Mock billing history
  const billingHistory = [
    { date: 'May 1, 2024', amount: '$199.00', status: 'Paid', plan: 'Growth', invoice: '#INV-0012' },
    { date: 'Apr 1, 2024', amount: '$199.00', status: 'Paid', plan: 'Growth', invoice: '#INV-0011' },
    { date: 'Mar 1, 2024', amount: '$69.00', status: 'Paid', plan: 'Starter', invoice: '#INV-0010' },
  ];

  // Mock data for dropdowns
  const companySizes = [
    { id: '1-10', label: '1-10 employees' },
    { id: '11-50', label: '11-50 employees' },
    { id: '51-200', label: '51-200 employees' },
    { id: '201-500', label: '201-500 employees' },
    { id: '501-1000', label: '501-1000 employees' },
    { id: '1000+', label: '1000+ employees' },
  ];

  const industryTypes = [
    { id: 'technology', label: 'Technology' },
    { id: 'healthcare', label: 'Healthcare' },
    { id: 'finance', label: 'Finance' },
    { id: 'education', label: 'Education' },
    { id: 'retail', label: 'Retail' },
    { id: 'manufacturing', label: 'Manufacturing' },
    { id: 'consulting', label: 'Consulting' },
    { id: 'marketing', label: 'Marketing' },
    { id: 'other', label: 'Other' },
  ];

  const businessTaskOptions = [
    { id: 'customer-support', label: 'Customer Support' },
    { id: 'lead-generation', label: 'Lead Generation' },
    { id: 'appointment-booking', label: 'Appointment Booking' },
    { id: 'product-recommendations', label: 'Product Recommendations' },
    { id: 'faq-answering', label: 'FAQ Answering' },
    { id: 'data-collection', label: 'Data Collection' },
  ];

  const communicationChannelOptions = [
    { id: 'website', label: 'Website' },
    { id: 'email', label: 'Email' },
    { id: 'whatsapp', label: 'WhatsApp' },
    { id: 'facebook', label: 'Facebook Messenger' },
    { id: 'instagram', label: 'Instagram' },
    { id: 'sms', label: 'SMS' },
  ];

  useEffect(() => {
    // Fetch user data
    if (session?.user) {
      setEmail(session.user.email || '');
      setName(session.user.name || '');
      
      // Fetch user notification preferences
      fetchUserPreferences();
      
      // Fetch payment methods and subscription
      fetchPaymentMethods();
      fetchSubscription();
      
      // Fetch user profile details
      fetchUserProfile();
    }
  }, [session]);

  // Check for Stripe redirect completion
  useEffect(() => {
    // Check if we have a session_id in the URL (for Stripe redirect)
    const query = new URLSearchParams(window.location.search);
    if (query.get('setup_intent') && query.get('setup_intent_client_secret')) {
      setIsAddingPaymentMethod(true);
      
      // Set the active tab to billing
      const tabsElement = document.querySelector('button[value="billing"]');
      if (tabsElement) {
        (tabsElement as HTMLButtonElement).click();
      }
      
      const handleSetupIntentResult = async () => {
        try {
          const stripe = await stripePromise;
          if (!stripe) {
            throw new Error('Failed to load Stripe');
          }
          
          const clientSecret = query.get('setup_intent_client_secret') as string;
          
          // Confirm the SetupIntent using the client_secret
          const { setupIntent, error } = await stripe.retrieveSetupIntent(clientSecret);
          
          if (error) {
            console.error('Error confirming setup intent:', error);
            toast.error(error.message || 'An error occurred while setting up your payment method');
          } else if (setupIntent.status === 'succeeded') {
            toast.success('Your payment method has been successfully added');
            // Refresh payment methods
            fetchPaymentMethods();
          } else {
            toast.error(`Setup failed with status: ${setupIntent.status}`);
          }
        } catch (err) {
          console.error('Error handling SetupIntent result:', err);
          toast.error('An error occurred while setting up your payment method');
        } finally {
          setIsAddingPaymentMethod(false);
          
          // Clean up the URL
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        }
      };
      
      handleSetupIntentResult();
    }
  }, []);

  const fetchUserPreferences = async () => {
    try {
      const response = await fetch('/api/user/preferences');
      const data = await response.json();
      
      if (data.success) {
        setNotificationsEnabled(data.preferences.inquiryEmailEnabled);
        setMarketingEnabled(data.preferences.marketingEmailEnabled);
      }
    } catch (error) {
      console.error('Failed to fetch user preferences:', error);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/billing/payment-methods');
      const data = await response.json();
      
      if (data.success) {
        setPaymentMethods(data.paymentMethods || []);
      } else {
        toast.error(data.message || 'Failed to fetch payment methods');
      }
    } catch (error) {
      console.error('Failed to fetch payment methods:', error);
      toast.error('An error occurred while loading your payment methods');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSubscription = async () => {
    try {
      const response = await fetch('/api/billing/subscription');
      const data = await response.json();
      
      if (data.success && data.subscription) {
        setCurrentPlan(data.subscription);
      }
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/user/profile');
      const data = await response.json();
      
      if (data.success) {
        // Account details
        setName(data.profile.fullName || '');
        setAddressLine1(data.profile.addressLine1 || '');
        setAddressLine2(data.profile.addressLine2 || '');
        setCity(data.profile.city || '');
        setState(data.profile.state || '');
        setPostalCode(data.profile.postalCode || '');
        setCountry(data.profile.country || '');
        
        // Business details
        setCompanyName(data.profile.companyName || '');
        setBusinessWebsite(data.profile.businessWebsite || '');
        setCompanySize(data.profile.companySize || '');
        setIndustryType(data.profile.industryType || '');
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  };

  const handleAddPaymentMethod = async () => {
    try {
      setIsAddingPaymentMethod(true);
      setIsAddPaymentMethodDialogOpen(true);
    } catch (error: any) {
      console.error('Error adding payment method:', error);
      toast.error(error.message || 'Failed to set up payment method');
      setIsAddingPaymentMethod(false);
    }
  };

  const handleAddPaymentMethodConfirm = async (): Promise<void> => {
    try {
      // Create a setup intent on the server
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
      
      // Store the client secret and show the payment form
      setClientSecret(clientSecret);
      setShowPaymentForm(true);
      setIsAddPaymentMethodDialogOpen(false);
      
    } catch (error: any) {
      console.error('Error adding payment method:', error);
      toast.error(error.message || 'Failed to set up payment method');
      setIsAddingPaymentMethod(false);
      throw error; // Re-throw to let the dialog handle it
    }
  };

  const handlePaymentSuccess = () => {
    toast.success('Your payment method has been successfully added');
    setShowPaymentForm(false);
    setIsAddingPaymentMethod(false);
    setClientSecret(null);
    fetchPaymentMethods();
  };

  const handlePaymentCancel = () => {
    setShowPaymentForm(false);
    setIsAddingPaymentMethod(false);
    setClientSecret(null);
  };

  const handleRemovePaymentMethod = async (paymentMethodId: string, brand?: string, last4?: string) => {
    setSelectedPaymentMethodId(paymentMethodId);
    setSelectedPaymentMethodDetails({ 
      brand: brand || '',
      last4: last4 || '****'
    });
    setIsDeletePaymentMethodDialogOpen(true);
  };

  const handleDeletePaymentMethodConfirm = async (): Promise<void> => {
    if (!selectedPaymentMethodId) return Promise.reject('No payment method selected');
    
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/billing/delete-payment-method', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentMethodId: selectedPaymentMethodId }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Payment method removed successfully');
        fetchPaymentMethods();
        return Promise.resolve();
      } else {
        toast.error(data.message || 'Failed to remove payment method');
        return Promise.reject(data.message || 'Failed to remove payment method');
      }
    } catch (error) {
      console.error('Error removing payment method:', error);
      toast.error('Failed to remove payment method');
      throw error; // Re-throw to let the dialog handle it
    } finally {
      setIsLoading(false);
      setSelectedPaymentMethodId(null);
      setSelectedPaymentMethodDetails(null);
    }
  };

  const handleSetDefaultPaymentMethod = async (paymentMethodId: string) => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/billing/set-default-payment-method', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/user/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          name,
          addressLine1,
          addressLine2,
          city,
          state,
          postalCode,
          country
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Profile updated successfully');
      } else {
        toast.error(data.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateNotifications = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/user/update-preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inquiryEmailEnabled: notificationsEnabled,
          marketingEmailEnabled: marketingEnabled,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Notification preferences updated successfully');
      } else {
        toast.error(data.message || 'Failed to update notification preferences');
      }
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      toast.error('Failed to update notification preferences');
    } finally {
      setIsLoading(false);
    }
  };

  const getCardBrandIcon = (brand: string) => {
    switch (brand.toLowerCase()) {
      case 'visa':
        return (
          <svg className="h-8 w-8 mr-3" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="48" height="48" rx="6" fill="#ECF0F3" />
            <path d="M15 19L19 29H22L18 19H15Z" fill="#1434CB" />
            <path d="M21 19L25 29H28L24 19H21Z" fill="#1434CB" />
            <path d="M36 19H31.0155C30.3362 19.0004 29.6934 19.3056 29.2982 19.8361C28.9031 20.3666 28.8116 21.0382 29.055 21.65L31 29H34L36 19Z" fill="#1434CB" />
            <path fillRule="evenodd" clipRule="evenodd" d="M30 24H14V25H30V24Z" fill="#1434CB" />
          </svg>
        );
      case 'mastercard':
        return (
          <svg className="h-8 w-8 mr-3" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="48" height="48" rx="6" fill="#ECF0F3" />
            <path d="M29.5 16H18.5C14.9101 16 12 18.9101 12 22.5V25.5C12 29.0899 14.9101 32 18.5 32H29.5C33.0899 32 36 29.0899 36 25.5V22.5C36 18.9101 33.0899 16 29.5 16Z" fill="white"/>
            <path d="M25.5 16H18.5C14.9101 16 12 18.9101 12 22.5V25.5C12 29.0899 14.9101 32 18.5 32H25.5C29.0899 32 32 29.0899 32 25.5V22.5C32 18.9101 29.0899 16 25.5 16Z" fill="#FF5F00"/>
            <path d="M18.5 16C14.9101 16 12 18.9101 12 22.5V25.5C12 29.0899 14.9101 32 18.5 32H25.5C29.0899 32 32 29.0899 32 25.5V22.5C32 18.9101 29.0899 16 25.5 16H18.5Z" fill="#FF5F00"/>
            <path d="M18.5 16C14.9101 16 12 18.9101 12 22.5V25.5C12 29.0899 14.9101 32 18.5 32H20.5C24.0899 32 27 29.0899 27 25.5V22.5C27 18.9101 24.0899 16 21.5 16H18.5Z" fill="#EB001B"/>
            <path d="M29.5 16C33.0899 16 36 18.9101 36 22.5V25.5C36 29.0899 33.0899 32 29.5 32H27.5C23.9101 32 21 29.0899 21 25.5V22.5C21 18.9101 23.9101 16 27.5 16H29.5Z" fill="#F79E1B"/>
          </svg>
        );
      case 'amex':
        return (
          <svg className="h-8 w-8 mr-3" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="48" height="48" rx="6" fill="#ECF0F3" />
            <path d="M36 24.5C36 28.0899 33.0899 31 29.5 31H18.5C14.9101 31 12 28.0899 12 24.5V23.5C12 19.9101 14.9101 17 18.5 17H29.5C33.0899 17 36 19.9101 36 23.5V24.5Z" fill="#006FCF"/>
            <path d="M32 21L30 19H26L28 21L26 23H30L32 21Z" fill="white"/>
            <path d="M23 19H16V21H22L23 19Z" fill="white"/>
            <path d="M23 23H16V25H22L23 23Z" fill="white"/>
            <path d="M26 25H16V27H26V25Z" fill="white"/>
          </svg>
        );
      default:
        return (
          <svg className="h-8 w-8 mr-3" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="48" height="48" rx="6" fill="#ECF0F3" />
            <rect x="12" y="17" width="24" height="14" rx="2" stroke="#000" strokeWidth="2" fill="none" />
          </svg>
        );
    }
  };

  const formatCardBrand = (brand: string | undefined) => {
    if (!brand) return 'Card';
    
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
    
    const lowercaseBrand = brand.toLowerCase();
    return brandMap[lowercaseBrand] || brand.charAt(0).toUpperCase() + brand.slice(1);
  };

  const getPlanDetails = () => {
    if (!currentPlan) return {
      name: 'No active plan',
      price: '$0',
      features: []
    };
    
    // This would be dynamically determined based on the plan from the API
    const planInfo = {
      starter: {
        name: 'Starter Plan',
        price: '$69 per month',
        features: ['1 Agent', '2,000 Messages', 'Standard Support']
      },
      growth: {
        name: 'Growth Plan',
        price: '$199 per month',
        features: ['3 Agents', '12,000 Messages', 'Priority Support']
      },
      scale: {
        name: 'Scale Plan',
        price: '$499 per month',
        features: ['10 Agents', '25,000 Messages', 'Dedicated Support']
      }
    };
    
    // Determine which plan the user is on
    const planId = currentPlan.priceId || '';
    let plan = planInfo.starter;
    
    if (planId === process.env.NEXT_PUBLIC_STRIPE_BASIC_PRICE_ID) {
      plan = planInfo.growth;
    } else if (planId === process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID) {
      plan = planInfo.scale;
    }
    
    return plan;
  };

  const planDetails = getPlanDetails();

  // New method to update business information
  const handleUpdateBusinessInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/user/update-business', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName,
          businessWebsite,
          companySize,
          industryType
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Business information updated successfully');
      } else {
        toast.error(data.message || 'Failed to update business information');
      }
    } catch (error) {
      console.error('Error updating business information:', error);
      toast.error('Failed to update business information');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-lg font-bold text-gray-900 dark:text-gray-50">
        Settings
      </h1>
      <p className="mt-2 text-sm/6 text-gray-500 dark:text-gray-500">
        Manage your personal details, notifications, business information, and billing information.
      </p>
      <Tabs defaultValue="account" className="mt-8">
        <TabsList variant="line">
          <TabsTrigger value="account" className="inline-flex gap-2">
            Account details
          </TabsTrigger>
          <TabsTrigger value="business" className="inline-flex gap-2">
            Business Information
          </TabsTrigger>
          <TabsTrigger value="billing" className="inline-flex gap-2">
            Billing
          </TabsTrigger>
        </TabsList>

        {/* Account Details Tab */}
        <TabsContent value="account" className="mt-8 space-y-8">
          <form onSubmit={handleUpdateProfile}>
            <h2 className="font-semibold text-gray-900 dark:text-gray-50">
              Personal Information
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
              Update your personal information associated with this account.
            </p>
            <div className="mt-6">
              <Label htmlFor="fullName" className="font-medium">
                Full Name
              </Label>
              <Input
                type="text"
                id="fullName"
                name="fullName"
                placeholder="John Smith"
                className="mt-2 w-full sm:max-w-lg"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="mt-6">
              <Label htmlFor="email" className="font-medium">
                Email Address
              </Label>
              <Input
                type="email"
                id="email"
                name="email"
                placeholder="john@company.com"
                className="mt-2 w-full sm:max-w-lg"
                value={email}
                disabled
              />
              <p className="mt-1 text-xs text-gray-500">
                Your email is used for login and cannot be changed.
              </p>
            </div>

            {/* Add address fields to account tab */}
            <div className="space-y-6 mt-8">
              <h3 className="text-lg font-medium">Address Information</h3>
              
              <div>
                <Label htmlFor="addressLine1" className="font-medium">
                  Address Line 1
                </Label>
                <Input
                  type="text"
                  id="addressLine1"
                  name="addressLine1"
                  placeholder="123 Main St"
                  className="mt-2 w-full sm:max-w-lg"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="addressLine2" className="font-medium">
                  Address Line 2 (Optional)
                </Label>
                <Input
                  type="text"
                  id="addressLine2"
                  name="addressLine2"
                  placeholder="Apartment, suite, etc."
                  className="mt-2 w-full sm:max-w-lg"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div>
                  <Label htmlFor="city" className="font-medium">
                    City
                  </Label>
                  <Input
                    type="text"
                    id="city"
                    name="city"
                    placeholder="New York"
                    className="mt-2 w-full"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="state" className="font-medium">
                    State/Province
                  </Label>
                  <Input
                    type="text"
                    id="state"
                    name="state"
                    placeholder="NY"
                    className="mt-2 w-full"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="postalCode" className="font-medium">
                    Postal Code
                  </Label>
                  <Input
                    type="text"
                    id="postalCode"
                    name="postalCode"
                    placeholder="10001"
                    className="mt-2 w-full"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="country" className="font-medium">
                  Country
                </Label>
                <Select 
                  value={country} 
                  onValueChange={setCountry}
                >
                  <SelectTrigger className="mt-2 w-full sm:max-w-lg">
                    <SelectValue placeholder="Select a country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US">United States</SelectItem>
                    <SelectItem value="CA">Canada</SelectItem>
                    <SelectItem value="GB">United Kingdom</SelectItem>
                    <SelectItem value="AU">Australia</SelectItem>
                    <SelectItem value="DE">Germany</SelectItem>
                    <SelectItem value="FR">France</SelectItem>
                    <SelectItem value="JP">Japan</SelectItem>
                    <SelectItem value="CN">China</SelectItem>
                    <SelectItem value="IN">India</SelectItem>
                    <SelectItem value="BR">Brazil</SelectItem>
                    {/* Add more countries as needed */}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" className="mt-6" disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update Information'}
            </Button>
          </form>

          <Divider />
          
          <form onSubmit={handleUpdateNotifications}>
            <h2 className="font-semibold text-gray-900 dark:text-gray-50">
              Notification Settings
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
              Configure how and when you receive notifications.
            </p>
            
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="notifications" className="text-sm font-medium">
                    Inquiry Notifications
                  </Label>
                  <p className="text-xs text-gray-500">
                    Receive email notifications when there are new inquiries.
                  </p>
                </div>
                <Switch 
                  id="notifications" 
                  checked={notificationsEnabled}
                  onCheckedChange={setNotificationsEnabled}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="marketing" className="text-sm font-medium">
                    Marketing Emails
                  </Label>
                  <p className="text-xs text-gray-500">
                    Receive emails about new features and product updates.
                  </p>
                </div>
                <Switch 
                  id="marketing" 
                  checked={marketingEnabled}
                  onCheckedChange={setMarketingEnabled}
                />
              </div>
            </div>
            
            <Button type="submit" className="mt-6" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Notification Settings'}
            </Button>
          </form>
        </TabsContent>

        {/* Business Information Tab */}
        <TabsContent value="business" className="mt-8 space-y-8">
          <form onSubmit={handleUpdateBusinessInfo}>
            <h2 className="font-semibold text-gray-900 dark:text-gray-50">
              Business Information
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
              Update your company details to help us customize your experience.
            </p>
            
            <div className="grid grid-cols-1 gap-6 mt-8 md:grid-cols-2">
              <div>
                <Label htmlFor="companyName" className="font-medium">
                  Company Name
                </Label>
                <Input
                  type="text"
                  id="companyName"
                  name="companyName"
                  placeholder="Acme Inc."
                  className="mt-2 w-full"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="businessWebsite" className="font-medium">
                  Business Website (Optional)
                </Label>
                <Input
                  type="text"
                  id="businessWebsite"
                  name="businessWebsite"
                  placeholder="https://example.com"
                  className="mt-2 w-full"
                  value={businessWebsite}
                  onChange={(e) => setBusinessWebsite(e.target.value)}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-6 mt-6 md:grid-cols-2">
              <div>
                <Label htmlFor="companySize" className="font-medium">
                  Company Size
                </Label>
                <Select 
                  value={companySize} 
                  onValueChange={setCompanySize}
                >
                  <SelectTrigger className="mt-2 w-full">
                    <SelectValue placeholder="Select company size" />
                  </SelectTrigger>
                  <SelectContent>
                    {companySizes.map(size => (
                      <SelectItem key={size.id} value={size.id}>
                        {size.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="industryType" className="font-medium">
                  Industry Type
                </Label>
                <Select 
                  value={industryType} 
                  onValueChange={setIndustryType}
                >
                  <SelectTrigger className="mt-2 w-full">
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {industryTypes.map(industry => (
                      <SelectItem key={industry.id} value={industry.id}>
                        {industry.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <Button type="submit" className="mt-8" disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update Business Information'}
            </Button>
          </form>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="mt-8 space-y-8">
          {/* Current Plan */}
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-gray-50">
              Current Plan
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
              Your current subscription plan and details.
            </p>
            
            <Card className="mt-4 p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">{planDetails.name}</h3>
                  <p className="text-sm text-gray-500">{planDetails.price}</p>
                  <ul className="mt-4 space-y-2 text-sm">
                    {planDetails.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <svg className="h-4 w-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                <Button variant="light">Change Plan</Button>
              </div>
              
              {currentPlan && currentPlan.currentPeriodEnd && (
                <p className="mt-6 text-sm text-gray-500">
                  Next billing date: {new Date(currentPlan.currentPeriodEnd).toLocaleDateString()}
                </p>
              )}
            </Card>
          </div>

          <Divider />

          {/* Usage Section */}
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-gray-50">
              Usage
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
              Monitor your current usage across different services.
            </p>
            
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {usageData.map((item) => (
                <Card key={item.resource} className="p-4 hover:bg-gray-50 transition-colors">
                  <p className="text-sm text-gray-500">
                    {item.resource}
                  </p>
                  <p className="mt-3 flex items-end">
                    <span className="text-2xl font-semibold text-gray-900 dark:text-gray-50">
                      {item.usage}
                    </span>
                    <span className="text-sm font-semibold text-gray-500 ml-1">
                      /{item.maximum}
                    </span>
                  </p>
                  
                  <div className="mt-2 h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 rounded-full" 
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <Divider />
          
          {/* Payment Methods */}
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-gray-50">
              Payment Methods
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
              Manage your payment methods for billing.
            </p>
            
            <Card className="mt-4 p-6">
              <div className="space-y-4">
                {isLoading && paymentMethods.length === 0 && !showPaymentForm ? (
                  <div className="py-8 text-center text-gray-500">
                    <div className="flex justify-center mb-4">
                      <svg className="animate-spin h-8 w-8 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                    <p>Loading payment methods...</p>
                  </div>
                ) : showPaymentForm && clientSecret ? (
                  <div className="py-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-50 mb-4">Add Payment Method</h3>
                    <Elements stripe={stripePromise} options={{ 
                      clientSecret,
                      appearance: {
                        theme: 'stripe',
                        variables: {
                          colorPrimary: '#3b82f6',
                          colorBackground: '#ffffff',
                          colorText: '#1f2937',
                          colorDanger: '#ef4444',
                          fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
                          borderRadius: '6px',
                        },
                        labels: 'floating',
                      },
                      loader: 'auto',
                    }}>
                      <PaymentMethodForm 
                        clientSecret={clientSecret}
                        onSuccess={handlePaymentSuccess}
                        onCancel={handlePaymentCancel}
                      />
                    </Elements>
                  </div>
                ) : isAddingPaymentMethod && !showPaymentForm ? (
                  <div className="py-12 text-center">
                    <div className="flex justify-center mb-4">
                      <svg className="animate-spin h-8 w-8 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-50 mb-2">Preparing payment form...</h3>
                    <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
                      Please wait while we securely set up your payment method with Stripe.
                    </p>
                  </div>
                ) : paymentMethods.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="flex justify-center mb-4">
                      <svg className="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-50 mb-2">No payment methods added</h3>
                    <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
                      Add a payment method to easily manage your subscription and make future purchases without re-entering your card details.
                    </p>
                    <Button 
                      onClick={handleAddPaymentMethod}
                      disabled={isAddingPaymentMethod}
                      className="mx-auto"
                    >
                      <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add Payment Method
                    </Button>
                  </div>
                ) : (
                  paymentMethods.map((method) => (
                    <div key={method.id} className="flex justify-between items-center p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center">
                        {getCardBrandIcon(method.card.brand)}
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-50">
                            {formatCardBrand(method.card?.brand)} ending in {method.card?.last4 || '****'}
                          </p>
                          <p className="text-sm text-gray-500">
                            Expires {method.card?.exp_month || '--'}/{method.card?.exp_year || '----'} 
                            {method.isDefault && <span className="text-green-500 ml-2 font-medium">Default</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {!method.isDefault && (
                          <Button 
                            variant="ghost" 
                            onClick={() => handleSetDefaultPaymentMethod(method.id)}
                            disabled={isLoading || isAddingPaymentMethod || showPaymentForm}
                          >
                            {isLoading ? (
                              <svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                              <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                            Set Default
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          className="text-red-500" 
                          onClick={() => handleRemovePaymentMethod(method.id, method.card.brand, method.card.last4)}
                          disabled={isLoading || isAddingPaymentMethod || showPaymentForm}
                        >
                          {isLoading ? (
                            <svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))
                )}
                
                {paymentMethods.length > 0 && !showPaymentForm && (
                  <div className="pt-4 border-t border-gray-100 mt-4">
                    <Button 
                      variant="light" 
                      onClick={handleAddPaymentMethod}
                      disabled={isLoading || isAddingPaymentMethod}
                    >
                      {isAddingPaymentMethod ? (
                        <>
                          <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Adding Payment Method...
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Add Payment Method
                        </>
                      )}
                    </Button>
                  </div>
                )}
                
                {/* Secure payment info */}
                <div className="flex items-center p-4 mt-6 text-sm text-gray-500 bg-gray-50 rounded-lg">
                  <svg className="h-5 w-5 text-gray-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <div>
                    <p>Payment information is securely processed and stored by Stripe. We never store your full card details on our servers.</p>
                    <p className="mt-1">Your payment method will be used for subscription charges and any future purchases you make.</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <Divider />
          
          {/* Billing History */}
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-gray-50">
              Billing History
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
              View your past invoices and payment history.
            </p>
            
            <Card className="mt-4 overflow-hidden">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell className="text-right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <InvoiceList />
                </TableBody>
              </Table>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Payment Method Dialogs */}
      <PaymentMethodDialog
        open={isAddPaymentMethodDialogOpen}
        onOpenChange={setIsAddPaymentMethodDialogOpen}
        type="add"
        onConfirm={handleAddPaymentMethodConfirm}
      />
      
      <PaymentMethodDialog
        open={isDeletePaymentMethodDialogOpen}
        onOpenChange={setIsDeletePaymentMethodDialogOpen}
        type="delete"
        paymentMethodId={selectedPaymentMethodId || undefined}
        paymentMethodDetails={selectedPaymentMethodDetails ? {
          brand: selectedPaymentMethodDetails.brand,
          last4: selectedPaymentMethodDetails.last4
        } : undefined}
        onConfirm={handleDeletePaymentMethodConfirm}
      />
    </div>
  );
}