import { useCallback, useEffect, useState } from 'react'
import { useChat, Message } from 'ai/react'
import { nanoid } from 'nanoid'

export type AssistantStatus =
  | 'in_progress'
  | 'awaiting_message'
  | 'awaiting_file'

export interface AssistantStatusResponse {
  status: AssistantStatus
  threadId: string
}

export interface AssistantMessageResponse {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt?: Date
}

export interface AssistantErrorResponse {
  error: string
  message: string
}

export interface UseAssistantOptions {
  id: string
  api: string
  threadId?: string
  inputFile?: File
  clientSidePrompt?: string
}

export function useAssistant({
  id,
  api,
  threadId: initialThreadId,
  inputFile,
  clientSidePrompt
}: UseAssistantOptions) {
  const [status, setStatus] = useState<AssistantStatus>('awaiting_message')
  const [error, setError] = useState<{ message: string } | null>(null)
  const [threadId, setThreadId] = useState<string | undefined>(initialThreadId)
  const [threads, setThreads] = useState<{ id: string, messages: Message[] }[]>([])

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error: chatError,
    append,
    setMessages
  } = useChat({
    api,
    id,
    body: {
      threadId,
      clientSidePrompt
    },
    onResponse: async (response) => {
      const threadIdHeader = response.headers.get('x-thread-id')
      if (threadIdHeader) {
        setThreadId(threadIdHeader)
      }
      
      // Check if the response is not ok and handle the error
      if (!response.ok) {
        try {
          const clonedResponse = response.clone();
          const data = await clonedResponse.json();
          console.error("API error response:", data);
          setError({ message: data.message || "An error occurred while processing your request" });
          setStatus('awaiting_message');
        } catch (err) {
          console.error("Failed to parse error response:", err);
          setError({ message: `Error ${response.status}: ${response.statusText}` });
          setStatus('awaiting_message');
        }
      }
    },
    onError: (err) => {
      console.error("Chat error:", err);
      setStatus('awaiting_message');
      setError(err);
    },
    onFinish: () => {
      setStatus('awaiting_message');
    }
  })

  useEffect(() => {
    if (chatError) {
      console.error("Chat error from useChat:", chatError);
      setError(chatError)
    }
  }, [chatError])

  useEffect(() => {
    if (isLoading) {
      setStatus('in_progress')
    } else {
      setStatus('awaiting_message')
    }
  }, [isLoading])

  useEffect(() => {
    if (threadId) {
      fetchThreads()
    }
  }, [threadId])

  const fetchThreads = useCallback(async () => {
    try {
      const response = await fetch(`/api/chatbots/${id}/threads`)
      if (!response.ok) {
        throw new Error('Failed to fetch threads')
      }
      const data = await response.json()
      setThreads(data)
    } catch (err) {
      console.error('Error fetching threads:', err)
    }
  }, [id])

  const deleteThreadFromHistory = useCallback(async (threadIdToDelete: string) => {
    try {
      const response = await fetch(`/api/chatbots/${id}/threads/${threadIdToDelete}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Failed to delete thread')
      }
      // Update the threads list
      setThreads(prevThreads => prevThreads.filter(thread => thread.id !== threadIdToDelete))
      
      // If the deleted thread is the current one, reset to a new thread
      if (threadId === threadIdToDelete) {
        setThreadId(undefined)
        setMessages([])
      }
    } catch (err) {
      console.error('Error deleting thread:', err)
      setError({ message: 'Failed to delete conversation' })
    }
  }, [id, threadId, setMessages])

  const submitMessage = useCallback(
    async (options: { message?: string } = {}) => {
      if (status === 'in_progress') {
        console.log("Message submission blocked: already in progress");
        return;
      }

      const messageValue = options.message ?? input;

      if (!messageValue && !inputFile) {
        console.log("Message submission blocked: no message or file");
        return;
      }

      console.log(`Submitting message to chatbot ${id}:`, { 
        messageLength: messageValue.length,
        hasFile: !!inputFile,
        threadId
      });

      setStatus('in_progress');
      setError(null);

      let fileId = null;

      if (inputFile) {
        try {
          console.log(`Uploading file: ${inputFile.name} (${inputFile.size} bytes)`);
          
          const formData = new FormData();
          formData.append('file', inputFile);
          formData.append('chatbotId', id);
          formData.append('threadId', threadId || '');

          const uploadResponse = await fetch('/api/chatbots/upload', {
            method: 'POST',
            body: formData
          });

          if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json().catch(() => ({}));
            console.error("File upload error:", errorData);
            throw new Error(errorData.message || 'Failed to upload file');
          }

          const responseData = await uploadResponse.json();
          fileId = responseData.fileId;
          console.log(`File uploaded successfully, fileId: ${fileId}`);
          
          // If we got a threadId from the upload, use it
          if (responseData.threadId && !threadId) {
            setThreadId(responseData.threadId);
            console.log(`Thread created during file upload: ${responseData.threadId}`);
          }
        } catch (err) {
          console.error("File upload error:", err);
          setStatus('awaiting_message');
          setError({ message: err instanceof Error ? err.message : 'Failed to upload file' });
          return;
        }
      }

      const userMessage = {
        id: nanoid(),
        role: 'user' as const,
        content: messageValue
      };

      try {
        console.log(`Appending message to chat:`, {
          threadId,
          hasFileId: !!fileId,
          hasClientSidePrompt: !!clientSidePrompt
        });
        
        await append(userMessage, {
          options: {
            body: {
              threadId,
              fileId,
              clientSidePrompt
            }
          }
        });
        
        console.log("Message appended successfully");
      } catch (err) {
        console.error("Message append error:", err);
        setStatus('awaiting_message');
        setError({ message: err instanceof Error ? err.message : 'Failed to send message' });
      }
    },
    [append, id, input, inputFile, status, threadId, clientSidePrompt]
  );

  return {
    messages,
    threadId,
    input,
    handleInputChange,
    submitMessage,
    status,
    error,
    setThreadId,
    threads,
    deleteThreadFromHistory
  }
}
