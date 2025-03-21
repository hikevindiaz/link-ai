import { ArtifactBase } from '@/lib/chat-interface/artifact-base';
import { DiffView } from '@/components/chat-interface/diffview';
import { DocumentSkeleton } from '@/components/chat-interface/document-skeleton';
import { Editor } from '@/components/chat-interface/text-editor';
import {
  CopyIcon,
  MessageIcon,
  PenIcon,
  RedoIcon,
  UndoIcon,
} from '@/components/chat-interface/icons';
import { HistoryIcon as ClockRewind } from '@/components/chat-interface/icons';
import { toast } from 'sonner';
import { getSuggestions } from '../actions';

interface Suggestion {
  id: string;
  content: string;
  range?: [number, number];
}

interface TextArtifactMetadata {
  suggestions: Array<Suggestion>;
}

export const textArtifact = new ArtifactBase<'text', TextArtifactMetadata>({
  kind: 'text',
  description: 'Useful for text content, like drafting essays and emails.',
  initialize: async ({ documentId, setMetadata }: { 
    documentId: string; 
    setMetadata: (data: TextArtifactMetadata) => void 
  }) => {
    const suggestions = await getSuggestions({ documentId });

    setMetadata({
      suggestions,
    });
  },
  onStreamPart: ({ streamPart, setMetadata, setArtifact }: { 
    streamPart: any; 
    setMetadata: (updater: (metadata: TextArtifactMetadata) => TextArtifactMetadata) => void;
    setArtifact: (updater: (draft: any) => any) => void;
  }) => {
    if (streamPart.type === 'suggestion') {
      setMetadata((metadata: TextArtifactMetadata) => {
        return {
          suggestions: [
            ...metadata.suggestions,
            streamPart.content as Suggestion,
          ],
        };
      });
    }

    if (streamPart.type === 'text-delta') {
      setArtifact((draftArtifact: any) => {
        return {
          ...draftArtifact,
          content: draftArtifact.content + (streamPart.content as string),
          isVisible:
            draftArtifact.status === 'streaming' &&
            draftArtifact.content.length > 400 &&
            draftArtifact.content.length < 450
              ? true
              : draftArtifact.isVisible,
          status: 'streaming',
        };
      });
    }
  },
  content: ({
    mode,
    status,
    content,
    isCurrentVersion,
    currentVersionIndex,
    onSaveContent,
    getDocumentContentById,
    isLoading,
    metadata,
  }: {
    mode: string;
    status: string;
    content: string;
    isCurrentVersion: boolean;
    currentVersionIndex: number;
    onSaveContent: (content: string, debounce: boolean) => void;
    getDocumentContentById: (index: number) => string;
    isLoading: boolean;
    metadata: TextArtifactMetadata | undefined;
  }) => {
    if (isLoading) {
      return <DocumentSkeleton artifactKind="text" />;
    }

    if (mode === 'diff') {
      const oldContent = getDocumentContentById(currentVersionIndex - 1);
      const newContent = getDocumentContentById(currentVersionIndex);

      return <DiffView oldContent={oldContent} newContent={newContent} />;
    }

    return (
      <>
        <div className="flex flex-row py-8 md:p-20 px-4">
          <Editor
            content={content}
            suggestions={metadata ? metadata.suggestions : []}
            isCurrentVersion={isCurrentVersion}
            currentVersionIndex={currentVersionIndex}
            status={status}
            onSaveContent={onSaveContent}
          />

          {metadata &&
          metadata.suggestions &&
          metadata.suggestions.length > 0 ? (
            <div className="md:hidden h-dvh w-12 shrink-0" />
          ) : null}
        </div>
      </>
    );
  },
  actions: [
    {
      icon: <ClockRewind size={18} />,
      description: 'View changes',
      onClick: ({ handleVersionChange }: { handleVersionChange: (action: string) => void }) => {
        handleVersionChange('toggle');
      },
      isDisabled: ({ currentVersionIndex }: { 
        currentVersionIndex: number; 
        setMetadata?: (data: any) => void;
      }) => {
        if (currentVersionIndex === 0) {
          return true;
        }

        return false;
      },
    },
    {
      icon: <UndoIcon size={18} />,
      description: 'View Previous version',
      onClick: ({ handleVersionChange }: { handleVersionChange: (action: string) => void }) => {
        handleVersionChange('prev');
      },
      isDisabled: ({ currentVersionIndex }: { currentVersionIndex: number }) => {
        if (currentVersionIndex === 0) {
          return true;
        }

        return false;
      },
    },
    {
      icon: <RedoIcon size={18} />,
      description: 'View Next version',
      onClick: ({ handleVersionChange }: { handleVersionChange: (action: string) => void }) => {
        handleVersionChange('next');
      },
      isDisabled: ({ isCurrentVersion }: { isCurrentVersion: boolean }) => {
        if (isCurrentVersion) {
          return true;
        }

        return false;
      },
    },
    {
      icon: <CopyIcon size={18} />,
      description: 'Copy to clipboard',
      onClick: ({ content }: { content: string }) => {
        navigator.clipboard.writeText(content);
        toast.success('Copied to clipboard!');
      },
    },
  ],
  toolbar: [
    {
      icon: <PenIcon />,
      description: 'Add final polish',
      onClick: ({ appendMessage }: { appendMessage: (message: any) => void }) => {
        appendMessage({
          role: 'user',
          content:
            'Please add final polish and check for grammar, add section titles for better structure, and ensure everything reads smoothly.',
        });
      },
    },
    {
      icon: <MessageIcon />,
      description: 'Request suggestions',
      onClick: ({ appendMessage }: { appendMessage: (message: any) => void }) => {
        appendMessage({
          role: 'user',
          content:
            'Please add suggestions you have that could improve the writing.',
        });
      },
    },
  ],
});
