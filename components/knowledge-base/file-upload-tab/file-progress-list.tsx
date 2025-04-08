'use client'

import React from 'react';
import { File, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileStatus } from './types';
import FileProgressItem from './file-progress-item';

interface FileProgressListProps {
  pendingFiles: FileStatus[];
  onStartUpload: (fileId: string) => void;
  onStartAllUploads: () => void;
  onRemoveFile: (fileId: string) => void;
}

const FileProgressList: React.FC<FileProgressListProps> = ({ 
  pendingFiles, 
  onStartUpload, 
  onStartAllUploads,
  onRemoveFile 
}) => {
  if (pendingFiles.length === 0) {
    return null;
  }

  // Count files that are in queued state
  const queuedFilesCount = pendingFiles.filter(file => file.status === 'queued').length;
  
  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Uploading Files:</h4>
        {queuedFilesCount > 1 && (
          <Button 
            size="sm" 
            variant="secondary" 
            className="text-xs"
            onClick={onStartAllUploads}
          >
            Start All Uploads
          </Button>
        )}
      </div>
      <ul className="space-y-4">
        {pendingFiles.map((fileStatus) => (
          <li key={fileStatus.id} className="p-3 border rounded-md bg-gray-50 dark:bg-gray-900">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center">
                <File className="h-4 w-4 mr-2 text-gray-500" />
                <span className="text-sm font-medium">{fileStatus.file.name}</span>
              </div>
              {(fileStatus.status === 'error' || fileStatus.status === 'queued') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveFile(fileStatus.id)}
                  className="ml-2 h-6 px-1.5 py-0 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Remove</span>
                </Button>
              )}
            </div>
            <FileProgressItem 
              fileStatus={fileStatus}
              onStartUpload={onStartUpload}
              onRemove={onRemoveFile}
            />
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FileProgressList; 