'use client'

import { useState, useRef, useEffect } from 'react';
import { Upload, File, X, AlertCircle, CheckCircle, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Source } from './source-sidebar';
import { ProgressBar } from "@/components/ProgressBar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoadingState } from '@/components/LoadingState';

interface FileUploadTabProps {
  source?: Source;
  onSave: (data: any) => Promise<void>;
}

interface FileData {
  id: string;
  name: string;
  url?: string;
  blobUrl?: string;
  createdAt?: string;
  crawlerId?: string | null;
  knowledgeSourceId?: string | null;
  openAIFileId?: string | null;
}

// Define allowed file types
const ALLOWED_FILE_TYPES = [
  'application/pdf', // PDF
  'text/csv', // CSV
  'text/plain', // TXT
  'application/vnd.ms-excel', // XLS
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
  'application/msword', // DOC
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
];

// File extensions for the file input accept attribute
const ACCEPTED_FILE_EXTENSIONS = '.pdf,.csv,.txt,.xls,.xlsx,.doc,.docx';

// Maximum file size in bytes (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

interface FileStatus {
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

interface SavedFile {
  id: string;
  name: string;
  blobUrl: string;
  created_at?: string;
}

export default function FileUploadTab({ source, onSave }: FileUploadTabProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [existingFiles, setExistingFiles] = useState<FileData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileToDelete, setFileToDelete] = useState<FileData | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch existing files when component mounts or source changes
  useEffect(() => {
    if (source?.id) {
      fetchExistingFiles();
    }
  }, [source?.id]);

  const fetchExistingFiles = async () => {
    if (!source?.id) return;
    
    setIsLoading(true);
    setError(null);
    
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
      setError('Failed to load existing files. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // Filter files to only include allowed types
      const validFiles = Array.from(e.target.files).filter(file => {
        const isValidType = ALLOWED_FILE_TYPES.includes(file.type);
        const isValidSize = file.size <= MAX_FILE_SIZE;
        
        if (!isValidType) {
          toast.error(`File type not supported: ${file.name}. Please upload PDF, DOCX, TXT, XLS, XLSX, or CSV files.`);
        } else if (!isValidSize) {
          toast.error(`File too large: ${file.name}. Maximum size is 10MB.`);
        }
        
        return isValidType && isValidSize;
      });
      
      setFiles(validFiles);
      
      if (validFiles.length === 0) {
        toast.error("No valid files selected. Please upload PDF, DOCX, TXT, XLS, XLSX, or CSV files under 10MB.");
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // Filter files to only include allowed types
      const validFiles = Array.from(e.dataTransfer.files).filter(file => {
        const isValidType = ALLOWED_FILE_TYPES.includes(file.type);
        const isValidSize = file.size <= MAX_FILE_SIZE;
        
        if (!isValidType) {
          toast.error(`File type not supported: ${file.name}. Please upload PDF, DOCX, TXT, XLS, XLSX, or CSV files.`);
        } else if (!isValidSize) {
          toast.error(`File too large: ${file.name}. Maximum size is 10MB.`);
        }
        
        return isValidType && isValidSize;
      });
      
      setFiles(validFiles);
      
      if (validFiles.length === 0) {
        toast.error("No valid files selected. Please upload PDF, DOCX, TXT, XLS, XLSX, or CSV files under 10MB.");
      }
    }
  };

  const handleUpload = async () => {
    if (files.length === 0 || !source?.id) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      let successCount = 0;
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        
        try {
          // Upload the file
          const response = await fetch(`/api/knowledge-sources/${source.id}/content`, {
            method: 'POST',
            body: formData,
          });
          
          const responseData = await response.json().catch(() => null);
          
          if (!response.ok) {
            const errorMessage = responseData?.error || `Error uploading ${file.name}`;
            console.error(errorMessage, responseData);
            toast.error(errorMessage);
            continue;
          }
          
          successCount++;
          
          // Update progress
          setUploadProgress(Math.round((i + 1) / files.length * 100));
        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error);
          toast.error(`Failed to upload ${file.name}. Please try again.`);
        }
      }
      
      // Clear the file input
      setFiles([]);
      
