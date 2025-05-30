import { useState } from "react";
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Code2, Check } from "lucide-react"
import { RiClipboardLine, RiCheckLine } from "@remixicon/react"
import { toast } from "sonner"
import type { Agent } from "@/types/agent"

interface EmbedOptionsProps {
  agent: Agent;
  widgetCode: string;
  windowCode: string;
}

export function EmbedOptions({ agent, widgetCode, windowCode }: EmbedOptionsProps) {
  const [widgetCodeCopied, setWidgetCodeCopied] = useState(false);
  const [windowCodeCopied, setWindowCodeCopied] = useState(false);

  const handleCopyWidgetCode = () => {
    navigator.clipboard.writeText(widgetCode).then(() => {
      setWidgetCodeCopied(true);
      toast.success('Widget code copied to clipboard');
      setTimeout(() => setWidgetCodeCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy widget code: ', err);
      toast.error('Failed to copy widget code');
    });
  };

  const handleCopyWindowCode = () => {
    navigator.clipboard.writeText(windowCode).then(() => {
      setWindowCodeCopied(true);
      toast.success('Window code copied to clipboard');
      setTimeout(() => setWindowCodeCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy window code: ', err);
      toast.error('Failed to copy window code');
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-900 dark:text-white">Embed Options</h3>
      
      {/* Chat Widget Code */}
      <div className="space-y-2">
        <Label className="text-gray-900 dark:text-white">Chat Widget (Floating Button)</Label>
        <div className="relative">
          <pre className="p-4 bg-gray-50 dark:bg-gray-900 border rounded-md overflow-auto">
            <code className="text-sm text-gray-900 dark:text-gray-300">{widgetCode}</code>
          </pre>
          <Button 
            type="button" 
            variant="secondary" 
            size="sm" 
            className="absolute top-2 right-2"
            onClick={handleCopyWidgetCode}
          >
            {widgetCodeCopied ? (
              <RiCheckLine className="w-4 h-4 mr-1" />
            ) : (
              <RiClipboardLine className="w-4 h-4 mr-1" />
            )}
            {widgetCodeCopied ? "Copied!" : "Copy Widget"}
          </Button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Paste this code snippet into the <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-xs">{'<head>'}</code> section of your website's HTML. This will add a floating chat button that visitors can click to interact with your AI assistant.
        </p>
      </div>

      {/* Chat Window Code */}
      <div className="space-y-2">
        <Label className="text-gray-900 dark:text-white">Chat Window (Inline Frame)</Label>
        <div className="relative">
          <pre className="p-4 bg-gray-50 dark:bg-gray-900 border rounded-md overflow-auto">
            <code className="text-sm text-gray-900 dark:text-gray-300">{windowCode}</code>
          </pre>
          <Button 
            type="button" 
            variant="secondary" 
            size="sm" 
            className="absolute top-2 right-2"
            onClick={handleCopyWindowCode}
          >
            {windowCodeCopied ? (
              <RiCheckLine className="w-4 h-4 mr-1" />
            ) : (
              <RiClipboardLine className="w-4 h-4 mr-1" />
            )}
            {windowCodeCopied ? "Copied!" : "Copy Window"}
          </Button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Paste this iframe code anywhere in your page content where you want the chat window to appear. This embeds the chat interface directly within your webpage as a fixed element.
        </p>
      </div>
    </div>
  );
} 