'use client'

import React from 'react';
import { FileStatus } from './types';
import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils';
import { Upload, UploadCloud, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { RiBrainLine } from '@remixicon/react';

interface FileProgressItemProps {
  fileStatus: FileStatus;
  onStartUpload: (fileId: string) => void;
  onRemove: (fileId: string) => void;
}

const FileProgressItem: React.FC<FileProgressItemProps> = ({ 
  fileStatus, 
  onStartUpload,
  onRemove 
}) => {
  const getStatusText = () => {
    switch (fileStatus.status) {
      case 'queued': return 'Ready to upload';
      case 'uploading': return 'Uploading file...';
      case 'processing': return 'Processing content...';
      case 'training': return 'Training your agent...';
      case 'complete': return 'Complete';
      case 'error': return fileStatus.error || 'Error occurred';
      default: return 'Processing...';
    }
  };
  
  const getStatusIcon = () => {
    switch (fileStatus.status) {
      case 'queued': return <Upload className="h-4 w-4 text-neutral-500" />;
      case 'uploading': return <UploadCloud className="h-4 w-4 animate-pulse text-neutral-500" />;
      case 'processing': return <Loader2 className="h-4 w-4 animate-spin text-neutral-500" />;
      case 'training': return <RiBrainLine className="h-4 w-4 animate-pulse text-purple-500" />;
      case 'complete': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Loader2 className="h-4 w-4 animate-spin text-neutral-500" />;
    }
  };
  
  // Determine progress indicator color based on status
  const indicatorColor = fileStatus.status === 'error' 
    ? 'bg-red-500' 
    : fileStatus.status === 'complete' 
      ? 'bg-green-500' 
      : fileStatus.status === 'uploading'
        ? 'bg-neutral-500'
        : fileStatus.status === 'training'
          ? 'bg-purple-500'
          : 'bg-neutral-500';
  
  // Ensure minimum progress for visibility
  const displayProgress = fileStatus.progress < 5 && fileStatus.status !== 'error' && fileStatus.status !== 'queued' ? 5 : fileStatus.progress;
  
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex justify-between items-center text-xs">
        <div className="flex items-center gap-1.5">
          {getStatusIcon()}
          <span className={cn(
            fileStatus.status === 'error' ? 'text-red-500' : 
            fileStatus.status === 'complete' ? 'text-green-600' : 
            'text-neutral-600',
            'font-medium'
          )}>
            {getStatusText()}
          </span>
        </div>
        {fileStatus.status === 'queued' ? (
          <Button 
            size="sm" 
            variant="secondary" 
            className="h-6 px-2 py-0 text-xs"
            onClick={() => onStartUpload(fileStatus.id)}
          >
            Start Upload
          </Button>
        ) : (
          <span className={cn(
            fileStatus.status === 'error' ? 'text-red-500' : 
            fileStatus.status === 'complete' ? 'text-green-600' : 
            'text-neutral-600',
            'font-medium'
          )}>
            {displayProgress}%
          </span>
        )}
      </div>
      {fileStatus.status !== 'queued' && (
        <div className={`relative h-2 w-full overflow-hidden rounded-full ${fileStatus.status === 'error' ? 'bg-red-100 dark:bg-red-950/30' : 'bg-neutral-100 dark:bg-neutral-800'}`}>
          <div 
            className={`h-full transition-all ${indicatorColor}`}
            style={{ width: `${displayProgress}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default FileProgressItem; 