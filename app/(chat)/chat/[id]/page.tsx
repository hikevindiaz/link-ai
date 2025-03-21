import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';

import { auth } from '@/app/(auth)/auth';
import { Chat } from '@/components/chat-interface/chat';
import { getChatById, getMessagesByChatId } from '@/lib/chat-interface/db/custom-queries';
import { convertToUIMessages } from '@/lib/chat-interface/utils';
import { DataStreamHandler } from '@/components/chat-interface/data-stream-handler';
import { DEFAULT_CHAT_MODEL } from '@/lib/chat-interface/ai/models';

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const chat = await getChatById({ id });

  if (!chat) {
    notFound();
  }

  const session = await auth();

  if (chat.visibility === 'private') {
    if (!session || !session.user) {
      return notFound();
    }

    if (session.user.id !== chat.userId) {
      return notFound();
    }
  }

  const messagesFromDb = await getMessagesByChatId({
    id,
  });

  const cookieStore = await cookies();
  const chatModelFromCookie = cookieStore.get('chat-model');

  let chatbotId = 'default';
  if (messagesFromDb.length > 0 && messagesFromDb[0].chatbotId) {
    chatbotId = messagesFromDb[0].chatbotId;
  }

  if (!chatModelFromCookie) {
    return (
      <>
        <Chat
          id={chat.id}
          initialMessages={convertToUIMessages(messagesFromDb)}
          selectedChatModel={DEFAULT_CHAT_MODEL}
          selectedVisibilityType={chat.visibility}
          isReadonly={session?.user?.id !== chat.userId}
          chatbotId={chatbotId}
        />
        <DataStreamHandler id={id} />
      </>
    );
  }

  return (
    <>
      <Chat
        id={chat.id}
        initialMessages={convertToUIMessages(messagesFromDb)}
        selectedChatModel={chatModelFromCookie.value}
        selectedVisibilityType={chat.visibility}
        isReadonly={session?.user?.id !== chat.userId}
        chatbotId={chatbotId}
      />
      <DataStreamHandler id={id} />
    </>
  );
}
