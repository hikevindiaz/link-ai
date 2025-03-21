import { useState, useEffect } from 'react';
import { FileSearch, FileCheck2, Trash2, User as UserIcon, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/Button";
import { Conversation, Message, getInitials } from "@/types/inbox";
import { ThreadHeader } from "./ThreadHeader";
import { ThreadMessage } from "./ThreadMessage";
import { SummaryDialog } from "./dialogs/SummaryDialog";
import { DeleteConfirmDialog } from "./dialogs/DeleteConfirmDialog";
import { SuccessDialog } from "./dialogs/SuccessDialog";

export function ChatThread({ conversation }: { conversation: Conversation }) {
  const [welcome, setWelcome] = useState("");
  const [threadMessages, setThreadMessages] = useState<Message[]>([]);
  const [isLoadingThread, setIsLoadingThread] = useState(true);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryGenerated, setSummaryGenerated] = useState(false);
  const [summaryTitle, setSummaryTitle] = useState("");
  const [summaryContent, setSummaryContent] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isCheckingSummary, setIsCheckingSummary] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);

  // Check if a summary already exists for this thread
  useEffect(() => {
    const checkExistingSummary = async () => {
      if (!conversation.id) return;
      
      setIsCheckingSummary(true);
      
      try {
        const response = await fetch('/api/inbox/summarize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            threadId: conversation.id,
            checkOnly: true, // Add a flag to indicate we're just checking for existence
          }),
        });

        if (response.ok) {
          const data = await response.json();
          
          // Only set as generated if we have both title and summary with actual content
          if (data.title && data.summary && 
              data.title.trim() !== "" && 
              data.summary.trim() !== "" &&
              data.title !== "Untitled Conversation") {
            setSummaryTitle(data.title);
            setSummaryContent(data.summary);
            setSummaryGenerated(true);
          } else {
            setSummaryGenerated(false);
          }
        } else {
          setSummaryGenerated(false);
        }
      } catch (error) {
        console.error('Error checking for existing summary:', error);
        setSummaryGenerated(false);
      } finally {
        setIsCheckingSummary(false);
      }
    };

    checkExistingSummary();
  }, [conversation.id]);

  useEffect(() => {
    // Reset the thread state immediately when conversation changes.
    setWelcome("");
    setThreadMessages([]);
    setIsLoadingThread(true);
    
    // Don't reset summary state here, as we'll check for existing summaries in the other useEffect

    const fetchThread = async () => {
      const res = await fetch(`/api/inbox/thread?threadId=${conversation.id}`);
      try {
        if (res.ok) {
          const data = await res.json();
          if (data.welcomeMessage !== undefined && data.messages !== undefined) {
            setWelcome(data.welcomeMessage || "");
            setThreadMessages(Array.isArray(data.messages) ? data.messages : [data.messages]);
          } else if (Array.isArray(data)) {
            setThreadMessages(data);
          } else if (data) {
            setThreadMessages([data]);
          } else {
            setThreadMessages([]);
          }
        } else {
          console.error('Failed to fetch thread messages');
          setThreadMessages([]);
        }
      } catch (error) {
        console.error('Error fetching thread messages:', error);
        setThreadMessages([]);
      } finally {
        setIsLoadingThread(false);
      }
    };
    fetchThread();
  }, [conversation.id]);

  const handleDeleteThread = async () => {
    if (!conversation.id) return;
    
    setIsDeleting(true);
    
    try {
      // Call the API to delete the thread
      const response = await fetch('/api/inbox/thread', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ threadId: conversation.id }),
      });
      
      // Close the delete confirmation dialog first
      setDeleteDialogOpen(false);
      
      // Show success dialog
      setTimeout(() => {
        setSuccessDialogOpen(true);
      }, 100);
      
    } catch (error) {
      console.error('Error during thread deletion:', error);
      
      // Close the delete confirmation dialog
      setDeleteDialogOpen(false);
      
      // Still show the success dialog
      setTimeout(() => {
        setSuccessDialogOpen(true);
      }, 100);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSummarize = async () => {
    if (summaryGenerated) {
      // If summary is already generated, just open the dialog
      setDialogOpen(true);
      return;
    }

    setIsSummarizing(true);
    try {
      // Format messages for the API
      const formattedMessages = threadMessages
        .filter(msg => msg.message || msg.response) // Filter out empty messages
        .map(msg => {
          if (msg.from === 'user' && msg.message) {
            return {
              role: 'user',
              content: msg.message
            };
          } else if (msg.response) {
            return {
              role: 'assistant',
              content: msg.response
            };
          }
          return null;
        })
        .filter(Boolean); // Remove any null entries

      // Check if we have any messages to summarize
      if (formattedMessages.length === 0) {
        toast.error("No messages to summarize");
        setIsSummarizing(false);
        return;
      }

      // Warn if the conversation is very long (rough token estimation)
      const estimatedTokens = formattedMessages.reduce((total, msg) => {
        // Since we've filtered for Boolean values above, we know msg is not null here
        return total + ((msg as any).content?.length || 0) / 4; // Rough estimate: 4 chars ≈ 1 token
      }, 0);
      
      if (estimatedTokens > 4000) {
        toast.warning("This is a long conversation. The summary may be incomplete.");
      }

      // Prepare the conversation data for the summary
      const conversationData = {
        threadId: conversation.id,
        title: conversation.title,
        messages: formattedMessages,
        welcomeMessage: welcome
      };

      // Call the API to generate a summary
      const response = await fetch('/api/inbox/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(conversationData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to generate summary');
      }

      // Only set as generated if we have both title and summary with actual content
      if (data.title && data.summary && 
          data.title.trim() !== "" && 
          data.summary.trim() !== "" &&
          data.title !== "Untitled Conversation") {
        setSummaryTitle(data.title);
        setSummaryContent(data.summary);
        setSummaryGenerated(true);
        setDialogOpen(true);
        
        if (data.dbSaveError) {
          // Summary was generated but not saved to DB
          toast.warning('Summary generated but not saved permanently');
        } else {
          toast.success('Summary generated successfully');
        }
      } else {
        throw new Error('Invalid or empty summary generated');
      }
    } catch (error) {
      console.error('Error generating summary:', error);
      toast.error(`Failed to generate summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with metadata */}
      <ThreadHeader 
        conversation={conversation}
        summaryGenerated={summaryGenerated}
        isSummarizing={isSummarizing}
        isCheckingSummary={isCheckingSummary}
        onSummarize={handleSummarize}
        onDelete={() => setDeleteDialogOpen(true)}
      />

      {/* Summary Dialog */}
      <SummaryDialog 
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={summaryTitle}
        content={summaryContent}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onDelete={handleDeleteThread}
        isDeleting={isDeleting}
      />

      {/* Success Dialog */}
      <SuccessDialog 
        open={successDialogOpen} 
        onOpenChange={(open) => {
          setSuccessDialogOpen(open);
          
          // If dialog is being closed, trigger the refresh event
          if (!open) {
            const event = new CustomEvent('inboxThreadDeleted', { 
              detail: { 
                threadId: conversation.id,
                selectNext: true 
              } 
            });
            window.dispatchEvent(event);
          }
        }}
        threadId={conversation.id}
      />

      {/* Conversation area */}
      <div className="p-4 flex-1 overflow-auto flex flex-col space-y-4">
        {isLoadingThread ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600 mb-2"></div>
              <span className="text-sm text-gray-500">Loading conversation...</span>
            </div>
          </div>
        ) : (
          <>
            {/* Render welcome message if it exists */}
            {welcome && (
              <ThreadMessage 
                isUser={false}
                content={welcome}
                avatar={getInitials(conversation.chatbotName)}
              />
            )}

            {threadMessages.length > 0 ? (
              threadMessages.map((msg) => (
                <div key={msg.id} className="w-full space-y-2">
                  {msg.message && (
                    <ThreadMessage 
                      isUser={true}
                      content={msg.message}
                    />
                  )}

                  {msg.response && (
                    <ThreadMessage 
                      isUser={false}
                      content={msg.response}
                      avatar={getInitials(conversation.chatbotName)}
                    />
                  )}
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">No messages in this conversation.</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
} 