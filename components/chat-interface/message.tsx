'use client';

import type { Message } from 'ai';
import cx from 'classnames';
import { AnimatePresence, motion } from 'framer-motion';
import { memo, useState } from 'react';
import { DocumentToolCall, DocumentToolResult } from '@/components/chat-interface/document';
import { PencilEditIcon, SparklesIcon } from '@/components/chat-interface/icons';
import { Markdown } from '@/components/chat-interface/markdown';
import { MessageActions } from '@/components/chat-interface/message-actions';
import { PreviewAttachment } from '@/components/chat-interface/preview-attachment';
import { Weather } from '@/components/chat-interface/weather';
import { FlightCard } from '@/components/chat-interface/flight-card';
import equal from 'fast-deep-equal';
import { cn } from '@/lib/chat-interface/utils';
import { Button } from '@/components/chat-interface/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/chat-interface/ui/tooltip';
import { MessageEditor } from '@/components/chat-interface/message-editor';
import { DocumentPreview } from '@/components/chat-interface/document-preview';
import { MessageReasoning } from '@/components/chat-interface/message-reasoning';
import RiveGlint from '@/components/chat-interface/rive-glint';
import { ShimmerText, ShimmerStyles } from '@/components/chat-interface/shimmer-text';
import { getStatusMessage, getToolNameFromInvocation } from '@/components/chat-interface/message-status-utils';
import { ProgressiveThinking } from '@/components/chat-interface/progressive-thinking';

