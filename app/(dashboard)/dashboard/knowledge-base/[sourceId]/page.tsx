'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { SourceSettings } from '@/components/knowledge-base/source-settings';
import { Source } from '@/components/knowledge-base/source-sidebar';
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
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600"></div>
          <span className="ml-2 text-sm text-gray-500">Loading source...</span>
        </div>
      </div>
    );
  }

  if (!source) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
            Source Not Found
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            The knowledge source you're looking for doesn't exist or you don't have access to it.
          </p>
        </div>
      </div>
    );
  }

  return <SourceSettings source={source} onSave={handleSave} />;
} 