'use client';

import { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import {
  RiBuildingFill,
  RiMapPin2Fill,
  RiUserFill,
  RiFileListLine,
  RiSettings3Line,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiMoreFill,
  RiAddLine,
  RiArrowLeftLine,
  RiDeleteBinLine,
  RiEditLine,
  RiRefreshLine
} from '@remixicon/react';

import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Divider } from '@/components/Divider';
import { ProgressCircle } from '@/components/ui/ProgressCircle';
import { Button } from "@/components/Button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/DropdownMenu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/Select";

// Temporary mock data, will be replaced with actual API data
const mockData = [
  {
    status: 'New Tickets',
    icon: RiFileListLine,
    iconColor: 'text-indigo-500',
    tickets: [
      {
        id: 't001',
        subject: 'Printer Laser Jet Pro not working',
        agentId: 'agent1',
        agentName: 'Sales Assistant',
        customerEmail: 'lena.stone@example.com',
        customerName: 'Lena Stone',
        priority: 'high',
        progress: 80,
        progressTotal: 100,
        lastUpdated: '2min ago',
        status: 'New Tickets',
      },
      {
        id: 't002',
        subject: 'LED Monitor flickering issue',
        agentId: 'agent2',
        agentName: 'Support Bot',
        customerEmail: 'matthias.ruedi@example.com',
        customerName: 'Matthias Ruedi',
        priority: 'medium',
        progress: 75,
        progressTotal: 100,
        lastUpdated: '5min ago',
        status: 'New Tickets',
      },
      {
        id: 't003',
        subject: 'Conference Speaker connectivity problems',
        agentId: 'agent1',
        agentName: 'Sales Assistant',
        customerEmail: 'david.mueller@example.com',
        customerName: 'David Mueller',
        priority: 'low',
        progress: 50,
        progressTotal: 100,
        lastUpdated: '10d ago',
        status: 'New Tickets',
      },
    ],
  },
  {
    status: 'Processing',
    icon: RiSettings3Line,
    iconColor: 'text-yellow-500',
    tickets: [
      {
        id: 't004',
        subject: 'OLED 49" Monitor dead pixels',
        agentId: 'agent2',
        agentName: 'Support Bot',
        customerEmail: 'patrick.doe@example.com',
        customerName: 'Patrick Doe',
        priority: 'medium',
        progress: 83,
        progressTotal: 100,
        lastUpdated: '4d ago',
        status: 'Processing',
      },
      {
        id: 't005',
        subject: 'Portable Power Station not charging',
        agentId: 'agent3',
        agentName: 'Technical Support',
        customerEmail: 'marco.smith@example.com',
        customerName: 'Marco Smith',
        priority: 'high',
        progress: 62,
        progressTotal: 100,
        lastUpdated: '1d ago',
        status: 'Processing',
      },
    ],
  },
  {
    status: 'Completed',
    icon: RiCheckboxCircleLine,
    iconColor: 'text-green-500',
    tickets: [
      {
        id: 't006',
        subject: 'External SSD Portable not recognized',
        agentId: 'agent1',
        agentName: 'Sales Assistant',
        customerEmail: 'adam.taylor@example.com',
        customerName: 'Adam Taylor',
        priority: 'medium',
        progress: 100,
        progressTotal: 100,
        lastUpdated: '1d ago',
        status: 'Completed',
      },
    ],
  },
  {
    status: 'Cancelled',
    icon: RiCloseCircleLine,
    iconColor: 'text-red-500',
    tickets: [
      {
        id: 't007',
        subject: 'Webcam installation issue',
        agentId: 'agent3',
        agentName: 'Technical Support',
        customerEmail: 'peter.jones@example.com',
        customerName: 'Peter Jones',
        priority: 'low',
        progress: 30,
        progressTotal: 100,
        lastUpdated: '3d ago',
        status: 'Cancelled',
      },
    ],
  },
];

// Mock agents data
const mockAgents = [
  { id: 'agent1', name: 'Sales Assistant' },
  { id: 'agent2', name: 'Support Bot' },
  { id: 'agent3', name: 'Technical Support' },
];

