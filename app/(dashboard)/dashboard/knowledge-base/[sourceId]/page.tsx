'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { SourceSettings } from '@/components/knowledge-base/source-settings';
import { Source } from '@/components/knowledge-base/source-sidebar';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RiFileUnknowLine } from '@remixicon/react';
import { useKnowledgeBase } from '../layout';

export default function SourcePage() {
  const params = useParams();
  const sourceId = params?.sourceId as string;
  const [source, setSource] = useState<Source | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { addPendingChange } = useKnowledgeBase();

  useEffect(() => {
    const fetchSource = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/knowledge-sources/${sourceId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch source');
        }
        const data = await response.json();
        setSource(data);
      } catch (error) {
        console.error('Error fetching source:', error);
        toast.error('Failed to load knowledge source');
      } finally {
        setIsLoading(false);
      }
    };

    if (sourceId) {
      fetchSource();
    }
  }, [sourceId]);

  const handleSave = async (data: any) => {
    // Instead of saving directly, add to pending changes
    addPendingChange(sourceId, data);
    toast.success('Changes queued for saving');
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black">
          <div className="flex flex-col items-center max-w-md">
            <Skeleton className="h-10 w-10 rounded-xl mb-4" />
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-3 w-64 mb-6" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-32 rounded-xl" />
              <Skeleton className="h-8 w-24 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!source) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Card className="p-6 bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
          <div className="flex flex-col items-center max-w-md text-center">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
              <RiFileUnknowLine className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
            </div>
            <h1 className="text-sm font-semibold text-black dark:text-white">
              Source Not Found
            </h1>
            <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
              The knowledge source you're looking for doesn't exist or you don't have access to it.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return <SourceSettings source={source} onSave={handleSave} />;
} 