'use client';

import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { toast } from "sonner";
import { Source } from './source-sidebar';
import { Button } from '@/components/ui/button';
import { AlertCircle, Save, Plus, Trash2, X, CheckCircle, Loader2, FileQuestion, Brain } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { LoadingState } from '@/components/LoadingState';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { useErrorHandler, ErrorDisplay } from './error-handler';
import { RiAddLine, RiDeleteBinLine, RiEditLine, RiBrainLine } from '@remixicon/react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface QATabProps {
  source?: Source;
}

interface QAPair {
  id: string;
  question: string;
  answer: string;
  createdAt: string;
  updatedAt: string;
  knowledgeSourceId: string;
  openAIFileId?: string | null;
}

interface QAPairStatus {
  id: string; // Can be a temporary ID for new items or the actual ID for existing items
  question: string;
  answer: string;
  status: 'saving' | 'processing' | 'training' | 'complete' | 'error' | 'deleting';
  progress: number;
  error?: string;
  openAIFileId?: string | null;
}

export default function QATab({ source }: QATabProps) {
  const [qaPairs, setQAPairs] = useState<QAPair[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Form state
  const [formQuestion, setFormQuestion] = useState('');
  const [formAnswer, setFormAnswer] = useState('');
  const [currentPairId, setCurrentPairId] = useState<string | null>(null);
  
  // Status tracking
  const [processingPairs, setProcessingPairs] = useState<QAPairStatus[]>([]);
  
  // Error handling
  const { addError } = useErrorHandler();

  useEffect(() => {
    if (source?.id) {
      fetchQAPairs();
    }
  }, [source?.id]);

  // Add this useEffect to automatically show the add form when there are no QA pairs
  useEffect(() => {
    if (!isLoading && qaPairs.length === 0) {
      setShowAddForm(true);
    }
  }, [isLoading, qaPairs]);

  const fetchQAPairs = async () => {
    if (!source?.id) return;
    
    setIsLoading(true);
    
    try {
      // Use the QA-specific endpoint
      const response = await fetch(`/api/knowledge-sources/${source.id}/qa`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch QA pairs: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Sort by most recent first
      const sortedData = [...data].sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      
      setQAPairs(sortedData);
    } catch (error) {
      console.error('Error fetching QA pairs:', error);
      addError({
        type: 'network',
        message: 'Failed to load existing QA pairs',
        details: error instanceof Error ? error.message : undefined
      });
      toast.error("Failed to load your Q&A content. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Progress stepper utility function to ensure all steps are visible
  const progressStep = async (
    id: string, 
    status: QAPairStatus['status'], 
    progress: number, 
    delay: number = 300
  ) => {
    // Create a new promise and use direct state updates to force render
    return new Promise<void>(resolve => {
      setTimeout(() => {
        setProcessingPairs(prev => {
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

  const handleAddNew = () => {
    // Reset form and show add form
    setFormQuestion('');
    setFormAnswer('');
    setCurrentPairId(null);
    setShowAddForm(true);
    setShowEditForm(false);
  };

  const handleEdit = (pair: QAPair) => {
    // Populate form with existing data and show edit form
    setFormQuestion(pair.question);
    setFormAnswer(pair.answer);
    setCurrentPairId(pair.id);
    setShowEditForm(true);
    setShowAddForm(false);
  };

  const handleCancel = () => {
    // Reset form and hide all forms
    setFormQuestion('');
    setFormAnswer('');
    setCurrentPairId(null);
    setShowAddForm(false);
    setShowEditForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!source?.id) return;
    
    // Validate form
    if (!formQuestion.trim()) {
      toast.error('Please enter a question');
      return;
    }
    
    if (!formAnswer.trim()) {
      toast.error('Please enter an answer');
      return;
    }
    
    // Determine if we're adding or editing
    const isEditing = !!currentPairId;
    
    // Create a temp ID for tracking if adding new
    const tempId = isEditing ? currentPairId : `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Initial status - force a render with an initial state
    setProcessingPairs(prev => [
      ...prev, 
      {
        id: tempId,
        question: formQuestion,
        answer: formAnswer,
        status: 'saving',
        progress: 10
      }
    ]);
    
    // Hide the form
    setShowAddForm(false);
    setShowEditForm(false);
    
    try {
      // Step 1: Initial progress (10%)
      await progressStep(tempId, 'saving', 10, 300);
      
      // Step 2: Saving to database (30%)
      await progressStep(tempId, 'saving', 30, 300);
      
      // Create or update the QA pair
      const url = isEditing 
        ? `/api/knowledge-sources/${source.id}/qa/${currentPairId}`
        : `/api/knowledge-sources/${source.id}/qa`;
      
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          isEditing 
            ? {
                question: formQuestion,
                answer: formAnswer
              }
            : [{ 
                question: formQuestion,
                answer: formAnswer
              }]
        ),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to ${isEditing ? 'update' : 'create'} QA pair: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Step 3: Processing (50%)
      await progressStep(tempId, 'processing', 50, 300);
      
      if (!isEditing) {
        // For creation, process the result
        const result = data.results && data.results[0];
        
        if (result && result.success) {
          // Update pairs list immediately
          fetchQAPairs();
          
          // Step 4: Training AI (70%)
          await progressStep(tempId, 'training', 70, 500);
          
          // Step 5: Complete (100%)
          await progressStep(tempId, 'complete', 100, 300);
        } else {
          throw new Error(result?.error || `Failed to create QA pair`);
        }
      } else {
        // For updates, handle vector processing
        if (data.openAIFileId) {
          // Update pairs list
          fetchQAPairs();
          
          // Step 4: Training AI (70%)
          await progressStep(tempId, 'training', 70, 500);
          
          // Step 5: Complete (100%)
          await progressStep(tempId, 'complete', 100, 300);
        } else {
          // Even without vector processing, mark as complete
          await progressStep(tempId, 'complete', 100, 300);
          
          // Update pairs list
          fetchQAPairs();
        }
      }
      
      // Reset form
      setFormQuestion('');
      setFormAnswer('');
      setCurrentPairId(null);
      
      // Show success message
      toast.success(`Q&A pair ${isEditing ? 'updated' : 'added'} successfully`);
      
      // Remove from processing items after delay
      setTimeout(() => {
        setProcessingPairs(prev => prev.filter(pair => pair.id !== tempId));
      }, 3000);
      
    } catch (error) {
      console.error(`Error ${isEditing ? 'updating' : 'creating'} QA pair:`, error);
      
      // Immediately update to error state
      setProcessingPairs(prev => {
        const newState = prev.map(item => 
          item.id === tempId
            ? { 
                ...item, 
                status: 'error' as const, 
                progress: 100,
                error: error instanceof Error ? error.message : `Failed to ${isEditing ? 'update' : 'create'} QA pair` 
              } 
            : item
        );
        return [...newState];
      });
      
      toast.error(`Error ${isEditing ? 'updating' : 'adding'} QA pair: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const confirmDelete = (pair: QAPair) => {
    setCurrentPairId(pair.id);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!currentPairId || !source?.id) return;
    
    // Find the pair to delete
    const pairToDelete = qaPairs.find(pair => pair.id === currentPairId);
    if (!pairToDelete) return;
    
    const pairId = currentPairId;
    
    // Initial status
    setProcessingPairs(prev => [
      ...prev, 
      {
        id: pairId,
        question: pairToDelete.question,
        answer: pairToDelete.answer,
        status: 'deleting',
        progress: 10
      }
    ]);
    
    // Close dialog
    setDeleteDialogOpen(false);
    
    try {
      // Step 1: Start deleting (10%)
      await progressStep(pairId, 'deleting', 10, 300);
      
      // Step 2: Removing from database (40%)
      await progressStep(pairId, 'deleting', 40, 300);
      
      // Delete from the API
      const response = await fetch(`/api/knowledge-sources/${source.id}/qa/${pairId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to delete QA pair: ${response.status}`);
      }
      
      // Update UI by removing from local state
      setQAPairs(prev => prev.filter(pair => pair.id !== pairId));
      
      // Step 3: Cleaning up vector store (70%)
      await progressStep(pairId, 'processing', 70, 300);
      
      // Step 4: Mark as complete (100%)
      await progressStep(pairId, 'complete', 100, 300);
      
      // Show success message
      toast.success(`Q&A has been removed from your knowledge base`);
      
      // Remove from processing items after delay
      setTimeout(() => {
        setProcessingPairs(prev => prev.filter(pair => pair.id !== pairId));
      }, 3000);
      
      // Reset state
      setCurrentPairId(null);
    } catch (error) {
      console.error('Error deleting QA pair:', error);
      
      // Immediately update to error state
      setProcessingPairs(prev => {
        const newState = prev.map(item => 
          item.id === pairId
            ? { 
                ...item, 
                status: 'error' as const, 
                progress: 100,
                error: error instanceof Error ? error.message : 'Failed to delete QA pair' 
              } 
            : item
        );
        return [...newState];
      });
      
      toast.error(`Error deleting Q&A: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setCurrentPairId(null);
    }
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

  // Function to truncate text with ellipsis
  const truncateText = (text: string, maxLength: number): string => {
    if (!text) return 'No content';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  // Render progress UI for a QA pair
  const renderPairProgress = (pair: QAPairStatus) => {
    const getStatusText = () => {
      switch (pair.status) {
        case 'saving': 
          if (pair.progress < 20) return 'Starting the saving process...';
          if (pair.progress < 40) return 'Saving your knowledge to the database...';
          if (pair.progress < 60) return 'Processing your Q&A content...';
          return 'Almost there, finalizing your content...';
        case 'processing': 
          if (pair.progress < 60) return 'Processing your content...';
          if (pair.progress < 80) return 'Preparing your knowledge for the AI...';
          return 'Almost done processing...';
        case 'training': 
          if (pair.progress < 80) return 'Training your Agent with this knowledge...';
          if (pair.progress < 95) return 'Agent is learning from your Q&A...';
          return 'Finalizing Agent training...';
        case 'complete': return 'Operation completed successfully';
        case 'error': return pair.error || 'Error occurred';
        case 'deleting':
          if (pair.progress < 20) return 'Starting deletion process...';
          if (pair.progress < 40) return 'Removing from your knowledge base...';
          if (pair.progress < 70) return 'Cleaning up AI memory...';
          return 'Almost done, finalizing deletion...';
        default: return 'Processing...';
      }
    };
    
    const getProgressVariant = () => {
      switch (pair.status) {
        case 'error': return 'destructive';
        case 'complete': return 'success';
        case 'training': return 'default';
        case 'deleting': return 'default';
        default: return 'default';
      }
    };
    
    const getStatusIcon = () => {
      switch (pair.status) {
        case 'saving': return <Loader2 className="h-4 w-4 animate-spin text-neutral-500" />;
        case 'processing': return <Loader2 className="h-4 w-4 animate-spin text-neutral-500" />;
        case 'training': return <RiBrainLine className="h-4 w-4 animate-pulse text-neutral-500" />;
        case 'complete': return <CheckCircle className="h-4 w-4 text-green-500" />;
        case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
        case 'deleting': return <Loader2 className="h-4 w-4 animate-spin text-neutral-500" />;
        default: return <Loader2 className="h-4 w-4 animate-spin text-neutral-500" />;
      }
    };
    
    return (
      <div className="mt-2 space-y-2">
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-1.5">
            {getStatusIcon()}
            <span className={cn(
              pair.status === 'error' ? 'text-red-500' : 
              pair.status === 'complete' ? 'text-green-600' : 
              'text-neutral-600 dark:text-neutral-400',
              'font-medium'
            )}>
              {getStatusText()}
            </span>
          </div>
          <Badge 
            variant={getProgressVariant() as any}
            className="font-medium"
          >
            {pair.progress}%
          </Badge>
        </div>
        
        <Progress 
          value={pair.progress} 
          className={cn(
            "h-2",
            pair.status === 'error' ? 'bg-red-100 text-red-500' : 
            pair.status === 'complete' ? 'bg-green-100 text-green-600' : 
            'bg-neutral-100 text-neutral-600'
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
            <FileQuestion className="h-5 w-5 text-neutral-500" />
            <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-50">
              Add Q&A Content
            </h2>
          </div>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Add question and answer pairs to your knowledge source. Your Agent will use these to provide more accurate and specific answers.
          </p>
          
          {/* Add new Q&A button - only show if there are existing QA pairs */}
          {!showAddForm && !showEditForm && qaPairs.length > 0 && (
            <div className="flex justify-center mt-6">
              <Button 
                onClick={handleAddNew} 
                className="flex items-center gap-1.5 w-full"
                variant="secondary"
              >
                <Plus className="h-4 w-4" />
                Add New Q&A Pair
              </Button>
            </div>
          )}
          
          {/* Add/Edit form - show by default if no pairs exist */}
          {((showAddForm || showEditForm) || (!showEditForm && qaPairs.length === 0 && !isLoading)) && (
            <div className="mt-4 border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 bg-neutral-50/30 dark:bg-neutral-900/20">
              <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="text-lg font-medium mb-2 flex items-center gap-2 text-neutral-900 dark:text-neutral-100">
                  {showEditForm ? (
                    <>
                      <RiEditLine className="h-4 w-4" />
                      Edit Q&A Pair
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      New Q&A Pair
                    </>
                  )}
                </h3>
                
                <div className="space-y-2">
                  <label htmlFor="question" className="block text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    Question
                  </label>
                  <div className="space-y-2">
                    <Textarea
                      id="question"
                      value={formQuestion}
                      onChange={(e) => setFormQuestion(e.target.value)}
                      placeholder="Enter a question that your Agent should answer"
                      rows={2}
                      required
                      className="resize-y"
                      maxLength={200}
                    />
                    <div className="flex justify-end">
                      <span className="text-xs text-neutral-500">
                        {formQuestion.length}/200
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="answer" className="block text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    Answer
                  </label>
                  <div className="space-y-2">
                    <Textarea
                      id="answer"
                      value={formAnswer}
                      onChange={(e) => setFormAnswer(e.target.value)}
                      placeholder="Enter the precise answer your Agent should provide"
                      rows={4}
                      required
                      className="resize-y"
                      maxLength={1000}
                    />
                    <div className="flex justify-end">
                      <span className="text-xs text-neutral-500">
                        {formAnswer.length}/1,000
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={handleCancel}
                    className="border-neutral-200 dark:border-neutral-800"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    className="bg-black hover:bg-neutral-700 text-white"
                  >
                    {showEditForm ? (
                      <>Update & Train Agent</>
                    ) : (
                      <>Save & Train Agent</>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
        
        {/* Processing pairs */}
        {processingPairs.length > 0 && (
          <div className="mt-4">
            <div className="space-y-3">
              {processingPairs.map((pair) => (
                <Card key={pair.id} className="p-4 border border-neutral-200 dark:border-neutral-800 shadow-sm">
                  <div>
                    <h4 className="font-medium text-neutral-900 dark:text-neutral-100">{pair.question}</h4>
                    <div className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                      {truncateText(pair.answer, 150)}
                    </div>
                  </div>
                  {renderPairProgress(pair)}
                </Card>
              ))}
            </div>
          </div>
        )}
        
        {/* List of existing QA pairs */}
        <div>
          <h3 className="font-medium text-lg text-neutral-900 dark:text-neutral-50 flex items-center gap-2">
            <RiBrainLine className="h-5 w-5 text-neutral-500" />
            Agent Knowledge Q&A
          </h3>
          
          {isLoading ? (
            <LoadingState text="Loading your Q&A knowledge..." />
          ) : qaPairs.length > 0 ? (
            <div className="mt-4 grid gap-4">
              {qaPairs.map((pair) => (
                <Card 
                  key={pair.id} 
                  className="overflow-hidden border-neutral-200 dark:border-neutral-800 hover:border-neutral-200 dark:hover:border-neutral-800 transition-all duration-200"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Badge variant="secondary" className="text-xs bg-neutral-50 dark:bg-neutral-950 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800">
                            Q&A
                          </Badge>
                          <span className="text-xs text-neutral-500 dark:text-neutral-400">
                            Updated {formatDate(pair.updatedAt)}
                          </span>
                        </div>
                        
                        <h4 className="font-medium text-neutral-900 dark:text-neutral-100">{pair.question}</h4>
                        <div className="mt-2 text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                          {pair.answer}
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(pair)}
                          title="Edit Q&A"
                          className="text-neutral-500 hover:text-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-950"
                        >
                          <RiEditLine className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => confirmDelete(pair)}
                          title="Delete Q&A"
                          className="text-neutral-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
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
            <div className="mt-6 flex justify-center items-center py-12 rounded-lg border border-dashed border-neutral-200 dark:border-neutral-800 bg-neutral-50/30 dark:bg-neutral-900/20">
              <div className="text-center">
                <Brain className="h-12 w-12 text-neutral-300 dark:text-neutral-700 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                  No Q&A pairs saved yet
                </h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2 max-w-xs mx-auto">
                  Add Q&A pairs to teach your Agent specific questions and answers
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-4 w-4" />
              Delete Q&A Pair
            </DialogTitle>
            <DialogDescription>
              This will permanently remove this Q&A pair from your knowledge base and your Agent will no longer have access to this information.
            </DialogDescription>
          </DialogHeader>
          
          {currentPairId && (
            <div className="py-4">
              <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-100 dark:border-red-900">
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  {qaPairs.find(pair => pair.id === currentPairId)?.question}
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setDeleteDialogOpen(false)}
              className="border-neutral-200 dark:border-neutral-800"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
} 