      // Refresh the file list
      await fetchExistingFiles();
      
      if (successCount > 0) {
        toast.success(`Successfully uploaded ${successCount} file(s)`);
      } else {
        toast.error("Failed to upload files. Please try again.");
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error("Failed to upload files. Please try again.");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const confirmDeleteFile = (file: FileData) => {
    setFileToDelete(file);
    setDeleteDialogOpen(true);
  };

  const handleDeleteFile = async () => {
    if (!fileToDelete || !source?.id) return;
    
    setIsDeleting(true);
    
    try {
      // Delete the file
      const response = await fetch(`/api/knowledge-sources/${source.id}/content/${fileToDelete.id}?type=file`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error deleting file:', errorText);
        throw new Error(`Failed to delete file: ${response.status} ${response.statusText}`);
      }
      
      // Remove the file from the list
      setExistingFiles(existingFiles.filter(file => file.id !== fileToDelete.id));
      
      toast.success(`Successfully deleted ${fileToDelete.name}`);
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error("Failed to delete file. Please try again.");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setFileToDelete(null);
    }
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return <File className="h-8 w-8 text-red-500" />;
      case 'doc':
      case 'docx':
        return <File className="h-8 w-8 text-indigo-500" />;
      case 'xls':
      case 'xlsx':
        return <File className="h-8 w-8 text-green-500" />;
      case 'csv':
        return <File className="h-8 w-8 text-green-300" />;
      case 'txt':
        return <File className="h-8 w-8 text-gray-500" />;
      default:
        return <File className="h-8 w-8 text-gray-400" />;
    }
  };

  const getStatusIcon = (status: FileStatus['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'uploading':
        return (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600"></div>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <Card className="p-6">
      <div className="space-y-8">
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-gray-50">
            Upload Files
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
            Upload files to this knowledge source. Supported formats include PDF, DOCX, TXT, XLS, XLSX, and CSV.
          </p>
          
          {error && (
            <Alert variant="destructive" className="mt-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm text-red-800 dark:text-red-400">
                {error}
              </AlertDescription>
            </Alert>
          )}
          
          <div 
            className="mt-6 flex justify-center rounded-lg border border-dashed border-gray-300 px-6 py-10 dark:border-gray-800"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div className="text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4 flex text-sm text-gray-500 dark:text-gray-500">
                <label
                  htmlFor="file-upload"
                  className="relative cursor-pointer rounded-md font-semibold text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 hover:text-indigo-500 dark:text-indigo-500 dark:hover:text-indigo-400"
                >
                  <span>Upload a file</span>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    className="sr-only"
                    onChange={handleFileChange}
                    multiple
                    accept={ACCEPTED_FILE_EXTENSIONS}
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                PDF, DOCX, TXT, XLS, XLSX, CSV up to 10MB
              </p>
              
              {files.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Selected files:
                  </p>
                  <ul className="mt-2 text-sm text-gray-500 dark:text-gray-500">
                    {files.map((file, index) => (
                      <li key={index}>{file.name}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {isUploading && (
                <LoadingState text="Uploading files..." className="mt-4" />
              )}
              
              <div className="mt-4">
                <Button
                  onClick={handleUpload}
                  disabled={files.length === 0 || isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : 'Upload'}
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-50">
            Uploaded Files
          </h3>
          
          {isLoading ? (
            <LoadingState text="Loading files..." />
          ) : existingFiles.length > 0 ? (
            <div className="mt-4 space-y-4">
              {existingFiles.map((file) => (
                <div 
                  key={file.id} 
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-800"
                >
                  <div className="flex items-center">
                    {getFileIcon(file.name)}
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        Uploaded on {formatDate(file.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => confirmDeleteFile(file)}
                      title="Delete file"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 flex justify-center items-center py-8 rounded-lg border border-dashed border-gray-300 dark:border-gray-800">
              <div className="text-center">
                <File className="mx-auto h-8 w-8 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  No files uploaded yet
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Upload files using the form above
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete File</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this file? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {fileToDelete && (
            <div className="py-4">
              <p className="text-sm font-medium">{fileToDelete.name}</p>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteFile}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}