"use client";

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Icons } from '@/components/icons';
import { toast } from 'sonner';
import { RiWhatsappFill, RiCheckboxCircleFill, RiErrorWarningFill } from '@remixicon/react';
import axios from 'axios';
import { useSession } from 'next-auth/react';

interface WhatsAppConfigurationFormProps {
  phoneNumber: {
    id: string;
    number: string;
    whatsappEnabled?: boolean;
    whatsappBusinessId?: string | null;
    whatsappDisplayName?: string | null;
  };
  onStatusUpdate?: () => void;
}

export function WhatsAppConfigurationForm({ phoneNumber, onStatusUpdate }: WhatsAppConfigurationFormProps) {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [displayName, setDisplayName] = useState(phoneNumber.whatsappDisplayName || '');
  const [businessId, setBusinessId] = useState(phoneNumber.whatsappBusinessId || '');
  const [isWhatsAppIntegrationEnabled, setIsWhatsAppIntegrationEnabled] = useState(false);

  // Check if WhatsApp integration is enabled
  useEffect(() => {
    if (session?.user) {
      const userSettings = (session.user as any).integrationSettings ?? {};
      setIsWhatsAppIntegrationEnabled(userSettings['ext-whatsapp'] ?? false);
    }
  }, [session]);

  const handleSubmit = async () => {
    if (!displayName.trim()) {
      toast.error('Please provide a display name for WhatsApp');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(`/api/twilio/phone-numbers/${phoneNumber.id}/configure-whatsapp`, {
        displayName: displayName.trim(),
        businessId: businessId.trim()
      });
      
      if (response.data.success) {
        toast.success('WhatsApp configuration saved successfully!');
        if (onStatusUpdate) {
          onStatusUpdate();
        }
      } else {
        throw new Error(response.data.error || 'Configuration failed');
      }
    } catch (error: any) {
      console.error('Error configuring WhatsApp:', error);
      toast.error(error.response?.data?.error || 'Failed to configure WhatsApp. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisable = async () => {
    setIsLoading(true);
    try {
      const response = await axios.post(`/api/twilio/phone-numbers/${phoneNumber.id}/disable-whatsapp`);
      
      if (response.data.success) {
        toast.success('WhatsApp disabled for this phone number');
        setDisplayName('');
        setBusinessId('');
        if (onStatusUpdate) {
          onStatusUpdate();
        }
      } else {
        throw new Error(response.data.error || 'Failed to disable WhatsApp');
      }
    } catch (error: any) {
      console.error('Error disabling WhatsApp:', error);
      toast.error(error.response?.data?.error || 'Failed to disable WhatsApp. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isWhatsAppIntegrationEnabled) {
    return (
      <Card id="whatsapp-section" className="overflow-hidden">
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RiWhatsappFill className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-50">
                WhatsApp Configuration
              </h4>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <RiErrorWarningFill className="h-5 w-5" />
              <span className="text-sm">Integration Disabled</span>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-4 border border-amber-200 dark:border-amber-800">
            <div className="flex">
              <RiErrorWarningFill className="h-5 w-5 text-amber-400 flex-shrink-0" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  WhatsApp Integration Required
                </h3>
                <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                  To configure WhatsApp for this phone number, you need to enable the WhatsApp integration first.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  onClick={() => window.location.href = '/dashboard/integrations'}
                >
                  Go to Integrations
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card id="whatsapp-section" className="overflow-hidden">
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RiWhatsappFill className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-50">
              WhatsApp Configuration
            </h4>
          </div>
          {phoneNumber.whatsappEnabled ? (
            <div className="flex items-center gap-2 text-green-600">
              <RiCheckboxCircleFill className="h-5 w-5" />
              <span className="text-sm">Configured</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-500">
              <span className="text-sm">Not Configured</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-4">
        <div className="space-y-4">
          <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-4 border border-green-200 dark:border-green-800">
            <h3 className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
              Connect with customers on WhatsApp
            </h3>
            <p className="text-xs text-green-700 dark:text-green-300">
              Enable WhatsApp messaging for this phone number to allow your AI agent to communicate with customers through WhatsApp.
            </p>
          </div>

          <div className="grid gap-4">
            <div>
              <Label htmlFor="displayName" className="text-sm">
                Display Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your Business Name on WhatsApp"
                className="mt-1"
                disabled={phoneNumber.whatsappEnabled && !isLoading}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                This name will be displayed to customers on WhatsApp
              </p>
            </div>

            <div>
              <Label htmlFor="businessId" className="text-sm">
                WhatsApp Business ID (Optional)
              </Label>
              <Input
                id="businessId"
                value={businessId}
                onChange={(e) => setBusinessId(e.target.value)}
                placeholder="WABA ID (if you have one)"
                className="mt-1"
                disabled={phoneNumber.whatsappEnabled && !isLoading}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Leave empty to use the default business account
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            {phoneNumber.whatsappEnabled ? (
              <>
                <Button 
                  variant="destructive"
                  onClick={handleDisable}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                      Disabling...
                    </>
                  ) : (
                    'Disable WhatsApp'
                  )}
                </Button>
              </>
            ) : (
              <Button 
                onClick={handleSubmit}
                disabled={isLoading || !displayName.trim()}
              >
                {isLoading ? (
                  <>
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    Configuring...
                  </>
                ) : (
                  'Enable WhatsApp'
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
} 