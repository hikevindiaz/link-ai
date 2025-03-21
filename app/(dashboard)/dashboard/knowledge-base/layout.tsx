'use client';

import { SourceSidebar } from '@/components/knowledge-base/source-sidebar';

export default function KnowledgeBaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full">
      {/* Left Sidebar - Always visible */}
      <SourceSidebar />
      
      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
} 