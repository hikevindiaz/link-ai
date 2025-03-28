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
import { useKnowledgeBase } from '@/app/(dashboard)/dashboard/knowledge-base/layout';
import { useErrorHandler, ErrorDisplay } from './error-handler';
import { RiAddLine, RiUploadLine, RiDeleteBinLine } from '@remixicon/react';

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

interface PendingFileAction {
  type: 'add' | 'delete';
  file?: File;
  fileId?: string;
  tempId?: string;
}

export default function FileUploadTab({ source, onSave }: FileUploadTabProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [existingFiles, setExistingFiles] = useState<FileData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<FileData | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Use our global state management and error handling
  const { addPendingChange } = useKnowledgeBase();
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

  const handleAddFiles = () => {
    if (files.length === 0 || !source?.id) return;
    
    // For each file, create a temporary ID and add to pending changes
    files.forEach(file => {
      const tempId = `temp-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
      
      // Create pending action
      const pendingAction: PendingFileAction = {
        type: 'add',
        file: file,
        tempId: tempId
      };
      
      // Add to global pending changes
      addPendingChange(source.id, {
        file: pendingAction
      });
      
      // Update local state with a temporary file entry
      const tempFileData: FileData = {
        id: tempId,
        name: file.name,
        knowledgeSourceId: source.id,
        createdAt: new Date().toISOString()
      };
      
      setExistingFiles(prev => [...prev, tempFileData]);
    });
    
    // Clear the selected files
    setFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    // Show success message
    toast.success(`${files.length} file${files.length === 1 ? '' : 's'} added to changes`);
  };

  const confirmDeleteFile = (file: FileData) => {
    setFileToDelete(file);
    setDeleteDialogOpen(true);
  };

  const handleDeleteFile = () => {
    if (!fileToDelete || !source?.id) return;
    
    // Create pending action
    const pendingAction: PendingFileAction = {
      type: 'delete',
      fileId: fileToDelete.id
    };
    
    // Add to global pending changes
    addPendingChange(source.id, {
      file: pendingAction
    });
    
    // Update UI by removing from local state
    setExistingFiles(prev => prev.filter(file => file.id !== fileToDelete.id));
    
    // Close dialog and reset state
    setDeleteDialogOpen(false);
    setFileToDelete(null);
    
    // Show success message
    toast.success("File removal queued for saving");
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
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium mb-2">Add Files</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Upload files to your knowledge source. Supported file types: PDF, DOCX, TXT, XLS, XLSX, CSV.
            </p>
          </div>
          
          <div
            className="border-2 border-dashed p-8 rounded-lg text-center hover:bg-gray-50 dark:hover:bg-gray-900/40 cursor-pointer transition-colors"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              multiple
              className="hidden"
              accept={ACCEPTED_FILE_EXTENSIONS}
              onChange={handleFileChange}
            />
            <div className="mx-auto flex flex-col items-center justify-center gap-1">
              <RiUploadLine className="h-10 w-10 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                <span className="text-primary">Click to upload</span> or drag and drop
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                PDF, DOCX, TXT, XLS, XLSX, CSV (max 10MB per file)
              </p>
            </div>
          </div>
          
          {files.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Selected Files:</h4>
              <ul className="space-y-2">
                {files.map((file, index) => (
                  <li key={index} className="flex items-center justify-between p-2 border rounded-md">
                    <div className="flex items-center">
                      <File className="h-4 w-4 mr-2 text-gray-500" />
                      <span className="text-sm">{file.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFiles(files.filter((_, i) => i !== index));
                      }}
                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
              
              <div className="mt-4 flex justify-end">
                <Button onClick={handleAddFiles} disabled={isUploading || files.length === 0}>
                  <RiAddLine className="mr-2 h-4 w-4" />
                  Add {files.length} File{files.length !== 1 ? 's' : ''}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
      
      <div className="mt-6">
        <h3 className="text-lg font-medium mb-4">Files in Knowledge Source</h3>
        
        {isLoading ? (
          <LoadingState />
        ) : existingFiles.length > 0 ? (
          <div className="space-y-2">
            {existingFiles.map((file) => (
              <Card key={file.id} className="flex items-center justify-between p-4">
                <div className="flex items-center">
                  <File className="h-5 w-5 mr-3 text-gray-500" />
                  <div>
                    <div className="font-medium">{file.name}</div>
                    {file.createdAt && (
                      <div className="text-xs text-gray-500">
                        Added on {formatDate(file.createdAt)}
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => confirmDeleteFile(file)}
                  className="flex items-center gap-1 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950"
                >
                  <RiDeleteBinLine className="h-4 w-4" />
                  <span>Delete</span>
                </Button>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center p-8 border rounded-md border-dashed border-gray-300 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400">No files added yet</p>
          </div>
        )}
      </div>
      
      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete File</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this file? This will remove it from your knowledge source.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 p-4 bg-gray-50 dark:bg-gray-900 rounded-md overflow-hidden text-ellipsis">
            {fileToDelete?.name}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteFile} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Display any errors */}
      <ErrorDisplay />
    </div>
  );
}