type Status = 'New Tickets' | 'Processing' | 'Completed' | 'Cancelled';
type Priority = 'high' | 'medium' | 'low';

interface Ticket {
  id: string;
  subject: string;
  agentId: string;
  agentName: string;
  customerEmail: string;
  customerName: string;
  priority: Priority;
  progress: number;
  progressTotal: number;
  lastUpdated: string;
  status: Status;
}

const statusColor: Record<Status, string> = {
  'New Tickets': 'bg-indigo-50 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-400/10 dark:text-indigo-400 dark:ring-indigo-400/20',
  'Processing': 'bg-yellow-50 text-yellow-700 ring-yellow-600/20 dark:bg-yellow-400/10 dark:text-yellow-400 dark:ring-yellow-400/20',
  'Completed': 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-400/10 dark:text-green-400 dark:ring-green-400/20',
  'Cancelled': 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-400/10 dark:text-red-400 dark:ring-red-400/20',
};

const priorityColor: Record<Priority, string> = {
  'high': 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-400/10 dark:text-red-400 dark:ring-red-400/20',
  'medium': 'bg-yellow-50 text-yellow-700 ring-yellow-600/20 dark:bg-yellow-400/10 dark:text-yellow-400 dark:ring-yellow-400/20',
  'low': 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-400/10 dark:text-blue-400 dark:ring-blue-400/20',
};

