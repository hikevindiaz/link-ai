'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { Book } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Source, FileData, FileStatus, MAX_FILES, ALLOWED_FILE_TYPES, MAX_FILE_SIZE, MAX_PDF_PAGES } from './types';
import { useErrorHandler } from '../error-handler';
import { RiInformationLine, RiFileUploadLine } from '@remixicon/react';

// Import our sub-components
import FileUploadForm from './file-upload-form';
import FileProgressList from './file-progress-list';
import ExistingFilesList from './existing-files-list';
import DeleteFileDialog from './delete-file-dialog';

interface FileUploadTabProps {
  source?: Source;
}

export default function FileUploadTab({ source }: FileUploadTabProps) {
  const [pendingFiles, setPendingFiles] = useState<FileStatus[]>([]);
  const [existingFiles, setExistingFiles] = useState<FileData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<FileData | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState<'deleting' | 'removing' | 'complete' | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  
  // Use our error handling
  const { addError } = useErrorHandler();

  // Fetch existing files when component mounts or source changes
  useEffect(() => {
    if (source?.id) {
      fetchExistingFiles();
    }
  }, [source?.id]);

  const fetchExistingFiles = async () => {
    if (!source?.id) return;
    
    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/knowledge-sources/${source.id}/content?type=file`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch files: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Fetched files:', data);
      
      // Filter files to only include those directly uploaded to this knowledge source
      // and exclude files that are associated with catalog content
      const filteredFiles = data.filter((file: FileData) => {
        // Only include files that:
        // 1. Have this knowledge source as their primary source
        // 2. Don't have a crawler ID (not from a crawler)
        // 3. Don't have an openAIFileId that starts with 'catalog_' (not a catalog file)
        return file.knowledgeSourceId === source.id && 
               !file.crawlerId && 
               !file.openAIFileId?.startsWith('catalog_');
      });
      
      console.log('Filtered files for this tab:', filteredFiles);
      setExistingFiles(filteredFiles);
    } catch (error) {
      console.error('Error fetching files:', error);
      addError({
        type: 'network',
        message: 'Failed to load existing files',
        details: error instanceof Error ? error.message : undefined
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      console.warn(`🔄 [UPLOAD] Files selected via input: ${e.target.files.length} files`);
      
      // Check if adding more files would exceed the maximum
      if (existingFiles.length + e.target.files.length > MAX_FILES) {
        console.warn(`❌ [UPLOAD] Too many files: ${existingFiles.length} existing + ${e.target.files.length} new > ${MAX_FILES} max`);
        toast.error(`You can only upload up to ${MAX_FILES} files. You currently have ${existingFiles.length} files.`);
        return;
      }

      // Filter files to only include allowed types
      const validFiles = Array.from(e.target.files).filter(file => {
        const isValidType = ALLOWED_FILE_TYPES.includes(file.type);
        const isValidSize = file.size <= MAX_FILE_SIZE;
        
        if (!isValidType) {
          console.warn(`❌ [UPLOAD] Invalid file type: ${file.name} (${file.type})`);
          toast.error(`File type not supported: ${file.name}. Please upload PDF, DOCX, TXT, or CSV files.`);
        } else if (!isValidSize) {
          console.warn(`❌ [UPLOAD] File too large: ${file.name} (${file.size} bytes)`);
          toast.error(`File too large: ${file.name}. Maximum size is 5MB.`);
        }
        
        return isValidType && isValidSize;
      });
      
      console.warn(`🔄 [UPLOAD] Valid files: ${validFiles.length} of ${e.target.files.length}`);
      
      if (validFiles.length === 0) {
        toast.error("No valid files selected. Please upload PDF, DOCX, TXT, or CSV files under 5MB.");
        return;
      }
      
      // Add files to queue with 'queued' status instead of 'uploading'
      const newPendingFiles = validFiles.map(file => ({
        file,
        id: `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        status: 'queued' as const, // Changed from 'uploading' to 'queued'
        progress: 0 // Start with 0 progress since upload hasn't started
      }));
      
      console.warn(`🔄 [UPLOAD] Created ${newPendingFiles.length} pending file entries in queue`);
      
      // Add to state but don't start uploads automatically
      setPendingFiles(prev => [...prev, ...newPendingFiles]);
      
      // Notify user that files are queued
      if (validFiles.length === 1) {
        toast.info(`File "${validFiles[0].name}" ready to upload`);
      } else {
        toast.info(`${validFiles.length} files ready to upload`);
      }
      
      // Reset file input
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  // Update handleDragOver to set drag active state
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  // Add handleDragLeave
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  // Add back the handleDrop function
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      console.warn(`🔄 [UPLOAD] Files dropped: ${e.dataTransfer.files.length} files`);
      
      // Check if adding more files would exceed the maximum
      if (existingFiles.length + e.dataTransfer.files.length > MAX_FILES) {
        console.warn(`❌ [UPLOAD] Too many files: ${existingFiles.length} existing + ${e.dataTransfer.files.length} new > ${MAX_FILES} max`);
        toast.error(`You can only upload up to ${MAX_FILES} files. You currently have ${existingFiles.length} files.`);
        return;
      }

      // Filter files to only include allowed types
      const validFiles = Array.from(e.dataTransfer.files).filter(file => {
        const isValidType = ALLOWED_FILE_TYPES.includes(file.type);
        const isValidSize = file.size <= MAX_FILE_SIZE;
        
        if (!isValidType) {
          console.warn(`❌ [UPLOAD] Invalid file type: ${file.name} (${file.type})`);
          toast.error(`File type not supported: ${file.name}. Please upload PDF, DOCX, TXT, or CSV files.`);
        } else if (!isValidSize) {
          console.warn(`❌ [UPLOAD] File too large: ${file.name} (${file.size} bytes)`);
          toast.error(`File too large: ${file.name}. Maximum size is 5MB.`);
        }
        
        return isValidType && isValidSize;
      });
      
      console.warn(`🔄 [UPLOAD] Valid files: ${validFiles.length} of ${e.dataTransfer.files.length}`);
      
      if (validFiles.length === 0) {
        toast.error("No valid files selected. Please upload PDF, DOCX, TXT, or CSV files under 5MB.");
        return;
      }
      
      // Add files to queue with 'queued' status
      const newPendingFiles = validFiles.map(file => ({
        file,
        id: `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        status: 'queued' as const,
        progress: 0
      }));
      
      console.warn(`🔄 [UPLOAD] Created ${newPendingFiles.length} pending file entries in queue`);
      
      // Add to state but don't start uploads automatically
      setPendingFiles(prev => [...prev, ...newPendingFiles]);
      
      // Notify user that files are queued
      if (validFiles.length === 1) {
        toast.info(`File "${validFiles[0].name}" ready to upload`);
      } else {
        toast.info(`${validFiles.length} files ready to upload`);
      }
    }
  };

  // Function to update file status and progress
  const updateFileStatus = (id: string, updates: Partial<FileStatus>) => {
    setPendingFiles(prev => 
      prev.map(file => 
        file.id === id 
          ? { ...file, ...updates } 
          : file
      )
    );
  };

  // Upload a single file
  const uploadFile = async (fileId: string) => {
    const fileStatus = pendingFiles.find(f => f.id === fileId);
    if (!fileStatus || !source?.id) return;
    
    try {
      // Update status to uploading with initial progress
      updateFileStatus(fileId, { status: 'uploading', progress: 5 });
      
      // Prepare form data - ensure we're getting a valid File object
      const formData = new FormData();
      formData.append('file', fileStatus.file);
      
      // Calculate total size to estimate progress
      const totalSize = fileStatus.file.size;
      
      try {
        // Set up XMLHttpRequest to track upload progress
        const xhr = new XMLHttpRequest();
        
        // Track real-time progress
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 45) + 5; // Scale to 5-50%
            updateFileStatus(fileId, { progress: percentComplete });
          }
        };
        
        // Create a promise to handle the XHR request
        const uploadPromise = new Promise((resolve, reject) => {
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(xhr.response);
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText}`));
            }
          };
          xhr.onerror = () => reject(new Error('Network error during upload'));
          xhr.ontimeout = () => reject(new Error('Upload timed out'));
        });
        
        // Open and send the request
        xhr.open('POST', `/api/knowledge-sources/${source.id}/content`);
        xhr.responseType = 'json';
        xhr.timeout = 60000; // 1 minute timeout
        xhr.send(formData);
        
        // Wait for the upload to complete
        const response = await uploadPromise;
        const data = xhr.response;
        
        // Update status to processing for vector store
        updateFileStatus(fileId, { 
          status: 'processing', 
          progress: 60, 
          fileId: data.id,
          openAIFileId: data.openAIFileId
        });
        
        // Create additional vector store request directly
        if (data.id && data.openAIFileId) {
          updateFileStatus(fileId, { status: 'training', progress: 70 });
          
          // Make direct call to vector endpoint
          const vectorResponse = await fetch(`/api/knowledge-sources/${source.id}/content/${data.id}/vector`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              openAIFileId: data.openAIFileId
            })
          });
          
          updateFileStatus(fileId, { progress: 90 });
          
          if (!vectorResponse.ok) {
            const vectorText = await vectorResponse.text();
            throw new Error(vectorText || `Failed to process file for AI training: ${vectorResponse.status}`);
          }
        }
        
        // Success! Show message and update UI
        toast.success(`File "${fileStatus.file.name}" uploaded and processed successfully`);
        
        // Refresh the list of files to include the new one
        fetchExistingFiles();
        
        // Complete the upload with full progress
        updateFileStatus(fileId, { status: 'complete', progress: 100 });
        
        // Remove from pending files after showing success
        setTimeout(() => {
          setPendingFiles(prev => prev.filter(f => f.id !== fileId));
        }, 3000);
        
      } catch (error) {
        updateFileStatus(fileId, { 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Failed to upload file' 
        });
        toast.error(`Error uploading ${fileStatus.file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } catch (error) {
      updateFileStatus(fileId, { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Failed to upload file' 
      });
      toast.error(`Error uploading ${fileStatus.file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const confirmDeleteFile = (file: FileData) => {
    setFileToDelete(file);
    setDeleteDialogOpen(true);
  };

  const handleDeleteFile = async () => {
    if (!fileToDelete || !source?.id) return;
    
    setIsDeleting(true);
    setDeleteProgress('deleting');
    
    try {
      // First delete the file from the database
      const response = await fetch(`/api/knowledge-sources/${source.id}/content/${fileToDelete.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to delete file: ${response.status}`);
      }
      
      // Update delete progress
      setDeleteProgress('removing');
    
      // Show toast notification
      toast.info(`Removing ${fileToDelete.name} from your knowledge base...`);
      
      // Short delay to show the progress
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mark delete as complete
      setDeleteProgress('complete');
    
      // Update UI by removing from local state
      setExistingFiles(prev => prev.filter(file => file.id !== fileToDelete.id));
    
      // Close dialog and reset state after a short delay
      setTimeout(() => {
        setDeleteDialogOpen(false);
        setFileToDelete(null);
        setIsDeleting(false);
        setDeleteProgress(null);
      }, 1000);
    
      // Show success message
      toast.success(`${fileToDelete.name} has been removed from your knowledge base`);
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error(`Error deleting ${fileToDelete.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsDeleting(false);
      setDeleteProgress(null);
      
      // Don't close the dialog on error
      setTimeout(() => {
        // If there's an error, we'll still close the dialog after a while
        // but give the user time to see the error
        setDeleteDialogOpen(false);
        setFileToDelete(null);
      }, 3000);
    }
  };

  // Start upload for a specific file
  const startUpload = (fileId: string) => {
    console.warn(`🔄 [UPLOAD] Manually starting upload for file: ${fileId}`);
    uploadFile(fileId);
  };
  
  // Start all queued uploads
  const startAllUploads = () => {
    const queuedFiles = pendingFiles.filter(f => f.status === 'queued');
    if (queuedFiles.length === 0) return;
    
    console.warn(`🔄 [UPLOAD] Starting upload for ${queuedFiles.length} queued files`);
    queuedFiles.forEach(file => {
      startUpload(file.id);
    });
  };

  // Remove a file from the pending list
  const removeFile = (fileId: string) => {
    setPendingFiles(prev => prev.filter(f => f.id !== fileId));
  };

  // Helper function to check PDF page count
  const checkPDFPageCount = async (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      // Only check page count for PDF files
      if (file.type !== 'application/pdf') {
        resolve(true);
        return;
      }

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const typedarray = new Uint8Array(event.target!.result as ArrayBuffer);
          
          // Use PDF.js to check page count
          // This typically requires PDF.js to be loaded
          // For simplicity, we'll use a placeholder that always passes
          // In a real implementation, you would use PDF.js to count pages
          
          // Placeholder: In production, replace with actual PDF.js implementation
          // const loadingTask = pdfjsLib.getDocument(typedarray);
          // const pdf = await loadingTask.promise;
          // const pageCount = pdf.numPages;
          
          // Example mock implementation (replace with real implementation)
          const pageCount = 15; // Placeholder assuming 15 pages
          
          if (pageCount > MAX_PDF_PAGES) {
            toast.error(`PDF has ${pageCount} pages. Maximum allowed is ${MAX_PDF_PAGES} pages.`);
            resolve(false);
          } else {
            resolve(true);
          }
        } catch (error) {
          console.error('Error checking PDF page count:', error);
          toast.error(`Could not verify PDF page count. Please ensure it's under ${MAX_PDF_PAGES} pages.`);
          resolve(false);
        }
      };
      reader.onerror = () => {
        toast.error('Error reading PDF file');
        resolve(false);
      };
      reader.readAsArrayBuffer(file);
    });
  };

  return (
    <div className="flex h-full flex-col">
      <Card className="mb-6 p-6">
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Book className="h-5 w-5 text-indigo-500" />
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-50">
                Add Files to Knowledge Base
              </h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Upload files like PDFs, TXT, CSV, DOCX, PPTX, XLSX to use as knowledge for Agent responses. 
              Files will be processed and made available for Agent queries. Max 5MB per file, PDFs limited to 20 pages, 
              and a maximum of {MAX_FILES} files total.
            </p>
          </div>
          
          {/* File upload form component */}
          <FileUploadForm 
            existingFilesCount={existingFiles.length}
            isDragActive={isDragActive}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onFileChange={handleFileChange}
          />
          
          {/* Upload progress list component */}
          <FileProgressList 
            pendingFiles={pendingFiles}
            onStartUpload={startUpload}
            onStartAllUploads={startAllUploads}
            onRemoveFile={removeFile}
          />
        </div>
      </Card>
      
      {/* List of existing files component */}
      <ExistingFilesList 
        files={existingFiles}
        isLoading={isLoading}
        onDeleteFile={confirmDeleteFile}
      />
      
      {/* Delete confirmation dialog component */}
      <DeleteFileDialog 
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        fileToDelete={fileToDelete}
        isDeleting={isDeleting}
        deleteProgress={deleteProgress}
        onConfirmDelete={handleDeleteFile}
      />
    </div>
  );
} 