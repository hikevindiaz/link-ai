'use client';

import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { toast } from "sonner";
import { Source } from './source-sidebar';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, FileText, CheckCircle2, Save, Plus, Trash2, Edit, X, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
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

interface TextContentTabProps {
  source?: Source;
  onSave: (data: any) => Promise<void>;
}

interface TextContent {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  knowledgeSourceId: string;
}

// Use named export for the component
export function TextContentTab({ source, onSave }: TextContentTabProps) {
  const [textContent, setTextContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedTexts, setSavedTexts] = useState<TextContent[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingText, setEditingText] = useState<TextContent | null>(null);
  const [editedContent, setEditedContent] = useState<string>("");
  const [textToDelete, setTextToDelete] = useState<TextContent | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Success dialog state
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [successTitle, setSuccessTitle] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

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
      console.log(`Fetching text content for source ID: ${source.id}`);
      
      // Use the dedicated text-content API endpoint
      const response = await fetch(`/api/knowledge-sources/${source.id}/text-content`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch text content: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Text content from API:', data);
      
      // No filtering needed - the API returns only TextContent items
      setSavedTexts(data);
    } catch (error) {
      console.error('Error fetching text content:', error);
      toast.error('Failed to load text content. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to show success dialog
  const showSuccessDialog = (title: string, message: string) => {
    setSuccessTitle(title);
    setSuccessMessage(message);
    setSuccessDialogOpen(true);
  };

  const handleSaveText = async () => {
    if (!textContent.trim() || !source?.id) {
      toast.error("Please enter some text to save");
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Use the dedicated text-content API endpoint
      const response = await fetch(`/api/knowledge-sources/${source.id}/text-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: textContent,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save text: ${response.status} ${response.statusText}`);
      }
      
      const newText = await response.json();
      console.log('New text saved:', newText);
      
      // Add the new text to the list
      setSavedTexts([newText, ...savedTexts]);
      
      // Clear the text input
      setTextContent("");
      
      // Show success dialog instead of toast
      showSuccessDialog(
        "Text Saved Successfully",
        "Your text content has been saved successfully. This will be used to train your Agent."
      );
    } catch (error) {
      console.error('Error saving text:', error);
      toast.error("Failed to save text. Please try again.");
    } finally {
      setIsSaving(false);
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
    
    setIsSaving(true);
    
    try {
      // Use the dedicated text-content API endpoint
      const response = await fetch(`/api/knowledge-sources/${source.id}/text-content`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingText.id,
          content: editedContent,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update text: ${response.status} ${response.statusText}`);
      }
      
      const updatedText = await response.json();
      
      // Update the text in the list
      setSavedTexts(savedTexts.map(text => 
        text.id === editingText.id ? updatedText : text
      ));
      
      // Close the dialog
      setEditDialogOpen(false);
      setEditingText(null);
      
      // Show success dialog instead of toast
      showSuccessDialog(
        "Text Updated Successfully",
        "Your text content has been updated successfully."
      );
    } catch (error) {
      console.error('Error updating text:', error);
      toast.error("Failed to update text. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDeleteText = (text: TextContent) => {
    setTextToDelete(text);
    setDeleteDialogOpen(true);
  };

  const handleDeleteText = async () => {
    if (!textToDelete || !source?.id) return;
    
    setIsDeleting(true);
    
    try {
      console.log(`Attempting to delete text with ID: ${textToDelete.id}`);
      
      // Use the correct URL structure for the DELETE endpoint
      const response = await fetch(`/api/knowledge-sources/${source.id}/text-content/${textToDelete.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Delete API response:', errorText);
        throw new Error(`Failed to delete text: ${response.status} ${response.statusText}`);
      }
      
      // Remove the text from the list
      setSavedTexts(savedTexts.filter(text => text.id !== textToDelete.id));
      
      // Show success dialog instead of toast
      showSuccessDialog(
        "Text Deleted Successfully",
        "The selected text content has been deleted successfully."
      );
    } catch (error) {
      console.error('Error deleting text:', error);
      toast.error("Failed to delete text. Please try again.");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
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

  return (
    <Card className="p-6">
      <div className="space-y-8">
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-gray-50">
            Add Text
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
            Add text content to this knowledge source.
          </p>
          
          <div className="mt-4">
            <Textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Enter your text content here..."
              className="min-h-[200px]"
            />
            
            <div className="mt-4 flex justify-end">
              <Button
                onClick={handleSaveText}
                disabled={!textContent.trim() || isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-50">
            Saved Text Content
          </h3>
          
          {isLoading ? (
            <LoadingState text="Loading text content..." />
          ) : savedTexts.length > 0 ? (
            <div className="mt-4 space-y-4">
              {savedTexts.map((text) => (
                <div 
                  key={text.id} 
                  className="p-4 rounded-lg border border-gray-200 dark:border-gray-800"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 dark:text-gray-500 mb-2">
                        Last updated: {formatDate(text.updatedAt)}
                      </p>
                      <div className="text-sm text-gray-900 dark:text-gray-50 whitespace-pre-wrap">
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
                      >
                        <Edit className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => confirmDeleteText(text)}
                        title="Delete text"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 flex justify-center items-center py-8 rounded-lg border border-dashed border-gray-300 dark:border-gray-800">
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No text content saved yet
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Add text using the form above
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Text</DialogTitle>
            <DialogDescription>
              Update the text content below.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              placeholder="Enter your text content here..."
              className="min-h-[200px]"
            />
          </div>
          
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setEditDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateText}
              disabled={!editedContent.trim() || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Text</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this text? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {textToDelete && (
            <div className="py-4">
              <p className="text-sm font-medium">
                {textToDelete.content.length > 100 
                  ? `${textToDelete.content.substring(0, 100)}...` 
                  : textToDelete.content}
              </p>
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
              onClick={handleDeleteText}
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

// Also provide a default export that references the named export
export default TextContentTab; 