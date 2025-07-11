'use client';

import { useState, useEffect } from 'react';
import { Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { LoadingState } from '@/components/LoadingState';
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Source } from './source-sidebar';
import { ManualMode } from './catalog/manual-mode';
import { SuccessDialog } from './catalog/success-dialog';
import { DeleteDialog } from './catalog/delete-dialog';
import { CatalogContent, Product } from './catalog/types';
import { RiListCheck2 } from '@remixicon/react';
import { Progress } from "@/components/ui/progress";

interface CatalogTabProps {
  source?: Source;
  onSave: (data: any) => Promise<void>;
}

export function CatalogTab({ source, onSave }: CatalogTabProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingInstructions, setIsSavingInstructions] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [catalogContent, setCatalogContent] = useState<CatalogContent | null>(null);
  const [catalogInstructions, setCatalogInstructions] = useState<string>('');
  const [originalInstructions, setOriginalInstructions] = useState<string>('');
  const [saveProgress, setSaveProgress] = useState(0);
  
  // Success dialog state
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [successTitle, setSuccessTitle] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState(0);

  // Track whether instructions have changed
  const instructionsChanged = catalogInstructions !== originalInstructions;

  // Fetch existing catalog content when component mounts or source changes
  useEffect(() => {
    if (source?.id) {
      fetchCatalogContent();
    }
  }, [source?.id]);

  // Function to fetch catalog content
  const fetchCatalogContent = async () => {
    if (!source?.id) return;
    
    setIsLoading(true);
    console.log('Fetching catalog content for source:', source.id);
    
    try {
      const response = await fetch(`/api/knowledge-sources/${source.id}/catalog`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch catalog content: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Catalog content from API:', data);
      
      if (data) {
        setCatalogContent(data);
        setCatalogInstructions(data.instructions || '');
        setOriginalInstructions(data.instructions || '');
        
        // If there are products, set them
        if (data.products && data.products.length > 0) {
          setProducts(data.products);
        }
      }
    } catch (error) {
      console.error('Error fetching catalog content:', error);
      toast.error('Failed to load catalog content. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to show success dialog
  const showSuccessDialog = (title: string, message: string) => {
    setSuccessTitle(title);
    setSuccessMessage(message);
    setSuccessDialogOpen(true);
  };

  // Function to save shared instructions
  const saveInstructions = async () => {
    if (!source?.id) return;
    
    setIsSavingInstructions(true);
    setSaveProgress(10);
    
    try {
      // Start saving
      setSaveProgress(30);
      setTimeout(() => setSaveProgress(50), 300);
      
      const response = await fetch(`/api/knowledge-sources/${source.id}/catalog/instructions`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instructions: catalogInstructions
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save instructions: ${response.status}`);
      }
      
      // Process response
      setSaveProgress(70);
      setTimeout(() => setSaveProgress(90), 300);
      
      // Update original instructions state
      setOriginalInstructions(catalogInstructions);
      
      toast.success("Instructions saved successfully");
      
      // Refresh to ensure UI is updated
      await fetchCatalogContent();
      
      setSaveProgress(100);
      
      // Reset progress after a delay
      setTimeout(() => {
        setSaveProgress(0);
      }, 1000);
    } catch (error) {
      console.error('Error saving instructions:', error);
      toast.error("Failed to save instructions");
      setSaveProgress(0);
    } finally {
      setIsSavingInstructions(false);
    }
  };

  // Function to delete specific catalog content
  const handleDeleteContent = async () => {
    if (!source?.id) return;
    
    setIsDeleting(true);
    setDeleteProgress(10);
    
    try {
      // Step 1: Start deleting (10%)
      setTimeout(() => setDeleteProgress(30), 300);
      
      // Step 2: Removing from database (50%)
      setTimeout(() => setDeleteProgress(50), 600);
      
      // Delete products only
      const endpoint = `/api/knowledge-sources/${source.id}/catalog/products`;
      
      const response = await fetch(endpoint, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete content: ${response.status}`);
      }
      
      // Step 3: Cleaning up (70%)
      setDeleteProgress(70);
      setTimeout(() => setDeleteProgress(90), 300);
      
      // Update local state
      setProducts([]);
      
      // Close dialog
      setDeleteDialogOpen(false);
      
      // Show success message
      toast.success('Products deleted successfully');
      
      // Step 4: Complete (100%)
      setDeleteProgress(100);
      
      // Refresh to ensure UI is updated
      await fetchCatalogContent();
      
      // Reset progress after a delay
      setTimeout(() => {
        setDeleteProgress(0);
      }, 1000);
    } catch (error) {
      console.error('Error deleting content:', error);
      toast.error("Failed to delete content");
      setDeleteProgress(0);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle showing the delete confirmation dialog
  const confirmDelete = () => {
    setDeleteDialogOpen(true);
  };

  return (
          <Card className="px-3 py-2">
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <RiListCheck2 className="h-5 w-5 text-neutral-500" />
                              <h2 className="text-lg font-semibold text-black dark:text-white">
              Product Catalog
            </h2>
          </div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
            Add products to your catalog with details like title, price, description, and categories. Your Agent will reference this information when responding to queries.
          </p>
        </div>
        
        {isLoading ? (
          <div className="mt-8">
            <LoadingState text="Loading catalog content..." />
          </div>
        ) : (
          <>
            {/* Shared Instructions Section */}
            <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-4 border border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <h3 className="font-semibold text-black dark:text-white">
                    Catalog Instructions
                  </h3>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="ml-2 text-neutral-500 cursor-help">
                          <Info className="h-4 w-4" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="w-[220px] text-xs">
                          These instructions apply to your entire catalog.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                {instructionsChanged && (
                  <Button 
                    size="sm" 
                    onClick={saveInstructions}
                    disabled={isSavingInstructions}
                    className="bg-black hover:bg-neutral-800 text-white"
                  >
                    {isSavingInstructions ? (
                      <div className="flex items-center gap-1.5">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Saving...</span>
                      </div>
                    ) : 'Save Instructions'}
                  </Button>
                )}
              </div>
              
              <Label htmlFor="catalog-instructions" className="sr-only">
                Catalog Instructions
              </Label>
              <div className="space-y-2">
                <Textarea
                  id="catalog-instructions"
                  placeholder="Enter additional instructions for processing your catalog (optional)"
                  value={catalogInstructions}
                  onChange={(e) => setCatalogInstructions(e.target.value)}
                  rows={3}
                  className="resize-none"
                  maxLength={500}
                />
                <div className="flex justify-between items-center">
                  <p className="text-xs text-neutral-500">
                    Add specific instructions about how products should be processed or what information is most important.
                  </p>
                  <span className="text-xs text-neutral-500">
                    {catalogInstructions.length}/500
                  </span>
                </div>
              </div>
              
              {saveProgress > 0 && (
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-1.5">
                      <Loader2 className="h-3 w-3 animate-spin text-neutral-500" />
                      <span className="font-medium text-neutral-600 dark:text-neutral-400">
                        {saveProgress < 20 ? 'Starting save...' : 
                         saveProgress < 40 ? 'Saving instructions...' :
                         saveProgress < 70 ? 'Processing instructions...' :
                         saveProgress < 90 ? 'Updating Agent information...' :
                         'Finishing up...'}
                      </span>
                    </div>
                    <span className="font-medium text-neutral-600 dark:text-neutral-400">
                      {saveProgress}%
                    </span>
                  </div>
                  <Progress 
                    value={saveProgress} 
                    className="h-1.5 bg-neutral-100 text-neutral-600"
                  />
                </div>
              )}
            </div>
            
            {/* Manual Mode - Direct */}
            <ManualMode 
              source={source}
              catalogContent={catalogContent}
              catalogInstructions={catalogInstructions}
              setCatalogInstructions={setCatalogInstructions}
              products={products}
              setProducts={setProducts}
              fetchCatalogContent={fetchCatalogContent}
              showSuccessDialog={showSuccessDialog}
            />
            
            {products.length > 0 && (
              <div className="flex justify-end">
                <button
                  onClick={confirmDelete}
                  className="text-sm flex items-center text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400"
                >
                  Delete All Products
                </button>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Success Dialog */}
      <SuccessDialog 
        open={successDialogOpen}
        onOpenChange={setSuccessDialogOpen}
        title={successTitle}
        message={successMessage}
      />
      
      {/* Delete Content Dialog */}
      <DeleteDialog 
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        isDeleting={isDeleting}
        onConfirm={handleDeleteContent}
        title="Delete All Products"
        description="Are you sure you want to delete all manually entered products? This action cannot be undone."
        deleteProgress={deleteProgress}
      />
    </Card>
  );
} 