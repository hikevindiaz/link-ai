'use server';

import { generateText, Message } from 'ai';
import { cookies } from 'next/headers';

import {
  deleteMessagesByChatIdAfterTimestamp,
  getMessageById,
  updateChatVisiblityById,
} from '@/lib/chat-interface/db/custom-queries';
import { VisibilityType } from '@/components/chat-interface/visibility-selector';
import { myProvider } from '@/lib/chat-interface/ai/providers';

export async function saveChatModelAsCookie(model: string) {
  const cookieStore = await cookies();
  cookieStore.set('chat-model', model);
}

export async function generateTitleFromUserMessage({
  message,
}: {
  message: Message;
}) {
  try {
    const title = await generateText({
      provider: myProvider,
      model: 'title-model',
      prompt: `Create a 3-5 word title for the following message. Reply only with the title. Message: "${message.content}"`,
    });

    return title || 'New Chat';
  } catch (error) {
    console.error('Failed to generate title', error);
    return 'New Chat';
  }
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  const [message] = await getMessageById({ id });

  await deleteMessagesByChatIdAfterTimestamp({
    chatId: message.chatId,
    timestamp: message.createdAt,
  });
}

export async function updateChatVisibility({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: VisibilityType;
}) {
  await updateChatVisiblityById({ chatId, visibility });
}
