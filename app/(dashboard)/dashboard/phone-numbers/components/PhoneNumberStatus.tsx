import { Card } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface PhoneNumberStatusProps {
  phoneNumber: {
    id: string;
    number: string;
    status: 'active' | 'suspended' | 'pending';
    twilioSid?: string;
    calculatedStatus?: 'active' | 'pending' | 'warning' | 'suspended';
    warningMessage?: string;
    statusReason?: string;
  };
}

export function PhoneNumberStatus({ phoneNumber }: PhoneNumberStatusProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();

  // Function to refresh the status
  const refreshStatus = async () => {
    try {
      setIsRefreshing(true);
      
      // Refresh the page to get updated status
      router.refresh();
      toast.success('Phone number status refreshed');
      
    } catch (error) {
      console.error('Error refreshing phone number status:', error);
      toast.error('Failed to refresh phone number status');
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusDetails = () => {
    // Use calculated status if available, otherwise fall back to regular status
    const effectiveStatus = phoneNumber.calculatedStatus || phoneNumber.status;
    
    switch (effectiveStatus) {
      case 'active':
        return {
          icon: <Icons.check className="h-5 w-5 text-green-500" />,
          title: 'Active',
          description: phoneNumber.warningMessage || 'This phone number is active and ready to use.',
          color: 'text-green-600 dark:text-green-500',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
        };
      case 'warning':
        return {
          icon: <Icons.warning className="h-5 w-5 text-yellow-500" />,
          title: 'Action Required',
          description: phoneNumber.warningMessage || 'Please add a payment method to keep this number.',
          color: 'text-yellow-600 dark:text-yellow-500',
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
          action: {
            label: 'Add Payment Method',
            handler: () => router.push('/dashboard/billing'),
          }
        };
      case 'suspended':
        return {
          icon: <Icons.warning className="h-5 w-5 text-red-500" />,
          title: 'Suspended',
          description: phoneNumber.warningMessage || 'This phone number has been suspended due to payment issues.',
          color: 'text-red-600 dark:text-red-500',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          action: {
            label: 'Add Payment Method',
            handler: () => router.push('/dashboard/billing'),
          }
        };
      case 'pending':
        return {
          icon: <Icons.clock className="h-5 w-5 text-neutral-500" />,
          title: 'Pending',
          description: 'This phone number is ready to use but waiting to be assigned to an agent.',
          color: 'text-neutral-600 dark:text-neutral-500',
          bgColor: 'bg-neutral-50 dark:bg-neutral-900/20',
        };
      default:
        return {
          icon: <Icons.info className="h-5 w-5 text-neutral-500" />,
          title: 'Unknown',
          description: 'The status of this phone number is unknown.',
          color: 'text-neutral-600 dark:text-neutral-500',
          bgColor: 'bg-neutral-50 dark:bg-neutral-900/20',
        };
    }
  };

  const statusDetails = getStatusDetails();

  return (
    <Card className="mt-4 overflow-hidden p-0 bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-900">
      <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-900 dark:bg-neutral-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icons.activity className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
            <h4 className="text-md font-semibold text-neutral-900 dark:text-neutral-50">
              Phone Number Status
            </h4>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={refreshStatus}
            disabled={isRefreshing}
            className="h-8 w-8 p-0"
            title="Refresh status"
          >
            {isRefreshing ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-600"></div>
            ) : (
              <Icons.refresh className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      <div className="p-4 bg-white dark:bg-neutral-900/50">
        <div className={`rounded-xl p-4 ${statusDetails.bgColor}`}>
          <div className="flex items-start">
            <div className="mr-3 mt-0.5">
              {statusDetails.icon}
            </div>
            <div className="flex-1">
              <h5 className={`font-medium ${statusDetails.color}`}>
                {statusDetails.title}
              </h5>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                {statusDetails.description}
              </p>
              
              {/* Show status reason if available */}
              {phoneNumber.statusReason && (
                <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                  Reason: {phoneNumber.statusReason}
                </p>
              )}
              
              {/* Action button */}
              {statusDetails.action && (
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="mt-3"
                  onClick={statusDetails.action.handler}
                >
                  <Icons.billing className="h-3.5 w-3.5 mr-1.5" />
                  {statusDetails.action.label}
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <h5 className="font-medium text-sm text-neutral-900 dark:text-neutral-50 mb-2">
            Billing Information
          </h5>
          <div className="space-y-1 text-sm text-neutral-600 dark:text-neutral-400">
            <p className="text-xs text-neutral-500 mt-2">
              Phone numbers are billed monthly. Add a payment method to ensure uninterrupted service.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
} 