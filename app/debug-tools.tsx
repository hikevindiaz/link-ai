'use client';

import { useState } from 'react';
import { Button } from '@/components/Button';
import { Card } from '@/components/ui/homepage/card';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';

export default function DebugToolsPage() {
  const [statusMessage, setStatusMessage] = useState<string>('');
  const router = useRouter();

  const setCookie = (name: string, value: string, days = 30) => {
    Cookies.set(name, value, { expires: days, path: '/' });
    setStatusMessage(`Cookie '${name}' set to '${value}'`);
  };

  const clearCookie = (name: string) => {
    Cookies.remove(name, { path: '/' });
    setStatusMessage(`Cookie '${name}' cleared`);
  };

  const checkCookie = (name: string) => {
    const value = Cookies.get(name);
    setStatusMessage(`Cookie '${name}' is ${value ? `'${value}'` : 'not set'}`);
  };

  const testFetchApi = async (url: string) => {
    try {
      setStatusMessage(`Fetching ${url}...`);
      const response = await fetch(url);
      const data = await response.json();
      setStatusMessage(`Response from ${url}: ${JSON.stringify(data)}`);
    } catch (error) {
      setStatusMessage(`Error fetching ${url}: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const forceUpdateOnboardingStatus = async (status: boolean) => {
    try {
      setStatusMessage(`Setting onboarding status to ${status}...`);
      
      // Set the cookie
      setCookie('onboardingCompleted', status.toString());
      
      // Also update the database if possible
      const response = await fetch('/api/user/onboarding-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboardingCompleted: status })
      });
      
      if (response.ok) {
        setStatusMessage(`Successfully updated onboarding status to ${status} in database and cookie`);
      } else {
        setStatusMessage(`Set cookie to ${status} but failed to update database: ${response.status}`);
      }
    } catch (error) {
      setStatusMessage(`Error updating onboarding status: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Debug Tools</h1>
      
      <div className="mb-8">
        <Button onClick={() => router.push('/dashboard')} className="mr-4">
          Go to Dashboard
        </Button>
        <Button onClick={() => router.push('/welcome')} className="mr-4">
          Go to Welcome Page
        </Button>
      </div>
      
      <Card className="p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Quick Fixes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button onClick={() => forceUpdateOnboardingStatus(true)}>
            Force Onboarding Completed
          </Button>
          <Button onClick={() => forceUpdateOnboardingStatus(false)}>
            Force Onboarding Not Completed
          </Button>
          <Button onClick={() => {
            clearCookie('onboardingCompleted');
            router.push('/welcome');
          }}>
            Reset Welcome Flow
          </Button>
          <Button onClick={() => {
            setCookie('onboardingCompleted', 'true');
            router.push('/dashboard');
          }}>
            Skip Onboarding & Go to Dashboard
          </Button>
        </div>
      </Card>
      
      <Card className="p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Onboarding Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button onClick={() => setCookie('onboardingCompleted', 'true')}>
            Set Onboarding Completed
          </Button>
          <Button onClick={() => setCookie('onboardingCompleted', 'false')}>
            Set Onboarding Not Completed
          </Button>
          <Button onClick={() => clearCookie('onboardingCompleted')}>
            Clear Onboarding Cookie
          </Button>
          <Button onClick={() => checkCookie('onboardingCompleted')}>
            Check Onboarding Cookie
          </Button>
        </div>
      </Card>
      
      <Card className="p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">API Tests</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button onClick={() => testFetchApi('/api/chatbots')}>
            Test Chatbots API
          </Button>
          <Button onClick={() => testFetchApi('/api/twilio/phone-numbers')}>
            Test Phone Numbers API
          </Button>
          <Button onClick={() => testFetchApi('/api/onboarding/status')}>
            Test Onboarding Status API
          </Button>
        </div>
      </Card>
      
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Status</h2>
        <div className="p-4 bg-neutral-100 dark:bg-neutral-800 rounded">
          {statusMessage || 'No actions taken yet'}
        </div>
      </Card>
    </div>
  );
} 