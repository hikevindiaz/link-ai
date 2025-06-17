'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { RiUpload2Line, RiCloseLine, RiImageLine, RiAlertLine } from '@remixicon/react';
import { cn } from '@/lib/utils';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';

interface LogoUploadProps {
  currentLogoUrl: string | null; // URL of the currently saved logo, if any
  onLogoSelected: (file: File | null) => void; // Callback when a new file is selected or cleared
  onClearSavedLogo: () => void; // Callback when the user wants to remove the currently *saved* logo
  isLoading?: boolean; // For showing a loading state (e.g., during parent upload)
  chatbotId?: string; // Chatbot ID for direct API calls
}

// Delete confirmation dialog component
interface DeleteLogoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDeleting?: boolean;
}

function DeleteLogoDialog({ open, onOpenChange, onConfirm, isDeleting = false }: DeleteLogoDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <RiAlertLine className="h-5 w-5 text-orange-500" />
            Delete Logo
          </DialogTitle>
          <DialogDescription className="pt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
            Are you sure you want to delete this logo? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="mt-6">
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            className="mr-2"
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            {isDeleting ? 
              <span className="flex items-center gap-1">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Deleting...
              </span> : 
              'Delete Logo'
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function LogoUpload({ 
  currentLogoUrl,
  onLogoSelected,
  onClearSavedLogo,
  isLoading,
  chatbotId
}: LogoUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasLogo, setHasLogo] = useState<boolean>(!!currentLogoUrl);

  // Update hasLogo whenever currentLogoUrl changes
  useEffect(() => {
    setHasLogo(!!currentLogoUrl);
  }, [currentLogoUrl]);

  // Log when component receives new props
  useEffect(() => {
    console.log("LogoUpload: Received props", { 
      hasCurrentLogoUrl: !!currentLogoUrl,
      currentLogoUrl,
      isLoading,
      hasLogo
    });
  }, [currentLogoUrl, isLoading, hasLogo]);

  // Determine the preview URL: either local selected file or current saved URL
  const getPreviewUrl = useCallback(() => {
    if (selectedFile) {
      return URL.createObjectURL(selectedFile);
    }
    return currentLogoUrl;
  }, [selectedFile, currentLogoUrl]);

  const previewUrl = getPreviewUrl();
  const hasDisplayableLogo = selectedFile || (hasLogo && currentLogoUrl);

  // Clean up object URL when component unmounts or selectedFile changes
  useEffect(() => {
    // We're now tracking URLs created in getPreviewUrl
    let objectUrl: string | null = null;
    if (selectedFile) {
      objectUrl = URL.createObjectURL(selectedFile);
    }
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [selectedFile]);

  // Add an effect to listen for cancel events
  useEffect(() => {
    // Handler for settings cancel event
    const handleSettingsCanceled = (event: CustomEvent) => {
      // Revert to original logo state based on currentLogoUrl
      setHasLogo(!!currentLogoUrl);
      setSelectedFile(null);
      
      // If we generated any blob URLs, clean them up
      if (previewUrl && previewUrl.startsWith('blob:') && previewUrl !== currentLogoUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      
      console.log("LogoUpload: Reverting to original state after cancel", {
        hasLogo: !!currentLogoUrl,
        originalLogoUrl: currentLogoUrl
      });
    };
    
    // Add event listener
    window.addEventListener('settingsChangesCanceled' as any, handleSettingsCanceled);
    
    // Clean up
    return () => {
      window.removeEventListener('settingsChangesCanceled' as any, handleSettingsCanceled);
    };
  }, [currentLogoUrl, previewUrl]);

  // Add a new effect to listen for icon type changes
  useEffect(() => {
    // Handler for icon type changes
    const handleIconTypeChanged = (event: CustomEvent) => {
      const { newIconType, agentId } = event.detail;
      
      // When switching to orb mode, hide the logo display
      if (newIconType === 'orb') {
        // Force the logo UI to hide
        setHasLogo(false);
        
        console.log("LogoUpload: Hiding logo display due to switch to orb mode");
        
        // Clean up any selected files or blob URLs
        if (selectedFile) {
          setSelectedFile(null);
        }
        
        if (previewUrl && previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(previewUrl);
        }
      }
      // When switching to logo mode, show logo if one exists
      else if (newIconType === 'logo' && currentLogoUrl) {
        setHasLogo(true);
        console.log("LogoUpload: Showing logo display due to switch to logo mode");
      }
    };
    
    // Add event listener
    window.addEventListener('iconTypeChanged' as any, handleIconTypeChanged);
    
    // Clean up
    return () => {
      window.removeEventListener('iconTypeChanged' as any, handleIconTypeChanged);
    };
  }, [currentLogoUrl, previewUrl, selectedFile]);

  const handleFileChange = useCallback((files: FileList | null) => {
    // Prevent multiple rapid calls
    if (isLoading) return;
    
    const file = files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // Max 2MB
        alert('File is too large. Max size is 2MB.'); // Simple alert, consider a toast
        setSelectedFile(null);
        onLogoSelected(null);
        return;
      }
      console.log("LogoUpload: New file selected", { name: file.name, size: file.size });
      setSelectedFile(file);
      setHasLogo(true);
      onLogoSelected(file);
    } else {
      // This case might happen if selection is cancelled
      // If a file was previously selected, and now it's null, reflect that
      if(selectedFile) {
        console.log("LogoUpload: File selection cleared");
        setSelectedFile(null);
        onLogoSelected(null);
      }
    }
  }, [isLoading, onLogoSelected, selectedFile]);

  const handleReactInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileChange(event.target.files);
    // Reset the file input value so the same file can be selected again if removed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    // Prevent any default behavior that might cause a second dialog
    event.stopPropagation();
  }, [handleFileChange]);

  // Show the delete confirmation dialog
  const handleRemoveFile = useCallback(() => {
    console.log("LogoUpload: Remove file clicked", { hasSelectedFile: !!selectedFile, hasCurrentLogo: !!currentLogoUrl });
    
    // If it's just a local file selection (no saved logo yet), clear it without dialog
    if (selectedFile && !currentLogoUrl) {
      setSelectedFile(null);
      setHasLogo(false);
      onLogoSelected(null);
      return;
    }
    
    // Open confirmation dialog for saved logos
    setDeleteDialogOpen(true);
  }, [currentLogoUrl, onLogoSelected, selectedFile]);
  
  // Handle the actual deletion after confirmation
  const handleConfirmDelete = useCallback(async () => {
    setIsDeleting(true);
    
    try {
      // Clear the selected file if there is one
      setSelectedFile(null);
      
      // If there's a saved logo, notify parent to handle deletion
      if (currentLogoUrl) {
        console.log("LogoUpload: Confirmed deletion of saved logo");
        
        // Notify the parent component about the change
        onClearSavedLogo();
        
        // Mark as no logo - this ensures the upload form shows immediately
        setHasLogo(false);
      }
      
      // Close the dialog
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error during logo deletion:", error);
      // Don't close the dialog on error so user can try again
    } finally {
      setIsDeleting(false);
    }
  }, [currentLogoUrl, onClearSavedLogo]);

  const openFileDialog = useCallback(() => {
    // Check if the dialog isn't already triggered
    if (fileInputRef.current && !fileInputRef.current.disabled) {
      // Set a brief timeout to prevent double clicks
      setTimeout(() => {
        fileInputRef.current?.click();
      }, 0);
    }
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files);
    }
  }, [handleFileChange]);

  return (
    <div className="w-full space-y-4">
      {/* Delete Confirmation Dialog */}
      <DeleteLogoDialog 
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
      
      {/* Circular Preview and Selected File Info */} 
      {hasDisplayableLogo ? (
        <div className={cn(
          "relative rounded-lg p-3 flex items-center space-x-3",
          isLoading ? "bg-gray-100 dark:bg-gray-800" : "bg-gray-50 dark:bg-gray-900"
        )}>
          <Avatar className="h-12 w-12 border flex-shrink-0">
            <AvatarImage src={previewUrl ?? undefined} alt="Logo Preview" className="object-cover" />
            <AvatarFallback className="bg-gray-200 dark:bg-gray-700">
              <RiImageLine className="h-6 w-6 text-gray-400" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-grow min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate">
              {selectedFile ? selectedFile.name : (currentLogoUrl ? 'Current Logo' : 'No logo selected')}
            </p>
            {selectedFile && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            )}
            {isLoading && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400 animate-pulse">
                Uploading...
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isLoading && (
              <>
                <button
                  type="button"
                  onClick={openFileDialog}
                  className="p-1 text-neutral-500 hover:text-neutral-600 dark:text-neutral-400 dark:hover:text-neutral-300 rounded-full focus:outline-none focus:ring-2 focus:ring-neutral-500"
                  aria-label="Change logo"
                >
                  <RiUpload2Line className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-neutral-500"
                  aria-label="Remove logo"
                >
                  <RiCloseLine className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
          {/* Hidden file input that's still accessible */}
          <input 
            ref={fileInputRef} 
            id="logo-upload-input" 
            name="logo-upload-input" 
            type="file" 
            className="sr-only" 
            onChange={handleReactInputChange}
            accept="image/png, image/jpeg, image/gif, image/svg+xml"
            disabled={isLoading}
          />
        </div>
      ) : (
        /* Drop Zone / File Input */
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={cn(
            "flex flex-col items-center justify-center space-y-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 px-4 py-6 text-center",
            dragActive ? "border-neutral-500 bg-neutral-50 dark:bg-neutral-900/20" : "",
            isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-gray-400 dark:hover:border-gray-500"
          )}
          onClick={(e) => {
            e.preventDefault();
            if (!isLoading) {
              openFileDialog();
            }
          }}
        >
          <RiUpload2Line
            className="mx-auto size-6 text-gray-400 dark:text-gray-500"
            aria-hidden={true}
          />
          <div className="flex text-xs text-gray-600 dark:text-gray-400">
            <label
              htmlFor="logo-upload-input"
              className={cn(
                "relative font-medium text-neutral-600 dark:text-neutral-400 focus-within:outline-none focus-within:ring-2 focus-within:ring-neutral-500 focus-within:ring-offset-2 dark:focus-within:ring-offset-gray-900",
                isLoading ? "cursor-not-allowed" : "cursor-pointer hover:text-neutral-500 dark:hover:text-neutral-300"
              )}
            >
              <span>Choose file</span>
              <input 
                ref={fileInputRef} 
                id="logo-upload-input" 
                name="logo-upload-input" 
                type="file" 
                className="sr-only" 
                onChange={handleReactInputChange}
                accept="image/png, image/jpeg, image/gif, image/svg+xml"
                disabled={isLoading}
                onClick={(e) => e.stopPropagation()}
              />
            </label>
            <p className="pl-1">or drag and drop</p>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            PNG, JPG, GIF, SVG up to 2MB.
          </p>
        </div>
      )}
    </div>
  );
} 