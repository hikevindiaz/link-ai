"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Divider } from '@/components/Divider';
import EmptyState from '@/components/ui/empty-state';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { RiDeleteBinLine, RiPencilLine, RiAddLine, RiMoreFill, RiPhoneLine } from '@remixicon/react';
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
}

interface Agent {
  id: string;
  name: string;
  phoneNumberId: string | null;
}

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

  // Load phone numbers
  useEffect(() => {
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

    setIsUpdateLoading(true);
    try {
      const response = await fetch(`/api/twilio/phone-numbers/${phoneNumberId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ agentId }),
      });

      if (!response.ok) throw new Error('Failed to assign agent');
      
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
      
      toast.success(agentId ? 'Agent assigned successfully' : 'Agent removed successfully');
    } catch (error) {
      console.error('Error assigning agent:', error);
      toast.error('Failed to assign agent');
    } finally {
      setIsUpdateLoading(false);
    }
  };
  
  const handlePhoneNumberPurchased = (newPhoneNumber: string) => {
    // Show toast notification for feedback
    toast.success(`Phone number ${newPhoneNumber} purchased successfully!`);
    
    // Refresh the phone numbers list
    const loadPhoneNumbers = async () => {
      setIsLoading(true);
      try {
        // First refresh all phone number statuses to ensure they're up-to-date
        console.log('Refreshing phone number statuses...');
        await fetch('/api/twilio/phone-numbers/refresh-all-statuses', {
          method: 'POST'
        });
        
        // Add a small delay to ensure database updates are complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Then fetch the phone numbers with updated statuses
        console.log('Fetching updated phone number list...');
        const response = await fetch('/api/twilio/phone-numbers');
        
        if (!response.ok) throw new Error('Failed to load phone numbers');
        
        const data = await response.json();
        console.log('Fetched phone numbers:', data.phoneNumbers);
        
        setPhoneNumbers(data.phoneNumbers || []);
        
        // Find the newly purchased phone number to select it
        const newlyPurchased = data.phoneNumbers?.find((p: PhoneNumber) => p.number === newPhoneNumber);
        if (newlyPurchased) {
          setSelectedPhoneNumber(newlyPurchased);
          console.log('Selected newly purchased phone number:', newlyPurchased);
        }
      } catch (error) {
        console.error('Error refreshing phone numbers:', error);
        toast.error('Failed to refresh phone number list. Please reload the page.');
      } finally {
        setIsLoading(false);
      }
    };

    loadPhoneNumbers();
  };

  const getAvailableAgents = () => {
    return agents.filter(agent => 
      !agent.phoneNumberId || 
      (selectedPhoneNumber && agent.phoneNumberId === selectedPhoneNumber.id)
    );
  };

  return (
    <div className="flex h-full">
      {/* Left Sidebar */}
      {(!isMobileView || (isMobileView && !showPhoneDetailsOnMobile)) && (
        <div className={cn("border-r border-gray-200 dark:border-gray-800 flex flex-col", 
          isMobileView ? "w-full" : "w-80")}>
          <div className="p-4 pb-0">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                My Phone Numbers
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
              <div className="flex items-center justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600"></div>
                <span className="ml-2 text-sm text-gray-500">Loading phone numbers...</span>
              </div>
            ) : phoneNumbers.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 mt-1">
                {phoneNumbers.map((phone) => (
                  <Card 
                    key={phone.id}
                    className={cn(
                      "group transition-all duration-200",
                      "hover:bg-gray-50 dark:hover:bg-gray-900",
                      "hover:shadow-sm",
                      "hover:border-gray-300 dark:hover:border-gray-700",
                      selectedPhoneNumber?.id === phone.id && [
                        "border-indigo-500 dark:border-indigo-500",
                        "bg-indigo-50/50 dark:bg-indigo-500/5",
                        "ring-1 ring-indigo-500/20 dark:ring-indigo-500/20"
                      ],
                      phone.status === 'suspended' && "opacity-60"
                    )}
                  >
                    <div className="relative px-3.5 py-2.5">
                      <div className="flex items-center space-x-3">
                        <span
                          className={cn(
                            'flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-medium',
                            'bg-indigo-100 dark:bg-indigo-500/20',
                            'text-indigo-800 dark:text-indigo-500',
                            'transition-transform duration-200 group-hover:scale-[1.02]',
                            selectedPhoneNumber?.id === phone.id && [
                              "border-2 border-indigo-500 dark:border-indigo-500",
                              "shadow-[0_0_0_4px_rgba(59,130,246,0.1)]"
                            ],
                            phone.status === 'suspended' && "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                          )}
                          aria-hidden={true}
                        >
                          <RiPhoneLine className="h-5 w-5" />
                        </span>
                        <div className="truncate min-w-0">
                          <p className={cn(
                            "truncate text-sm font-medium text-gray-900 dark:text-gray-50",
                            selectedPhoneNumber?.id === phone.id && "text-indigo-600 dark:text-indigo-400",
                            phone.status === 'suspended' && "text-gray-500 dark:text-gray-400"
                          )}>
                            <button 
                              onClick={() => {
                                setSelectedPhoneNumber(phone);
                                if (isMobileView) {
                                  setShowPhoneDetailsOnMobile(true);
                                }
                              }}
                              className="focus:outline-none hover:no-underline no-underline"
                              type="button"
                            >
                              <span className="absolute inset-0" aria-hidden="true" />
                              {phone.number}
                            </button>
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 pointer-events-none no-underline mt-0.5">
                            {phone.agentName || 'No agent assigned'}
                            {phone.status === 'suspended' && ' · Suspended'}
                            {phone.status === 'pending' && ' · Pending'}
                          </p>
                        </div>
                      </div>

                      <div className="absolute right-2.5 top-2.5">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <RiMoreFill className="h-3.5 w-3.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300" />
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
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center py-8 text-center">
                <div className="flex flex-col items-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
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
            <div className="border-b border-gray-200 dark:border-gray-800 p-2">
              <Button
                variant="ghost"
                onClick={() => setShowPhoneDetailsOnMobile(false)}
                className="flex items-center text-gray-600 dark:text-gray-300"
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
              <header className="border-b border-gray-200 dark:border-gray-800 pb-4 mb-4">
                <div className="sm:flex sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                      {selectedPhoneNumber.number}
                    </h3>
                    {selectedPhoneNumber.status === 'suspended' && (
                      <p className="mt-1 text-sm text-yellow-600 dark:text-yellow-500">
                        This phone number is suspended. Please check your billing information.
                      </p>
                    )}
                    {selectedPhoneNumber.status === 'pending' && (
                      <p className="mt-1 text-sm text-indigo-600 dark:text-indigo-500">
                        This phone number is being provisioned. It will be available soon.
                      </p>
                    )}
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => handleDeletePhoneNumber(selectedPhoneNumber)}
                  >
                    <RiDeleteBinLine className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </header>
              <main>
                <Card className="overflow-hidden p-0 bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-900 mb-4">
                  <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-900 dark:bg-gray-900">
                    <div className="flex items-center gap-2">
                      <Icons.speech className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <h4 className="text-md font-semibold text-gray-900 dark:text-gray-50">
                        Agent Assignment
                      </h4>
                    </div>
                  </div>
                  <div className="p-4 bg-white dark:bg-gray-900/50">
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 mb-3">
                      Assign an agent to handle calls to this phone number. Each agent can only have one phone number assigned.
                    </p>
                    
                    {isAgentsLoading ? (
                      <div className="flex items-center py-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600 mr-2"></div>
                        <span className="text-sm text-gray-500">Loading agents...</span>
                      </div>
                    ) : getAvailableAgents().length > 0 ? (
                      <div>
                        <Select 
                          value={selectedPhoneNumber.agentId || 'none'} 
                          onValueChange={(value) => handleAssignAgent(selectedPhoneNumber.id, value === 'none' ? null : value)}
                          disabled={isUpdateLoading || selectedPhoneNumber.status !== 'active'}
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
                        
                        {selectedPhoneNumber.status !== 'active' && (
                          <p className="mt-2 text-xs text-yellow-600 dark:text-yellow-500">
                            Agent assignment is only available for active phone numbers.
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-yellow-600 dark:text-yellow-500">
                        No available agents found. Create an agent first or free up an agent by unassigning their current phone number.
                      </p>
                    )}
                  </div>
                </Card>
                <Card className="overflow-hidden p-0 bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-900">
                  <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-900 dark:bg-gray-900">
                    <div className="flex items-center gap-2">
                      <Icons.billing className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <h4 className="text-md font-semibold text-gray-900 dark:text-gray-50">
                        Billing Information
                      </h4>
                    </div>
                  </div>
                  <div className="p-4 bg-white dark:bg-gray-900/50">
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      Monthly Fee: {selectedPhoneNumber.monthlyFee}
                    </p>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      Purchased On: {new Date(selectedPhoneNumber.boughtOn).toLocaleDateString()}
                    </p>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      Renews On: {new Date(selectedPhoneNumber.renewsOn).toLocaleDateString()}
                    </p>
                    
                    {/* Payment Method Display */}
                    <PaymentMethodDisplay 
                      renewalDate={selectedPhoneNumber.renewsOn} 
                      showDetailsButton={true}
                    />
                    
                    <div className="mt-4 rounded-md bg-indigo-50 p-3 dark:bg-indigo-900/20">
                      <div className="flex">
                        <Icons.info className="h-5 w-5 text-indigo-400 dark:text-indigo-500" />
                        <div className="ml-3">
                          <p className="text-sm text-indigo-700 dark:text-indigo-300">
                            This phone number requires an active payment method. If your payment method becomes invalid, 
                            the phone number may be suspended and eventually released.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
                
                {/* Phone Number Status Component */}
                <PhoneNumberStatus 
                  phoneNumber={{
                    id: selectedPhoneNumber.id,
                    number: selectedPhoneNumber.number,
                    status: selectedPhoneNumber.status,
                    twilioSid: selectedPhoneNumber.twilioSid
                  }}
                />
              </main>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-6">
              <div className="mx-auto max-w-md text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900">
                  <RiPhoneLine className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
                  {phoneNumbers.length > 0 
                    ? 'Select a Phone Number' 
                    : 'Welcome to Phone Numbers'}
                </h1>
                <p className="mt-2 text-gray-500 dark:text-gray-400">
                  {phoneNumbers.length > 0 
                    ? 'Select a phone number from the sidebar or add a new one to get started.' 
                    : 'Add your first phone number to enhance your communication capabilities.'}
                </p>
                <Button className="mt-6" onClick={() => setIsDrawerOpen(true)}>
                  <RiAddLine className="mr-2 h-4 w-4" />
                  Add Phone Number
                </Button>
              </div>
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
