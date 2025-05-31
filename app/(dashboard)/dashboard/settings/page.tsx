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
import { useStripe, useElements, PaymentElement, Elements } from '@stripe/react-stripe-js';
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
import { RiUserLine, RiBriefcaseLine, RiBankCardLine } from "@remixicon/react";
import { PricingDialog } from '@/components/billing/pricing-dialog';
import { AccountDetailsTab } from './components/AccountDetailsTab';
import { BusinessInformationTab } from './components/BusinessInformationTab';
import { BillingOverview } from './components/BillingOverview';
import { PaymentMethodsSection } from './components/PaymentMethodsSection';
import { InvoicesSection } from './components/InvoicesSection';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

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
  const [usageData, setUsageData] = useState<Array<{
    resource: string;
    usage: string;
    maximum: string;
    percentage: number;
    overage: number;
    overageCost: number;
  }>>([]);
  const [overageCost, setOverageCost] = useState<number>(0);
  const [phoneNumbers, setPhoneNumbers] = useState<Array<{
    id: string;
    phoneNumber: string;
    monthlyPrice: number;
    status: string;
  }>>([]);

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

  const [showPricingDialog, setShowPricingDialog] = useState(false);

  const [isBillingOverviewLoading, setIsBillingOverviewLoading] = useState(true);
  const [isPaymentMethodsLoading, setIsPaymentMethodsLoading] = useState(true);
  const [isInvoicesLoading, setIsInvoicesLoading] = useState(true);

  const fetchPhoneNumbers = async () => {
    try {
      const response = await fetch('/api/twilio/phone-numbers');
      const data = await response.json();
      
      if (data.success && data.phoneNumbers) {
        // Format phone numbers for billing display
        const formattedPhoneNumbers = data.phoneNumbers
          .map((phone: any) => ({
            id: phone.id,
            phoneNumber: phone.number, // API returns 'number' not 'phoneNumber'
            monthlyPrice: parseFloat(phone.monthlyFee.replace('$', '')) || 7.99, // Parse from $7.99 format
            status: phone.calculatedStatus || 'active'
          }));
        
        setPhoneNumbers(formattedPhoneNumbers);
      } else {
        setPhoneNumbers([]);
      }
    } catch (error) {
      console.error('Failed to fetch phone numbers:', error);
      setPhoneNumbers([]);
    }
  };

  useEffect(() => {
    // Fetch user data
    if (session?.user) {
      setEmail(session.user.email || '');
      setName(session.user.name || '');
      
      // Fetch user notification preferences
      fetchUserPreferences();
      
      // Fetch payment methods and subscription first
      fetchPaymentMethods();
      fetchSubscription();
      
      // Fetch user profile details
      fetchUserProfile();
      
      // Fetch phone numbers
      fetchPhoneNumbers();
    }
  }, [session]);

  // Separate useEffect to fetch usage data after currentPlan is set
  useEffect(() => {
    if (currentPlan) {
      fetchUsageData();
    } else {
      // If there's no plan, set empty usage data - loading is handled in fetchSubscription
      setUsageData([]);
      setOverageCost(0);
    }
  }, [currentPlan]);

  // Add a separate effect to handle invoices loading
  useEffect(() => {
    if (session?.user) {
      // Simulate invoice loading - replace with actual API call when invoice API is ready
      setTimeout(() => {
        setIsInvoicesLoading(false);
      }, 1000);
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
      setIsPaymentMethodsLoading(true);
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
      setIsPaymentMethodsLoading(false);
    }
  };

  const fetchSubscription = async () => {
    try {
      setIsBillingOverviewLoading(true);
      console.log('🔍 [DEBUG] Fetching subscription...');
      const response = await fetch('/api/billing/subscription');
      console.log('📊 [DEBUG] Response status:', response.status);
      const data = await response.json();
      console.log('📊 [DEBUG] Response data:', JSON.stringify(data, null, 2));
      
      if (data.success && data.subscription) {
        console.log('✅ [DEBUG] Setting currentPlan:', data.subscription);
        setCurrentPlan(data.subscription);
      } else {
        console.log('⚠️ [DEBUG] No subscription found or data.success is false');
        console.log('⚠️ [DEBUG] data.success:', data.success);
        console.log('⚠️ [DEBUG] data.subscription:', data.subscription);
        console.log('⚠️ [DEBUG] data.isSubscribed:', data.isSubscribed);
        setCurrentPlan(null);
        setIsBillingOverviewLoading(false);
      }
    } catch (error) {
      console.error('❌ [DEBUG] Failed to fetch subscription:', error);
      setCurrentPlan(null);
      setIsBillingOverviewLoading(false);
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

  const fetchUsageData = async () => {
    try {
      console.log('[fetchUsageData] Starting to fetch usage data...');
      // Fetch both usage tracking data and real database counts
      const [usageResponse, agentsResponse, messageCountResponse] = await Promise.all([
        fetch('/api/billing/usage'),
        fetch('/api/chatbots'), // Get real agent/chatbot count
        fetch('/api/billing/message-count') // Get real message count
      ]);
      
      const usageData = await usageResponse.json();
      const agentsData = await agentsResponse.json();
      const messageCountData = await messageCountResponse.json();
      
      if (usageData.success && usageData.data) {
        const summary = usageData.data;
        
        // Get current plan for proper limits - direct comparison only
        const priceId = currentPlan?.priceId || currentPlan?.stripePriceId || '';
        let planType = 'starter'; // default
        
        console.log('[fetchUsageData] Price ID:', priceId);
        console.log('[fetchUsageData] Environment variables:', {
          STARTER: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID,
          GROWTH: process.env.NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID,
          SCALE: process.env.NEXT_PUBLIC_STRIPE_SCALE_PRICE_ID
        });
        
        if (priceId === process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID) {
          planType = 'starter';
        } else if (priceId === process.env.NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID) {
          planType = 'growth';
        } else if (priceId === process.env.NEXT_PUBLIC_STRIPE_SCALE_PRICE_ID) {
          planType = 'scale';
        }
        
        console.log('[fetchUsageData] Detected plan type:', planType);
        
        // Define correct plan limits based on pricing
        const planLimits = {
          starter: { agents: 1, messages: 2000, sms: 50, webSearches: 25, voiceMinutes: 30 },
          growth: { agents: 5, messages: 12000, sms: 150, webSearches: 100, voiceMinutes: 120 },
          scale: { agents: 10, messages: 25000, sms: 400, webSearches: 250, voiceMinutes: 300 }
        };
        
        const currentLimits = planLimits[planType as keyof typeof planLimits];
        console.log('[fetchUsageData] Plan limits:', currentLimits);
        
        // Get real agent count from API response
        const actualAgentCount = agentsData.chatbots ? agentsData.chatbots.length : (Array.isArray(agentsData) ? agentsData.length : 0);
        
        // Get real message count from API response
        const actualMessageCount = messageCountData.success ? (messageCountData.messageCount || 0) : 0;
        
        console.log('[fetchUsageData] Usage summary:', summary);
        console.log('[fetchUsageData] Actual counts:', { agents: actualAgentCount, messages: actualMessageCount });
        
        // Format usage data for display
        const formattedUsage = [
          {
            resource: 'Agents',
            usage: actualAgentCount.toLocaleString(),
            maximum: `${currentLimits.agents} included`,
            percentage: currentLimits.agents > 0 ? Math.round((actualAgentCount / currentLimits.agents) * 100) : 0,
            overage: Math.max(0, actualAgentCount - currentLimits.agents),
            overageCost: Math.max(0, actualAgentCount - currentLimits.agents) * 10 // $10 per additional agent
          },
          {
            resource: 'Messages',
            usage: actualMessageCount.toLocaleString(),
            maximum: `${currentLimits.messages.toLocaleString()} included`,
            percentage: Math.round((actualMessageCount / currentLimits.messages) * 100),
            overage: Math.max(0, actualMessageCount - currentLimits.messages),
            overageCost: Math.max(0, actualMessageCount - currentLimits.messages) * 0.01 // Estimated overage cost
          },
          {
            resource: 'SMS Messages', 
            usage: (summary.usage.sms || 0).toLocaleString(),
            maximum: `${currentLimits.sms.toLocaleString()} included`,
            percentage: Math.round(((summary.usage.sms || 0) / currentLimits.sms) * 100),
            overage: Math.max(0, (summary.usage.sms || 0) - currentLimits.sms),
            overageCost: summary.overageCosts.sms || 0
          },
          {
            resource: 'Web Searches',
            usage: (summary.usage.webSearches || 0).toLocaleString(), 
            maximum: `${currentLimits.webSearches.toLocaleString()} included`,
            percentage: Math.round(((summary.usage.webSearches || 0) / currentLimits.webSearches) * 100),
            overage: Math.max(0, (summary.usage.webSearches || 0) - currentLimits.webSearches),
            overageCost: summary.overageCosts.webSearches || 0
          },
          {
            resource: 'Voice Minutes',
            usage: (summary.usage.voiceMinutes || 0).toLocaleString(),
            maximum: currentLimits.voiceMinutes > 0 ? `${currentLimits.voiceMinutes.toLocaleString()} included` : 'Not included',
            percentage: currentLimits.voiceMinutes > 0 ? Math.round(((summary.usage.voiceMinutes || 0) / currentLimits.voiceMinutes) * 100) : 0,
            overage: Math.max(0, (summary.usage.voiceMinutes || 0) - currentLimits.voiceMinutes),
            overageCost: summary.overageCosts.voiceMinutes || 0
          }
        ];
        
        setUsageData(formattedUsage);
        setOverageCost(summary.overageCosts.total || 0);
      } else {
        // Use empty array as fallback
        setUsageData([]);
        setOverageCost(0);
      }
    } catch (error) {
      console.error('Failed to fetch usage data:', error);
      // Use empty array as fallback
      setUsageData([]);
      setOverageCost(0);
    } finally {
      setIsBillingOverviewLoading(false);
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
      features: [] as string[],
      nextBillingDate: undefined as string | undefined
    };
    
    console.log('[getPlanDetails] Current plan:', currentPlan);
    
    // Map Stripe price IDs to plan details
    const planInfo = {
      starter: {
        name: 'Starter Plan',
        price: '$69 per month',
        features: ['1 Agent', '2,000 Messages', 'Standard Support']
      },
      growth: {
        name: 'Growth Plan',
        price: '$199 per month',
        features: ['5 Agents', '12,000 Messages', 'Priority Support']
      },
      scale: {
        name: 'Scale Plan',
        price: '$499 per month',
        features: ['10 Agents', '25,000 Messages', 'Dedicated Support']
      }
    };
    
    // Simple direct comparison
    const priceId = currentPlan.priceId || currentPlan.stripePriceId || '';
    let selectedPlan = planInfo.starter;
    
    console.log('[getPlanDetails] Price ID:', priceId);
    console.log('[getPlanDetails] Environment variables:', {
      STARTER: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID,
      GROWTH: process.env.NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID,
      SCALE: process.env.NEXT_PUBLIC_STRIPE_SCALE_PRICE_ID
    });
    
    if (priceId === process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID) {
      selectedPlan = planInfo.starter;
    } else if (priceId === process.env.NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID) {
      selectedPlan = planInfo.growth;
    } else if (priceId === process.env.NEXT_PUBLIC_STRIPE_SCALE_PRICE_ID) {
      selectedPlan = planInfo.scale;
    }
    
    console.log('[getPlanDetails] Selected plan:', selectedPlan.name);
    
    // Return plan details with optional billing date
    return {
      name: selectedPlan.name,
      price: selectedPlan.price,
      features: selectedPlan.features,
      nextBillingDate: currentPlan.currentPeriodEnd 
        ? new Date(currentPlan.currentPeriodEnd).toLocaleDateString('en-US', { 
            month: 'long', 
            day: 'numeric',
            year: 'numeric'
          })
        : undefined
    };
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
    <div className="p-4 sm:p-8">
      <h1 className="text-lg font-bold text-gray-900 dark:text-gray-50">
        Settings
      </h1>
      <p className="mt-2 text-sm/6 text-gray-500 dark:text-gray-500">
        Manage your personal details, notifications, business information, and billing information.
      </p>
      <Tabs defaultValue="account" className="mt-8">
        <TabsList variant="line">
          <TabsTrigger value="account" className="inline-flex items-center gap-2">
            <RiUserLine className="size-4 sm:-ml-1" aria-hidden="true" /> 
            <span className="hidden sm:inline">Account details</span>
          </TabsTrigger>
          <TabsTrigger value="business" className="inline-flex items-center gap-2">
            <RiBriefcaseLine className="size-4 sm:-ml-1" aria-hidden="true" /> 
            <span className="hidden sm:inline">Business Information</span>
          </TabsTrigger>
          <TabsTrigger value="billing" className="inline-flex items-center gap-2">
            <RiBankCardLine className="size-4 sm:-ml-1" aria-hidden="true" /> 
            <span className="hidden sm:inline">Billing</span>
          </TabsTrigger>
        </TabsList>

        {/* Account Details Tab */}
        <TabsContent value="account" className="mt-8 space-y-8">
          <AccountDetailsTab />
        </TabsContent>

        {/* Business Information Tab */}
        <TabsContent value="business" className="mt-8 space-y-8">
          <BusinessInformationTab />
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="mt-8 space-y-8">
          <div className="max-w-4xl space-y-10">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-gray-50">
                Billing overview
            </h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">
                {currentPlan 
                  ? `See the breakdown of your costs for the upcoming payment.`
                  : 'Your workspace has no active plan. Choose a plan to get started with AI agents.'
                }{' '}
                <button
                  onClick={() => setShowPricingDialog(true)}
                  className="inline-flex items-center gap-1 text-indigo-500 hover:underline hover:underline-offset-4 dark:text-indigo-400"
                >
                  {currentPlan ? 'Compare pricing plans' : 'View plans'}
                  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                </button>
              </p>

              <BillingOverview
                currentPlan={currentPlan}
                usageData={usageData}
                phoneNumbers={phoneNumbers}
                overageCost={overageCost}
                onShowPricingDialog={() => setShowPricingDialog(true)}
                isLoading={isBillingOverviewLoading}
              />
            </div>
            
            <PaymentMethodsSection
              onAddPaymentMethod={() => setIsAddPaymentMethodDialogOpen(true)}
              onDeletePaymentMethod={(id, details) => {
                setSelectedPaymentMethodId(id);
                setSelectedPaymentMethodDetails(details);
                setIsDeletePaymentMethodDialogOpen(true);
              }}
              isLoading={isPaymentMethodsLoading}
            />

            <InvoicesSection isLoading={isInvoicesLoading} />
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

      {/* Pricing Dialog */}
      <PricingDialog
        open={showPricingDialog}
        onOpenChange={setShowPricingDialog}
        currentPlan={currentPlan}
        hasPaymentMethods={paymentMethods.length > 0}
        paymentMethods={paymentMethods}
        onPlanConfirmed={async (planId: string) => {
          try {
            const planMap = {
              'starter': process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID,
              'growth': process.env.NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID,
              'scale': process.env.NEXT_PUBLIC_STRIPE_SCALE_PRICE_ID,
            };

            const stripePriceId = planMap[planId as keyof typeof planMap];
            if (!stripePriceId) {
              throw new Error('Price ID not configured');
            }

            // Show loading state
            toast.loading('Processing your subscription...');

            const response = await fetch('/api/billing/confirm-subscription', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                priceId: stripePriceId,
                planId: planId
              }),
            });

            const result = await response.json();
            
            // Dismiss loading toast
            toast.dismiss();
            
            if (!response.ok) {
              throw new Error(result.error || 'Failed to process subscription');
            }

            if (result.success) {
              // Success!
              toast.success(result.message || 'Subscription processed successfully!');
              
              // Refresh the page data
              await Promise.all([
                fetchSubscription(),
                fetchUsageData(),
                fetchPaymentMethods(),
                fetchPhoneNumbers()
              ]);
              
              // Close the dialog (handled by parent in PricingDialog)
            } else {
              throw new Error(result.error || 'Unexpected response format');
            }
          } catch (error) {
            console.error('Error processing subscription:', error);
            toast.dismiss();
            toast.error(error instanceof Error ? error.message : 'Failed to process subscription');
            throw error; // Re-throw to let the dialog handle it
          }
        }}
      />

      {/* Payment Form Modal */}
      {showPaymentForm && clientSecret && (
        <Dialog open={showPaymentForm} onOpenChange={(open) => !open && handlePaymentCancel()}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add Payment Method</DialogTitle>
              <DialogDescription>
                Enter your card details to add a new payment method to your account.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Elements 
                stripe={loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)} 
                options={{ 
                  clientSecret,
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
                  },
                }}
              >
                <PaymentMethodForm 
                  clientSecret={clientSecret}
                  onSuccess={handlePaymentSuccess}
                  onCancel={handlePaymentCancel}
                />
              </Elements>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}