'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/Button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface PhoneNumber {
  id: string;
  phoneNumber: string;
  country: string;
  monthlyPrice: number;
  status: string;
  agentName?: string;
  nextBillingDate?: string;
}

export function PhoneNumberBillingCard() {
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalMonthlyCost, setTotalMonthlyCost] = useState(0);

  useEffect(() => {
    fetchPhoneNumbers();
  }, []);

  const fetchPhoneNumbers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/twilio/phone-numbers');
      const data = await response.json();

      if (data.success) {
        const numbers = data.phoneNumbers.map((num: any) => ({
          id: num.id,
          phoneNumber: num.number,
          country: num.country,
          monthlyPrice: parseFloat(num.monthlyFee.replace('$', '')),
          status: num.status,
          agentName: num.agentName,
          nextBillingDate: num.nextBillingDate,
        }));

        setPhoneNumbers(numbers);
        
        // Calculate total monthly cost
        const total = numbers
          .filter((n: PhoneNumber) => n.status === 'active')
          .reduce((sum: number, n: PhoneNumber) => sum + n.monthlyPrice, 0);
        setTotalMonthlyCost(total);
      }
    } catch (error) {
      console.error('Error fetching phone numbers:', error);
      toast.error('Failed to load phone numbers');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'suspended':
        return <Badge className="bg-yellow-100 text-yellow-800">Suspended</Badge>;
      case 'pending':
        return <Badge className="bg-neutral-100 text-neutral-800">Pending</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-neutral-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-neutral-200 rounded w-2/3 mb-2"></div>
          <div className="h-4 bg-neutral-200 rounded w-1/2"></div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold text-neutral-900 dark:text-neutral-50">
          Phone Numbers
        </h2>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-500">
          Manage your phone numbers and their billing
        </p>
      </div>

      {phoneNumbers.length === 0 ? (
        <Card className="p-6 text-center">
          <svg
            className="mx-auto h-12 w-12 text-neutral-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-neutral-900 dark:text-neutral-50">
            No phone numbers
          </h3>
          <p className="mt-1 text-sm text-neutral-500">
            Purchase phone numbers to enable voice and SMS capabilities
          </p>
          <Button
            className="mt-4"
            onClick={() => window.location.href = '/dashboard/phone-numbers'}
          >
            Browse Phone Numbers
          </Button>
        </Card>
      ) : (
        <>
          <div className="grid gap-4">
            {phoneNumbers.map((number) => (
              <Card key={number.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-neutral-900 dark:text-neutral-50">
                        {number.phoneNumber}
                      </p>
                      {getStatusBadge(number.status)}
                    </div>
                    <p className="text-sm text-neutral-500 mt-1">
                      {number.country} • ${number.monthlyPrice.toFixed(2)}/month
                      {number.agentName && ` • Assigned to ${number.agentName}`}
                    </p>
                    {number.nextBillingDate && (
                      <p className="text-xs text-neutral-400 mt-1">
                        Next billing: {new Date(number.nextBillingDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => window.location.href = '/dashboard/phone-numbers'}
                  >
                    Manage
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          <Card className="p-4 bg-neutral-50 dark:bg-neutral-900/20 border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-neutral-900 dark:text-neutral-100">
                  Total Monthly Phone Number Cost
                </p>
                <p className="text-sm text-neutral-700 dark:text-neutral-300">
                  {phoneNumbers.filter(n => n.status === 'active').length} active phone number(s)
                </p>
              </div>
              <p className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
                ${totalMonthlyCost.toFixed(2)}
              </p>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button
              variant="light"
              onClick={() => window.location.href = '/dashboard/phone-numbers'}
            >
              Add More Phone Numbers
            </Button>
          </div>
        </>
      )}
    </div>
  );
} 