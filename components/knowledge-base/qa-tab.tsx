'use client';

import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { toast } from "sonner";
import { Source } from './source-sidebar';
import { Button } from '@/components/ui/button';
import { AlertCircle, Save, Plus, Trash2, X, CheckCircle, Loader2 } from 'lucide-react';
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
import { useKnowledgeBase } from '@/app/(dashboard)/dashboard/knowledge-base/layout';
import { RiAddLine, RiDeleteBinLine } from '@remixicon/react';

interface QATabProps {
  source?: Source;
  onSave?: (data: any) => Promise<void>;
}

interface QAPair {
  id?: string;
  question: string;
  answer: string;
  createdAt?: string;
  updatedAt?: string;
}

interface PendingQAAction {
  type: 'add' | 'update' | 'delete';
  pair?: QAPair;
  pairId?: string;
}

export function QATab({ source, onSave }: QATabProps) {
  const [pairs, setPairs] = useState<QAPair[]>([{ question: '', answer: '' }]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pairToDelete, setPairToDelete] = useState<QAPair | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Success dialog state
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [successTitle, setSuccessTitle] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // New state for active pair being edited
  const [currentPair, setCurrentPair] = useState<QAPair>({ question: '', answer: '' });
  
  // Global save state
  const { addPendingChange } = useKnowledgeBase();

  useEffect(() => {
    if (source?.id) {
      fetchQAPairs();
    }
  }, [source?.id]);

  const fetchQAPairs = async () => {
    if (!source?.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Use the new QA-specific endpoint
      const response = await fetch(`/api/knowledge-sources/${source.id}/qa`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch QA pairs: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Fetched QA pairs:', data);
      
      // Set the pairs from API response
      setPairs(data);
      
      // Reset the current pair
      setCurrentPair({ question: '', answer: '' });
    } catch (error) {
      console.error('Error fetching QA pairs:', error);
      setError('Failed to load QA pairs. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuestionChange = (value: string) => {
    setCurrentPair(prev => ({ ...prev, question: value }));
  };

  const handleAnswerChange = (value: string) => {
    setCurrentPair(prev => ({ ...prev, answer: value }));
  };

  const addQAPair = () => {
    // Validate that both question and answer are provided
    if (!currentPair.question.trim() || !currentPair.answer.trim()) {
      toast.error("Please enter both question and answer");
      return;
    }

    if (!source?.id) return;
    
    // Create a temporary ID for optimistic UI updates
    const tempId = `temp-${Date.now()}`;
    const pairToAdd = {
      ...currentPair,
      id: tempId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Add to local state for immediate UI update
    setPairs(prev => [...prev, pairToAdd]);
    
    // Create pending action
    const pendingAction: PendingQAAction = {
      type: 'add',
      pair: currentPair
    };
    
    // Add to global pending changes
    addPendingChange(source.id, {
      qa: pendingAction
    });
    
    // Reset the current pair
    setCurrentPair({ question: '', answer: '' });
    
    // Show success message
    toast.success("QA pair added to changes");
  };

  const confirmDeletePair = (pair: QAPair) => {
    setPairToDelete(pair);
    setDeleteDialogOpen(true);
  };

  const handleDeletePair = () => {
    if (!pairToDelete?.id || !source?.id) return;
    
    // Check if this is a temporary ID (not yet saved to database)
    const isTemporaryItem = pairToDelete.id.startsWith('temp-');
    
    if (isTemporaryItem) {
      // For temporary items, just remove from local state without database operations
      setPairs(prev => prev.filter(pair => pair.id !== pairToDelete.id));
      setDeleteDialogOpen(false);
      setPairToDelete(null);
      toast.success("QA pair removed");
      return;
    }
    
    // Create pending action for items that exist in the database
    const pendingAction: PendingQAAction = {
      type: 'delete',
      pairId: pairToDelete.id
    };
    
    // Add to global pending changes
    addPendingChange(source.id, {
      qa: pendingAction
    });
    
    // Update UI by removing from local state
    setPairs(prev => prev.filter(pair => pair.id !== pairToDelete.id));
    
    // Close dialog and reset state
    setDeleteDialogOpen(false);
    setPairToDelete(null);
    
    // Show success message
    toast.success("QA pair removal queued for saving");
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

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium mb-2">Add Question & Answer Pair</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add question and answer pairs to your knowledge base. These will be used to train your AI.
            </p>
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="question">
                Question
              </label>
              <Textarea
                id="question"
                placeholder="Enter your question here..."
                value={currentPair.question}
                onChange={(e) => handleQuestionChange(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="answer">
                Answer
              </label>
              <Textarea
                id="answer"
                placeholder="Enter the answer here..."
                value={currentPair.answer}
                onChange={(e) => handleAnswerChange(e.target.value)}
                className="min-h-[120px]"
              />
            </div>
            
            <div className="flex justify-end">
              <Button
                onClick={addQAPair}
                disabled={!currentPair.question.trim() || !currentPair.answer.trim()}
              >
                <RiAddLine className="mr-2 h-4 w-4" />
                Add QA Pair
              </Button>
            </div>
          </div>
        </div>
      </Card>
      
      <div className="mt-6">
        <h3 className="text-lg font-medium mb-4">Saved Question & Answer Pairs</h3>
        
        {isLoading ? (
          <LoadingState />
        ) : pairs.length > 0 ? (
          <div className="space-y-4">
            {pairs.map((pair, index) => (
              <Card key={pair.id || index} className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="space-y-1">
                    <h4 className="font-semibold">Question</h4>
                    <p className="whitespace-pre-wrap">{pair.question}</p>
                  </div>
                  <div className="flex">
                    {pair.id && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => confirmDeletePair(pair)}
                        className="flex items-center gap-1 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950"
                      >
                        <RiDeleteBinLine className="h-4 w-4" />
                        <span>Delete</span>
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-1 mt-4">
                  <h4 className="font-semibold">Answer</h4>
                  <p className="whitespace-pre-wrap">{pair.answer}</p>
                </div>
                {pair.createdAt && (
                  <div className="mt-4 pt-2 border-t text-xs text-gray-500">
                    Added on {formatDate(pair.createdAt)}
                  </div>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center p-8 border rounded-md border-gray-300 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400">No QA pairs added yet</p>
          </div>
        )}
      </div>
      
      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete QA Pair</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this question and answer pair? This will remove it from your knowledge source.
            </DialogDescription>
          </DialogHeader>
          {pairToDelete && (
            <div className="mt-2 p-4 bg-gray-50 dark:bg-gray-900 rounded-md overflow-hidden">
              <p className="font-medium">Question:</p>
              <p className="text-sm mt-1 mb-3">{pairToDelete.question}</p>
              <p className="font-medium">Answer:</p>
              <p className="text-sm mt-1">{pairToDelete.answer}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeletePair} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Success dialog */}
      <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              {successTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>{successMessage}</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setSuccessDialogOpen(false)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 