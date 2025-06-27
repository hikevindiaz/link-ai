'use client';

import React, { useState, useEffect } from 'react';
import { Input } from "@/components/Input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/Select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRoot, TableRow } from "@/components/Table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/DropdownMenu";
import { Badge } from "@/components/ui/badge";
import { IconDots, IconEdit, IconTrash, IconEye, IconCopy, IconMessageCircle, IconUser, IconAlertTriangle } from "@tabler/icons-react";
import { EditAgentDialog } from "./EditAgentDialog";

interface AgentManagementTabProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  userFilter: string;
  setUserFilter: (user: string) => void;
}

interface Agent {
  id: string;
  name: string;
  userId: string;
  user: {
    name: string | null;
    email: string;
  };
  createdAt: string;

  lastTrainedAt: string | null;
  trainingStatus: string;
  websiteEnabled: boolean;
  whatsappEnabled: boolean;
  smsEnabled: boolean;
  messengerEnabled: boolean;
  instagramEnabled: boolean;
  _count: {
    ChatbotFiles: number;
    knowledgeSources: number;
  };
}

const statusOptions = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Training', value: 'training' },
  { label: 'Ready', value: 'idle' },
  { label: 'Error', value: 'error' },
];

export function AgentManagementTab({ 
  searchQuery, 
  setSearchQuery, 
  statusFilter, 
  setStatusFilter,
  userFilter,
  setUserFilter
}: AgentManagementTabProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [deletingAgentId, setDeletingAgentId] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  // Fetch agents
  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/admin/agents');
      if (response.ok) {
        const data = await response.json();
        setAgents(data.agents || []);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
    } finally {
      setAgentsLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  // Fetch users for filter
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/admin/users');
        if (response.ok) {
          const data = await response.json();
          setUsers(data.users || []);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setUsersLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Helper function to get training status badge
  const getTrainingStatusBadge = (status: string) => {
    switch (status) {
      case 'training':
        return { label: 'Training', color: 'bg-blue-100 text-blue-800 dark:bg-blue-400/10 dark:text-blue-400' };
      case 'idle':
        return { label: 'Ready', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-400' };
      case 'error':
        return { label: 'Error', color: 'bg-red-100 text-red-800 dark:bg-red-400/10 dark:text-red-400' };
      default:
        return { label: 'Unknown', color: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-300' };
    }
  };

  // Helper function to get channel count
  const getActiveChannels = (agent: Agent) => {
    const channels = [];
    if (agent.websiteEnabled) channels.push('Website');
    if (agent.whatsappEnabled) channels.push('WhatsApp');
    if (agent.smsEnabled) channels.push('SMS');
    if (agent.messengerEnabled) channels.push('Messenger');
    if (agent.instagramEnabled) channels.push('Instagram');
    return channels;
  };

  // Handle agent deletion
  const handleDeleteAgent = async (agentId: string) => {
    setDeletingAgentId(agentId);
    
    try {
      const response = await fetch(`/api/admin/agents/${agentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setAgents(agents.filter(agent => agent.id !== agentId));
      } else {
        const error = await response.json();
        console.error('Failed to delete agent:', error);
      }
    } catch (error) {
      console.error('Error deleting agent:', error);
    } finally {
      setDeletingAgentId(null);
    }
  };

  // Handle copy agent ID
  const handleCopyAgentId = (agentId: string) => {
    navigator.clipboard.writeText(agentId);
  };

  // Handle edit agent
  const handleEditAgent = (agent: Agent) => {
    setSelectedAgent(agent);
    setEditDialogOpen(true);
  };

  // Handle agent updated
  const handleAgentUpdated = () => {
    fetchAgents(); // Refresh the list
  };

  // Filter agents based on search and filters
  const filteredAgents = agents.filter(agent => {
    const matchesSearch = searchQuery === '' || 
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (agent.user.name && agent.user.name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || agent.trainingStatus === statusFilter;
    
    const matchesUser = userFilter === 'all' || agent.userId === userFilter;
    
    return matchesSearch && matchesStatus && matchesUser;
  });

  const renderAgentsTable = () => (
    <TableRoot className="mt-3">
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Agent
            </TableHeaderCell>
            <TableHeaderCell className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Owner
            </TableHeaderCell>
            <TableHeaderCell className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Status
            </TableHeaderCell>
            <TableHeaderCell className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Channels
            </TableHeaderCell>
            <TableHeaderCell className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Knowledge Sources
            </TableHeaderCell>
            <TableHeaderCell className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Files
            </TableHeaderCell>
            <TableHeaderCell className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Last Trained
            </TableHeaderCell>
            <TableHeaderCell className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Created
            </TableHeaderCell>
            <TableHeaderCell>
              <span className="sr-only">Actions</span>
            </TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredAgents.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                No agents found
              </TableCell>
            </TableRow>
          ) : (
            filteredAgents.map((agent) => {
              const trainingStatus = getTrainingStatusBadge(agent.trainingStatus);
              const activeChannels = getActiveChannels(agent);
              
              return (
                <TableRow
                  key={agent.id}
                  className="hover:bg-neutral-50 hover:dark:bg-neutral-900"
                >
                  <TableCell className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                    <div>
                      <div className="font-medium">{agent.name}</div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                        {agent.id}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-neutral-700 dark:text-neutral-200">
                    <div>
                      <div className="font-medium">{agent.user.name || 'No name'}</div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">
                        {agent.user.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${trainingStatus.color}`}>
                      {trainingStatus.label}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {activeChannels.length > 0 ? (
                        activeChannels.slice(0, 2).map((channel) => (
                          <span
                            key={channel}
                            className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-400/10 dark:text-indigo-400"
                          >
                            {channel}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">None</span>
                      )}
                      {activeChannels.length > 2 && (
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">
                          +{activeChannels.length - 2} more
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-neutral-700 dark:text-neutral-200">
                    {agent._count.knowledgeSources}
                  </TableCell>
                  <TableCell className="text-sm text-neutral-700 dark:text-neutral-200">
                    {agent._count.ChatbotFiles}
                  </TableCell>
                  <TableCell className="text-sm text-neutral-500 dark:text-neutral-400">
                    {agent.lastTrainedAt 
                      ? new Date(agent.lastTrainedAt).toLocaleDateString()
                      : 'Never'
                    }
                  </TableCell>
                  <TableCell className="text-sm text-neutral-500 dark:text-neutral-400">
                    {new Date(agent.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:text-neutral-300 dark:hover:bg-neutral-800 transition-colors">
                            <IconDots className="h-4 w-4" />
                            <span className="sr-only">Open menu for {agent.name}</span>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditAgent(agent)}>
                            <IconEdit className="h-4 w-4 mr-2" />
                            Edit Agent
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => window.open(`/dashboard/agents/${agent.id}`, '_blank')}>
                            <IconEye className="h-4 w-4 mr-2" />
                            View Agent
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => window.open(`/dashboard/agents/${agent.id}/chat`, '_blank')}>
                            <IconMessageCircle className="h-4 w-4 mr-2" />
                            Test Chat
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCopyAgentId(agent.id)}>
                            <IconCopy className="h-4 w-4 mr-2" />
                            Copy ID
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => window.open(`/dashboard/inquiries/${agent.id}`, '_blank')}>
                            <IconUser className="h-4 w-4 mr-2" />
                            User Inquiries
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => window.open(`/dashboard/errors/${agent.id}`, '_blank')}>
                            <IconAlertTriangle className="h-4 w-4 mr-2" />
                            Error Logs
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDeleteAgent(agent.id)}
                            className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                            disabled={deletingAgentId === agent.id}
                          >
                            <IconTrash className="h-4 w-4 mr-2" />
                            {deletingAgentId === agent.id ? 'Deleting...' : 'Delete'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </TableRoot>
  );

  const renderLoadingSkeleton = (skeletonCount: number) => (
    <div className="mt-3 space-y-2">
      {Array.from({ length: skeletonCount }).map((_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  );

  return (
    <div className="px-4 md:px-8 pt-6">
      <h1 className="text-xl font-normal text-neutral-700 dark:text-neutral-200">
        Agent Management
      </h1>
      <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
        Manage all agents across your platform and monitor their performance.
      </p>
      
      <Tabs defaultValue="all" className="mt-8">
        <TabsList variant="line">
          <TabsTrigger value="all">
            All Agents ({filteredAgents.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="all">
          <div className="mt-4 sm:flex sm:items-center sm:space-x-2">
            <Input 
              placeholder="Search agents..." 
              type="search" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="mt-2 sm:mt-0 sm:w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="mt-2 sm:mt-0 sm:w-48">
                <SelectValue placeholder="Filter by user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {agentsLoading ? renderLoadingSkeleton(5) : renderAgentsTable()}
        </TabsContent>
      </Tabs>

      {/* Edit Agent Dialog */}
      <EditAgentDialog
        open={editDialogOpen}
        setOpen={setEditDialogOpen}
        agent={selectedAgent}
        onAgentUpdated={handleAgentUpdated}
      />
    </div>
  );
} 