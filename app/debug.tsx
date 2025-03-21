'use client';

import { useState } from 'react';
import { Button } from '@/components/Button';
import { Card } from '@/components/ui/homepage/card';

export default function DebugPage() {
  const [agentsResponse, setAgentsResponse] = useState<any>(null);
  const [phoneNumbersResponse, setPhoneNumbersResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch agents
      const agentsRes = await fetch('/api/chatbots');
      const agentsData = await agentsRes.json();
      setAgentsResponse({
        status: agentsRes.status,
        statusText: agentsRes.statusText,
        data: agentsData
      });
      
      // Fetch phone numbers
      const phoneNumbersRes = await fetch('/api/twilio/phone-numbers');
      const phoneNumbersData = await phoneNumbersRes.json();
      setPhoneNumbersResponse({
        status: phoneNumbersRes.status,
        statusText: phoneNumbersRes.statusText,
        data: phoneNumbersData
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">API Debug Page</h1>
      
      <Button 
        onClick={fetchData} 
        disabled={isLoading}
        className="mb-8"
      >
        {isLoading ? 'Loading...' : 'Fetch API Data'}
      </Button>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          <p className="font-bold">Error:</p>
          <p>{error}</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Agents API Response</h2>
          {agentsResponse ? (
            <div>
              <p className="mb-2">
                <span className="font-medium">Status:</span> {agentsResponse.status} ({agentsResponse.statusText})
              </p>
              <div className="mt-4">
                <h3 className="font-medium mb-2">Response Data:</h3>
                <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-auto max-h-96">
                  {JSON.stringify(agentsResponse.data, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No data fetched yet</p>
          )}
        </Card>
        
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Phone Numbers API Response</h2>
          {phoneNumbersResponse ? (
            <div>
              <p className="mb-2">
                <span className="font-medium">Status:</span> {phoneNumbersResponse.status} ({phoneNumbersResponse.statusText})
              </p>
              <div className="mt-4">
                <h3 className="font-medium mb-2">Response Data:</h3>
                <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-auto max-h-96">
                  {JSON.stringify(phoneNumbersResponse.data, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No data fetched yet</p>
          )}
        </Card>
      </div>
    </div>
  );
} 