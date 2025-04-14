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
import { addMonths, formatDate } from '@/lib/date-utils';
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
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState<boolean>(false);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState<boolean>(false);

  useEffect(() => {
    const loadCountries = async () => {
      try {
        const response = await fetch('/api/twilio');
        const data = await response.json();
        setCountries(data);
      } catch (error) {
        console.error('Error loading countries:', error);
        toast.error('Failed to load countries. Please try again.');
      }
    };
    loadCountries();
  }, []);

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
    
    fetchAgents();
  }, []);

  const handleFetchPhoneNumbers = async () => {
    if (!selectedCountry) return;
    setIsFetching(true);
    try {
      const response = await fetch(`/api/twilio/numbers?country=${selectedCountry}`);
      const data = await response.json();
      setAvailableNumbers(data.numbers);

      const pricingResponse = await fetch(`/api/twilio/pricing?country=${selectedCountry}`);
      const pricingData = await pricingResponse.json();
      const localPrice = pricingData.phone_number_prices.find((price: { number_type: string }) => price.number_type === 'local');
      setPhoneNumberPrice(parseFloat(localPrice?.current_price || '0'));
    } catch (error) {
      console.error('Error fetching phone numbers or pricing:', error);
      toast.error('Failed to fetch phone numbers. Please try again.');
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
    // Open the purchase confirmation dialog instead of direct purchase
    setShowPurchaseDialog(true);
  };

  const handleConfirmPurchase = async () => {
    // This function will be called when the PurchaseConfirmationDialog confirms
    console.log('Purchase confirmed for:', selectedNumber);
    
    try {
      // Notify the parent component about the purchase
      onPhoneNumberPurchased(selectedNumber!);
      
      // Reset form state
      setSelectedNumber(null);
      setAvailableNumbers([]);
      setSelectedCountry(null);
      setSelectedAgentId(null);
      
      // Close the purchase dialog and drawer
      setShowPurchaseDialog(false);
      onClose();
      
      // Show success toast
      toast.success('Phone number purchased successfully! You can now use it with your agent.');
      
      // Force refresh phone number statuses to ensure the new number shows up properly
      try {
        const refreshResponse = await fetch('/api/twilio/phone-numbers/refresh-all-statuses', {
          method: 'POST'
        });
        console.log('Refreshed phone number statuses:', refreshResponse.ok);
      } catch (refreshError) {
        console.warn('Failed to refresh phone number statuses:', refreshError);
        // Continue anyway as this is not critical
      }
      
      return true;
    } catch (error) {
      console.error('Error during purchase confirmation:', error);
      toast.error('Failed to complete the purchase process.');
      return false;
    }
  };

  const handleClose = () => {
    // Reset state when closing
    setSelectedNumber(null);
    setAvailableNumbers([]);
    setSelectedCountry(null);
    setSelectedAgentId(null);
    onClose();
  };

  return (
    <>
      <Drawer open={open} onOpenChange={handleClose}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Buy a New Phone Number</DrawerTitle>
          </DrawerHeader>
          <DrawerBody className="overflow-auto">
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Select your country to start searching.
            </p>
            <div className="mt-4">
              <Select onValueChange={setSelectedCountry}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      <span className="flex items-center gap-2">
                        <span>{country.emoji}</span>
                        {country.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="primary"
                className="mt-2"
                onClick={handleFetchPhoneNumbers}
                disabled={!selectedCountry || isFetching}
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
          </DrawerBody>
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
                `Buy Phone Number for $${(phoneNumberPrice + 3.0).toFixed(2)}/month`
              ) : (
                'Buy Phone Number'
              )}
            </Button>
            <div className="h-0.5" />
            {selectedNumber && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Your subscription will renew on {formatDate(addMonths(new Date(), 1))}
              </p>
            )}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Purchase Confirmation Dialog */}
      <PurchaseConfirmationDialog
        open={showPurchaseDialog}
        onOpenChange={setShowPurchaseDialog}
        phoneNumber={selectedNumber}
        monthlyCost={phoneNumberPrice + 3.0}
        selectedAgentId={selectedAgentId}
        onConfirm={handleConfirmPurchase}
      />
    </>
  );
};

export default BuyPhoneNumberDrawer; 