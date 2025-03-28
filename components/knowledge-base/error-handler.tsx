import { useState, useEffect, createContext, useContext } from 'react';
import { toast } from 'sonner';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { RiAlertLine, RiCloseLine } from '@remixicon/react';

// Types of errors that can occur
export type ErrorType = 
  | 'network' 
  | 'permission' 
  | 'validation' 
  | 'fileSize' 
  | 'fileType' 
  | 'vectorStore' 
  | 'api' 
  | 'unknown';

export interface ErrorDetails {
  type: ErrorType;
  message: string;
  details?: string;
  timestamp: Date;
}

interface ErrorHandlerContextType {
  errors: ErrorDetails[];
  addError: (error: Omit<ErrorDetails, 'timestamp'>) => void;
  clearErrors: () => void;
  clearError: (index: number) => void;
}

const ErrorHandlerContext = createContext<ErrorHandlerContextType | undefined>(undefined);

export function useErrorHandler() {
  const context = useContext(ErrorHandlerContext);
  if (!context) {
    throw new Error('useErrorHandler must be used within an ErrorHandlerProvider');
  }
  return context;
}

interface ErrorHandlerProviderProps {
  children: React.ReactNode;
}

export function ErrorHandlerProvider({ children }: ErrorHandlerProviderProps) {
  const [errors, setErrors] = useState<ErrorDetails[]>([]);

  const addError = (error: Omit<ErrorDetails, 'timestamp'>) => {
    // Add timestamp and add to errors
    const newError = { ...error, timestamp: new Date() };
    setErrors(prev => [...prev, newError]);
    
    // Also show as toast for immediate feedback
    toast.error(error.message);
  };

  const clearErrors = () => {
    setErrors([]);
  };

  const clearError = (index: number) => {
    setErrors(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <ErrorHandlerContext.Provider value={{ errors, addError, clearErrors, clearError }}>
      {children}
    </ErrorHandlerContext.Provider>
  );
}

export function ErrorDisplay() {
  const { errors, clearError } = useErrorHandler();

  if (errors.length === 0) return null;

  return (
    <div className="space-y-3 my-4">
      {errors.map((error, index) => (
        <Alert variant="destructive" key={`${error.type}-${index}`}>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <AlertTitle className="flex items-center gap-2">
                <RiAlertLine className="h-4 w-4" />
                {getErrorTitle(error.type)}
              </AlertTitle>
              <AlertDescription>
                {error.message}
                {error.details && (
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {error.details}
                  </div>
                )}
              </AlertDescription>
            </div>
            <button
              onClick={() => clearError(index)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Dismiss error"
            >
              <RiCloseLine className="h-4 w-4" />
            </button>
          </div>
        </Alert>
      ))}
    </div>
  );
}

// Helper function to get a user-friendly title for each error type
function getErrorTitle(type: ErrorType): string {
  switch (type) {
    case 'network':
      return 'Network Error';
    case 'permission':
      return 'Permission Error';
    case 'validation':
      return 'Validation Error';
    case 'fileSize':
      return 'File Size Error';
    case 'fileType':
      return 'File Type Error';
    case 'vectorStore':
      return 'Vector Store Error';
    case 'api':
      return 'API Error';
    case 'unknown':
    default:
      return 'Error';
  }
} 