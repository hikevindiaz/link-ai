export interface Source {
  id: string;
  name: string;
  // Other source properties
}

export interface FileData {
  id: string;
  name: string;
  url?: string;
  blobUrl?: string;
  createdAt?: string;
  crawlerId?: string | null;
  knowledgeSourceId?: string | null;
  openAIFileId?: string | null;
}

export interface FileStatus {
  file: File;
  id: string; // Temporary ID for tracking
  status: 'queued' | 'uploading' | 'processing' | 'training' | 'complete' | 'error';
  progress: number;
  error?: string;
  fileId?: string; // Server ID once uploaded
  openAIFileId?: string; // OpenAI File ID once processed
}

// Define allowed file types - prioritize PDF and other easily processed formats
export const ALLOWED_FILE_TYPES = [
  'application/pdf', // PDF
  'text/plain', // TXT
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
  'text/csv', // CSV
];

// File extensions for the file input accept attribute
export const ACCEPTED_FILE_EXTENSIONS = '.pdf,.txt,.docx,.csv,.pptx,.xlsx';

// Maximum file size in bytes (5MB)
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Maximum number of pages for PDF files
export const MAX_PDF_PAGES = 20;

// Maximum number of files allowed (will be updated with billing settings)
export const MAX_FILES = 3;

// Helper function to format file size
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatDate = (dateString?: string) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}; 