export default function TicketsPage() {
  const { data: session } = useSession();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  // Mobile responsiveness state
  const [isMobileView, setIsMobileView] = useState<boolean>(false);
  const [showTicketDetailsOnMobile, setShowTicketDetailsOnMobile] = useState<boolean>(false);

  // Load the mock data
  useEffect(() => {
    const loadData = () => {
      setIsLoading(true);
      // In a real application, this would be an API call
      setTimeout(() => {
        // Flatten the tickets array from the mock data
        const allTickets = mockData.flatMap(category => 
          category.tickets.map(ticket => ({
            ...ticket,
          }))
        );
        setTickets(allTickets);
        setFilteredTickets(allTickets);
        setIsLoading(false);
      }, 800); // Simulate network delay
    };

    loadData();
  }, []);

  // Filter tickets when filter changes
  useEffect(() => {
    let result = tickets;
    
    if (statusFilter !== "all") {
      result = result.filter(ticket => ticket.status === statusFilter);
    }
    
    if (agentFilter !== "all") {
      result = result.filter(ticket => ticket.agentId === agentFilter);
    }
    
    setFilteredTickets(result);
  }, [tickets, statusFilter, agentFilter]);

  // Handle mobile view detection
  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    checkMobileView();
    window.addEventListener('resize', checkMobileView);
    
    return () => {
      window.removeEventListener('resize', checkMobileView);
    };
  }, []);

  // Update mobile view state when ticket is selected
  useEffect(() => {
    if (isMobileView && selectedTicket) {
      setShowTicketDetailsOnMobile(true);
    }
  }, [selectedTicket, isMobileView]);

  const handleSelectTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    if (isMobileView) {
      setShowTicketDetailsOnMobile(true);
    }
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
  };

  const handleAgentFilterChange = (value: string) => {
    setAgentFilter(value);
  };

  const handleDeleteTicket = async (id: string) => {
    setIsDeleting(true);
    // In a real app, this would call an API
    setTimeout(() => {
      setTickets(tickets.filter(ticket => ticket.id !== id));
      
      // If the deleted ticket was selected, deselect it
      if (selectedTicket?.id === id) {
        setSelectedTicket(null);
        setShowTicketDetailsOnMobile(false);
      }
      
      setTicketToDelete(null);
      setIsDeleting(false);
    }, 1000);
  };

  const handleRefresh = () => {
    setIsLoading(true);
    // In a real app, this would call an API to fetch fresh data
    setTimeout(() => {
      setIsLoading(false);
    }, 800);
  };

  // Render the empty state when no ticket is selected
  const renderEmptyState = () => (
    <div className="flex h-full flex-col items-center justify-center p-6">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900">
          <RiFileListLine className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
          {filteredTickets.length > 0 
            ? 'Select a Ticket' 
            : 'No Tickets Found'}
        </h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          {filteredTickets.length > 0 
            ? 'Select a ticket from the sidebar to view details.' 
            : 'No tickets match your current filters. Try changing your filter settings or create a new ticket.'}
        </p>
        <Button 
          className="mt-6" 
          onClick={() => setIsCreateDialogOpen(true)}
        >
          <RiAddLine className="mr-2 h-4 w-4" />
          Create New Ticket
        </Button>
      </div>
    </div>
  );

  // Render the ticket details view
  const renderTicketDetails = () => {
    if (!selectedTicket) return null;
    
    return (
      <div className="p-6 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50">
            Ticket Details
          </h2>
          <div className="flex items-center space-x-2">
            <Button variant="secondary" size="sm">
              <RiEditLine className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <RiMoreFill className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {
                  // Change status logic would go here
                }}>
                  Mark as Completed
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  // Assign to different agent logic would go here
                }}>
                  Reassign Ticket
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-red-600 dark:text-red-400"
                  onClick={() => setTicketToDelete(selectedTicket)}
                >
                  <RiDeleteBinLine className="mr-2 h-4 w-4" />
                  Delete Ticket
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        <Card className="mb-6">
          <div className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-50">
                {selectedTicket.subject}
              </h3>
              <div className="mt-2 sm:mt-0 flex items-center space-x-2">
                <Badge 
                  className={cn(
                    statusColor[selectedTicket.status as Status],
                    'inline-flex items-center whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset',
                  )}
                >
                  {selectedTicket.status}
                </Badge>
                <Badge 
                  className={cn(
                    priorityColor[selectedTicket.priority],
                    'inline-flex items-center whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset',
                  )}
                >
                  {selectedTicket.priority} priority
                </Badge>
              </div>
            </div>
            
            <Divider className="my-4" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Customer Information</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <RiUserFill className="size-5 text-gray-400 dark:text-gray-600" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedTicket.customerName}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RiMapPin2Fill className="size-5 text-gray-400 dark:text-gray-600" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedTicket.customerEmail}
                    </p>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Ticket Information</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <RiBuildingFill className="size-5 text-gray-400 dark:text-gray-600" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Agent: {selectedTicket.agentName}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RiFileListLine className="size-5 text-gray-400 dark:text-gray-600" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Ticket ID: {selectedTicket.id}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <Divider className="my-4" />
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ProgressCircle
                    value={(selectedTicket.progress / selectedTicket.progressTotal) * 100}
                    radius={9}
                    strokeWidth={3.5}
                  />
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
                    Resolution Progress ({selectedTicket.progress}/{selectedTicket.progressTotal})
                  </p>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  Updated {selectedTicket.lastUpdated}
                </p>
              </div>
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="p-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Conversation History</h4>
            
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md">
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                This is a mockup. In a real application, the conversation between the customer and the AI agent would appear here.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left Sidebar: Tickets List */}
      {(!isMobileView || (isMobileView && !showTicketDetailsOnMobile)) && (
        <div className={`${isMobileView ? 'w-full' : 'w-80'} border-r border-gray-200 dark:border-gray-800 flex flex-col`}>
          <div className="p-4 pb-0">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                Support Tickets
              </h2>
              <div className="flex items-center space-x-2">
                <Button
                  variant="secondary"
                  className="h-8 w-8 p-0"
                  onClick={handleRefresh}
                  disabled={isLoading}
                  title="Refresh tickets"
                >
                  <RiRefreshLine className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
                <Button
                  variant="secondary"
                  className="h-8 w-8 p-0"
                  onClick={() => setIsCreateDialogOpen(true)}
                  title="Create new ticket"
                >
                  <RiAddLine className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Select
                value={statusFilter}
                onValueChange={handleStatusFilterChange}
              >
                <SelectTrigger className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {mockData.map((category) => (
                    <SelectItem key={category.status} value={category.status}>
                      {category.status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select
                value={agentFilter}
                onValueChange={handleAgentFilterChange}
              >
                <SelectTrigger className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50">
                  <SelectValue placeholder="Agent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agents</SelectItem>
                  {mockAgents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Divider className="mt-4" />
          
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600"></div>
                <span className="ml-2 text-sm text-gray-500">Loading tickets...</span>
              </div>
            ) : filteredTickets.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {filteredTickets.map((ticket) => (
                  <Card 
                    key={ticket.id} 
                    className={cn(
                      "cursor-pointer hover:shadow-sm transition-all duration-200",
                      "hover:bg-gray-50 dark:hover:bg-gray-900",
                      "hover:border-gray-300 dark:hover:border-gray-700",
                      selectedTicket?.id === ticket.id && [
                        "border-indigo-600 dark:border-indigo-500",
                        "bg-indigo-50/50 dark:bg-indigo-500/5",
                        "ring-1 ring-indigo-500 dark:ring-indigo-500"
                      ]
                    )}
                    onClick={() => handleSelectTicket(ticket)}
                  >
                    <div className="p-3">
                      <div className="flex items-center justify-between">
                        <h4 className={cn(
                          "text-sm font-medium truncate text-gray-900 dark:text-gray-50 flex-1 mr-2",
                          selectedTicket?.id === ticket.id && "text-indigo-600 dark:text-indigo-400"
                        )}>
                          {ticket.subject}
                        </h4>
                        <Badge 
                          className={cn(
                            statusColor[ticket.status as Status],
                            'inline-flex items-center whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset',
                          )}
                        >
                          {ticket.status}
                        </Badge>
                      </div>
                      
                      <div className="mt-2 flex items-center text-xs text-gray-500 space-x-2">
                        <span>Agent: {ticket.agentName}</span>
                        <span>•</span>
                        <span>{ticket.customerName}</span>
                      </div>
                      
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                          <ProgressCircle
                            value={(ticket.progress / ticket.progressTotal) * 100}
                            radius={7}
                            strokeWidth={3}
                          />
                          <p className="text-xs text-gray-500">
                            {ticket.progress}%
                          </p>
                        </div>
                        <p className="text-xs text-gray-500">
                          {ticket.lastUpdated}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <RiFileListLine className="h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No tickets match your current filters
                </p>
                <Button 
                  variant="link" 
                  className="mt-2 text-indigo-600 dark:text-indigo-400"
                  onClick={() => {
                    setStatusFilter("all");
                    setAgentFilter("all");
                  }}
                >
                  Clear filters
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content: Ticket Details */}
      <div className="flex-1 overflow-auto">
        {/* Mobile back button */}
        {isMobileView && showTicketDetailsOnMobile && selectedTicket && (
          <div className="border-b border-gray-200 dark:border-gray-800 p-2 sticky top-0 bg-white dark:bg-gray-950 z-10">
            <Button
              variant="ghost"
              onClick={() => setShowTicketDetailsOnMobile(false)}
              className="flex items-center text-gray-600 dark:text-gray-300"
            >
              <RiArrowLeftLine className="h-4 w-4 mr-1" />
              Back to tickets
            </Button>
          </div>
        )}
        
        {/* Show ticket details if a ticket is selected, otherwise show empty state */}
        {(!isMobileView || (isMobileView && showTicketDetailsOnMobile)) && (
          selectedTicket ? renderTicketDetails() : renderEmptyState()
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!ticketToDelete} onOpenChange={(open) => {
        if (!open) setTicketToDelete(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Ticket</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this ticket? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button 
              variant="destructive"
              onClick={() => ticketToDelete && handleDeleteTicket(ticketToDelete.id)}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Ticket Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Ticket</DialogTitle>
            <DialogDescription>
              This functionality will be implemented later. In a real app, you would be able to create tickets manually here.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-800 dark:text-yellow-400">
              In the final implementation, tickets will be primarily created automatically by AI agents when they detect a customer needs assistance.
            </p>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsCreateDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}