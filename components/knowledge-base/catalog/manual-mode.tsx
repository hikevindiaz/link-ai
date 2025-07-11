'use client';

import React, { useState, useRef } from 'react';
import { Edit, Loader2, Plus, Trash2, X, Upload, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Table,
  TableBody, 
  TableCell, 
  TableHead,
  TableHeaderCell, 
  TableRow,
  TableRoot
} from '@/components/ui/table';
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
} from '@/components/ui/drawer';
import { CatalogContent, Product } from './types';
import { Source } from '../source-sidebar';
import { RiListCheck2 } from '@remixicon/react';
import { DeleteDialog } from './delete-dialog';
import { Progress } from '@/components/ui/progress';

interface ManualModeProps {
  source?: Source;
  catalogContent: CatalogContent | null;
  catalogInstructions: string;
  setCatalogInstructions: (value: string) => void;
  products: Product[];
  setProducts: (products: Product[]) => void;
  fetchCatalogContent: () => Promise<void>;
  showSuccessDialog: (title: string, message: string) => void;
}

export function ManualMode({
  source,
  catalogContent,
  catalogInstructions,
  setCatalogInstructions,
  products,
  setProducts,
  fetchCatalogContent,
  showSuccessDialog
}: ManualModeProps) {
  const { data: session } = useSession();
  const [newProduct, setNewProduct] = useState<Omit<Product, 'id'>>({
    title: '',
    price: 0,
    taxRate: 0,
    description: '',
    categories: [],
    imageUrl: ''
  });
  const [newCategory, setNewCategory] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Product deletion state
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState(0);

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Validate file type
      const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validImageTypes.includes(file.type)) {
        toast.error('Invalid file type. Please upload a JPG, PNG, GIF, or WebP image.');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image is too large. Maximum size is 5MB.');
        return;
      }
      
      setSelectedImage(file);
      
      // Create a preview URL for display
      const previewUrl = URL.createObjectURL(file);
      setNewProduct({
        ...newProduct,
        imageUrl: previewUrl
      });
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setNewProduct({
      ...newProduct,
      imageUrl: ''
    });
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
      let response;
      
      // Check if we need to upload a new image or use existing image URL
      if (selectedImage && session?.user?.id) {
        // Use multipart form data for new image upload
        const formData = new FormData();
        formData.append('image', selectedImage);
        formData.append('catalogContentId', catalogContent?.id || '');
        formData.append('product', JSON.stringify({
          ...newProduct,
          imageUrl: '', // Will be set by the server after upload
          id: isEditing && editingProductId ? editingProductId : undefined
        }));
        
        response = await fetch(`/api/knowledge-sources/${source.id}/catalog/products`, {
          method: 'POST',
          body: formData, // No Content-Type header - browser will set it with boundary
        });
      } else {
        // Use JSON for existing image URL or no image
        const payload = {
          knowledgeSourceId: source.id,
          catalogContentId: catalogContent?.id,
          product: {
            ...newProduct,
            imageUrl: newProduct.imageUrl, // Use existing URL or empty string
            id: isEditing && editingProductId ? editingProductId : undefined
          }
        };
        
        response = await fetch(`/api/knowledge-sources/${source.id}/catalog/products`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
      }
      
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
        categories: [],
        imageUrl: ''
      });
      setSelectedImage(null);
      setIsEditing(false);
      setEditingProductId(null);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Close the drawer
      return Promise.resolve();
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error(error instanceof Error ? error.message : "Failed to save product");
      return Promise.reject(error);
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
      categories: [...product.categories],
      imageUrl: product.imageUrl || ''
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
    
    setIsDeleting(true);
    setDeleteProgress(10);
    
    try {
      // Step 1: Start deleting (10%)
      setTimeout(() => setDeleteProgress(30), 300);
      
      // Step 2: Removing from database (50%)
      setTimeout(() => setDeleteProgress(50), 600);
      
      const response = await fetch(`/api/knowledge-sources/${source.id}/catalog/products/${productId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete product: ${response.status}`);
      }
      
      // Step 3: Cleaning up (70%)
      setDeleteProgress(70);
      setTimeout(() => setDeleteProgress(90), 300);
      
      // Remove product from local state
      setProducts(products.filter(p => p.id !== productId));
      
      // Close dialog
      setDeleteDialogOpen(false);
      
      // Show success message
      toast.success("Product deleted successfully");
      
      // Step 4: Complete (100%)
      setDeleteProgress(100);
      
      // Refresh catalog content
      await fetchCatalogContent();
      
      // Reset progress after a delay
      setTimeout(() => {
        setDeleteProgress(0);
        setProductToDelete(null);
      }, 1000);
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error(error instanceof Error ? error.message : "Failed to delete product");
      setDeleteProgress(0);
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDeleteProduct = () => {
    if (productToDelete) {
      handleDeleteProduct(productToDelete.id);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  return (
    <div className="mt-6 bg-white dark:bg-neutral-900">
      <div className="flex sm:items-center sm:justify-between sm:space-x-10">
        <div>
          <h3 className="font-semibold text-neutral-900 dark:text-neutral-50">
            Product List
          </h3>
        </div>
        
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerTrigger asChild>
            <Button 
              className="mt-2 w-full sm:mt-0 sm:w-fit bg-black hover:bg-neutral-800 text-white"
              onClick={() => {
                // Reset form when opening drawer for a new product
                if (!isEditing) {
                  setNewProduct({
                    title: '',
                    price: 0,
                    taxRate: 0,
                    description: '',
                    categories: [],
                    imageUrl: ''
                  });
                  setSelectedImage(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>
                {isEditing ? 'Edit Product' : 'Add New Product'}
              </DrawerTitle>
              <DrawerDescription>
                {isEditing 
                  ? 'Make changes to this product in your catalog.'
                  : 'Add a new product to your catalog.'
                }
              </DrawerDescription>
            </DrawerHeader>
            
            <DrawerBody className="mt-6 space-y-4">
              <div>
                <Label htmlFor="product-title" className="font-medium">
                  Product Title
                </Label>
                <div className="space-y-2">
                  <Input
                    id="product-title"
                    value={newProduct.title}
                    onChange={(e) => setNewProduct({...newProduct, title: e.target.value})}
                    placeholder="Enter product title"
                    className="mt-2"
                    maxLength={100}
                  />
                  <div className="flex justify-end">
                    <span className="text-xs text-neutral-500">
                      {newProduct.title.length}/100
                    </span>
                  </div>
                </div>
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
                <div className="space-y-2">
                  <Textarea
                    id="product-description"
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                    placeholder="Enter product description"
                    className="mt-2"
                    rows={3}
                    maxLength={500}
                  />
                  <div className="flex justify-end">
                    <span className="text-xs text-neutral-500">
                      {newProduct.description.length}/500
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Product Image Upload */}
              <div>
                <Label htmlFor="product-image" className="font-medium">
                  Product Image
                </Label>
                
                {newProduct.imageUrl ? (
                  <div className="mt-2 relative">
                    <div className="relative w-full h-40 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800">
                      <img 
                        src={newProduct.imageUrl} 
                        alt="Product preview" 
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute top-2 right-2 p-1 rounded-full bg-white/80 text-neutral-700 hover:bg-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2">
                    <label
                      htmlFor="product-image-input"
                      className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl border-neutral-300 dark:border-neutral-700 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900/50"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <ImageIcon className="w-10 h-10 mb-3 text-neutral-400" />
                        <p className="mb-2 text-sm text-neutral-500 dark:text-neutral-400">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          JPG, PNG, GIF or WebP (MAX. 5MB)
                        </p>
                      </div>
                      <Input
                        id="product-image-input"
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg, image/png, image/gif, image/webp"
                        className="hidden"
                        onChange={handleImageChange}
                      />
                    </label>
                  </div>
                )}
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  Add an image of your product to enhance visibility.
                </p>
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
                        className="ml-1 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="mt-2 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder="Add category"
                      className="flex-1"
                      maxLength={30}
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
                  <div className="flex justify-end">
                    <span className="text-xs text-neutral-500">
                      {newCategory.length}/30
                    </span>
                  </div>
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
                      categories: [],
                      imageUrl: ''
                    });
                    setSelectedImage(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
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
                className="bg-black hover:bg-neutral-800 text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : isEditing ? 'Update Product' : 'Add Product'}
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>
      
      {products.length > 0 ? (
        <div className="mt-4">
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800">
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
                        <div className="flex items-center space-x-3">
                          {product.imageUrl && (
                            <div className="flex-shrink-0 w-10 h-10 overflow-hidden rounded-xl">
                              <img 
                                src={product.imageUrl} 
                                alt={product.title} 
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-black dark:text-white">{product.title}</div>
                            <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 line-clamp-1">{product.description}</div>
                          </div>
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
                              setProductToDelete(product);
                              setDeleteDialogOpen(true);
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
        <div className="mt-6 flex justify-center items-center py-12 rounded-lg border border-dashed border-neutral-200 dark:border-neutral-800 bg-neutral-50/30 dark:bg-neutral-900/20">
          <div className="text-center">
            <RiListCheck2 className="h-12 w-12 text-neutral-300 dark:text-neutral-700 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              No products added yet
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2 max-w-xs mx-auto">
              Click "Add Product" to start building your catalog
            </p>
            <Button 
              variant="secondary" 
              className="mt-4 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800" 
              onClick={() => setDrawerOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add your first product
            </Button>
          </div>
        </div>
      )}
      
      {/* Delete product dialog */}
      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        isDeleting={isDeleting}
        onConfirm={confirmDeleteProduct}
        title="Delete Product"
        description={`Are you sure you want to delete "${productToDelete?.title}"? This action cannot be undone.`}
        deleteProgress={deleteProgress}
      />
    </div>
  );
} 