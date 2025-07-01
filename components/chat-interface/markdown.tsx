import Link from 'next/link';
import React, { memo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from './code-block';
import Image from 'next/image';

const components: Partial<Components> = {
  // @ts-expect-error
  code: CodeBlock,
  pre: ({ children }) => <>{children}</>,
  p: ({ node, children, ...props }) => {
    return (
      <p className="mb-3 last:mb-0 leading-relaxed" {...props}>
        {children}
      </p>
    );
  },
  br: ({ node, ...props }) => {
    return <br className="mb-2" {...props} />;
  },
  ol: ({ node, children, ...props }) => {
    return (
      <ol className="list-decimal list-outside ml-4 mb-3 space-y-1" {...props}>
        {children}
      </ol>
    );
  },
  li: ({ node, children, ...props }) => {
    return (
      <li className="py-0.5 leading-relaxed" {...props}>
        {children}
      </li>
    );
  },
  ul: ({ node, children, ...props }) => {
    return (
      <ul className="list-disc list-outside ml-4 mb-3 space-y-1" {...props}>
        {children}
      </ul>
    );
  },
  strong: ({ node, children, ...props }) => {
    return (
      <strong className="font-bold text-neutral-900 dark:text-neutral-100" {...props}>
        {children}
      </strong>
    );
  },
  em: ({ node, children, ...props }) => {
    return (
      <em className="italic text-neutral-800 dark:text-neutral-200" {...props}>
        {children}
      </em>
    );
  },
  blockquote: ({ node, children, ...props }) => {
    return (
      <blockquote className="border-l-4 border-neutral-300 pl-4 py-2 mb-3 italic text-neutral-700 dark:text-neutral-300 dark:border-neutral-600" {...props}>
        {children}
      </blockquote>
    );
  },
  a: ({ node, children, ...props }) => {
    return (
      <Link
        className="text-blue-600 hover:underline dark:text-blue-400 dark:hover:underline"
        target="_blank"
        rel="noreferrer"
        {...props}
      >
        {children}
      </Link>
    );
  },
  h1: ({ node, children, ...props }) => {
    return (
      <h1 className="text-3xl font-bold mt-6 mb-3 text-neutral-900 dark:text-neutral-100 border-b border-neutral-200 dark:border-neutral-700 pb-2" {...props}>
        {children}
      </h1>
    );
  },
  h2: ({ node, children, ...props }) => {
    return (
      <h2 className="text-2xl font-bold mt-5 mb-3 text-neutral-900 dark:text-neutral-100" {...props}>
        {children}
      </h2>
    );
  },
  h3: ({ node, children, ...props }) => {
    return (
      <h3 className="text-xl font-semibold mt-4 mb-2 text-neutral-900 dark:text-neutral-100" {...props}>
        {children}
      </h3>
    );
  },
  h4: ({ node, children, ...props }) => {
    return (
      <h4 className="text-lg font-semibold mt-4 mb-2 text-neutral-800 dark:text-neutral-200" {...props}>
        {children}
      </h4>
    );
  },
  h5: ({ node, children, ...props }) => {
    return (
      <h5 className="text-base font-semibold mt-3 mb-2 text-neutral-800 dark:text-neutral-200" {...props}>
        {children}
      </h5>
    );
  },
  h6: ({ node, children, ...props }) => {
    return (
      <h6 className="text-sm font-semibold mt-3 mb-2 text-neutral-700 dark:text-neutral-300" {...props}>
        {children}
      </h6>
    );
  },
  hr: ({ node, ...props }) => {
    return (
      <hr className="my-6 border-0 border-t border-neutral-300 dark:border-neutral-600" {...props} />
    );
  },
  table: ({ node, children, ...props }) => {
    return (
      <div className="overflow-x-auto mb-3">
        <table className="min-w-full border-collapse border border-neutral-300 dark:border-neutral-600" {...props}>
          {children}
        </table>
      </div>
    );
  },
  thead: ({ node, children, ...props }) => {
    return (
      <thead className="bg-neutral-50 dark:bg-neutral-800" {...props}>
        {children}
      </thead>
    );
  },
  tbody: ({ node, children, ...props }) => {
    return (
      <tbody className="bg-white dark:bg-neutral-900" {...props}>
        {children}
      </tbody>
    );
  },
  tr: ({ node, children, ...props }) => {
    return (
      <tr className="border-b border-neutral-200 dark:border-neutral-700" {...props}>
        {children}
      </tr>
    );
  },
  td: ({ node, children, ...props }) => {
    return (
      <td className="px-3 py-2 text-sm border-r border-neutral-200 dark:border-neutral-700 last:border-r-0" {...props}>
        {children}
      </td>
    );
  },
  th: ({ node, children, ...props }) => {
    return (
      <th className="px-3 py-2 text-sm font-semibold text-left border-r border-neutral-300 dark:border-neutral-600 last:border-r-0" {...props}>
        {children}
      </th>
    );
  },
  img: ({ node, src, alt, ...props }) => {
    const width = 300;
    const height = 200;

    return (
      <Image
        src={src || ""}
        alt={alt || "Markdown image content"}
        width={width}
        height={height}
        className="rounded-xl my-2 max-w-xs h-auto object-contain block"
        {...props}
      />
    );
  },
};

const remarkPlugins = [remarkGfm];

const NonMemoizedMarkdown = ({ children }: { children: string }) => {
  return (
    <ReactMarkdown remarkPlugins={remarkPlugins} components={components}>
      {children}
    </ReactMarkdown>
  );
};

export const Markdown = memo(
  NonMemoizedMarkdown,
  (prevProps, nextProps) => prevProps.children === nextProps.children,
);
