import { Message, AssistantMessage, DataMessage } from 'ai';

declare module '@openassistantgpt/ai-wrapper' {
  export * from 'ai';
  export function formatStreamPart(part: any): string;
  export function formatStreamPart(type: string, value: any): string;
} 