import { streamText } from 'ai';
import { myProvider } from '@/lib/chat-interface/ai/providers';
import { createDocumentHandler } from '@/lib/chat-interface/artifacts/server';
import { updateDocumentPrompt } from '@/lib/chat-interface/ai/prompts';

export const textDocumentHandler = createDocumentHandler<'text'>({
  kind: 'text',
  onCreateDocument: async ({ title, dataStream }) => {
    let draftContent = '';

    const stream = await streamText({
      model: myProvider.languageModel('artifact-model'),
      system:
        'Write about the given topic. Markdown is supported. Use headings wherever appropriate.',
      messages: [{ role: 'user', content: title }],
    });

    for await (const chunk of stream) {
      draftContent += chunk;

      dataStream.writeData({
        type: 'text-delta',
        content: chunk,
      });
    }

    return draftContent;
  },
  onUpdateDocument: async ({ document, description, dataStream }) => {
    let draftContent = '';

    const stream = await streamText({
      model: myProvider.languageModel('artifact-model'),
      system: updateDocumentPrompt(document.content, 'text'),
      messages: [{ role: 'user', content: description }],
      stopSequences: ['\n\n\n'],
    });

    for await (const chunk of stream) {
      draftContent += chunk;
      dataStream.writeData({
        type: 'text-delta',
        content: chunk,
      });
    }

    return draftContent;
  },
});
