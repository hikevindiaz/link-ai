import { Card } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { toast } from 'sonner';

interface PhoneNumberStatusProps {
  phoneNumber: {
    id: string;
    number: string;
    status: 'active' | 'suspended' | 'pending';
    twilioSid?: string;
  };
}

export function PhoneNumberStatus({ phoneNumber }: PhoneNumberStatusProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isForceActivating, setIsForceActivating] = useState(false);

  // Function to refresh the status directly from Twilio
  const refreshStatus = async () => {
    if (!phoneNumber.twilioSid) return;
    
    try {
      setIsRefreshing(true);
      
      const response = await fetch(`/api/twilio/phone-numbers/${phoneNumber.id}/refresh-status`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to refresh phone number status');
      }
      
      toast.success('Phone number status refreshed');
      
      // You would typically refresh the page or update state here
      // For now, we'll just show a success message and reload the page
      setTimeout(() => window.location.reload(), 1500);
      
    } catch (error) {
      console.error('Error refreshing phone number status:', error);
      toast.error('Failed to refresh phone number status');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Function to force activate a suspended phone number
  const forceActivate = async () => {
    try {
      setIsForceActivating(true);
      
      const response = await fetch(`/api/twilio/phone-numbers/refresh-all-statuses`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to activate phone number');
      }
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Phone number status updated');
        // Reload the page after a short delay to show updated status
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast.error(data.message || 'Failed to update phone number status');
      }
    } catch (error) {
      console.error('Error activating phone number:', error);
      toast.error('Failed to activate phone number');
    } finally {
      setIsForceActivating(false);
    }
  };

  const getStatusDetails = () => {
    switch (phoneNumber.status) {
      case 'active':
        return {
          icon: <Icons.check className="h-5 w-5 text-green-500" />,
          title: 'Active',
          description: 'This phone number is active and ready to use.',
          color: 'text-green-600 dark:text-green-500',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
        };
      case 'suspended':
        return {
          icon: <Icons.warning className="h-5 w-5 text-yellow-500" />,
          title: 'Suspended',
          description: 'This phone number has been suspended. Please check your billing information.',
          color: 'text-yellow-600 dark:text-yellow-500',
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
          action: {
            label: 'Force Activate',
            handler: forceActivate,
            isLoading: isForceActivating
          }
        };
      case 'pending':
        return {
          icon: <Icons.clock className="h-5 w-5 text-indigo-500" />,
          title: 'Pending',
          description: 'This phone number is being provisioned. It will be available soon.',
          color: 'text-indigo-600 dark:text-indigo-500',
          bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
        };
      default:
        return {
          icon: <Icons.info className="h-5 w-5 text-gray-500" />,
          title: 'Unknown',
          description: 'The status of this phone number is unknown.',
          color: 'text-gray-600 dark:text-gray-500',
          bgColor: 'bg-gray-50 dark:bg-gray-900/20',
        };
    }
  };

  const statusDetails = getStatusDetails();

  return (
    <Card className="mt-4 overflow-hidden p-0 bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-900">
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-900 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icons.activity className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <h4 className="text-md font-semibold text-gray-900 dark:text-gray-50">
              Phone Number Status
            </h4>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={refreshStatus}
            disabled={isRefreshing || !phoneNumber.twilioSid}
            className="h-8 w-8 p-0"
            title="Refresh status"
          >
            {isRefreshing ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600"></div>
            ) : (
              <Icons.refresh className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      <div className="p-4 bg-white dark:bg-gray-900/50">
        <div className={`rounded-lg p-4 ${statusDetails.bgColor}`}>
          <div className="flex items-start">
            <div className="mr-3 mt-0.5">
              {statusDetails.icon}
            </div>
            <div className="flex-1">
              <h5 className={`font-medium ${statusDetails.color}`}>
                {statusDetails.title}
              </h5>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {statusDetails.description}
              </p>
              
              {/* Action button for suspended numbers */}
              {statusDetails.action && (
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="mt-3"
                  onClick={statusDetails.action.handler}
                  disabled={statusDetails.action.isLoading}
                >
                  {statusDetails.action.isLoading ? (
                    <>
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600 mr-2"></div>
                      Activating...
                    </>
                  ) : (
                    <>
                      <Icons.refresh className="h-3.5 w-3.5 mr-1.5" />
                      {statusDetails.action.label}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <h5 className="font-medium text-sm text-gray-900 dark:text-gray-50 mb-2">
            Status Monitoring
          </h5>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Status changes are automatically synced with Twilio via webhooks. 
            Any changes in phone number status—such as purchase, modification, or deletion—are 
            immediately reflected in your system.
          </p>
          
          <div className="mt-3 text-xs text-gray-500 border-l-2 border-gray-200 pl-3 py-1">
            <p>Last status update: {new Date().toLocaleString()}</p>
            {phoneNumber.twilioSid && <p>Twilio SID: {phoneNumber.twilioSid}</p>}
          </div>
        </div>
      </div>
    </Card>
  );
} 