const PurePreviewMessage = ({
  chatId,
  message,
  isLoading,
  setMessages,
  reload,
  isReadonly,
}: {
  chatId: string;
  message: Message;
  isLoading: boolean;
  setMessages: (
    messages: Message[] | ((messages: Message[]) => Message[]),
  ) => void;
  reload: (
    options?: any
  ) => Promise<string | null | undefined>;
  isReadonly: boolean;
}) => {
  const [mode, setMode] = useState<'view' | 'edit'>('view');

  return (
    <AnimatePresence>
      <motion.div
        data-testid={`message-${message.role}`}
        className="w-full mx-auto max-w-3xl px-4 group/message"
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        data-role={message.role}
      >
        <div
          className={cn(
            'flex gap-4 w-full',
            message.role === 'user' ? 'justify-end' : '',
            {
              'w-full': mode === 'edit',
            },
          )}
        >
          {message.role === 'assistant' && (
            <div className="text-black size-8 flex items-center justify-center shrink-0">
              {isLoading ? (
                <RiveGlint 
                  isSpeaking={true}
                  className="w-8 h-8"
                />
              ) : (
                <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border bg-neutral-100 dark:bg-white">
              <div className="translate-y-px">
                <SparklesIcon size={14} />
              </div>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-4 w-full">
            {message.experimental_attachments && (
              <div
                data-testid={`message-attachments`}
                className="flex flex-row justify-end gap-2"
              >
                {message.experimental_attachments.map((attachment) => (
                  <PreviewAttachment
                    key={attachment.url}
                    attachment={attachment}
                  />
                ))}
              </div>
            )}

            {message.reasoning && (
              <MessageReasoning
                isLoading={isLoading}
                reasoning={message.reasoning}
              />
            )}

            {(message.content || message.reasoning) && mode === 'view' && (
              <div
                data-testid="message-content"
                className="flex flex-row gap-2 items-start w-full max-w-2xl"
              >
                <div
                  className={cn(
                    'flex flex-col gap-4',
                    'px-2 h-fit py-2 rounded-xl break-words',
                    message.role === 'user'
                      ? 'bg-black text-white dark:bg-white dark:text-black ml-auto max-w-[90%]'
                      : 'bg-white-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100'
                  )}
                >
                  <Markdown>{message.content}</Markdown>
                </div>
              </div>
            )}

            {message.content && mode === 'edit' && (
              <MessageEditor
                message={message}
                setMessages={setMessages}
                reload={reload}
                setMode={setMode}
              />
            )}

            {message.toolInvocations && message.toolInvocations.length > 0 && (
              <div className="flex flex-col gap-4">
                {message.toolInvocations.map((toolInvocation) => {
                  const { toolName, toolCallId, state, args } = toolInvocation;

                  if (state === 'result') {
                    const { result } = toolInvocation;

                    return (
                      <div key={toolCallId}>
                        {toolName === 'getWeather' ? (
                          <Weather weatherAtLocation={result.ui?.type === 'weather-card' ? result.ui.data : result} />
                        ) : toolName === 'aviationstack' ? (
                          <div className="flex flex-col gap-3">
                            {(() => {
                              // Use UI structure if available, otherwise fall back to data
                              const flightsToRender = result.ui?.type === 'flight-cards' && result.ui.flights 
                                ? result.ui.flights 
                                : result.data || [];
                              
                              // Remove duplicates based on flight number, date, AND departure time
                              const uniqueFlights = flightsToRender.reduce((acc: any[], flight: any) => {
                                // Create a unique key that includes flight number, date, and departure time
                                const departureTime = flight.departure?.scheduled || flight.departure?.actual || '';
                                const key = `${flight.flight?.iata || ''}-${flight.flight_date || ''}-${departureTime}`;
                                
                                const exists = acc.some(f => {
                                  const fDepartureTime = f.departure?.scheduled || f.departure?.actual || '';
                                  return `${f.flight?.iata || ''}-${f.flight_date || ''}-${fDepartureTime}` === key;
                                });
                                
                                if (!exists) {
                                  acc.push(flight);
                                }
                                return acc;
                              }, []);
                              
                              if (uniqueFlights.length > 0) {
                                return uniqueFlights.map((flight: any, index: number) => (
                                  <FlightCard key={`flight-${index}`} flightData={flight} />
                                ));
                              } else {
                                // Don't show raw JSON - just return null to let the text message handle it
                                return null;
                              }
                            })()}
                          </div>
                        ) : toolName === 'createDocument' ? (
                          <DocumentPreview
                            isReadonly={isReadonly}
                            result={result}
                          />
                        ) : toolName === 'updateDocument' ? (
                          <DocumentToolResult
                            type="update"
                            result={result}
                            isReadonly={isReadonly}
                          />
                        ) : toolName === 'requestSuggestions' ? (
                          <DocumentToolResult
                            type="request-suggestions"
                            result={result}
                            isReadonly={isReadonly}
                          />
                        ) : (
                          <pre>{JSON.stringify(result, null, 2)}</pre>
                        )}
                      </div>
                    );
                  }
                  return (
                    <div
                      key={toolCallId}
                      className={cx({
                        skeleton: ['getWeather', 'aviationstack'].includes(toolName),
                      })}
                    >
                      {toolName === 'getWeather' ? (
                        <Weather />
                      ) : toolName === 'aviationstack' ? (
                        <div className="flex flex-col gap-3">
                          <FlightCard />
                        </div>
                      ) : toolName === 'createDocument' ? (
                        <DocumentPreview isReadonly={isReadonly} args={args} />
                      ) : toolName === 'updateDocument' ? (
                        <DocumentToolCall
                          type="update"
                          args={args}
                          isReadonly={isReadonly}
                        />
                      ) : toolName === 'requestSuggestions' ? (
                        <DocumentToolCall
                          type="request-suggestions"
                          args={args}
                          isReadonly={isReadonly}
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}

            {!isReadonly && (
              <MessageActions
                key={`action-${message.id}`}
                chatId={chatId}
                message={message}
                isLoading={isLoading}
              />
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export const PreviewMessage = memo(PurePreviewMessage, (prevProps, nextProps) => {
  if (!equal(prevProps.message, nextProps.message)) return false;
  if (prevProps.isLoading !== nextProps.isLoading) return false;
  
  return true;
});

// Check if a user message is actually a request vs just a conversational response
const isActualRequest = (query: string): boolean => {
  const trimmed = query.toLowerCase().trim();
  
  // Short responses that are clearly not requests
  const conversationalResponses = [
    'ok', 'okay', 'yes', 'yeah', 'yep', 'sure', 'no', 'nope', 'thanks', 'thank you', 
    'good', 'great', 'perfect', 'nice', 'cool', 'awesome', 'got it', 'understood',
    'right', 'correct', 'exactly', 'true', 'false', 'maybe', 'perhaps', 'hi', 
    'hello', 'hey', 'bye', 'goodbye', 'see you', 'later', 'lol', 'haha', 'hmm',
    'interesting', 'wow', 'amazing', 'wonderful', 'excellent', 'fine', 'alright'
  ];
  
  // Check if it's just a short conversational response
  if (conversationalResponses.includes(trimmed)) {
    return false;
  }
  
  // Check if it's just punctuation or very short (likely not a real request)
  if (trimmed.length < 3 || /^[!@#$%^&*(),.?":{}|<>]*$/.test(trimmed)) {
    return false;
  }
  
  return true;
};

// Detect if a query should use progressive thinking (multi-step process)
const shouldUseProgressiveThinking = (userQuery?: string): boolean => {
  if (!userQuery || !isActualRequest(userQuery)) return false;
  
  const query = userQuery.toLowerCase().trim();
  
  // Don't use progressive thinking for very short queries
  if (query.length < 10) return false;
  
  // Always use progressive thinking for queries longer than a simple request
  return true;
};

export const ThinkingMessage = ({ 
  toolInvocations, 
  isStreaming = false,
  userQuery,
  agentId
}: { 
  toolInvocations?: any[], 
  isStreaming?: boolean,
  userQuery?: string,
  agentId?: string
}) => {
  const role = 'assistant';
  
  // Determine the current tool being used
  const currentTool = getToolNameFromInvocation(toolInvocations);
  
  // Use progressive thinking for complex queries
  if (shouldUseProgressiveThinking(userQuery)) {
    return (
      <ProgressiveThinking 
        key={`progressive-${userQuery}-${agentId}`}
        userQuery={userQuery}
        toolName={currentTool}
        isStreaming={isStreaming}
        agentId={agentId}
      />
    );
  }
  
  // Fall back to simple thinking for basic queries
  const statusInfo = getStatusMessage(currentTool, userQuery);

  return (
    <>
      <ShimmerStyles />
    <motion.div
      data-testid="message-assistant-loading"
      className="w-full mx-auto max-w-3xl px-4 group/message dark:text-white"
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1, transition: { delay: 1 } }}
      data-role={role}
    >
      <div
        className={cx(
          'flex gap-4 group-data-[role=user]/message:px-3 w-full group-data-[role=user]/message:w-fit group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl group-data-[role=user]/message:py-2 rounded-xl',
          {
            'group-data-[role=user]/message:bg-muted': true,
          },
        )}
      >
          <div className="size-8 flex items-center justify-center shrink-0">
            <RiveGlint 
              isThinking={!isStreaming}
              isSpeaking={isStreaming}
              className="w-8 h-8"
            />
        </div>

        <div className="flex flex-col gap-2 w-full">
          <div className="flex flex-col gap-4 text-muted-foreground">
              <ShimmerText className="text-base">
                {statusInfo.title}
              </ShimmerText>
          </div>
        </div>
      </div>
    </motion.div>
    </>
  );
};
