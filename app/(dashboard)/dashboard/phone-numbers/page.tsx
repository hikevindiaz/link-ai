"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Divider } from '@/components/Divider';
import EmptyState from '@/components/ui/empty-state';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { RiDeleteBinLine, RiPencilLine, RiAddLine, RiMoreFill, RiPhoneLine, RiInformationLine, RiCheckboxCircleFill, RiErrorWarningLine, RiWhatsappFill } from '@remixicon/react';
import { Icons } from '@/components/icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuIconWrapper,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/DropdownMenu';
import BuyPhoneNumberDrawer from '@/components/phone-numbers/buy-phone-number-drawer';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DeletePhoneNumberDialog } from './components/DeletePhoneNumberDialog';
import { PhoneNumberStatus } from './components/PhoneNumberStatus';
import { PaymentMethodDisplay } from '@/components/billing/payment-method-display';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { RiAlertLine } from '@remixicon/react';
import { WhatsAppConfigurationForm } from '@/components/phone-numbers/whatsapp-configuration-form';

interface PhoneNumber {
  id: string;
  number: string;
  agentId: string | null;
  agentName: string | null;
  boughtOn: string;
  renewsOn: string;
  monthlyFee: string;
  status: 'active' | 'suspended' | 'pending';
  twilioSid?: string;
  calculatedStatus?: 'active' | 'pending' | 'warning' | 'suspended';
  warningMessage?: string;
  statusReason?: string;
  whatsappEnabled?: boolean;
  whatsappBusinessId?: string | null;
  whatsappDisplayName?: string | null;
}

interface Agent {
  id: string;
  name: string;
  phoneNumberId: string | null;
}

// Status Badge Component
const StatusBadge = ({ status, calculatedStatus, size = 'sm' }: { 
  status: string; 
  calculatedStatus?: string; 
  size?: 'xxs' | 'xs' | 'sm' | 'md' 
}) => {
  const displayStatus = calculatedStatus || status;
  
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return {
          label: 'Active',
          className: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
        };
      case 'pending':
        return {
          label: 'Pending',
          className: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-900/20 dark:text-neutral-400'
        };
      case 'warning':
        return {
          label: 'Warning',
          className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400'
        };
      case 'suspended':
        return {
          label: 'Suspended',
          className: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
        };
      default:
        return {
          label: 'Active', // Default to active for unknown statuses
          className: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
        };
    }
  };

  if (!status) return null; // Don't render if no status

  const config = getStatusConfig(displayStatus);
  const sizeClasses = {
    xxs: 'px-1 py-0.5 text-[10px]',
    xs: 'px-1.5 py-0.5 text-xs',
    sm: 'px-2 py-1 text-xs',
    md: 'px-2.5 py-1.5 text-sm'
  };

  return (
    <span className={cn(
      'inline-flex items-center rounded-full font-medium',
      sizeClasses[size],
      config.className
    )}>
      {config.label}
    </span>
  );
};

