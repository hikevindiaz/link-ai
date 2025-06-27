'use client'

import React, { useRef } from 'react';
import { Cloud } from "lucide-react";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MAX_FILES, ACCEPTED_FILE_EXTENSIONS } from './types';
import { cn } from '@/lib/utils';

interface FileUploadFormProps {
  existingFilesCount: number;
  isDragActive: boolean;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const FileUploadForm: React.FC<FileUploadFormProps> = ({
  existingFilesCount,
  isDragActive,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileChange
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMaxFilesReached = existingFilesCount >= MAX_FILES;

  return (
    <div className="space-y-4">
      {/* Show warning if max files reached */}
      {isMaxFilesReached && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Maximum Files Reached
          </AlertTitle>
          <AlertDescription>
            You have reached the maximum of {MAX_FILES} files. Delete some files to upload more.
          </AlertDescription>
        </Alert>
      )}
      
      {/* File upload area */}
      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg py-12 transition-colors",
          isDragActive 
            ? "border-neutral-500 bg-neutral-50/30 dark:bg-neutral-900/20" 
            : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-200 dark:hover:border-neutral-800 bg-neutral-50/30 dark:bg-neutral-900/20",
          isMaxFilesReached && "opacity-50 cursor-not-allowed"
        )}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={isMaxFilesReached ? undefined : onDrop}
        onClick={() => {
          if (!isMaxFilesReached && fileInputRef.current) {
            fileInputRef.current.click();
          }
        }}
      >
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <Cloud className={cn("h-10 w-10", isDragActive ? "text-neutral-500" : "text-neutral-300 dark:text-neutral-700")} />
          <div className="space-y-1">
            <p className="text-sm text-neutral-600 dark:text-neutral-400 font-medium">
              {isDragActive ? "Drop files to upload" : "Drag & drop files or click to upload"}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1 max-w-xs">
              Supported formats: PDF, DOCX, TXT, CSV, PPTX, XLSX (Max 5MB)
            </p>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_FILE_EXTENSIONS}
          onChange={isMaxFilesReached ? undefined : onFileChange}
          className="sr-only"
          multiple
          disabled={isMaxFilesReached}
        />
      </div>
    </div>
  );
};

export default FileUploadForm; 