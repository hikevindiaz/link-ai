'use client';

import { useState, useContext, createContext } from 'react';
import { SourceSidebar } from '@/components/knowledge-base/source-sidebar';
import { ErrorHandlerProvider } from '@/components/knowledge-base/error-handler';
import { toast } from 'sonner';
import { FloatingActionBar } from "@/components/ui/floating-action-bar";

// Knowledge Base Context
export interface KnowledgeBaseState {
  isDirty: boolean;
  isLoading: boolean;
  isSaving: boolean;
  pendingChanges: Record<string, any>;
  addPendingChange: (sourceId: string, data: any) => void;
  resetPendingChanges: () => void;
  saveAllChanges: () => Promise<void>;
}

const KnowledgeBaseContext = createContext<KnowledgeBaseState | undefined>(undefined);

export const useKnowledgeBase = () => {
  const context = useContext(KnowledgeBaseContext);
  if (!context) {
    throw new Error('useKnowledgeBase must be used within a KnowledgeBaseProvider');
  }
  return context;
};

export default function KnowledgeBaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Global state for managing changes across knowledge sources
  const [pendingChanges, setPendingChanges] = useState<Record<string, any>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Add a pending change for a specific source
  const addPendingChange = (sourceId: string, data: any) => {
    setPendingChanges(prev => ({
      ...prev,
      [sourceId]: {
        ...(prev[sourceId] || {}),
        ...data
      }
    }));
    setIsDirty(true);
  };
  
  // Reset all pending changes
  const resetPendingChanges = () => {
    setPendingChanges({});
    setIsDirty(false);
  };
  
  // Save all pending changes
  const saveAllChanges = async () => {
    if (!isDirty || Object.keys(pendingChanges).length === 0) {
      toast.info("No changes to save");
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Process each source with pending changes
      for (const [sourceId, data] of Object.entries(pendingChanges)) {
        console.log(`Processing changes for source ${sourceId}:`, data);
        
        // Process website changes
        if (data.website) {
          const websiteChanges = Array.isArray(data.website) ? data.website : [data.website];
          for (const change of websiteChanges) {
            if (change.type === 'add' && change.url) {
              const response = await fetch(`/api/knowledge-sources/${sourceId}/website`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  urls: [change.url]
                }),
              });
              
              if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to add website: ${response.status}`);
              }
            } else if (change.type === 'delete' && change.websiteId) {
              const response = await fetch(`/api/knowledge-sources/${sourceId}/website/${change.websiteId}`, {
                method: 'DELETE',
              });
              
              if (!response.ok) {
                throw new Error(`Failed to delete website: ${response.status}`);
              }
            }
          }
        }
        
        // Process QA changes
        if (data.qa) {
          const qaChanges = Array.isArray(data.qa) ? data.qa : [data.qa];
          for (const change of qaChanges) {
            if (change.type === 'add' && change.pair) {
              const response = await fetch(`/api/knowledge-sources/${sourceId}/qa`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify([change.pair]),
              });
              
              if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to add QA pair: ${response.status}`);
              }
            } else if (change.type === 'delete' && change.pairId) {
              const response = await fetch(`/api/knowledge-sources/${sourceId}/qa/${change.pairId}`, {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id: change.pairId }),
              });
              
              if (!response.ok) {
                throw new Error(`Failed to delete QA pair: ${response.status}`);
              }
            }
          }
        }
        
        // Process file changes
        if (data.file) {
          const fileChanges = Array.isArray(data.file) ? data.file : [data.file];
          for (const change of fileChanges) {
            if (change.type === 'add' && change.file) {
              const formData = new FormData();
              formData.append('file', change.file);
              
              const response = await fetch(`/api/knowledge-sources/${sourceId}/content`, {
                method: 'POST',
                body: formData,
              });
              
              if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to upload file: ${response.status}`);
              }
            } else if (change.type === 'delete' && change.fileId) {
              const response = await fetch(`/api/knowledge-sources/${sourceId}/content/${change.fileId}?type=file`, {
                method: 'DELETE',
              });
              
              if (!response.ok) {
                throw new Error(`Failed to delete file: ${response.status}`);
              }
            }
          }
        }
        
        // Process text content changes
        if (data.text) {
          const textChanges = Array.isArray(data.text) ? data.text : [data.text];
          for (const change of textChanges) {
            if (change.type === 'add' && change.content) {
              const response = await fetch(`/api/knowledge-sources/${sourceId}/text-content`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  content: change.content
                }),
              });
              
              if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to add text: ${response.status}`);
              }
            } else if (change.type === 'update' && change.id && change.content) {
              const response = await fetch(`/api/knowledge-sources/${sourceId}/text-content`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  id: change.id,
                  content: change.content
                }),
              });
              
              if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to update text: ${response.status}`);
              }
            } else if (change.type === 'delete' && change.id) {
              const response = await fetch(`/api/knowledge-sources/${sourceId}/text-content/${change.id}`, {
                method: 'DELETE',
              });
              
              if (!response.ok) {
                throw new Error(`Failed to delete text: ${response.status}`);
              }
            }
          }
        }
      }
      
      toast.success('All changes saved successfully');
      resetPendingChanges();
      
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Create context value
  const knowledgeBaseContextValue: KnowledgeBaseState = {
    isDirty,
    isLoading,
    isSaving,
    pendingChanges,
    addPendingChange,
    resetPendingChanges,
    saveAllChanges
  };

  return (
    <ErrorHandlerProvider>
      <KnowledgeBaseContext.Provider value={knowledgeBaseContextValue}>
        <div className="flex h-full">
          {/* Left Sidebar - Always visible */}
          <SourceSidebar />
          
          {/* Main Content Area */}
          <div className="flex-1 overflow-auto relative">
            {children}
            
            {/* Display the floating action bar when changes are pending */}
            {isDirty && (
              <FloatingActionBar
                isSaving={isSaving}
                onSave={saveAllChanges}
                onCancel={resetPendingChanges}
                message={`You have unsaved changes in ${Object.keys(pendingChanges).length} knowledge source(s)`}
              />
            )}
          </div>
        </div>
      </KnowledgeBaseContext.Provider>
    </ErrorHandlerProvider>
  );
} 