const PhoneNumbersPage = () => {
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState<PhoneNumber | null>(null);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAgentsLoading, setIsAgentsLoading] = useState<boolean>(true);
  const [isUpdateLoading, setIsUpdateLoading] = useState<boolean>(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [phoneNumberToDelete, setPhoneNumberToDelete] = useState<PhoneNumber | null>(null);
  
  // Assignment progress state
  const [assignmentProgress, setAssignmentProgress] = useState<{
    isAssigning: boolean;
    progress: number;
    message: string;
    phoneNumberId?: string;
  }>({
    isAssigning: false,
    progress: 0,
    message: '',
    phoneNumberId: undefined
  });
  
  // Add mobile responsiveness state
  const [isMobileView, setIsMobileView] = useState<boolean>(false);
  const [showPhoneDetailsOnMobile, setShowPhoneDetailsOnMobile] = useState<boolean>(false);

  // Check for mobile view on mount and window resize
  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    // Initial check
    checkMobileView();
    
    // Set up listener for window resize
    window.addEventListener('resize', checkMobileView);
    
    return () => {
      window.removeEventListener('resize', checkMobileView);
    };
  }, []);
  
  // Update mobile view state when phone number is selected
  useEffect(() => {
    if (selectedPhoneNumber && isMobileView) {
      setShowPhoneDetailsOnMobile(true);
    }
  }, [selectedPhoneNumber, isMobileView]);

  // Load phone numbers function
  const loadPhoneNumbers = async () => {
    setIsLoading(true);
    try {
      // First refresh all phone number statuses to ensure they're up-to-date
      try {
        await fetch('/api/twilio/phone-numbers/refresh-all-statuses', {
          method: 'POST'
        });
      } catch (error) {
        console.error('Error refreshing phone number statuses:', error);
        // Continue even if refresh fails
      }
      
      // Then fetch the phone numbers with updated statuses
      const response = await fetch('/api/twilio/phone-numbers');
      if (!response.ok) throw new Error('Failed to load phone numbers');
      const data = await response.json();
      setPhoneNumbers(data.phoneNumbers || []);
    } catch (error) {
      console.error('Error loading phone numbers:', error);
      toast.error('Failed to load phone numbers. Please try again later.');
      setPhoneNumbers([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load phone numbers on mount
  useEffect(() => {
    loadPhoneNumbers();
  }, []);

  // Load agents
  useEffect(() => {
    const loadAgents = async () => {
      setIsAgentsLoading(true);
      try {
        const response = await fetch('/api/chatbots');
        if (!response.ok) throw new Error('Failed to load agents');
        const data = await response.json();
        
        if (data.success && Array.isArray(data.chatbots)) {
          setAgents(data.chatbots.map((chatbot: any) => ({
            id: chatbot.id,
            name: chatbot.name,
            phoneNumberId: chatbot.phoneNumber || null
          })));
        } else {
          // Handle case where data doesn't have the expected structure
          console.error('Unexpected API response format:', data);
          setAgents([]);
        }
      } catch (error) {
        console.error('Error loading agents:', error);
        toast.error('Failed to load agents. Please try again later.');
        setAgents([]);
      } finally {
        setIsAgentsLoading(false);
      }
    };

    loadAgents();
  }, []);

  const handleDeletePhoneNumber = (phoneNumber: PhoneNumber) => {
    setPhoneNumberToDelete(phoneNumber);
    setIsDeleteDialogOpen(true);
  };

  const handlePhoneNumberDeleted = () => {
    // Remove the deleted phone number from the state
    if (phoneNumberToDelete) {
      setPhoneNumbers(prevPhoneNumbers => 
        prevPhoneNumbers.filter(p => p.id !== phoneNumberToDelete.id)
      );
      
      // Clear selected phone number if it was deleted
      if (selectedPhoneNumber?.id === phoneNumberToDelete.id) {
        setSelectedPhoneNumber(null);
      }
      
      // Reset the phoneNumberToDelete state
      setPhoneNumberToDelete(null);
    }
  };

  const handleAssignAgent = async (phoneNumberId: string, agentId: string | null) => {
    if (!phoneNumberId) return;

    // If the agent already has a phone number assigned, show warning
    if (agentId) {
      const agentWithPhone = agents.find(agent => agent.id === agentId);
      if (agentWithPhone?.phoneNumberId && agentWithPhone.phoneNumberId !== phoneNumberId) {
        toast.warning(`Agent ${agentWithPhone.name} already has a phone number assigned. Reassigning will remove their current number.`);
        return;
      }
    }

    // Start progress tracking
    setAssignmentProgress({
      isAssigning: true,
      progress: 0,
      message: agentId ? 'Starting agent assignment...' : 'Removing agent assignment...',
      phoneNumberId
    });

    setIsUpdateLoading(true);
    
    try {
      // Progress: 25%
      setAssignmentProgress(prev => ({
        ...prev,
        progress: 25,
        message: agentId ? 'Configuring SMS and voice capabilities...' : 'Updating phone number configuration...'
      }));

      // Small delay to show progress
      await new Promise(resolve => setTimeout(resolve, 500));

      // Progress: 50%
      setAssignmentProgress(prev => ({
        ...prev,
        progress: 50,
        message: agentId ? 'Connecting agent to incoming calls and messages...' : 'Disconnecting agent from phone number...'
      }));

      const response = await fetch(`/api/twilio/phone-numbers/${phoneNumberId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ agentId }),
      });

      if (!response.ok) throw new Error('Failed to assign agent');

      // Progress: 75%
      setAssignmentProgress(prev => ({
        ...prev,
        progress: 75,
        message: agentId ? 'Finalizing agent setup...' : 'Completing configuration...'
      }));

      // Small delay to show progress
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Update the phone numbers list
      setPhoneNumbers(prevPhoneNumbers => 
        prevPhoneNumbers.map(pn => {
          // Update the target phone number
          if (pn.id === phoneNumberId) {
            const assignedAgent = agents.find(a => a.id === agentId);
            return {
              ...pn,
              agentId,
              agentName: assignedAgent ? assignedAgent.name : null,
            };
          }
          // If we're assigning a new agent to a phone number, make sure to remove it from any other phone number
          if (agentId && pn.agentId === agentId && pn.id !== phoneNumberId) {
            return {
              ...pn,
              agentId: null,
              agentName: null,
            };
          }
          return pn;
        })
      );
      
      // Update the selected phone number if it's the one we just updated
      if (selectedPhoneNumber?.id === phoneNumberId) {
        const assignedAgent = agents.find(a => a.id === agentId);
        setSelectedPhoneNumber({
          ...selectedPhoneNumber,
          agentId,
          agentName: assignedAgent ? assignedAgent.name : null,
        });
      }
      
      // Update agents list
      setAgents(prevAgents => 
        prevAgents.map(agent => {
          if (agent.id === agentId) {
            return {
              ...agent,
              phoneNumberId
            };
          }
          // If this agent previously had this phone number, remove it
          if (agent.phoneNumberId === phoneNumberId) {
            return {
              ...agent,
              phoneNumberId: null
            };
          }
          return agent;
        })
      );

      // Progress: 100%
      setAssignmentProgress(prev => ({
        ...prev,
        progress: 100,
        message: agentId ? 'Phone number ready for calls and messages!' : 'Agent removed successfully!'
      }));

      // Wait a moment to show completion
      await new Promise(resolve => setTimeout(resolve, 800));
      
      toast.success(agentId ? 'Agent assigned and ready to receive calls and SMS' : 'Agent removed successfully');
      
    } catch (error) {
      console.error('Error assigning agent:', error);
      setAssignmentProgress(prev => ({
        ...prev,
        progress: 0,
        message: 'Assignment failed. Please try again.'
      }));
      
      // Wait a moment to show error
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.error('Failed to assign agent');
    } finally {
      setIsUpdateLoading(false);
      // Reset progress after a delay
      setTimeout(() => {
        setAssignmentProgress({
          isAssigning: false,
          progress: 0,
          message: '',
          phoneNumberId: undefined
        });
      }, 1000);
    }
  };
  
  const handlePhoneNumberPurchased = (newPhoneNumber: string) => {
    // Show toast notification for feedback
    toast.success(`Phone number ${newPhoneNumber} purchased successfully!`);
    
    // Refresh the phone numbers list
    loadPhoneNumbers();
  };

  const getAvailableAgents = () => {
    return agents.filter(agent => 
      !agent.phoneNumberId || 
      (selectedPhoneNumber && agent.phoneNumberId === selectedPhoneNumber.id)
    );
  };

  // Function to get detailed status information
  const getStatusInfo = (phone: PhoneNumber) => {
    const status = phone.calculatedStatus || phone.status;
    
    switch (status) {
      case 'active':
        return {
          variant: 'default' as const,
          icon: RiCheckboxCircleFill,
          title: 'Phone Number Active',
          description: 'Your phone number is active and ready to receive calls and messages.',
          className: 'border-green-200 bg-green-50 dark:border-green-800/50 dark:bg-green-950/20'
        };
      
      case 'warning':
        return {
          variant: 'default' as const,
          icon: RiErrorWarningLine,
          title: 'Subscription Required',
          description: phone.warningMessage || phone.statusReason || 'This phone number requires an active subscription to function properly. Please upgrade your plan or add a payment method to keep this number active.',
          className: 'border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/20'
        };
      
      case 'pending':
        return {
          variant: 'default' as const,
          icon: RiInformationLine,
          title: 'Ready for Agent Assignment',
          description: 'Your phone number is active and ready to use. Assign it to an agent to start receiving calls and messages.',
          className: 'border-blue-200 bg-blue-50 dark:border-blue-800/50 dark:bg-blue-950/20'
        };
      
      case 'suspended':
        return {
          variant: 'destructive' as const,
          icon: RiErrorWarningLine,
          title: 'Phone Number Suspended',
          description: 'Your phone number has been suspended due to payment issues. Add a payment method to reactivate this number.',
          className: 'border-red-200 bg-red-50 dark:border-red-800/50 dark:bg-red-950/20'
        };
      
      default:
        return {
          variant: 'default' as const,
          icon: RiInformationLine,
          title: 'Phone Number Status',
          description: 'Phone number status information is being updated.',
          className: 'border-neutral-200 bg-neutral-50 dark:border-neutral-800/50 dark:bg-neutral-950/20'
        };
    }
  };

  // Component for status banner
  const PhoneNumberStatusBanner = ({ phone }: { phone: PhoneNumber }) => {
    const statusInfo = getStatusInfo(phone);
    const StatusIcon = statusInfo.icon;

    // Only show banner for non-active statuses
    if ((phone.calculatedStatus || phone.status) === 'active') {
      return null;
    }

    return (
      <Alert className={`mb-6 ${statusInfo.className}`}>
        <StatusIcon className="h-4 w-4" />
        <AlertTitle>{statusInfo.title}</AlertTitle>
        <AlertDescription>{statusInfo.description}</AlertDescription>
      </Alert>
    );
  };

  return (
    <div className="flex h-full">
      {/* Left Sidebar */}
      {(!isMobileView || (isMobileView && !showPhoneDetailsOnMobile)) && (
        <div className={cn("border-r border-neutral-200 dark:border-neutral-800 flex flex-col", 
          isMobileView ? "w-full" : "w-80")}>
          <div className="p-4 pb-0">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-black dark:text-white">
                Phone Numbers
              </h2>
              <Button
                variant="secondary"
                className="h-8 w-8 p-0"
                onClick={() => setIsDrawerOpen(true)}
              >
                <RiAddLine className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <Divider className="mt-4" />
          
          <div className="flex-1 overflow-auto px-4 pb-4">
            {isLoading ? (
              <div className="grid grid-cols-1 gap-2 mt-1">
                {[1, 2, 3, 4, 5].map((item) => (
                  <div key={item} className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black">
                    <div className="flex items-center">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="ml-3 flex-1">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <Skeleton className="h-4 w-24" />
                            <div className="ml-2">
                              <Skeleton className="h-4 w-12" />
                            </div>
                          </div>
                        </div>
                        <Skeleton className="h-3 w-32 mt-1" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : phoneNumbers.length > 0 ? (
              <div className="grid grid-cols-1 gap-2 mt-1">
                {phoneNumbers.map((phone) => (
                  <div 
                    key={phone.id}
                    onClick={() => {
                      setSelectedPhoneNumber(phone);
                      if (isMobileView) {
                        setShowPhoneDetailsOnMobile(true);
                      }
                    }}
                    className={cn(
                      "group transition-all duration-200 cursor-pointer p-3 rounded-xl border relative",
                      "hover:bg-neutral-50 dark:hover:bg-neutral-900",
                      "hover:shadow-sm",
                      "bg-white dark:bg-black border-neutral-200 dark:border-neutral-800",
                      "hover:border-neutral-300 dark:hover:border-neutral-700",
                      selectedPhoneNumber?.id === phone.id && [
                        "border-neutral-400 dark:border-white",
                        "bg-neutral-50 dark:bg-neutral-900"
                      ],
                      phone.status === 'suspended' && "opacity-60"
                    )}
                  >
                    <div className="flex items-center">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-medium">
                        <RiPhoneLine className="h-4 w-4" />
                      </span>
                      <div className="ml-3 w-full overflow-hidden">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center max-w-[70%]">
                                                <div className="truncate text-sm font-semibold text-black dark:text-white">
                      {phone.number}
                    </div>
                            <div className="ml-2 flex-shrink-0">
                              <StatusBadge 
                                status={phone.status} 
                                calculatedStatus={phone.calculatedStatus}
                                size="xxs"
                              />
                            </div>
                          </div>
                        </div>
                        <p className="mt-1 truncate text-xs text-neutral-600 dark:text-neutral-400">
                          {phone.agentName || 'No agent assigned'}
                        </p>
                      </div>
                    </div>

                    <div className="absolute right-2 top-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <RiMoreFill className="h-3.5 w-3.5 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="min-w-56">
                          <DropdownMenuLabel>Phone Number Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          
                          <DropdownMenuGroup>
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePhoneNumber(phone);
                              }}
                              className="text-red-600 dark:text-red-400"
                            >
                              <span className="flex items-center gap-x-2">
                                <DropdownMenuIconWrapper>
                                  <RiDeleteBinLine className="size-4 text-inherit" />
                                </DropdownMenuIconWrapper>
                                <span>Delete</span>
                              </span>
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center py-8 text-center">
                <div className="flex flex-col items-center">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    No phone numbers yet.
                  </p>
                  <Button
                    variant="secondary"
                    className="mt-4"
                    onClick={() => setIsDrawerOpen(true)}
                  >
                    <RiAddLine className="mr-2 h-4 w-4" />
                    Add Phone Number
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      {(!isMobileView || (isMobileView && showPhoneDetailsOnMobile)) && (
        <div className="flex-1 overflow-auto">
          {isMobileView && showPhoneDetailsOnMobile && selectedPhoneNumber && (
            <div className="border-b border-neutral-200 dark:border-neutral-800 p-2">
              <Button
                variant="ghost"
                onClick={() => setShowPhoneDetailsOnMobile(false)}
                className="flex items-center text-neutral-600 dark:text-neutral-300"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                  <path d="m15 18-6-6 6-6"/>
                </svg>
                Back to phone numbers
              </Button>
            </div>
          )}
          
          {selectedPhoneNumber ? (
            <div className="p-6">
              {/* Simplified Header */}
              <header className="mb-6">
                <div className="sm:flex sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                        {selectedPhoneNumber.number}
                      </h3>
                      <StatusBadge 
                        status={selectedPhoneNumber.status} 
                        calculatedStatus={selectedPhoneNumber.calculatedStatus}
                        size="sm"
                      />
                    </div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {selectedPhoneNumber.monthlyFee}/month • Purchased {selectedPhoneNumber.boughtOn}
                    </p>
                    {/* Status indicators */}
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1.5">
                        <RiPhoneLine className="h-3.5 w-3.5 text-green-600 dark:text-green-500" />
                        <span className="text-xs text-neutral-600 dark:text-neutral-400">Calling ready</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <RiWhatsappFill className={cn(
                          "h-3.5 w-3.5",
                          selectedPhoneNumber.whatsappEnabled 
                            ? "text-green-600 dark:text-green-500" 
                            : "text-neutral-400 dark:text-neutral-600"
                        )} />
                        <span className="text-xs text-neutral-600 dark:text-neutral-400">
                          WhatsApp {selectedPhoneNumber.whatsappEnabled ? 'configured' : 'not configured'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => handleDeletePhoneNumber(selectedPhoneNumber)}
                    className="mt-3 sm:mt-0"
                  >
                    <RiDeleteBinLine className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </header>

              {/* Status Banner */}
              {/* <PhoneNumberStatusBanner phone={selectedPhoneNumber} /> */}

              {/* Status-based Action Cards */}
              {selectedPhoneNumber.status === 'suspended' && (
                <Card className="mb-6 border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/20">
                  <div className="p-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <Icons.warning className="h-5 w-5 text-amber-600 dark:text-amber-500" />
                      </div>
                      <div className="ml-3 flex-1">
                        <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                          Phone Number Suspended
                        </h3>
                        <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                          Add a payment method to reactivate this number and keep it active.
                        </p>
                        <div className="mt-4">
                          <PaymentMethodDisplay 
                            renewalDate={selectedPhoneNumber.renewsOn} 
                            showDetailsButton={false}
                          />
                          <div className="mt-3">
                            <Button 
                              variant="secondary" 
                              className="bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300 dark:bg-amber-900/50 dark:hover:bg-amber-900/70 dark:text-amber-200 dark:border-amber-700"
                            >
                              Add Payment Method
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {selectedPhoneNumber.status === 'pending' && (
                <Card className="mb-6 border-neutral-200 bg-neutral-50 dark:border-neutral-800/50 dark:bg-neutral-950/20">
                  <div className="p-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <RiInformationLine className="h-5 w-5 text-neutral-600 dark:text-neutral-500" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-semibold text-black dark:text-white">
                          Ready for Agent Assignment
                        </h3>
                        <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">
                          Your phone number is ready to use! Assign it to an agent using the dropdown below.
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              <main className="space-y-6">
                {/* Agent Assignment */}
                <Card>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Icons.speech className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                      <h4 className="text-sm font-semibold text-black dark:text-white">
                        Agent Assignment
                      </h4>
                    </div>
                    
                    {/* Progress Bar */}
                    {assignmentProgress.isAssigning && assignmentProgress.phoneNumberId === selectedPhoneNumber.id && (
                      <div className="mb-4 p-3 bg-neutral-50 dark:bg-neutral-950/20 border border-neutral-200 dark:border-neutral-800/50 rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-600"></div>
                          <span className="text-sm font-semibold text-black dark:text-white">
                            {assignmentProgress.message}
                          </span>
                        </div>
                        <div className="w-full bg-neutral-200 dark:bg-neutral-800 rounded-full h-2">
                          <div 
                            className="bg-neutral-600 dark:bg-neutral-500 h-2 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${assignmentProgress.progress}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-xs text-neutral-600 dark:text-neutral-400">
                            {assignmentProgress.progress}%
                          </span>
                          <span className="text-xs text-neutral-600 dark:text-neutral-400">
                            Please wait...
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {isAgentsLoading ? (
                      <div className="py-2">
                        <Skeleton className="h-10 w-full rounded-xl" />
                      </div>
                    ) : getAvailableAgents().length > 0 ? (
                      <div>
                        <Select 
                          value={selectedPhoneNumber.agentId || 'none'} 
                          onValueChange={(value) => handleAssignAgent(selectedPhoneNumber.id, value === 'none' ? null : value)}
                          disabled={isUpdateLoading || (selectedPhoneNumber.status !== 'active' && selectedPhoneNumber.status !== 'pending')}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Agent" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Agent (Unassign)</SelectItem>
                            {getAvailableAgents().map(agent => (
                              <SelectItem key={agent.id} value={agent.id}>
                                {agent.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        {(selectedPhoneNumber.status !== 'active' && selectedPhoneNumber.status !== 'pending') && (
                          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                            Available when number is active or pending
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        No available agents. Create an agent first.
                      </p>
                    )}
                  </div>
                </Card>

                {/* WhatsApp Configuration Form */}
                <WhatsAppConfigurationForm 
                  phoneNumber={selectedPhoneNumber}
                  onStatusUpdate={() => {
                    // Refresh phone numbers to get updated status
                    loadPhoneNumbers();
                  }}
                />

                {/* Simplified Billing Info */}
                {selectedPhoneNumber.status === 'active' && (
                  <Card>
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Icons.billing className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                        <h4 className="text-sm font-semibold text-black dark:text-white">
                          Billing
                        </h4>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-neutral-600 dark:text-neutral-400">Monthly cost</span>
                          <span className="font-medium">{selectedPhoneNumber.monthlyFee}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-600 dark:text-neutral-400">Next billing</span>
                          <span>{new Date(selectedPhoneNumber.renewsOn).toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <PaymentMethodDisplay 
                          renewalDate={selectedPhoneNumber.renewsOn} 
                          showDetailsButton={true}
                        />
                      </div>
                    </div>
                  </Card>
                )}
              </main>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center p-6">
              <Card className="p-6 bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
                <div className="flex flex-col items-center max-w-md">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
                    <RiPhoneLine className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
                  </div>
                  
                  <h3 className="text-sm font-semibold text-black dark:text-white mb-1">
                    {phoneNumbers.length > 0 
                      ? 'Select a Phone Number' 
                      : 'Welcome to Phone Numbers'}
                  </h3>
                  
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4 text-center">
                    {phoneNumbers.length > 0 
                      ? 'Select a phone number from the sidebar or add a new one to get started.' 
                      : 'Add your first phone number to enhance your communication capabilities.'}
                  </p>
                  
                  <Button onClick={() => setIsDrawerOpen(true)} size="sm">
                    <RiAddLine className="mr-2 h-4 w-4" />
                    Add Phone Number
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Buy Phone Number Drawer */}
      <BuyPhoneNumberDrawer 
        open={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        onPhoneNumberPurchased={handlePhoneNumberPurchased}
      />

      {/* Delete Confirmation Dialog */}
      <DeletePhoneNumberDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        phoneNumber={phoneNumberToDelete}
        onDeleted={handlePhoneNumberDeleted}
      />
    </div>
  );
};

export default PhoneNumbersPage;
