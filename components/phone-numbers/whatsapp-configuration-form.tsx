"use client";

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { toast } from 'sonner';
import { RiWhatsappFill, RiCheckboxCircleFill, RiErrorWarningFill, RiInformationLine } from '@remixicon/react';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import { 
  AlertDialog, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogHeader, 
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogAction 
} from '@/components/ui/alert-dialog';

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
  const [isWhatsAppIntegrationEnabled, setIsWhatsAppIntegrationEnabled] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [setupStep, setSetupStep] = useState<'ready' | 'connecting' | 'verifying' | 'complete'>('ready');

  // Check if WhatsApp integration is enabled
  useEffect(() => {
    if (session?.user) {
      const userSettings = (session.user as any).integrationSettings ?? {};
      setIsWhatsAppIntegrationEnabled(userSettings['ext-whatsapp'] ?? false);
    }
  }, [session]);

  // Check for success/error messages from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.get('whatsapp_success') === 'true') {
      toast.success('WhatsApp successfully configured!');
      setSetupStep('complete');
      
      // Clean URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      
      if (onStatusUpdate) {
        onStatusUpdate();
      }
    } else if (urlParams.get('whatsapp_partial') === 'true') {
      toast.success('WhatsApp partially configured. You may need to complete setup in Twilio console.');
      setSetupStep('complete');
      
      // Clean URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      
      if (onStatusUpdate) {
        onStatusUpdate();
      }
    }
  }, [onStatusUpdate]);

  const handleStartSetup = () => {
    setShowSetupGuide(true);
  };

  const handleConnectWhatsApp = async () => {
    setSetupStep('connecting');
    setIsLoading(true);

    try {
      // Step 1: Initialize WhatsApp registration
      const initResponse = await axios.post(`/api/twilio/phone-numbers/${phoneNumber.id}/whatsapp-init`, {
        phoneNumber: phoneNumber.number
      });

      if (!initResponse.data.success) {
        throw new Error(initResponse.data.error || 'Failed to initialize WhatsApp setup');
      }

      // Step 2: Open Meta Embedded Signup in a popup
      const width = 600;
      const height = 700;
      const left = (window.innerWidth - width) / 2;
      const top = (window.innerHeight - height) / 2;

      const popup = window.open(
        initResponse.data.authUrl,
        'whatsapp-signup',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
      );

      if (!popup) {
        throw new Error('Please allow popups to complete WhatsApp setup');
      }

      // Step 3: Listen for completion
      const checkInterval = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkInterval);
          handleVerifySetup();
        }
      }, 500);

    } catch (error: any) {
      console.error('Error starting WhatsApp setup:', error);
      toast.error(error.message || 'Failed to start WhatsApp setup');
      setSetupStep('ready');
      setIsLoading(false);
    }
  };

  const handleVerifySetup = async () => {
    setSetupStep('verifying');

    try {
      // Check if the setup was completed successfully
      const verifyResponse = await axios.post(`/api/twilio/phone-numbers/${phoneNumber.id}/whatsapp-verify`);

      if (verifyResponse.data.success) {
        setSetupStep('complete');
        toast.success('WhatsApp successfully configured!');
        if (onStatusUpdate) {
          onStatusUpdate();
        }
      } else {
        throw new Error(verifyResponse.data.error || 'WhatsApp setup was not completed');
      }
    } catch (error: any) {
      console.error('Error verifying WhatsApp setup:', error);
      toast.error(error.message || 'Failed to verify WhatsApp setup');
      setSetupStep('ready');
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
        setSetupStep('ready');
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
        <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RiWhatsappFill className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
              <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                WhatsApp Configuration
              </h4>
            </div>
            <div className="flex items-center gap-2 text-neutral-500">
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
    <>
      <Card id="whatsapp-section" className="overflow-hidden">
        <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RiWhatsappFill className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
              <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                WhatsApp Business
              </h4>
            </div>
            {phoneNumber.whatsappEnabled ? (
              <div className="flex items-center gap-2 text-green-600">
                <RiCheckboxCircleFill className="h-5 w-5" />
                <span className="text-sm">Configured</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-neutral-500">
                <span className="text-sm">Not Configured</span>
              </div>
            )}
          </div>
        </div>

        <div className="p-4">
          {phoneNumber.whatsappEnabled ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-4 border border-green-200 dark:border-green-800">
                <div className="flex items-start">
                  <RiCheckboxCircleFill className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                      WhatsApp Business Connected
                    </h3>
                    <p className="mt-1 text-xs text-green-700 dark:text-green-300">
                      This phone number is configured to send and receive WhatsApp messages.
                    </p>
                    {phoneNumber.whatsappDisplayName && (
                      <p className="mt-2 text-xs font-medium text-green-800 dark:text-green-200">
                        Display Name: {phoneNumber.whatsappDisplayName}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button 
                  variant="secondary"
                  onClick={handleDisable}
                  disabled={isLoading}
                  size="sm"
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
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg bg-neutral-50 dark:bg-neutral-900/20 p-4 border border-neutral-200 dark:border-neutral-800">
                <h3 className="text-sm font-medium text-neutral-800 dark:text-neutral-200 mb-2">
                  Connect your AI agent to WhatsApp
                </h3>
                <p className="text-xs text-neutral-700 dark:text-neutral-300">
                  Enable WhatsApp Business messaging to allow your AI agent to communicate with customers through the world's most popular messaging app.
                </p>
              </div>

              <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  What you'll need:
                </h4>
                <ul className="space-y-2 text-xs text-neutral-600 dark:text-neutral-400">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>A Facebook account to create or connect your business profile</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Your business name as it should appear to customers</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>About 5-10 minutes to complete the setup</span>
                  </li>
                </ul>
              </div>

              <div className="flex justify-center">
                <Button 
                  onClick={handleStartSetup}
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <RiWhatsappFill className="mr-2 h-4 w-4" />
                  Set up WhatsApp Business
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Setup Guide Dialog */}
      <AlertDialog open={showSetupGuide} onOpenChange={setShowSetupGuide}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RiWhatsappFill className="h-5 w-5 text-green-600" />
              Set up WhatsApp Business
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-2">
              {setupStep === 'ready' && (
                <>
                  <p>
                    You'll be redirected to Facebook to connect your business account to WhatsApp. This allows your AI agent to send and receive WhatsApp messages.
                  </p>
                  <div className="bg-neutral-50 dark:bg-neutral-900/20 p-3 rounded-lg text-sm">
                    <p className="font-medium text-neutral-800 dark:text-neutral-200 mb-1">
                      During setup, you will:
                    </p>
                    <ul className="space-y-1 text-neutral-700 dark:text-neutral-300">
                      <li>• Log in with Facebook</li>
                      <li>• Create or select your business profile</li>
                      <li>• Verify ownership of {phoneNumber.number}</li>
                      <li>• Choose your business display name</li>
                    </ul>
                  </div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Make sure pop-ups are enabled for this site.
                  </p>
                </>
              )}

              {setupStep === 'connecting' && (
                <div className="text-center py-4">
                  <Icons.spinner className="h-8 w-8 animate-spin mx-auto text-neutral-600" />
                  <p className="mt-3 font-medium">Connecting to WhatsApp Business...</p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                    Please complete the setup in the popup window
                  </p>
                </div>
              )}

              {setupStep === 'verifying' && (
                <div className="text-center py-4">
                  <Icons.spinner className="h-8 w-8 animate-spin mx-auto text-neutral-600" />
                  <p className="mt-3 font-medium">Verifying your setup...</p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                    This may take a few moments
                  </p>
                </div>
              )}

              {setupStep === 'complete' && (
                <div className="text-center py-4">
                  <RiCheckboxCircleFill className="h-12 w-12 mx-auto text-green-600" />
                  <p className="mt-3 font-medium text-green-800 dark:text-green-200">
                    WhatsApp Business is now configured!
                  </p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                    Your AI agent can now communicate through WhatsApp
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {setupStep === 'ready' && (
              <>
                <Button variant="secondary" onClick={() => setShowSetupGuide(false)}>
                  Cancel
                </Button>
                <Button onClick={handleConnectWhatsApp} disabled={isLoading}>
                  Continue to Facebook
                </Button>
              </>
            )}
            {setupStep === 'complete' && (
              <AlertDialogAction onClick={() => {
                setShowSetupGuide(false);
                setSetupStep('ready');
              }}>
                Done
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 