'use client'

import React from 'react';
import { File } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RiDeleteBinLine, RiFileLine, RiInformationLine } from '@remixicon/react';
import { FileData, formatDate } from './types';
import { LoadingState } from '@/components/LoadingState';

interface ExistingFilesListProps {
  files: FileData[];
  isLoading: boolean;
  onDeleteFile: (file: FileData) => void;
}

const ExistingFilesList: React.FC<ExistingFilesListProps> = ({ 
  files, 
  isLoading, 
  onDeleteFile 
}) => {
  return (
    <div className="mt-2">
      <h3 className="text-lg font-medium mb-4">Files in Knowledge Source</h3>
      
      {isLoading ? (
        <LoadingState />
      ) : files.length > 0 ? (
        <div className="space-y-2">
          {files.map((file) => (
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
                onClick={() => onDeleteFile(file)}
                className="flex items-center gap-1 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950"
              >
                <RiDeleteBinLine className="h-4 w-4" />
                <span>Delete</span>
              </Button>
            </Card>
          ))}
        </div>
      ) : (
        <div className="mt-6 flex justify-center items-center py-12 rounded-lg border border-dashed border-gray-200 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-900/20">
          <div className="text-center">
            <RiFileLine className="h-12 w-12 text-indigo-300 dark:text-indigo-700 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              No files added yet
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 max-w-xs mx-auto">
              Upload files to add knowledge to your Agent
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExistingFilesList; 