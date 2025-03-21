import { ArtifactBase } from '@/lib/chat-interface/artifact-base';
import {
  CopyIcon,
  LineChartIcon,
  RedoIcon,
  SparklesIcon,
  UndoIcon,
} from '@/components/chat-interface/icons';
import { SpreadsheetEditor } from '@/components/chat-interface/sheet-editor';
import { parse, unparse } from 'papaparse';
import { toast } from 'sonner';

interface SheetMetadata {
  // Add any sheet-specific metadata properties here
}

export const sheetArtifact = new ArtifactBase<'sheet', SheetMetadata>({
  kind: 'sheet',
  description: 'Useful for working with spreadsheets',
  initialize: async () => {},
  onStreamPart: ({ setArtifact, streamPart }: { 
    setArtifact: (updater: (draft: any) => any) => void;
    streamPart: any;
  }) => {
    if (streamPart.type === 'sheet-delta') {
      setArtifact((draftArtifact: any) => ({
        ...draftArtifact,
        content: streamPart.content as string,
        isVisible: true,
        status: 'streaming',
      }));
    }
  },
  content: ({
    content,
    currentVersionIndex,
    isCurrentVersion,
    onSaveContent,
    status,
  }: {
    content: string;
    currentVersionIndex: number;
    isCurrentVersion: boolean;
    onSaveContent: (content: string, debounce: boolean) => void;
    status: string;
  }) => {
    return (
      <SpreadsheetEditor
        content={content}
        currentVersionIndex={currentVersionIndex}
        isCurrentVersion={isCurrentVersion}
        saveContent={onSaveContent}
        status={status}
      />
    );
  },
  actions: [
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
      icon: <CopyIcon />,
      description: 'Copy as .csv',
      onClick: ({ content }: { content: string }) => {
        const parsed = parse<string[]>(content, { skipEmptyLines: true });

        const nonEmptyRows = parsed.data.filter((row: string[]) =>
          row.some((cell: string) => cell.trim() !== ''),
        );

        const cleanedCsv = unparse(nonEmptyRows);

        navigator.clipboard.writeText(cleanedCsv);
        toast.success('Copied csv to clipboard!');
      },
    },
  ],
  toolbar: [
    {
      description: 'Format and clean data',
      icon: <SparklesIcon />,
      onClick: ({ appendMessage }: { appendMessage: (message: any) => void }) => {
        appendMessage({
          role: 'user',
          content: 'Can you please format and clean the data?',
        });
      },
    },
    {
      description: 'Analyze and visualize data',
      icon: <LineChartIcon />,
      onClick: ({ appendMessage }: { appendMessage: (message: any) => void }) => {
        appendMessage({
          role: 'user',
          content:
            'Can you please analyze and visualize the data by creating a new code artifact in python?',
        });
      },
    },
  ],
});
