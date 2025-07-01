'use client'

import React, { useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";

interface DebugConsoleProps {
  logs: string[];
  onRunTest: () => void;
}

const DebugConsole: React.FC<DebugConsoleProps> = ({ logs, onRunTest }) => {
  const consoleRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs]);
  
  if (process.env.NODE_ENV !== 'development' || logs.length === 0) {
    return null;
  }
  
  return (
    <div className="mt-4 mb-4 border border-red-300 dark:border-red-800 rounded">
      <div className="bg-red-100 dark:bg-red-900/30 p-2 border-b border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 font-mono text-xs flex justify-between items-center">
        <span>Debug Console</span>
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            className="h-6 px-2 text-blue-600 hover:text-blue-800"
            onClick={onRunTest}
          >
            Test
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            className="h-6 px-2 text-red-600 hover:text-red-800"
            onClick={() => console.clear()}
          >
            Clear
          </Button>
        </div>
      </div>
      <div 
        ref={consoleRef}
        className="bg-neutral-50 dark:bg-neutral-900 p-2 font-mono text-xs text-neutral-800 dark:text-neutral-200 max-h-40 overflow-y-auto"
      >
        {logs.map((log, i) => (
          <div key={i} className="whitespace-pre-wrap mb-1">{log}</div>
        ))}
      </div>
    </div>
  );
};

export default DebugConsole; 