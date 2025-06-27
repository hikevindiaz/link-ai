'use client';

import React, { useState, useEffect } from 'react';
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRoot, TableRow } from "@/components/Table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/DropdownMenu";
import { Badge } from "@/components/ui/badge";
import { IconDots, IconEdit, IconCopy, IconPlus, IconTrash, IconEye, IconToggleLeft, IconToggleRight } from "@tabler/icons-react";
import { CreateAddOnDialog } from "./CreateAddOnDialog";
import { EditAddOnDialog } from "./EditAddOnDialog";
import { toast } from "sonner";

interface AddOnManagementTabProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

interface AddOnProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  active: boolean;
  createdAt: string;
  metadata: {
    integration?: string;
    features?: string[];
    [key: string]: any;
  };
  subscriptionCount?: number;
}

const categoryOptions = [
  { label: 'All Categories', value: 'all' },
  { label: 'Integrations', value: 'integrations' },
  { label: 'Analytics', value: 'analytics' },
  { label: 'AI & Training', value: 'ai' },
  { label: 'Communication', value: 'communication' },
  { label: 'Security', value: 'security' },
  { label: 'Automation', value: 'automation' },
];

export function AddOnManagementTab({ searchQuery, setSearchQuery }: AddOnManagementTabProps) {
  const [addOns, setAddOns] = useState<AddOnProduct[]>([]);
  const [addOnsLoading, setAddOnsLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedAddOn, setSelectedAddOn] = useState<AddOnProduct | null>(null);
  const [deletingAddOnId, setDeletingAddOnId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Fetch add-ons
  const fetchAddOns = async () => {
    try {
      setAddOnsLoading(true);
      const response = await fetch('/api/admin/billing/add-ons');
      if (response.ok) {
        const data = await response.json();
        setAddOns(data.addOns || []);
      } else {
        toast.error('Failed to fetch add-ons');
      }
    } catch (error) {
      console.error('Error fetching add-ons:', error);
      toast.error('Failed to fetch add-ons');
    } finally {
      setAddOnsLoading(false);
    }
  };

  useEffect(() => {
    fetchAddOns();
  }, []);

  // Handle add-on actions
  const handleEditAddOn = (addOn: AddOnProduct) => {
    setSelectedAddOn(addOn);
    setEditDialogOpen(true);
  };

  const handleCopyAddOn = (addOn: AddOnProduct) => {
    setSelectedAddOn(addOn);
    setCreateDialogOpen(true);
  };

  const handleToggleActive = async (addOnId: string, active: boolean) => {
    try {
      const response = await fetch(`/api/admin/billing/add-ons/${addOnId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ active }),
      });

      if (response.ok) {
        setAddOns(addOns.map(addOn => 
          addOn.id === addOnId ? { ...addOn, active } : addOn
        ));
        toast.success(`Add-on ${active ? 'activated' : 'deactivated'} successfully`);
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to update add-on');
      }
    } catch (error) {
      console.error('Error updating add-on:', error);
      toast.error('Failed to update add-on');
    }
  };

  const handleDeleteAddOn = async (addOnId: string) => {
    setDeletingAddOnId(addOnId);
    
    try {
      const response = await fetch(`/api/admin/billing/add-ons/${addOnId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setAddOns(addOns.filter(addOn => addOn.id !== addOnId));
        toast.success('Add-on deleted successfully');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to delete add-on');
      }
    } catch (error) {
      console.error('Error deleting add-on:', error);
      toast.error('Failed to delete add-on');
    } finally {
      setDeletingAddOnId(null);
    }
  };

  const handleCopyAddOnId = (addOnId: string) => {
    navigator.clipboard.writeText(addOnId);
    toast.success('Add-on ID copied to clipboard');
  };

  // Handle add-on created/updated
  const handleAddOnUpdated = () => {
    fetchAddOns(); // Refresh the list
  };

  // Filter add-ons based on search and category
  const filteredAddOns = addOns.filter(addOn => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = searchQuery === '' || 
      addOn.name.toLowerCase().includes(searchLower) ||
      addOn.description.toLowerCase().includes(searchLower) ||
      addOn.category.toLowerCase().includes(searchLower);
    
    const matchesCategory = categoryFilter === 'all' || addOn.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  // Helper functions
  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(price / 100);
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      integrations: 'bg-blue-100 text-blue-800 dark:bg-blue-400/10 dark:text-blue-400',
      analytics: 'bg-purple-100 text-purple-800 dark:bg-purple-400/10 dark:text-purple-400',
      ai: 'bg-green-100 text-green-800 dark:bg-green-400/10 dark:text-green-400',
      communication: 'bg-orange-100 text-orange-800 dark:bg-orange-400/10 dark:text-orange-400',
      security: 'bg-red-100 text-red-800 dark:bg-red-400/10 dark:text-red-400',
      automation: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-400/10 dark:text-indigo-400',
    };
    return colors[category] || 'bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-300';
  };

  const renderAddOnsTable = () => (
    <TableRoot className="mt-3">
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Add-on Details
            </TableHeaderCell>
            <TableHeaderCell className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Category
            </TableHeaderCell>
            <TableHeaderCell className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Price
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
          {filteredAddOns.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                No add-ons found
              </TableCell>
            </TableRow>
          ) : (
            filteredAddOns.map((addOn) => (
              <TableRow
                key={addOn.id}
                className="hover:bg-neutral-50 hover:dark:bg-neutral-900"
              >
                <TableCell className="text-sm text-neutral-700 dark:text-neutral-200">
                  <div>
                    <div className="font-medium">{addOn.name}</div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                      {addOn.description}
                    </div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400 font-mono mt-1">
                      {addOn.id}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${getCategoryColor(addOn.category)}`}>
                    {addOn.category}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-neutral-700 dark:text-neutral-200">
                  {formatPrice(addOn.price, addOn.currency)}/month
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                      addOn.active 
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-400'
                        : 'bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-300'
                    }`}>
                      {addOn.active ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      onClick={() => handleToggleActive(addOn.id, !addOn.active)}
                      className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                    >
                      {addOn.active ? (
                        <IconToggleRight className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <IconToggleLeft className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-neutral-700 dark:text-neutral-200">
                  {addOn.subscriptionCount || 0}
                </TableCell>
                <TableCell className="text-sm text-neutral-500 dark:text-neutral-400">
                  {new Date(addOn.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:text-neutral-300 dark:hover:bg-neutral-800 transition-colors">
                        <IconDots className="h-4 w-4" />
                        <span className="sr-only">Open menu for {addOn.name}</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditAddOn(addOn)}>
                        <IconEdit className="h-4 w-4 mr-2" />
                        Edit Add-on
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleCopyAddOn(addOn)}>
                        <IconCopy className="h-4 w-4 mr-2" />
                        Duplicate Add-on
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleCopyAddOnId(addOn.id)}>
                        <IconCopy className="h-4 w-4 mr-2" />
                        Copy Add-on ID
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => window.open(`/dashboard/settings`, '_blank')}>
                        <IconEye className="h-4 w-4 mr-2" />
                        Preview Add-on
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => handleDeleteAddOn(addOn.id)}
                        className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                        disabled={deletingAddOnId === addOn.id}
                      >
                        <IconTrash className="h-4 w-4 mr-2" />
                        {deletingAddOnId === addOn.id ? 'Deleting...' : 'Delete Add-on'}
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
            placeholder="Search add-ons..." 
            type="search" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="sm:w-80"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="mt-2 sm:mt-0 block w-full sm:w-40 rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
          >
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button onClick={() => setCreateDialogOpen(true)}>
            <IconPlus className="h-4 w-4 mr-2" />
            Create Add-on
          </Button>
        </div>
      </div>

      {addOnsLoading ? renderLoadingSkeleton(5) : renderAddOnsTable()}

      {/* Create Add-on Dialog */}
      <CreateAddOnDialog
        open={createDialogOpen}
        setOpen={setCreateDialogOpen}
        templateAddOn={selectedAddOn}
        onAddOnCreated={handleAddOnUpdated}
      />

      {/* Edit Add-on Dialog */}
      <EditAddOnDialog
        open={editDialogOpen}
        setOpen={setEditDialogOpen}
        addOn={selectedAddOn}
        onAddOnUpdated={handleAddOnUpdated}
      />
    </div>
  );
} 