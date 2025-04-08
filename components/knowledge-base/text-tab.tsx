'use client';

import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { toast } from "sonner";
import { Source } from './source-sidebar';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, FileText, CheckCircle2, Save, Plus, Trash2, Edit, X, CheckCircle, Brain } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { LoadingState } from '@/components/LoadingState';
import { cn } from '@/lib/utils';
import { RiBrainLine } from '@remixicon/react';
import { useErrorHandler } from './error-handler';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface TextContentTabProps {
  source?: Source;
}

interface TextContent {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  knowledgeSourceId: string;
  openAIFileId?: string | null;
}

// Status tracking for text content operations
interface TextProcessingStatus {
  id: string; // Can be temp ID for new content or actual ID for existing
  content: string;
  status: 'saving' | 'processing' | 'training' | 'complete' | 'error' | 'deleting';
  progress: number;
  error?: string;
  openAIFileId?: string | null;
}

// Function to create a content preview
const getContentPreview = (content: string, maxLength: number = 50): string => {
  if (!content) return 'Empty content';
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength).trim() + '...';
};

// Use named export for the component
export function TextContentTab({ source }: TextContentTabProps) {
  const [textContent, setTextContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [savedTexts, setSavedTexts] = useState<TextContent[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingText, setEditingText] = useState<TextContent | null>(null);
  const [editedContent, setEditedContent] = useState<string>("");
  const [textToDelete, setTextToDelete] = useState<TextContent | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Progress status tracking
  const [processingTexts, setProcessingTexts] = useState<TextProcessingStatus[]>([]);
  
  // Error handling
  const { addError } = useErrorHandler();

  // Fetch existing text content when component mounts or source changes
  useEffect(() => {
    if (source?.id) {
      fetchTextContent();
    }
  }, [source?.id]);

  const fetchTextContent = async () => {
    if (!source?.id) return;
    
    setIsLoading(true);
    
    try {
      // Use the dedicated text-content API endpoint
      const response = await fetch(`/api/knowledge-sources/${source.id}/text-content`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch text content: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Sort by most recent first
      const sortedData = [...data].sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      
      setSavedTexts(sortedData);
    } catch (error) {
      console.error('Error fetching text content:', error);
      addError({
        type: 'network',
        message: 'Failed to load text content',
        details: error instanceof Error ? error.message : undefined
      });
      toast.error("Failed to load your text content. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to update processing status
  const updateTextStatus = (id: string, updates: Partial<TextProcessingStatus>) => {
    // Force a new array reference to ensure React sees the state change
    setProcessingTexts(prev => {
      const newState = prev.map(item => 
        item.id === id 
          ? { ...item, ...updates } 
          : item
      );
      return [...newState]; // Create new array reference
    });
  };

  // Progress stepper utility function to ensure all steps are visible
  const progressStep = async (
    id: string, 
    status: TextProcessingStatus['status'], 
    progress: number, 
    delay: number = 300
  ) => {
    // Create a new promise and use direct state updates to force render
    return new Promise<void>(resolve => {
      setTimeout(() => {
        setProcessingTexts(prev => {
          // Find the item
          const newState = prev.map(item => 
            item.id === id 
              ? { ...item, status, progress } 
              : item
          );
          return [...newState]; // Create new array to force state update
        });
        resolve();
      }, delay);
    });
  };

  const handleAddText = async () => {
    if (!textContent.trim() || !source?.id) {
      toast.error("Please enter some text to add");
      return;
    }
    
    // Create a temporary ID for tracking the status
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Initial status - force a render with an initial state
    setProcessingTexts(prev => [
      ...prev, 
      {
        id: tempId,
        content: textContent,
        status: 'saving',
        progress: 10
      }
    ]);
    
    try {
      // Step 1: Initial progress (10%)
      await progressStep(tempId, 'saving', 10, 300);
      
      // Step 2: Saving to database (30%)
      await progressStep(tempId, 'saving', 30, 300);
      
      // Make API call to save text
      const response = await fetch(`/api/knowledge-sources/${source.id}/text-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: textContent
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to add text: ${response.status} ${response.statusText}`);
      }
      
      const newText = await response.json();
      
      // Step 3: Processing (50%)
      await progressStep(tempId, 'processing', 50, 300);
      
      // Add the new text to the list at the top
      setSavedTexts(prev => [newText, ...prev]);
      
      // Check if we need to process vector store
      if (newText.id && newText.openAIFileId) {
        // Step 4: Training AI (70%)
        await progressStep(tempId, 'training', 70, 300);
        
        try {
          // Process vector store
          const vectorResponse = await fetch(`/api/knowledge-sources/${source.id}/content/${newText.id}/vector`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              openAIFileId: newText.openAIFileId
            }),
          });
          
          if (!vectorResponse.ok) {
            console.warn('Vector processing issue:', await vectorResponse.text());
          }
        } catch (vectorError) {
          console.error('Vector processing error:', vectorError);
          // Continue even with error
        }
      }
      
      // Step 5: Always mark as complete (100%)
      await progressStep(tempId, 'complete', 100, 300);
      
      // Clear the text input
      setTextContent("");
      
      // Show success message
      toast.success("Text content added successfully");
      
      // Remove from processing after delay
      setTimeout(() => {
        setProcessingTexts(prev => prev.filter(item => item.id !== tempId));
      }, 3000);
    } catch (error) {
      console.error('Error adding text:', error);
      
      // Immediately update to error state
      setProcessingTexts(prev => {
        const newState = prev.map(item => 
          item.id === tempId
            ? { 
                ...item, 
                status: 'error' as const, 
                progress: 100,
                error: error instanceof Error ? error.message : 'Failed to add text'
              } 
            : item
        );
        return [...newState];
      });
      
      toast.error("Failed to add text. Please try again.");
    }
  };

  const openEditDialog = (text: TextContent) => {
    setEditingText(text);
    setEditedContent(text.content);
    setEditDialogOpen(true);
  };

  const handleUpdateText = async () => {
    if (!editingText || !editedContent.trim() || !source?.id) {
      toast.error("Please enter some text to save");
      return;
    }
    
    const textId = editingText.id;
    
    // Initial status
    setProcessingTexts(prev => [
      ...prev, 
      {
        id: textId,
        content: editedContent,
        status: 'saving',
        progress: 10
      }
    ]);
    
    // Close the dialog
    setEditDialogOpen(false);
    
    try {
      // Step 1: Start updating (10%)
      await progressStep(textId, 'saving', 10, 300);
      
      // Step 2: Saving to database (30%)
      await progressStep(textId, 'saving', 30, 300);
      
      const response = await fetch(`/api/knowledge-sources/${source.id}/text-content`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: textId,
          content: editedContent
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to update text: ${response.status} ${response.statusText}`);
      }
      
      const updatedText = await response.json();
      
      // Step 3: Processing (50%)
      await progressStep(textId, 'processing', 50, 300);
      
      // Update the text in the list and maintain sort order
      setSavedTexts(prev => {
        const updated = prev.map(text => 
          text.id === textId ? updatedText : text
        );
        return [...updated].sort((a, b) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      });
      
      // Check if we need to process vector store
      if (updatedText.id && updatedText.openAIFileId) {
        // Step 4: Training AI (70%)
        await progressStep(textId, 'training', 70, 300);
        
        try {
          // Process vector store
          const vectorResponse = await fetch(`/api/knowledge-sources/${source.id}/content/${updatedText.id}/vector`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              openAIFileId: updatedText.openAIFileId
            }),
          });
          
          if (!vectorResponse.ok) {
            console.warn('Vector processing issue during update:', await vectorResponse.text());
          }
        } catch (vectorError) {
          console.error('Vector processing error during update:', vectorError);
          // Continue even with error
        }
      }
      
      // Step 5: Always mark as complete (100%)
      await progressStep(textId, 'complete', 100, 300);
      
      // Reset the editing state
      setEditingText(null);
      
      // Show success message
      toast.success("Text content updated successfully");
      
      // Remove from processing after delay
      setTimeout(() => {
        setProcessingTexts(prev => prev.filter(item => item.id !== textId));
      }, 3000);
    } catch (error) {
      console.error('Error updating text:', error);
      
      // Immediately update to error state
      setProcessingTexts(prev => {
        const newState = prev.map(item => 
          item.id === textId
            ? { 
                ...item, 
                status: 'error' as const, 
                progress: 100,
                error: error instanceof Error ? error.message : 'Failed to update text'
              } 
            : item
        );
        return [...newState];
      });
      
      toast.error("Failed to update text. Please try again.");
    }
  };

  const confirmDeleteText = (text: TextContent) => {
    setTextToDelete(text);
    setDeleteDialogOpen(true);
  };

  const handleDeleteText = async () => {
    if (!textToDelete || !source?.id) return;
    
    const textId = textToDelete.id;
    
    // Initial status
    setProcessingTexts(prev => [
      ...prev, 
      {
        id: textId,
        content: textToDelete.content,
        status: 'deleting',
        progress: 10
      }
    ]);
    
    // Close dialog
    setDeleteDialogOpen(false);
    
    try {
      // Step 1: Start deleting (10%)
      await progressStep(textId, 'deleting', 10, 300);
      
      // Step 2: Removing from database (40%)
      await progressStep(textId, 'deleting', 40, 300);
      
      const response = await fetch(`/api/knowledge-sources/${source.id}/text-content/${textId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to delete text: ${response.status}`);
      }
      
      // Step 3: Cleaning up (70%)
      await progressStep(textId, 'processing', 70, 300);
      
      // Remove from list
      setSavedTexts(prev => prev.filter(text => text.id !== textId));
      
      // Step 4: Always mark as complete (100%)
      await progressStep(textId, 'complete', 100, 300);
      
      toast.success("Text deleted successfully");
      
      // Remove from processing after delay
      setTimeout(() => {
        setProcessingTexts(prev => prev.filter(item => item.id !== textId));
      }, 3000);
      
      // Reset state
      setTextToDelete(null);
    } catch (error) {
      console.error('Error deleting text:', error);
      
      // Immediately update to error state
      setProcessingTexts(prev => {
        const newState = prev.map(item => 
          item.id === textId
            ? { 
                ...item, 
                status: 'error' as const, 
                progress: 100,
                error: error instanceof Error ? error.message : 'Failed to delete text'
              } 
            : item
        );
        return [...newState];
      });
      
      toast.error("Failed to delete text. Please try again.");
      setTextToDelete(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Render progress UI for a text content item
  const renderProgressStatus = (item: TextProcessingStatus) => {
    const getStatusText = () => {
      switch (item.status) {
        case 'saving': 
          if (item.progress < 20) return 'Starting to save your content...';
          if (item.progress < 40) return 'Saving text to the database...';
          if (item.progress < 60) return 'Processing your valuable content...';
          return 'Almost there, finalizing your text...';
        case 'processing': 
          if (item.progress < 50) return 'Processing your content...';
          if (item.progress < 75) return 'Analyzing your text for the AI...';
          return 'Final content processing steps...';
        case 'training': 
          if (item.progress < 30) return 'Beginning to train your Agent...';
          if (item.progress < 60) return 'Agent is absorbing your content...';
          if (item.progress < 90) return 'Training nearly complete...';
          return 'Finalizing Agent knowledge update...';
        case 'complete': return 'Operation completed successfully';
        case 'error': return item.error || 'Error occurred';
        case 'deleting':
          if (item.progress < 25) return 'Starting to remove content...';
          if (item.progress < 50) return 'Removing from knowledge base...';
          if (item.progress < 75) return 'Updating Agent memory...';
          return 'Almost done with deletion...';
        default: return 'Processing...';
      }
    };
    
    const getProgressVariant = () => {
      switch (item.status) {
        case 'error': return 'destructive';
        case 'complete': return 'success';
        case 'training': return 'default';
        case 'deleting': return 'default';
        default: return 'default';
      }
    };
    
    const getStatusIcon = () => {
      switch (item.status) {
        case 'saving': return <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />;
        case 'processing': return <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />;
        case 'training': return <RiBrainLine className="h-4 w-4 animate-pulse text-indigo-500" />;
        case 'complete': return <CheckCircle className="h-4 w-4 text-green-500" />;
        case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
        case 'deleting': return <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />;
        default: return <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />;
      }
    };
    
    return (
      <div className="mt-2 space-y-2">
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-1.5">
            {getStatusIcon()}
            <span className={cn(
              item.status === 'error' ? 'text-red-500' : 
              item.status === 'complete' ? 'text-green-600' : 
              'text-indigo-600 dark:text-indigo-400',
              'font-medium'
            )}>
              {getStatusText()}
            </span>
          </div>
          <Badge 
            variant={getProgressVariant() as any}
            className="font-medium"
          >
            {item.progress}%
          </Badge>
        </div>
        
        <Progress 
          value={item.progress} 
          className={cn(
            "h-2",
            item.status === 'error' ? 'bg-red-100 text-red-500' : 
            item.status === 'complete' ? 'bg-green-100 text-green-600' : 
            'bg-indigo-100 text-indigo-600'
          )}
        />
      </div>
    );
  };

  return (
    <Card className="p-6">
      <div className="space-y-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-5 w-5 text-indigo-500" />
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-50">
              Add Text Content
            </h2>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Add text content to this knowledge source. Your Agent will be able to reference this information when responding to queries.
          </p>
          
          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="textContent" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                Content
              </label>
              <Textarea
                id="textContent"
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Enter your text content here..."
                className="min-h-[200px] resize-y"
              />
            </div>
            
            <div className="flex justify-end">
              <Button
                onClick={handleAddText}
                disabled={!textContent.trim()}
                className="flex items-center gap-1.5 bg-black hover:bg-gray-800 text-white"
              >
                <Plus className="h-4 w-4" />
                Add to Knowledge Base
              </Button>
            </div>
          </div>
        </div>
        
        {/* Processing items */}
        {processingTexts.length > 0 && (
          <div className="mt-4">
            <div className="space-y-3">
              {processingTexts.map((item) => (
                <Card key={item.id} className="p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{getContentPreview(item.content, 100)}</div>
                    </div>
                  </div>
                  {renderProgressStatus(item)}
                </Card>
              ))}
            </div>
          </div>
        )}
        
        <div>
          <h3 className="font-medium text-lg text-gray-900 dark:text-gray-50 flex items-center gap-2">
            <RiBrainLine className="h-5 w-5 text-indigo-500" />
            Agent Text Knowledge
          </h3>
          
          {isLoading ? (
            <LoadingState text="Loading your text knowledge..." />
          ) : savedTexts.length > 0 ? (
            <div className="mt-4 grid gap-4">
              {savedTexts.map((text) => (
                <Card 
                  key={text.id} 
                  className="overflow-hidden border-gray-200 dark:border-gray-800 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all duration-200"
                >
                  <div className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Badge variant="secondary" className="text-xs bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">
                            Text
                          </Badge>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Updated {formatDate(text.updatedAt)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {text.content.length > 300 
                            ? `${text.content.substring(0, 300)}...` 
                            : text.content}
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(text)}
                          title="Edit text"
                          className="text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => confirmDeleteText(text)}
                          title="Delete text"
                          className="text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="mt-6 flex justify-center items-center py-12 rounded-lg border border-dashed border-gray-200 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-900/20">
              <div className="text-center">
                <RiBrainLine className="h-12 w-12 text-indigo-300 dark:text-indigo-700 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  No text content saved yet
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 max-w-xs mx-auto">
                  Add text using the form above to enrich your Agent's knowledge
                </p>
                <Button 
                  variant="secondary" 
                  className="mt-4 border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800" 
                  onClick={() => document.getElementById('textContent')?.focus()}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add your first text content
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-4 w-4 text-indigo-500" />
              Edit Text
            </DialogTitle>
            <DialogDescription>
              Update the text content. This will retrain your Agent with the updated information.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Textarea
              id="editedContent"
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              placeholder="Enter your text content here..."
              className="min-h-[200px] resize-y"
            />
          </div>
          
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setEditDialogOpen(false)}
              className="border-gray-200 dark:border-gray-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateText}
              disabled={!editedContent.trim()}
              className="bg-black hover:bg-gray-800 text-white"
            >
              Update & Train Agent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-4 w-4" />
              Delete Text
            </DialogTitle>
            <DialogDescription>
              This will permanently remove this text from your knowledge base and your Agent will no longer have access to this information.
            </DialogDescription>
          </DialogHeader>
          
          {textToDelete && (
            <div className="py-4">
              <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-md border border-red-100 dark:border-red-900">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {textToDelete.content.length > 100 
                    ? `${textToDelete.content.substring(0, 100)}...` 
                    : textToDelete.content}
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteText}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// Also provide a default export that references the named export
export default TextContentTab;