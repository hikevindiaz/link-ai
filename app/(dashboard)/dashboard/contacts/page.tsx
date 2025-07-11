'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/Button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Divider } from "@/components/Divider";
import { toast } from "sonner";
import { 
  RiSearchLine, 
  RiFilterLine, 
  RiDownloadLine,
  RiMoreFill,
  RiEditLine,
  RiDeleteBinLine,
  RiHistoryLine,
  RiUserLine
} from "@remixicon/react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRoot,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { unparse } from 'papaparse';
import { cn } from "@/lib/utils";

// Contact type definition
interface Contact {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  toolsUsed: string[];
  createdAt: Date;
  updatedAt: Date;
  lastActivity: Date;
}

// Timeline event type
interface TimelineEvent {
  id: string;
  type: 'message' | 'appointment' | 'form' | 'call';
  description: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  user?: {
    name: string;
    initial: string;
    bgColor: string;
  };
}

export default function ContactsPage() {
  const { data: session } = useSession();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [toolFilter, setToolFilter] = useState('all');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [contactHistory, setContactHistory] = useState<TimelineEvent[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Mock data for development - replace with actual API call
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        setIsLoading(true);
        
        // Mock data - replace with actual API endpoint
        const mockContacts: Contact[] = [
          {
            id: '1',
            name: 'John Doe',
            email: 'john.doe@example.com',
            phoneNumber: '+1234567890',
            toolsUsed: ['chat', 'appointments', 'forms'],
            createdAt: new Date('2024-01-15'),
            updatedAt: new Date('2024-01-20'),
            lastActivity: new Date('2024-01-20')
          },
          {
            id: '2',
            name: 'Jane Smith',
            email: 'jane.smith@example.com',
            phoneNumber: null,
            toolsUsed: ['chat', 'calls'],
            createdAt: new Date('2024-01-10'),
            updatedAt: new Date('2024-01-18'),
            lastActivity: new Date('2024-01-18')
          },
          {
            id: '3',
            name: 'Robert Johnson',
            email: 'robert.j@example.com',
            phoneNumber: '+0987654321',
            toolsUsed: ['forms', 'appointments'],
            createdAt: new Date('2024-01-05'),
            updatedAt: new Date('2024-01-19'),
            lastActivity: new Date('2024-01-19')
          }
        ];
        
        setContacts(mockContacts);
        
        // Uncomment and modify for actual API call
        // const response = await fetch(`/api/contacts?userId=${session?.user?.id}`);
        // if (!response.ok) throw new Error('Failed to fetch contacts');
        // const data = await response.json();
        // setContacts(data.contacts);
        
      } catch (error) {
        console.error('Error fetching contacts:', error);
        toast.error('Failed to load contacts');
      } finally {
        setIsLoading(false);
      }
    };

    if (session?.user?.id) {
      fetchContacts();
    }
  }, [session?.user?.id]);

  // Get unique tools for filter
  const uniqueTools = useMemo(() => {
    const toolsSet = new Set<string>();
    contacts.forEach(contact => {
      contact.toolsUsed.forEach(tool => toolsSet.add(tool));
    });
    return Array.from(toolsSet).sort();
  }, [contacts]);

  // Filter contacts based on search and tool filter
  const filteredContacts = useMemo(() => {
    return contacts.filter(contact => {
      // Search filter
      const matchesSearch = searchQuery === '' || 
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (contact.phoneNumber && contact.phoneNumber.includes(searchQuery));

      // Tool filter
      const matchesTool = toolFilter === 'all' || 
        contact.toolsUsed.includes(toolFilter);

      return matchesSearch && matchesTool;
    });
  }, [contacts, searchQuery, toolFilter]);

  const handleExportCSV = () => {
    try {
      const csvData = filteredContacts.map(contact => ({
        Name: contact.name,
        Email: contact.email,
        'Phone Number': contact.phoneNumber || 'N/A',
        'Tools Used': contact.toolsUsed.join(', '),
        'Date Added': contact.createdAt.toLocaleDateString(),
        'Last Activity': contact.lastActivity.toLocaleDateString()
      }));

      const csv = unparse(csvData);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `contacts_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Contacts exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export contacts');
    }
  };

  const handleShowHistory = async (contact: Contact) => {
    setSelectedContact(contact);
    setShowHistoryDialog(true);
    setIsLoadingHistory(true);

    try {
      // Mock history data - replace with actual API call
      const mockHistory: TimelineEvent[] = [
        {
          id: '1',
          type: 'message',
          description: 'started a chat conversation',
          timestamp: new Date('2024-01-20T10:30:00'),
          metadata: { agentName: 'Support Bot' },
          user: {
            name: 'Support Bot',
            initial: 'S',
            bgColor: 'bg-indigo-500'
          }
        },
        {
          id: '2',
          type: 'appointment',
          description: 'booked an appointment',
          timestamp: new Date('2024-01-19T14:00:00'),
          metadata: { date: '2024-01-25', time: '10:00 AM' },
          user: {
            name: 'Calendar Bot',
            initial: 'C',
            bgColor: 'bg-emerald-500'
          }
        },
        {
          id: '3',
          type: 'form',
          description: 'submitted contact form',
          timestamp: new Date('2024-01-18T09:15:00'),
          metadata: { formName: 'Contact Us' },
          user: {
            name: 'Form Handler',
            initial: 'F',
            bgColor: 'bg-orange-500'
          }
        }
      ];

      setContactHistory(mockHistory);
      
      // Uncomment for actual API call
      // const response = await fetch(`/api/contacts/${contact.id}/history`);
      // if (!response.ok) throw new Error('Failed to fetch contact history');
      // const data = await response.json();
      // setContactHistory(data.history);
      
    } catch (error) {
      console.error('Error fetching contact history:', error);
      toast.error('Failed to load contact history');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleEditContact = (contact: Contact) => {
    // TODO: Implement edit functionality
    toast.info('Edit functionality coming soon');
  };

  const handleDeleteContact = async () => {
    if (!contactToDelete) return;

    try {
      // TODO: Implement actual delete API call
      // const response = await fetch(`/api/contacts/${contactToDelete.id}`, {
      //   method: 'DELETE',
      // });
      // if (!response.ok) throw new Error('Failed to delete contact');

      setContacts(contacts.filter(c => c.id !== contactToDelete.id));
      toast.success('Contact deleted successfully');
      setShowDeleteDialog(false);
      setContactToDelete(null);
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast.error('Failed to delete contact');
    }
  };

  const getTimelineIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'message':
        return '💬';
      case 'appointment':
        return '📅';
      case 'form':
        return '📝';
      case 'call':
        return '📞';
      default:
        return '📌';
    }
  };

  if (isLoading) {
    return (
      <div className="p-0">
        {/* Header skeleton */}
        <div className="px-4 md:px-8 pt-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-2">
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-6 w-6 rounded-full" />
            </div>
            <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 w-full md:w-auto">
              <Skeleton className="h-10 w-full sm:w-64" />
              <Skeleton className="h-10 w-full sm:w-40" />
              <Skeleton className="h-10 w-full sm:w-32" />
            </div>
          </div>
        </div>
        
        <div className="my-4 px-4 md:px-8">
          <Skeleton className="h-px w-full" />
        </div>
        
        {/* Table skeleton */}
        <div className="px-4 md:px-8">
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black">
            <div className="p-4">
              {/* Table header skeleton */}
              <div className="grid grid-cols-6 gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16 ml-auto" />
              </div>
              
              {/* Table rows skeleton */}
              {[1, 2, 3, 4, 5].map((item) => (
                <div key={item} className="grid grid-cols-6 gap-4 py-4 border-b border-neutral-100 dark:border-neutral-800 last:border-b-0">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <div className="flex gap-1">
                    <Skeleton className="h-5 w-12 rounded-full" />
                    <Skeleton className="h-5 w-10 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                  <div className="flex items-center justify-end gap-2">
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-0">
      {/* Header Section */}
      <div className="px-4 md:px-8 pt-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
          {/* Left Side: Title & Count */}
          <div className="flex items-center space-x-2">
            <h3 className="text-xl font-semibold text-black dark:text-white">
              Contacts
            </h3>
            <span className="inline-flex size-6 items-center justify-center rounded-full bg-neutral-100 text-xs font-medium text-black dark:bg-neutral-800 dark:text-white">
              {filteredContacts.length}
            </span>
          </div>

          {/* Right Side: Search, Filter & Export */}
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-500" />
              <Input 
                type="search"
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={toolFilter} onValueChange={setToolFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <div className="flex items-center space-x-2">
                  <RiFilterLine className="size-4" />
                  <span>Tool: {toolFilter === 'all' ? 'All' : toolFilter}</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tools</SelectItem>
                {uniqueTools.map(tool => (
                  <SelectItem key={tool} value={tool}>
                    {tool.charAt(0).toUpperCase() + tool.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={handleExportCSV}
              variant="secondary"
              size="sm"
              className="w-full sm:w-auto"
            >
              <RiDownloadLine className="size-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      <Divider className="my-4" />

      {/* Table Section */}
      <div className="px-4 md:px-8">
        {filteredContacts.length === 0 ? (
          <Card className="p-8">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-900">
                <RiUserLine className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
              </div>
              <h3 className="text-sm font-semibold text-black dark:text-white mb-2">
                No contacts found
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {searchQuery || toolFilter !== 'all' 
                  ? 'Try adjusting your filters to see more results.'
                  : 'Contacts will appear here when they interact with your agents.'}
              </p>
            </div>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <TableRoot>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Name</TableHeaderCell>
                    <TableHeaderCell>Email</TableHeaderCell>
                    <TableHeaderCell>Phone Number</TableHeaderCell>
                    <TableHeaderCell>Tools Used</TableHeaderCell>
                    <TableHeaderCell>Date Added</TableHeaderCell>
                    <TableHeaderCell className="text-right">Actions</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredContacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell className="font-medium">{contact.name}</TableCell>
                      <TableCell>{contact.email}</TableCell>
                      <TableCell>{contact.phoneNumber || 'N/A'}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {contact.toolsUsed.map((tool) => (
                            <Badge 
                              key={tool} 
                              variant="secondary"
                              className="text-xs"
                            >
                              {tool}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-neutral-600 dark:text-neutral-400">
                          {contact.createdAt.toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleShowHistory(contact)}
                          >
                            <RiHistoryLine className="size-4 mr-1" />
                            Show History
                          </Button>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <RiMoreFill className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditContact(contact)}>
                                <RiEditLine className="size-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-red-600 dark:text-red-400"
                                onClick={() => {
                                  setContactToDelete(contact);
                                  setShowDeleteDialog(true);
                                }}
                              >
                                <RiDeleteBinLine className="size-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableRoot>
          </Card>
        )}
      </div>

      {/* History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Contact History - {selectedContact?.name}</DialogTitle>
            <DialogDescription>
              Timeline of all interactions and activities
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto py-4">
            {isLoadingHistory ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : contactHistory.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  No history available for this contact
                </p>
              </div>
            ) : (
              <div className="sm:max-w-lg md:mx-auto">
                <ul role="list" className="mt-6 space-y-6 pb-2">
                  {contactHistory.map((event, eventIndex) => (
                    <li key={event.id} className="relative flex gap-x-3">
                      <div
                        className={cn(
                          eventIndex === contactHistory.length - 1 ? 'h-6' : '-bottom-6',
                          'absolute left-0 top-0 flex w-6 justify-center',
                        )}
                      >
                        <span
                          className="w-px bg-neutral-200 dark:bg-neutral-700"
                          aria-hidden={true}
                        />
                      </div>
                      <div className="flex items-start space-x-2">
                        <div className="flex items-center space-x-2">
                          <div className="relative flex size-6 flex-none items-center justify-center bg-white transition dark:bg-neutral-950">
                            <div className="size-3 rounded-full border border-neutral-300 bg-neutral-100 ring-4 ring-white transition dark:border-neutral-700 dark:bg-neutral-800 dark:ring-neutral-950" />
                          </div>
                          {event.user && (
                            <span
                              className={cn(
                                event.user.bgColor,
                                'inline-flex size-6 flex-none items-center justify-center rounded-full text-xs text-white dark:text-white',
                              )}
                              aria-hidden={true}
                            >
                              {event.user.initial}
                            </span>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="mt-0.5 text-sm font-medium text-neutral-900 dark:text-neutral-50">
                            {event.user?.name || 'System'}
                            <span className="font-normal text-neutral-500 dark:text-neutral-500">
                              {' '}
                              {event.description}
                            </span>
                            <span className="font-normal text-neutral-400 dark:text-neutral-600">
                              {' '}
                              &#8729; {formatDistanceToNow(event.timestamp, { addSuffix: true })}
                            </span>
                          </p>
                          {event.metadata && Object.keys(event.metadata).length > 0 && (
                            <div className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
                              {Object.entries(event.metadata).map(([key, value]) => (
                                <div key={key} className="flex items-center gap-1">
                                  <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                                  <span className="font-medium">{String(value)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Contact</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {contactToDelete?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button 
              variant="destructive" 
              onClick={handleDeleteContact}
            >
              Delete Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 