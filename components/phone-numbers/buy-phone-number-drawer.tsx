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
import { PurchaseConfirmationDialog } from './purchase-confirmation-dialog';
import { toast } from 'sonner';
import { addMonths, formatDate } from '@/lib/date-utils';

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
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState<boolean>(false);

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

  const handleBuyNumber = () => {
    if (!selectedNumber) return;
    setIsConfirmDialogOpen(true);
  };

  const handleConfirmPurchase = async (): Promise<boolean> => {
    if (!selectedNumber) return false;
    
    try {
      const response = await fetch('/api/twilio/phone-numbers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: selectedNumber,
          country: selectedCountry,
          monthlyPrice: phoneNumberPrice + 3.0, // Include the platform fee
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to purchase phone number');
      }
      
      // Call the callback to update the phone numbers list
      onPhoneNumberPurchased(selectedNumber);
      
      // Reset form state
      setSelectedNumber(null);
      setAvailableNumbers([]);
      setSelectedCountry(null);
      
      // Close the drawer
      onClose();
      
      return true;
    } catch (error) {
      console.error('Error purchasing phone number:', error);
      return false;
    }
  };

  const handleClose = () => {
    // Reset state when closing
    setSelectedNumber(null);
    setAvailableNumbers([]);
    setSelectedCountry(null);
    onClose();
  };

  return (
    <>
      <Drawer open={open} onOpenChange={handleClose}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Buy a New Phone Number</DrawerTitle>
          </DrawerHeader>
          <DrawerBody>
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
          </DrawerBody>
          <DrawerFooter className="flex flex-col items-start space-y-2 mt-4">
            <Button
              variant="primary"
              onClick={handleBuyNumber}
              disabled={!selectedNumber}
            >
              {selectedNumber
                ? `Buy Phone Number for $${(phoneNumberPrice + 3.0).toFixed(2)}/month`
                : 'Buy Phone Number'}
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

      <PurchaseConfirmationDialog
        open={isConfirmDialogOpen}
        onOpenChange={setIsConfirmDialogOpen}
        phoneNumber={selectedNumber}
        monthlyCost={phoneNumberPrice + 3.0}
        selectedAgentId={null}
      />
    </>
  );
};

export default BuyPhoneNumberDrawer; 