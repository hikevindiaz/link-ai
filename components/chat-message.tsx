import { Message } from 'ai'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'

import { MathJax, MathJaxContext } from 'better-react-mathjax'

import Image from 'next/image'
import { cn } from '@/lib/utils'
import { CodeBlock } from '@/components/ui/codeblock'
import { MemoizedReactMarkdown } from '@/components/markdown'
import { Icons } from '@/components/icons'
import { ExternalLink } from '@/components/external-link'
import { Chatbot } from '@prisma/client'
import { ChatMessageActions } from './chat-message-actions'

export interface ChatMessageProps {
    message: Message
    children?: React.ReactNode
    chatbot: Chatbot
    isFirst?: boolean
}

const getDirection = (isRTL: boolean) => isRTL ? 'rtl' : 'ltr';

export function ChatMessage({ message, children, chatbot, isFirst, ...props }: ChatMessageProps) {
    return (
        <>
            {
                message.role === 'user' ? (
                    <div
                        className={cn('pl-10 group relative mb-4 flex justify-end items-end')}
                        {...props}
                    >
                        <div
                            style={{ color: chatbot.userReplyTextColor, background: chatbot.userReplyBackgroundColor }}
                            className="p-2 text-sm rounded-xl mr-4 whitespace-pre-wrap leading-relaxed"
                            dir={getDirection(chatbot.rightToLeftLanguage)} // Set text direction
                        >
                            <svg fill={chatbot.userReplyBackgroundColor} className="absolute bottom-[0px] right-11" height="14" width="13"><path d="M6 .246c-.175 5.992-1.539 8.89-5.5 13.5 6.117.073 9.128-.306 12.5-3L6 .246Z"></path></svg>
                            <MemoizedReactMarkdown 
                                className="prose prose-sm max-w-none text-inherit [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    p({ children }) {
                                        return <p className="mb-2 last:mb-0 leading-relaxed" dir={getDirection(chatbot.rightToLeftLanguage)}>{children}</p>
                                    },
                                    strong({ children }) {
                                        return <strong className="font-bold">{children}</strong>
                                    },
                                    em({ children }) {
                                        return <em className="italic">{children}</em>
                                    },
                                    code({ children }) {
                                        return <code className="bg-black/10 px-1 py-0.5 rounded text-xs font-mono">{children}</code>
                                    }
                                }}
                            >
                            {message.content}
                            </MemoizedReactMarkdown>
                        </div>
                        <div
                            className={cn(
                                'flex size-8 shrink-0 select-none items-center justify-center rounded-xl border shadow',
                                'bg-background'
                            )}
                        >
                            <Icons.user />
                        </div>
                    </div>
                ) : (
                    <div
                        className={cn('pr-10 group relative mb-4 flex items-start ')}
                        {...props}
                    >
                        {chatbot.chatbotLogoURL ? <Image className='size-8' width={50} height={50} src={chatbot.chatbotLogoURL} alt="chatbot logo" /> :
                            <div
                                className={cn(
                                    'flex size-8 shrink-0 select-none items-center justify-center rounded-xl border shadow',
                                    'bg-primary text-primary-foreground'
                                )}
                            >
                                <Icons.bot />
                            </div>
                        }
                        <div className="flex-1 px-1 ml-4">
                            {message.content == "loading" ? <Icons.loading className="animate-spin" /> :
                                <>
                                    <MemoizedReactMarkdown
                                        className="w-full prose prose-sm text-sm break-words prose-p:leading-relaxed prose-pre:p-0 prose-strong:font-bold prose-em:italic [&>*:first-child]:mt-0"
                                        remarkPlugins={[remarkGfm, remarkMath]}
                                        components={{
                                            a({ node, children, ...props }) {
                                                return (
                                                    <ExternalLink href={props.href!}>
                                                        {children}
                                                    </ExternalLink>
                                                )
                                            },
                                            p({ children }) {
                                                return <p className="mb-3 last:mb-0 leading-relaxed" dir={getDirection(chatbot.rightToLeftLanguage)}>{children}</p>
                                            },
                                            strong({ children }) {
                                                return <strong className="font-bold text-neutral-900 dark:text-neutral-100">{children}</strong>
                                            },
                                            em({ children }) {
                                                return <em className="italic text-neutral-800 dark:text-neutral-200">{children}</em>
                                            },
                                            ul({ children }) {
                                                return <ul className="list-disc list-outside ml-4 mb-3 space-y-1">{children}</ul>
                                            },
                                            ol({ children }) {
                                                return <ol className="list-decimal list-outside ml-4 mb-3 space-y-1">{children}</ol>
                                            },
                                            li({ children }) {
                                                return <li className="py-0.5 leading-relaxed">{children}</li>
                                            },
                                            blockquote({ children }) {
                                                return <blockquote className="border-l-4 border-neutral-300 pl-4 py-2 mb-3 italic text-neutral-700 dark:text-neutral-300 dark:border-neutral-600">{children}</blockquote>
                                            },
                                            h1({ children }) {
                                                return <h1 className="text-2xl font-bold mt-6 mb-3 text-neutral-900 dark:text-neutral-100 border-b border-neutral-200 dark:border-neutral-700 pb-2">{children}</h1>
                                            },
                                            h2({ children }) {
                                                return <h2 className="text-xl font-bold mt-5 mb-3 text-neutral-900 dark:text-neutral-100">{children}</h2>
                                            },
                                            h3({ children }) {
                                                return <h3 className="text-lg font-semibold mt-4 mb-2 text-neutral-900 dark:text-neutral-100">{children}</h3>
                                            },
                                            code({ node, className, children, ...props }) {
                                                const match = /language-(\w+)/.exec(className || '')

                                                if (!match) {
                                                    return (
                                                        <code className={className} {...props}>
                                                            {children}
                                                        </code>
                                                    )
                                                }

                                                if (match && (match[1] === 'math' || match[1] === 'latex')) {
                                                    return (
                                                        <MathJaxContext>
                                                            <MathJax>{children || ''}</MathJax>
                                                        </MathJaxContext>
                                                    )
                                                }

                                                return (
                                                    <CodeBlock
                                                        key={Math.random()}
                                                        language={(match && match[1]) || ''}
                                                        value={String(children).replace(/\n$/, '')}
                                                        {...props}
                                                    />
                                                )
                                            }
                                        }}
                                    >
                                        {message.content.replace(/\【.*?】/g, "")}
                                    </MemoizedReactMarkdown>
                                    {!isFirst ?
                                        <ChatMessageActions message={message} /> :
                                        <div className='size-3'></div>
                                    }
                                </>
                            }
                        </div>
                    </div>
                )
            }
        </>
    )
}
