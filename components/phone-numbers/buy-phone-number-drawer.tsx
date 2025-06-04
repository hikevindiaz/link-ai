import React, { useState, useEffect } from 'react';
import {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Icons } from '@/components/icons';
import { toast } from 'sonner';
import { formatDate } from '@/lib/date-utils';
import { PurchaseConfirmationDialog } from './purchase-confirmation-dialog';

interface Agent {
  id: string;
  name: string;
}

interface BuyPhoneNumberDrawerProps {
  open: boolean;
  onClose: () => void;
  onPhoneNumberPurchased: (phoneNumber: string) => void;
}

const BuyPhoneNumberDrawer: React.FC<BuyPhoneNumberDrawerProps> = ({ 
  open, 
  onClose,
  onPhoneNumberPurchased 
}) => {
  const [countries, setCountries] = useState<{ code: string; name: string; emoji: string }[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [availableNumbers, setAvailableNumbers] = useState<string[]>([]);
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [phoneNumberPrice, setPhoneNumberPrice] = useState<number>(0);
  const [pricingBreakdown, setPricingBreakdown] = useState<{
    twilioPrice: number;
    markup: number;
    total: number;
  } | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState<boolean>(false);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState<boolean>(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState<{
    renewalDate: Date | null;
  } | null>(null);
  const [hasActiveSubscription, setHasActiveSubscription] = useState<boolean>(false);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState<boolean>(false);
  const [isLoadingCountries, setIsLoadingCountries] = useState<boolean>(false);

  useEffect(() => {
    const loadCountries = async () => {
      setIsLoadingCountries(true);
      try {
        const response = await fetch('/api/twilio');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Ensure data is an array before setting it
        if (Array.isArray(data)) {
          setCountries(data);
        } else {
          console.error('Invalid countries data format:', data);
          setCountries([]);
          toast.error('Failed to load countries. Invalid data format.');
        }
      } catch (error) {
        console.error('Error loading countries:', error);
        setCountries([]); // Ensure countries is always an array
        toast.error('Failed to load countries. Please try again.');
      } finally {
        setIsLoadingCountries(false);
      }
    };
    
    const checkSubscription = async () => {
      setIsCheckingSubscription(true);
      try {
        const response = await fetch('/api/billing/subscription-info');
        const data = await response.json();
        
        if (data.success && data.subscription) {
          setHasActiveSubscription(true);
          setSubscriptionInfo({
            renewalDate: new Date(data.subscription.current_period_end * 1000)
          });
        } else {
          setHasActiveSubscription(false);
          setSubscriptionInfo(null);
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
        setHasActiveSubscription(false);
        setSubscriptionInfo(null);
      } finally {
        setIsCheckingSubscription(false);
      }
    };
    
    if (open) {
      loadCountries();
      checkSubscription();
    }
  }, [open]);

  useEffect(() => {
    const fetchAgents = async () => {
      setIsLoadingAgents(true);
      try {
        const response = await fetch('/api/chatbots');
        if (!response.ok) throw new Error('Failed to load agents');
        const data = await response.json();
        
        if (data.success && Array.isArray(data.chatbots)) {
          setAgents(data.chatbots.map((chatbot: any) => ({
            id: chatbot.id,
            name: chatbot.name
          })));
        } else if (Array.isArray(data)) {
          // Legacy format
          setAgents(data.map((chatbot: any) => ({
            id: chatbot.id,
            name: chatbot.name
          })));
        } else {
          setAgents([]);
        }
      } catch (error) {
        console.error('Error loading agents:', error);
        toast.error('Failed to load agents. Please try again later.');
        setAgents([]);
      } finally {
        setIsLoadingAgents(false);
      }
    };
    
    if (open) {
      fetchAgents();
    }
  }, [open]);

  const handleFetchPhoneNumbers = async () => {
    if (!selectedCountry) return;
    
    if (!hasActiveSubscription) {
      toast.error('You need an active subscription to purchase phone numbers.');
      return;
    }
    
    setIsFetching(true);
    try {
      const response = await fetch(`/api/twilio/numbers?country=${selectedCountry}`);
      const data = await response.json();
      setAvailableNumbers(data.numbers);

      // Get dynamic pricing with markup for this country
      const pricingResponse = await fetch(`/api/twilio/pricing/display?country=${selectedCountry}`);
      const pricingData = await pricingResponse.json();
      
      if (pricingData.success) {
        setPhoneNumberPrice(pricingData.monthlyPrice);
        setPricingBreakdown({
          twilioPrice: pricingData.breakdown.twilioPrice,
          markup: pricingData.breakdown.markup,
          total: pricingData.monthlyPrice
        });
        console.log(`Dynamic pricing for ${selectedCountry}: $${pricingData.monthlyPrice} (Twilio: $${pricingData.breakdown.twilioPrice} + Markup: $${pricingData.breakdown.markup})`);
      } else {
        // Fallback to old method if dynamic pricing fails
        const legacyPricingResponse = await fetch(`/api/twilio/pricing?country=${selectedCountry}`);
        const legacyPricingData = await legacyPricingResponse.json();
        const localPrice = legacyPricingData.phone_number_prices.find((price: { number_type: string }) => price.number_type === 'local');
        const twilioPrice = parseFloat(localPrice?.current_price || '0');
        setPhoneNumberPrice(twilioPrice + 3.00); // Add $3 markup
        setPricingBreakdown({
          twilioPrice: twilioPrice,
          markup: 3.00,
          total: twilioPrice + 3.00
        });
      }
    } catch (error) {
      console.error('Error fetching phone numbers or pricing:', error);
      toast.error('Failed to fetch phone numbers. Please try again.');
      // Fallback pricing
      setPhoneNumberPrice(6.75);
      setPricingBreakdown(null);
    }
    setIsFetching(false);
  };

  const handleSelectPhoneNumber = (number: string) => {
    setSelectedNumber(number);
  };

  const handleSelectAgent = (agentId: string) => {
    setSelectedAgentId(agentId === 'none' ? null : agentId);
  };

  const handleBuyNumber = async () => {
    if (!selectedNumber) return;
    
    if (!hasActiveSubscription) {
      toast.error('You need an active subscription to purchase phone numbers.');
      return;
    }
    
    // Open the purchase confirmation dialog
    setShowPurchaseDialog(true);
  };

  const handleConfirmPurchase = async () => {
    // This is called when the purchase is successfully completed
    // Reset form state and close everything
    setSelectedNumber(null);
    setAvailableNumbers([]);
    setSelectedCountry(null);
    setSelectedAgentId(null);
    setShowPurchaseDialog(false);
    onClose();
    
    // Notify parent component of successful purchase
    if (selectedNumber) {
      onPhoneNumberPurchased(selectedNumber);
    }
    
    return true;
  };

  const handleClose = () => {
    // Reset state when closing
    setSelectedNumber(null);
    setAvailableNumbers([]);
    setSelectedCountry(null);
    setSelectedAgentId(null);
    setShowPurchaseDialog(false);
    onClose();
  };

  // Show subscription warning if not active
  if (open && !isCheckingSubscription && !hasActiveSubscription) {
    return (
      <Drawer open={open} onOpenChange={handleClose}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Subscription Required</DrawerTitle>
          </DrawerHeader>
          <DrawerBody className="text-center py-8">
            <div className="mb-4">
              <Icons.warning className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                You need an active subscription to purchase phone numbers.
              </p>
            </div>
            <Button 
              variant="primary" 
              onClick={() => {
                onClose();
                window.location.href = '/dashboard/settings?tab=billing';
              }}
            >
              View Subscription Plans
            </Button>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <>
      <Drawer open={open} onOpenChange={handleClose}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Buy a New Phone Number</DrawerTitle>
          </DrawerHeader>
          <DrawerBody className="overflow-auto">
            {isCheckingSubscription || isLoadingCountries ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600 mb-4"></div>
                <h3 className="text-base font-medium text-gray-900 dark:text-gray-50 mb-2">
                  {isCheckingSubscription ? 'Verifying subscription' : 'Loading countries'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  {isCheckingSubscription 
                    ? 'Please wait while we check your subscription status.'
                    : 'Please wait while we load available countries.'
                  }
                </p>
              </div>
            ) : (
              <>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Select your country to start searching.
                </p>
                <div className="mt-4">
                  <Select onValueChange={setSelectedCountry} disabled={isLoadingCountries}>
                    <SelectTrigger>
                      <SelectValue 
                        placeholder={isLoadingCountries ? "Loading countries..." : "Select Country"} 
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingCountries ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600 mr-2"></div>
                          <span className="text-sm text-gray-500">Loading countries...</span>
                        </div>
                      ) : Array.isArray(countries) && countries.length > 0 ? (
                        countries.map((country) => (
                          <SelectItem key={country.code} value={country.code}>
                            <span className="flex items-center gap-2">
                              <span>{country.emoji}</span>
                              {country.name}
                            </span>
                          </SelectItem>
                        ))
                      ) : (
                        <div className="flex items-center justify-center py-4">
                          <span className="text-sm text-gray-500">No countries available</span>
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="primary"
                    className="mt-2"
                    onClick={handleFetchPhoneNumbers}
                    disabled={!selectedCountry || isFetching || !hasActiveSubscription || isLoadingCountries}
                  >
                    {isFetching ? (
                      <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Icons.search className="mr-2 h-4 w-4" />
                    )}
                    {isFetching ? 'Searching...' : 'Search'}
                  </Button>
                </div>
                
                {availableNumbers.length > 0 && (
                  <div className="mt-4">
                    <Select onValueChange={handleSelectPhoneNumber}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Phone Number" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableNumbers.map((number) => (
                          <SelectItem key={number} value={number}>
                            {number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {selectedNumber && pricingBreakdown && (
                  <div className="mt-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                    <h4 className="text-sm font-medium text-indigo-900 dark:text-indigo-100 mb-2">Pricing</h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between font-medium text-indigo-900 dark:text-indigo-100">
                        <span>Monthly cost:</span>
                        <span>${pricingBreakdown.total.toFixed(2)}/month</span>
                      </div>
                      <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-1">
                        Prorated charge today, then added to your monthly subscription.
                      </p>
                    </div>
                  </div>
                )}
                
                {selectedNumber && (
                  <div className="mt-4">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Assign to Agent (Optional)
                    </label>
                    <div className="mt-1">
                      {isLoadingAgents ? (
                        <div className="flex items-center py-2">
                          <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                          <span className="text-sm text-gray-500">Loading agents...</span>
                        </div>
                      ) : (
                        <Select onValueChange={handleSelectAgent} value={selectedAgentId || 'none'}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Agent (Optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Agent</SelectItem>
                            {agents.map((agent) => (
                              <SelectItem key={agent.id} value={agent.id}>
                                {agent.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      If selected, this phone number will be assigned to the agent for handling calls and messages.
                    </p>
                  </div>
                )}
              </>
            )}
          </DrawerBody>
          
          {!isCheckingSubscription && !isLoadingCountries && hasActiveSubscription && (
            <DrawerFooter className="flex flex-col items-start space-y-2 mt-4">
              <Button
                variant="primary"
                onClick={handleBuyNumber}
                disabled={!selectedNumber || isFetching}
              >
                {isFetching ? (
                  <>
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    Purchasing...
                  </>
                ) : selectedNumber ? (
                  `Buy Phone Number for $${phoneNumberPrice.toFixed(2)}/month`
                ) : (
                  'Buy Phone Number'
                )}
              </Button>
              <div className="h-0.5" />
              {selectedNumber && subscriptionInfo?.renewalDate && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Added to your subscription. Next billing: {formatDate(subscriptionInfo.renewalDate)}
                </p>
              )}
            </DrawerFooter>
          )}
        </DrawerContent>
      </Drawer>

      {/* Purchase Confirmation Dialog */}
      <PurchaseConfirmationDialog
        open={showPurchaseDialog}
        onOpenChange={setShowPurchaseDialog}
        phoneNumber={selectedNumber}
        monthlyCost={phoneNumberPrice}
        selectedAgentId={selectedAgentId}
        onConfirm={handleConfirmPurchase}
      />
    </>
  );
};

export default BuyPhoneNumberDrawer; 