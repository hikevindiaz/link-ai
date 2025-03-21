'use client';

import { useState, useEffect } from 'react';
import { Plus, Upload, FileSpreadsheet, FileText, X, Edit, Trash2, Loader2, CheckCircle, FileUp, ListPlus } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Source } from './source-sidebar';
import { LoadingState } from '@/components/LoadingState';
import { Switch } from "@/components/ui/switch";
import { 
  Table,
  TableBody, 
  TableCell, 
  TableHead,
  TableHeaderCell, 
  TableRow,
  TableRoot
} from "@/components/ui/table";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerFooter,
  DrawerClose,
  DrawerBody
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";

// Define catalog mode type
type CatalogMode = 'document' | 'manual';

interface Product {
  id: string;
  title: string;
  price: number;
  taxRate: number;
  description: string;
  categories: string[];
}

interface CatalogTabProps {
  source?: Source;
  onSave: (data: any) => Promise<void>;
}

interface CatalogContent {
  id: string;
  instructions?: string;
  createdAt: string;
  updatedAt: string;
  knowledgeSourceId: string;
  fileId?: string;
  file?: {
    id: string;
    name: string;
    blobUrl?: string;
  };
  products?: Product[];
}

export function CatalogTab({ source, onSave }: CatalogTabProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [catalogContent, setCatalogContent] = useState<CatalogContent | null>(null);
  const [newProduct, setNewProduct] = useState<Omit<Product, 'id'>>({
    title: '',
    price: 0,
    taxRate: 0,
    description: '',
    categories: []
  });
  const [newCategory, setNewCategory] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [catalogInstructions, setCatalogInstructions] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  // Mode selection state
  const [catalogMode, setCatalogMode] = useState<CatalogMode>('document');
  const [modeChangeDialogOpen, setModeChangeDialogOpen] = useState(false);
  const [pendingMode, setPendingMode] = useState<CatalogMode | null>(null);
  
  // Success dialog state
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [successTitle, setSuccessTitle] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch existing catalog content when component mounts or source changes
  useEffect(() => {
    if (source?.id) {
      fetchCatalogContent();
    }
  }, [source?.id]);

  // Set initial mode based on existing content
  useEffect(() => {
    if (catalogContent) {
      // First check if the source has a preferred mode stored in the database
      if (source?.catalogMode && (source.catalogMode === 'document' || source.catalogMode === 'manual')) {
        setCatalogMode(source.catalogMode as CatalogMode);
      } 
      // Then check localStorage as fallback
      else {
        const storedMode = localStorage.getItem(`catalog-mode-${source?.id}`);
        
        if (storedMode && (storedMode === 'document' || storedMode === 'manual')) {
          setCatalogMode(storedMode as CatalogMode);
          // Save to database if we have a localStorage preference but not a database one
          if (source?.id) {
            saveCatalogModeToDatabase(storedMode as CatalogMode);
          }
        } else if (catalogContent.products && catalogContent.products.length > 0) {
          // If we have products, default to manual mode
          setCatalogMode('manual');
          if (source?.id) {
            saveCatalogModeToDatabase('manual');
          }
        } else if (catalogContent.file) {
          // If we have a file, default to document mode
          setCatalogMode('document');
          if (source?.id) {
            saveCatalogModeToDatabase('document');
          }
        }
      }
      
      // Set products if they exist
      if (catalogContent.products && catalogContent.products.length > 0) {
        setProducts(catalogContent.products);
      }
    }
  }, [catalogContent, source]);

  // Function to save catalog mode to the database
  const saveCatalogModeToDatabase = async (mode: CatalogMode) => {
    if (!source?.id) return;
    
    try {
      const response = await fetch(`/api/knowledge-sources/${source.id}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          catalogMode: mode
        }),
      });
      
      if (!response.ok) {
        console.error('Failed to save catalog mode to database');
      }
    } catch (error) {
      console.error('Error saving catalog mode to database:', error);
    }
  };

  const fetchCatalogContent = async () => {
    if (!source?.id) return;
    
    setIsLoading(true);
    
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

  const handleModeChange = (mode: CatalogMode) => {
    // If there's existing content in the current mode, show confirmation dialog
    if (
      (catalogMode === 'document' && catalogContent?.file) ||
      (catalogMode === 'manual' && products.length > 0)
    ) {
      setPendingMode(mode);
      setModeChangeDialogOpen(true);
    } else {
      // No existing content, safe to switch
      setCatalogMode(mode);
      // Store the mode preference in localStorage and database
      if (source?.id) {
        localStorage.setItem(`catalog-mode-${source.id}`, mode);
        saveCatalogModeToDatabase(mode);
      }
    }
  };

  const confirmModeChange = () => {
    if (pendingMode) {
      setCatalogMode(pendingMode);
      // Store the mode preference in localStorage and database
      if (source?.id) {
        localStorage.setItem(`catalog-mode-${source.id}`, pendingMode);
        saveCatalogModeToDatabase(pendingMode);
      }
      setPendingMode(null);
      setModeChangeDialogOpen(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Check file type
      const validTypes = ['text/csv', 'application/pdf', 
                         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                         'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      
      const validExtensions = ['.csv', '.pdf', '.xlsx', '.docx'];
      const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      
      if (validTypes.includes(file.type) || validExtensions.some(ext => fileExtension.endsWith(ext))) {
        // Check file size (10MB limit)
        if (file.size <= 10 * 1024 * 1024) {
          setSelectedFile(file);
        } else {
          toast.error("File is too large. Maximum size is 10MB.");
        }
      } else {
        toast.error("Please select a CSV, PDF, Excel or Word file");
      }
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !source?.id) {
      toast.error("Please select a file to upload");
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);
    
    try {
      // Create a FormData object to send the file
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('instructions', catalogInstructions);
      formData.append('contentType', 'catalog');
      
      // Upload the file to the API
      const response = await fetch(`/api/knowledge-sources/${source.id}/catalog`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to upload file: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Upload result:', result);
      
      // Update the catalog content with the new data
      setCatalogContent(result);
      
      // Clear the file input
      setSelectedFile(null);
      
      // Show success dialog
      showSuccessDialog(
        "Catalog File Uploaded Successfully",
        `Your catalog file "${selectedFile.name}" has been uploaded successfully. This will be used to train your AI assistant.`
      );
      
      // Refresh the catalog content
      await fetchCatalogContent();
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(error instanceof Error ? error.message : "Failed to upload file");
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const handleAddCategory = () => {
    if (newCategory.trim() && !newProduct.categories.includes(newCategory.trim())) {
      setNewProduct({
        ...newProduct,
        categories: [...newProduct.categories, newCategory.trim()]
      });
      setNewCategory('');
    }
  };

  const handleRemoveCategory = (category: string) => {
    setNewProduct({
      ...newProduct,
      categories: newProduct.categories.filter(c => c !== category)
    });
  };

  const handleSaveProduct = async () => {
    if (!newProduct.title.trim()) {
      toast.error("Product title is required");
      return;
    }

    if (!source?.id) {
      toast.error("Knowledge source not found");
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Create a proper payload for the API
      const payload = {
        knowledgeSourceId: source.id,
        catalogContentId: catalogContent?.id,
        product: {
          ...newProduct,
          id: isEditing && editingProductId ? editingProductId : undefined
        }
      };
      
      // Make the API request to save the product
      const response = await fetch(`/api/knowledge-sources/${source.id}/catalog/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to save product: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Product save result:', result);
      
      // Update local state based on the response
      if (isEditing && editingProductId) {
        // Update existing product in the list
        setProducts(products.map(product => 
          product.id === editingProductId ? result.product : product
        ));
        
        // Show success dialog
        showSuccessDialog(
          "Product Updated Successfully",
          `The product "${result.product.title}" has been updated successfully.`
        );
      } else {
        // Add new product to the list
        setProducts([...products, result.product]);
        
        // Show success dialog
        showSuccessDialog(
          "Product Added Successfully",
          `The product "${result.product.title}" has been added to your catalog.`
        );
      }
      
      // Reset form
      setNewProduct({
        title: '',
        price: 0,
        taxRate: 0,
        description: '',
        categories: []
      });
      setIsEditing(false);
      setEditingProductId(null);
      
      // Refresh catalog content to ensure we have the latest data
      await fetchCatalogContent();
      
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error(error instanceof Error ? error.message : "Failed to save product");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditProduct = (product: Product) => {
    setNewProduct({
      title: product.title,
      price: product.price,
      taxRate: product.taxRate,
      description: product.description,
      categories: [...product.categories]
    });
    setIsEditing(true);
    setEditingProductId(product.id);
    setDrawerOpen(true);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!source?.id) {
      toast.error("Knowledge source not found");
      return;
    }

    try {
      // Make the API request to delete the product
      const response = await fetch(`/api/knowledge-sources/${source.id}/catalog/products/${productId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to delete product: ${response.status}`);
      }
      
      // Update local state
      setProducts(products.filter(product => product.id !== productId));
      
      // Show success dialog
      const productToDelete = products.find(p => p.id === productId);
      showSuccessDialog(
        "Product Deleted Successfully",
        `The product "${productToDelete?.title || 'Selected product'}" has been removed from your catalog.`
      );
      
      // Refresh catalog content to ensure we have the latest data
      await fetchCatalogContent();
      
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error(error instanceof Error ? error.message : "Failed to delete product");
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  return (
    <Card className="p-6">
      <div className="space-y-8">
        {/* Mode Selection Switch */}
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-gray-50 mb-4">
            Product Catalog
          </h2>
          
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-6">
            <div className="flex flex-col space-y-4">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Choose how you want to manage your product catalog:
              </p>
              
              <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-8">
                <div 
                  className={cn(
                    "flex items-center p-3 rounded-md border cursor-pointer transition-colors",
                    catalogMode === 'document' 
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950 dark:border-indigo-700" 
                      : "border-gray-200 hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-700"
                  )}
                  onClick={() => handleModeChange('document')}
                >
                  <div className="mr-3">
                    <FileUp className={cn(
                      "h-5 w-5",
                      catalogMode === 'document' ? "text-indigo-600 dark:text-indigo-400" : "text-gray-500 dark:text-gray-400"
                    )} />
                  </div>
                  <div className="flex-1">
                    <p className={cn(
                      "font-medium",
                      catalogMode === 'document' ? "text-indigo-700 dark:text-indigo-400" : "text-gray-700 dark:text-gray-300"
                    )}>
                      Document Upload
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Upload a single file with your product catalog
                    </p>
                  </div>
                  <div className="ml-2">
                    <Switch 
                      checked={catalogMode === 'document'} 
                      onCheckedChange={() => handleModeChange('document')}
                    />
                  </div>
                </div>
                
                <div 
                  className={cn(
                    "flex items-center p-3 rounded-md border cursor-pointer transition-colors",
                    catalogMode === 'manual' 
                      ? "border-purple-500 bg-purple-50 dark:bg-purple-950 dark:border-purple-700" 
                      : "border-gray-200 hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-700"
                  )}
                  onClick={() => handleModeChange('manual')}
                >
                  <div className="mr-3">
                    <ListPlus className={cn(
                      "h-5 w-5",
                      catalogMode === 'manual' ? "text-purple-600 dark:text-purple-400" : "text-gray-500 dark:text-gray-400"
                    )} />
                  </div>
                  <div className="flex-1">
                    <p className={cn(
                      "font-medium",
                      catalogMode === 'manual' ? "text-purple-700 dark:text-purple-400" : "text-gray-700 dark:text-gray-300"
                    )}>
                      Manual Entry
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Add products one by one with detailed information
                    </p>
                  </div>
                  <div className="ml-2">
                    <Switch 
                      checked={catalogMode === 'manual'} 
                      onCheckedChange={() => handleModeChange('manual')}
                    />
                  </div>
                </div>
              </div>
              
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {catalogMode === 'document' && catalogContent?.file && (
                  <p className="flex items-center text-indigo-600 dark:text-indigo-400">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Document uploaded: {catalogContent.file.name}
                  </p>
                )}
                {catalogMode === 'manual' && products.length > 0 && (
                  <p className="flex items-center text-purple-600 dark:text-purple-400">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {products.length} product{products.length !== 1 ? 's' : ''} added manually
                  </p>
                )}
              </div>
            </div>
          </div>
          
          {isLoading ? (
            <div className="mt-8">
              <LoadingState text="Loading catalog content..." />
            </div>
          ) : (
            <>
              {/* Document Upload Mode */}
              {catalogMode === 'document' && (
                <div className="mt-6">
                  <div className="border-l-4 border-indigo-500 pl-4 py-1 mb-6">
                    <p className="text-sm font-medium text-indigo-700 dark:text-indigo-400">
                      Document Upload Mode Active
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Upload a single document containing your product catalog
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
                      Upload a single document containing your product catalog. The AI will extract product information from this document.
                    </p>
                    
                    <form onSubmit={handleFileUpload}>
                      <div className="flex justify-center rounded-lg border border-dashed border-gray-300 px-6 py-10 dark:border-gray-800">
                        <div className="text-center">
                          {selectedFile ? (
                            <div className="flex flex-col items-center">
                              {selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv') ? (
                                <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                              ) : selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || selectedFile.name.endsWith('.xlsx') ? (
                                <FileSpreadsheet className="mx-auto h-12 w-12 text-green-600 dark:text-green-500" />
                              ) : selectedFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || selectedFile.name.endsWith('.docx') ? (
                                <FileText className="mx-auto h-12 w-12 text-indigo-600 dark:text-indigo-500" />
                              ) : (
                                <FileText className="mx-auto h-12 w-12 text-red-600 dark:text-red-500" />
                              )}
                              <div className="mt-4 flex items-center">
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-50">{selectedFile.name}</span>
                                <button
                                  type="button"
                                  onClick={() => setSelectedFile(null)}
                                  className="ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                >
                                  <X className="h-5 w-5" />
                                </button>
                              </div>
                            </div>
                          ) : catalogContent?.file ? (
                            <div className="flex flex-col items-center">
                              <FileText className="mx-auto h-12 w-12 text-indigo-600 dark:text-indigo-500" />
                              <div className="mt-4 flex items-center">
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-50">
                                  {catalogContent.file.name}
                                </span>
                                <p className="ml-2 text-xs text-gray-500">
                                  (Uploaded)
                                </p>
                              </div>
                              <div className="mt-4 flex space-x-3">
                                {catalogContent.file.blobUrl && (
                                  <a
                                    href={catalogContent.file.blobUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="relative cursor-pointer rounded-md bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:text-indigo-300"
                                  >
                                    View File
                                  </a>
                                )}
                                <label
                                  htmlFor="file-upload-replace"
                                  className="relative cursor-pointer rounded-md bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:text-indigo-300"
                                >
                                  <span>Replace this file</span>
                                  <input
                                    id="file-upload-replace"
                                    name="file-upload-replace"
                                    type="file"
                                    className="sr-only"
                                    accept=".csv,.pdf,.xlsx,.docx"
                                    onChange={handleFileChange}
                                  />
                                </label>
                              </div>
                            </div>
                          ) : (
                            <>
                              <Upload className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                              <div className="mt-4 flex text-sm text-gray-500 dark:text-gray-500">
                                <label
                                  htmlFor="file-upload"
                                  className="relative cursor-pointer rounded-md font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-500 dark:hover:text-indigo-400"
                                >
                                  <span>Upload a file</span>
                                  <input
                                    id="file-upload"
                                    name="file-upload"
                                    type="file"
                                    className="sr-only"
                                    accept=".csv,.pdf,.xlsx,.docx"
                                    onChange={handleFileChange}
                                  />
                                </label>
                                <p className="pl-1">or drag and drop</p>
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-500">
                                CSV, PDF, Excel or Word documents up to 10MB
                              </p>
                            </>
                          )}
                          
                          {isSubmitting && (
                            <div className="mt-4">
                              <LoadingState text="Uploading file..." />
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-6">
                        <Label htmlFor="catalog-instructions" className="font-medium">
                          Additional Instructions
                        </Label>
                        <Textarea
                          id="catalog-instructions"
                          value={catalogInstructions}
                          onChange={(e) => setCatalogInstructions(e.target.value)}
                          placeholder="General tax is 11.5% that should be calculated at the end. Payment methods are credit card on pick-up. Make sure to emphasize that AI can make errors in the calculations but it's not very common."
                          className="mt-2"
                          rows={4}
                        />
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                          Add any special instructions or information about your catalog that the AI should know.
                        </p>
                      </div>
                      
                      <div className="mt-6 flex items-center justify-end space-x-3">
                        {selectedFile && (
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setSelectedFile(null)}
                            disabled={isSubmitting}
                          >
                            Cancel
                          </Button>
                        )}
                        <Button
                          type="submit"
                          disabled={!selectedFile || isSubmitting}
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Uploading...
                            </>
                          ) : catalogContent?.file ? 'Replace File' : 'Upload File'}
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
              
              {/* Manual Entry Mode */}
              {catalogMode === 'manual' && (
                <div className="mt-6">
                  <div className="border-l-4 border-purple-500 pl-4 py-1 mb-6">
                    <p className="text-sm font-medium text-purple-700 dark:text-purple-400">
                      Manual Entry Mode Active
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Add products one by one with detailed information
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
                      Manually add products to your catalog one by one. This is ideal for smaller catalogs or when you need precise control over product details.
                    </p>
                    
                    <div className="sm:flex sm:items-center sm:justify-between sm:space-x-10">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-50">
                          Product Management
                        </h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
                          Add, edit, and remove products in your catalog.
                        </p>
                      </div>
                      
                      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
                        <DrawerTrigger asChild>
                          <Button 
                            className="mt-4 w-full sm:mt-0 sm:w-fit"
                            onClick={() => {
                              // Reset form when opening drawer for a new product
                              if (!isEditing) {
                                setNewProduct({
                                  title: '',
                                  price: 0,
                                  taxRate: 0,
                                  description: '',
                                  categories: []
                                });
                              }
                            }}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Product
                          </Button>
                        </DrawerTrigger>
                        <DrawerContent>
                          <DrawerHeader>
                            <DrawerTitle>{isEditing ? 'Edit Product' : 'Add New Product'}</DrawerTitle>
                            <DrawerDescription>
                              {isEditing 
                                ? 'Update the product details below.' 
                                : 'Fill in the details to add a new product to your catalog.'}
                            </DrawerDescription>
                          </DrawerHeader>
                          
                          <DrawerBody className="mt-6 space-y-4">
                            <div>
                              <Label htmlFor="product-title" className="font-medium">
                                Product Title
                              </Label>
                              <Input
                                id="product-title"
                                value={newProduct.title}
                                onChange={(e) => setNewProduct({...newProduct, title: e.target.value})}
                                placeholder="Enter product title"
                                className="mt-2"
                              />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="product-price" className="font-medium">
                                  Price
                                </Label>
                                <Input
                                  id="product-price"
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={newProduct.price}
                                  onChange={(e) => setNewProduct({...newProduct, price: parseFloat(e.target.value) || 0})}
                                  placeholder="0.00"
                                  className="mt-2"
                                />
                              </div>
                              
                              <div>
                                <Label htmlFor="product-tax" className="font-medium">
                                  Tax Rate (%)
                                </Label>
                                <Input
                                  id="product-tax"
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={newProduct.taxRate}
                                  onChange={(e) => setNewProduct({...newProduct, taxRate: parseFloat(e.target.value) || 0})}
                                  placeholder="0"
                                  className="mt-2"
                                />
                              </div>
                            </div>
                            
                            <div>
                              <Label htmlFor="product-description" className="font-medium">
                                Description
                              </Label>
                              <Textarea
                                id="product-description"
                                value={newProduct.description}
                                onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                                placeholder="Enter product description"
                                className="mt-2"
                                rows={3}
                              />
                            </div>
                            
                            <div>
                              <Label className="font-medium">Categories</Label>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {newProduct.categories.map((category, index) => (
                                  <Badge key={index} variant="default" className="flex items-center gap-1">
                                    {category}
                                    <button 
                                      type="button" 
                                      onClick={() => handleRemoveCategory(category)}
                                      className="ml-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </Badge>
                                ))}
                              </div>
                              <div className="mt-2 flex gap-2">
                                <Input
                                  value={newCategory}
                                  onChange={(e) => setNewCategory(e.target.value)}
                                  placeholder="Add category"
                                  className="flex-1"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleAddCategory();
                                    }
                                  }}
                                />
                                <Button 
                                  type="button" 
                                  variant="secondary" 
                                  onClick={handleAddCategory}
                                >
                                  Add
                                </Button>
                              </div>
                            </div>
                          </DrawerBody>
                          
                          <DrawerFooter className="mt-6">
                            <Button 
                              variant="secondary" 
                              onClick={() => {
                                setDrawerOpen(false);
                                // Reset form state when canceling
                                if (isEditing) {
                                  setIsEditing(false);
                                  setEditingProductId(null);
                                  setNewProduct({
                                    title: '',
                                    price: 0,
                                    taxRate: 0,
                                    description: '',
                                    categories: []
                                  });
                                }
                              }}
                            >
                              Cancel
                            </Button>
                            <Button 
                              onClick={() => {
                                handleSaveProduct().then(() => {
                                  setDrawerOpen(false);
                                });
                              }} 
                              disabled={isSubmitting}
                            >
                              {isSubmitting ? 'Saving...' : isEditing ? 'Update Product' : 'Add Product'}
                            </Button>
                          </DrawerFooter>
                        </DrawerContent>
                      </Drawer>
                    </div>
                    
                    {products.length > 0 ? (
                      <div className="mt-8">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-50">
                          Your Products
                        </h3>
                        <div className="mt-4 rounded-md border border-gray-200 dark:border-gray-800">
                          <TableRoot>
                            <Table>
                              <TableHead>
                                <TableRow>
                                  <TableHeaderCell>Product</TableHeaderCell>
                                  <TableHeaderCell>Categories</TableHeaderCell>
                                  <TableHeaderCell className="text-right">Price</TableHeaderCell>
                                  <TableHeaderCell className="text-right">Tax Rate</TableHeaderCell>
                                  <TableHeaderCell className="text-right">Actions</TableHeaderCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {products.map((product) => (
                                  <TableRow key={product.id}>
                                    <TableCell className="font-medium">
                                      <div>
                                        <div className="font-medium text-gray-900 dark:text-gray-50">{product.title}</div>
                                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{product.description}</div>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex flex-wrap gap-1">
                                        {product.categories.map((category, index) => (
                                          <Badge key={index} variant="default" className="text-xs">
                                            {category}
                                          </Badge>
                                        ))}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right">{formatPrice(product.price)}</TableCell>
                                    <TableCell className="text-right">{product.taxRate}%</TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex justify-end space-x-2">
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleEditProduct(product);
                                          }}
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="icon"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteProduct(product.id);
                                          }}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableRoot>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-8 flex justify-center items-center py-8 rounded-lg border border-dashed border-gray-300 dark:border-gray-800">
                        <div className="text-center">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            No products added yet
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            Click "Add Product" to start building your catalog
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Mode Change Confirmation Dialog */}
      <Dialog open={modeChangeDialogOpen} onOpenChange={setModeChangeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Catalog Mode</DialogTitle>
            <DialogDescription>
              {catalogMode === 'document' && pendingMode === 'manual'
                ? "Switching to manual entry mode will not delete your uploaded document, but you'll be focusing on manually entered products instead."
                : "Switching to document upload mode will not delete your manually entered products, but you'll be focusing on the uploaded document instead."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              You're switching from <span className="font-medium">{catalogMode === 'document' ? 'Document Upload' : 'Manual Entry'}</span> to <span className="font-medium">{pendingMode === 'document' ? 'Document Upload' : 'Manual Entry'}</span> mode.
            </p>
            
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md dark:bg-amber-950 dark:border-amber-800">
              <p className="text-sm text-amber-800 dark:text-amber-300 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2">
                  <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                </svg>
                Your existing content will remain saved but will not be visible in the new mode.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setModeChangeDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={confirmModeChange}>
              Switch Mode
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Success Dialog */}
      <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              {successTitle}
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {successMessage}
            </p>
          </div>
          
          <DialogFooter>
            <Button onClick={() => setSuccessDialogOpen(false)}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
} 