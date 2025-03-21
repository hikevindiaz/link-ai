'use server';

import { getSuggestionsByDocumentId } from '@/lib/chat-interface/db/queries';

export async function getSuggestions({ documentId }: { documentId: string }) {
  const suggestions = await getSuggestionsByDocumentId({ documentId });
  return suggestions ?? [];
}
