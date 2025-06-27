'use client';

import React, { useState, useEffect } from 'react';
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRoot, TableRow } from "@/components/Table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/DropdownMenu";
import { Badge } from "@/components/ui/badge";
import { IconDots, IconEdit, IconCopy, IconPlus, IconTrash, IconEye } from "@tabler/icons-react";
import { CreatePlanDialog } from "./CreatePlanDialog";
import { EditPlanDialog } from "./EditPlanDialog";
import { toast } from "sonner";

interface PlansTabProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

interface StripePlan {
  id: string;
  productId: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: string;
  active: boolean;
  metadata: {
    planId?: string;
    planType?: string;
    agents?: string;
    messagesIncluded?: string;
    smsIncluded?: string;
    webSearchesIncluded?: string;
    [key: string]: string | undefined;
  };
  createdAt: string;
  subscriptionCount?: number;
}

export function PlansTab({ searchQuery, setSearchQuery }: PlansTabProps) {
  const [plans, setPlans] = useState<StripePlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<StripePlan | null>(null);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);

  // Fetch plans from Stripe
  const fetchPlans = async () => {
    try {
      setPlansLoading(true);
      const response = await fetch('/api/admin/billing/plans');
      if (response.ok) {
        const data = await response.json();
        setPlans(data.plans || []);
      } else {
        toast.error('Failed to fetch plans');
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('Failed to fetch plans');
    } finally {
      setPlansLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  // Handle plan actions
  const handleEditPlan = (plan: StripePlan) => {
    setSelectedPlan(plan);
    setEditDialogOpen(true);
  };

  const handleCopyPlan = (plan: StripePlan) => {
    // Set the plan as a template for creating a new plan
    setSelectedPlan(plan);
    setCreateDialogOpen(true);
  };

  const handleArchivePlan = async (planId: string) => {
    setDeletingPlanId(planId);
    
    try {
      const response = await fetch(`/api/admin/billing/plans/${planId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setPlans(plans.filter(plan => plan.id !== planId));
        toast.success('Plan archived successfully');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to archive plan');
      }
    } catch (error) {
      console.error('Error archiving plan:', error);
      toast.error('Failed to archive plan');
    } finally {
      setDeletingPlanId(null);
    }
  };

  const handleCopyPlanId = (planId: string) => {
    navigator.clipboard.writeText(planId);
    toast.success('Plan ID copied to clipboard');
  };

  // Handle plan created/updated
  const handlePlanUpdated = () => {
    fetchPlans(); // Refresh the list
  };

  // Filter plans based on search
  const filteredPlans = plans.filter(plan => {
    const searchLower = searchQuery.toLowerCase();
    return (
      plan.name.toLowerCase().includes(searchLower) ||
      plan.description.toLowerCase().includes(searchLower) ||
      (plan.metadata.planId && plan.metadata.planId.toLowerCase().includes(searchLower))
    );
  });

  // Helper functions
  const formatPrice = (price: number, currency: string, interval: string) => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(price / 100);
    return `${formatted}/${interval}`;
  };

  const getPlanTypeColor = (planType?: string) => {
    switch (planType) {
      case 'subscription':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-400/10 dark:text-indigo-400';
      case 'custom':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-400/10 dark:text-purple-400';
      case 'overage':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-400/10 dark:text-orange-400';
      default:
        return 'bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-300';
    }
  };

  const renderPlansTable = () => (
    <TableRoot className="mt-3">
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Plan Details
            </TableHeaderCell>
            <TableHeaderCell className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Type
            </TableHeaderCell>
            <TableHeaderCell className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Pricing
            </TableHeaderCell>
            <TableHeaderCell className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Limits
            </TableHeaderCell>
            <TableHeaderCell className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Status
            </TableHeaderCell>
            <TableHeaderCell className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Subscribers
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
          {filteredPlans.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                No plans found
              </TableCell>
            </TableRow>
          ) : (
            filteredPlans.map((plan) => (
              <TableRow
                key={plan.id}
                className="hover:bg-neutral-50 hover:dark:bg-neutral-900"
              >
                <TableCell className="text-sm text-neutral-700 dark:text-neutral-200">
                  <div>
                    <div className="font-medium">{plan.name}</div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                      {plan.description}
                    </div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400 font-mono mt-1">
                      {plan.id}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${getPlanTypeColor(plan.metadata.planType)}`}>
                    {plan.metadata.planType || 'Standard'}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-neutral-700 dark:text-neutral-200">
                  {formatPrice(plan.price, plan.currency, plan.interval)}
                </TableCell>
                <TableCell>
                  <div className="text-xs space-y-1">
                    {plan.metadata.agents && (
                      <div>Agents: {plan.metadata.agents}</div>
                    )}
                    {plan.metadata.messagesIncluded && (
                      <div>Messages: {plan.metadata.messagesIncluded}</div>
                    )}
                    {plan.metadata.smsIncluded && (
                      <div>SMS: {plan.metadata.smsIncluded}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                    plan.active 
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-400/10 dark:text-red-400'
                  }`}>
                    {plan.active ? 'Active' : 'Archived'}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-neutral-700 dark:text-neutral-200">
                  {plan.subscriptionCount || 0}
                </TableCell>
                <TableCell className="text-sm text-neutral-500 dark:text-neutral-400">
                  {new Date(plan.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:text-neutral-300 dark:hover:bg-neutral-800 transition-colors">
                        <IconDots className="h-4 w-4" />
                        <span className="sr-only">Open menu for {plan.name}</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditPlan(plan)}>
                        <IconEdit className="h-4 w-4 mr-2" />
                        Edit Plan
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleCopyPlan(plan)}>
                        <IconCopy className="h-4 w-4 mr-2" />
                        Duplicate Plan
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleCopyPlanId(plan.id)}>
                        <IconCopy className="h-4 w-4 mr-2" />
                        Copy Plan ID
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => window.open(`/dashboard/settings`, '_blank')}>
                        <IconEye className="h-4 w-4 mr-2" />
                        Preview Plan
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => handleArchivePlan(plan.id)}
                        className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                        disabled={deletingPlanId === plan.id}
                      >
                        <IconTrash className="h-4 w-4 mr-2" />
                        {deletingPlanId === plan.id ? 'Archiving...' : 'Archive Plan'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableRoot>
  );

  const renderLoadingSkeleton = (skeletonCount: number) => (
    <div className="mt-3 space-y-2">
      {Array.from({ length: skeletonCount }).map((_, index) => (
        <Skeleton key={index} className="h-16 w-full" />
      ))}
    </div>
  );

  return (
    <div className="mt-4">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div className="sm:flex sm:items-center sm:space-x-2">
          <Input 
            placeholder="Search plans..." 
            type="search" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="sm:w-80"
          />
        </div>
        <div className="mt-4 sm:mt-0">
          <Button onClick={() => setCreateDialogOpen(true)}>
            <IconPlus className="h-4 w-4 mr-2" />
            Create Custom Plan
          </Button>
        </div>
      </div>

      {plansLoading ? renderLoadingSkeleton(5) : renderPlansTable()}

      {/* Create Plan Dialog */}
      <CreatePlanDialog
        open={createDialogOpen}
        setOpen={setCreateDialogOpen}
        templatePlan={selectedPlan}
        onPlanCreated={handlePlanUpdated}
      />

      {/* Edit Plan Dialog */}
      <EditPlanDialog
        open={editDialogOpen}
        setOpen={setEditDialogOpen}
        plan={selectedPlan}
        onPlanUpdated={handlePlanUpdated}
      />
    </div>
  );
} 