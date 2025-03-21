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
      
      if (data.length === 0) {
        // If no pairs exist, initialize with one empty pair
        setPairs([{ question: '', answer: '' }]);
      } else {
        setPairs(data);
      }
    } catch (error) {
      console.error('Error fetching QA pairs:', error);
      setError('Failed to load QA pairs. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuestionChange = (index: number, value: string) => {
    const newPairs = [...pairs];
    newPairs[index] = { ...newPairs[index], question: value };
    setPairs(newPairs);
  };

  const handleAnswerChange = (index: number, value: string) => {
    const newPairs = [...pairs];
    newPairs[index] = { ...newPairs[index], answer: value };
    setPairs(newPairs);
  };

  const addNewPair = () => {
    setPairs([...pairs, { question: '', answer: '' }]);
  };

  const removePair = (index: number) => {
    const pair = pairs[index];
    if (pair.id) {
      // If the pair has an ID, it exists in the database, so confirm deletion
      setPairToDelete(pair);
      setDeleteDialogOpen(true);
    } else {
      // If the pair doesn't have an ID, just remove it from the state
      const newPairs = pairs.filter((_, i) => i !== index);
      setPairs(newPairs.length > 0 ? newPairs : [{ question: '', answer: '' }]);
    }
  };

  const showSuccessDialog = (title: string, message: string) => {
    setSuccessTitle(title);
    setSuccessMessage(message);
    setSuccessDialogOpen(true);
  };

  const handleSavePairs = async () => {
    if (!source?.id) return;

    // Filter out empty pairs
    const validPairs = pairs.filter(pair => 
      pair.question.trim() !== '' && pair.answer.trim() !== ''
    );

    if (validPairs.length === 0) {
      toast.error("Please enter at least one question and answer pair");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Use the new QA-specific endpoint
      const response = await fetch(`/api/knowledge-sources/${source.id}/qa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validPairs),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to save QA pairs: ${response.status}`);
      }

      const result = await response.json();
      console.log('Save result:', result);

      // Refresh the QA pairs list
      await fetchQAPairs();
      
      // Show success dialog instead of toast
      const pairsCount = validPairs.length;
      showSuccessDialog(
        "QA Pairs Saved Successfully",
        `${pairsCount} question and answer ${pairsCount === 1 ? 'pair has' : 'pairs have'} been saved successfully. These will be used to train your Agent.`
      );
    } catch (error) {
      console.error('Error saving QA pairs:', error);
      setError(error instanceof Error ? error.message : 'Failed to save QA pairs');
      toast.error("Failed to save QA pairs. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePair = async () => {
    if (!pairToDelete?.id || !source?.id) return;
    
    setIsDeleting(true);
    
    try {
      console.log(`Attempting to delete QA pair with ID: ${pairToDelete.id}`);
      
      // Use the correct URL structure for the DELETE endpoint
      const response = await fetch(`/api/knowledge-sources/${source.id}/qa/${pairToDelete.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Delete API response:', errorText);
        throw new Error(`Failed to delete QA pair: ${response.status}`);
      }
      
      // Remove the pair from the state
      setPairs(prevPairs => {
        const newPairs = prevPairs.filter(pair => pair.id !== pairToDelete.id);
        // If no pairs left, add an empty one
        return newPairs.length > 0 ? newPairs : [{ question: '', answer: '' }];
      });
      
      // Show success dialog instead of toast
      showSuccessDialog(
        "QA Pair Deleted Successfully",
        `The question "${pairToDelete.question}" has been deleted successfully.`
      );
    } catch (error) {
      console.error('Error deleting QA pair:', error);
      toast.error("Failed to delete QA pair. Please try again.");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setPairToDelete(null);
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

  return (
    <Card className="p-6">
      <div className="space-y-8">
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-gray-50">
            Question & Answer Pairs
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
            Add question and answer pairs to train your Agent.
          </p>
          
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {isLoading ? (
            <LoadingState text="Loading QA pairs..." />
          ) : (
            <div className="mt-6 space-y-6">
              {pairs.map((pair, index) => (
                <div key={pair.id || index} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-50">
                      Pair #{index + 1}
                    </h3>
                    <div className="flex items-center space-x-2">
                      {pair.id && (
                        <span className="text-xs text-gray-500">
                          Last updated: {formatDate(pair.updatedAt)}
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removePair(index)}
                        title={pair.id ? "Delete pair" : "Remove pair"}
                      >
                        {pair.id ? (
                          <Trash2 className="h-4 w-4 text-red-500" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Question
                      </label>
                      <Textarea
                        value={pair.question}
                        onChange={(e) => handleQuestionChange(index, e.target.value)}
                        placeholder="Enter your question here..."
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Answer
                      </label>
                      <Textarea
                        value={pair.answer}
                        onChange={(e) => handleAnswerChange(index, e.target.value)}
                        placeholder="Enter your answer here..."
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              <div className="flex justify-between items-center pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={addNewPair}
                  className="flex items-center"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Another Pair
                </Button>
                
                <Button
                  onClick={handleSavePairs}
                  disabled={isSaving || pairs.every(pair => !pair.question.trim() && !pair.answer.trim())}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save All Pairs
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete QA Pair</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this question and answer pair? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {pairToDelete && (
            <div className="py-4">
              <p className="text-sm font-medium">{pairToDelete.question}</p>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeletePair}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Success Dialog */}
      <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              {successTitle}
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {successMessage}
            </p>
          </div>
          
          <DialogFooter>
            <Button onClick={() => setSuccessDialogOpen(false)}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
} 