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
      // Process changes for each source
      for (const [sourceId, sourceChanges] of Object.entries(pendingChanges)) {
        const data = sourceChanges;
        
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
            }
          }
        }
        
        // Process website changes (live search URLs)
        if (data.website) {
          const websiteChanges = Array.isArray(data.website) ? data.website : [data.website];
          
          for (const change of websiteChanges) {
            // Add new website
            if (change.type === 'add' && change.url) {
              const response = await fetch(`/api/knowledge-sources/${sourceId}/website`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  urls: [change.url], // Send as array of URLs to match API schema
                  instructions: change.instructions // Add instructions if provided
                }),
              });
              
              if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to save website URL: ${response.status}`);
              }
            } 
            // Delete website
            else if (change.type === 'delete' && change.websiteId) {
              // Use the website-specific endpoint for deletion
              // The API expects the ID as the final path segment
              const response = await fetch(`/api/knowledge-sources/${sourceId}/website/${change.websiteId}`, {
                method: 'DELETE',
              });
              
              if (!response.ok) {
                throw new Error(`Failed to delete website: ${response.status}`);
              }
            }
          }
        }
        
        // Process text content changes
        if (data.textContent) {
          const textChanges = Array.isArray(data.textContent) ? data.textContent : [data.textContent];
          
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
                throw new Error(errorData.error || `Failed to save text: ${response.status}`);
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