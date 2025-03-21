import { useState, useEffect } from "react";
import { Button } from "@/components/Button";
import { Form } from "@/hooks/useForms";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { RiCodeSSlashLine, RiRobot2Line, RiFileCopyLine, RiCheckLine } from "@remixicon/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FormIntegrationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: Form;
}

export function FormIntegrationsDialog({
  open,
  onOpenChange,
  form,
}: FormIntegrationsDialogProps) {
  const [activeTab, setActiveTab] = useState<'chatbot' | 'api'>('chatbot');
  const [copied, setCopied] = useState(false);
  
  // Reset copied state when dialog closes
  useEffect(() => {
    if (!open) {
      setCopied(false);
    }
  }, [open]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Code copied to clipboard");
    
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  // Example chatbot integration code
  const chatbotIntegrationCode = `// Add this form to your chatbot
const formId = "${form.id}";

// In your chatbot configuration:
{
  name: "${form.name}",
  description: "${form.description || 'Form integration'}",
  formId: formId
}`;

  // Example API integration code
  const apiIntegrationCode = `// API endpoint to submit form data
POST /api/forms/${form.id}/submissions

// Request body example:
{
  "chatbotId": "your-chatbot-id",
  "fieldValues": {
${form.fields.map(field => `    "${field.name}": "value for ${field.name}"`).join(',\n')}
  }
}

// Response:
{
  "id": "submission-id",
  "formId": "${form.id}",
  "chatbotId": "your-chatbot-id",
  "createdAt": "2023-06-15T10:30:00Z",
  "data": {
    // Field values
  }
}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-white dark:bg-gray-900 border dark:border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-gray-100">Form Integrations</DialogTitle>
          <DialogDescription className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-400">
            Integrate this form with your chatbots or external applications.
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-800">
            <Button
              variant="ghost"
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-none",
                activeTab === 'chatbot'
                  ? "border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              )}
              onClick={() => setActiveTab('chatbot')}
            >
              <RiRobot2Line className="mr-2 h-4 w-4" />
              Chatbot Integration
            </Button>
            <Button
              variant="ghost"
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-none",
                activeTab === 'api'
                  ? "border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              )}
              onClick={() => setActiveTab('api')}
            >
              <RiCodeSSlashLine className="mr-2 h-4 w-4" />
              API Integration
            </Button>
          </div>
          
          {/* Tab Content */}
          <div className="mt-4">
            {activeTab === 'chatbot' && (
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                  Add this form to your chatbots to collect structured information from users during conversations.
                </p>
                
                <div className="relative">
                  <pre className="rounded-md bg-gray-50 p-4 text-sm text-gray-800 overflow-x-auto dark:bg-gray-900 dark:text-gray-300">
                    {chatbotIntegrationCode}
                  </pre>
                  <Button
                    variant="secondary"
                    className="absolute top-2 right-2 p-1.5 h-8 w-8 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    onClick={() => handleCopyCode(chatbotIntegrationCode)}
                  >
                    {copied ? (
                      <RiCheckLine className="h-4 w-4 text-green-500" />
                    ) : (
                      <RiFileCopyLine className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                
                <div className="mt-4 rounded-md border border-gray-200 p-4 dark:border-gray-800">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Chatbot Integration Steps
                  </h3>
                  <ol className="mt-2 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <li>1. Copy the form ID shown above</li>
                    <li>2. Go to your chatbot settings</li>
                    <li>3. Add this form to the chatbot's configuration</li>
                    <li>4. Save your changes</li>
                  </ol>
                </div>
              </div>
            )}
            
            {activeTab === 'api' && (
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                  Use our API to programmatically submit data to this form from external applications.
                </p>
                
                <div className="relative">
                  <pre className="rounded-md bg-gray-50 p-4 text-sm text-gray-800 overflow-x-auto dark:bg-gray-900 dark:text-gray-300">
                    {apiIntegrationCode}
                  </pre>
                  <Button
                    variant="secondary"
                    className="absolute top-2 right-2 p-1.5 h-8 w-8 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    onClick={() => handleCopyCode(apiIntegrationCode)}
                  >
                    {copied ? (
                      <RiCheckLine className="h-4 w-4 text-green-500" />
                    ) : (
                      <RiFileCopyLine className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                
                <div className="mt-4 rounded-md border border-gray-200 p-4 dark:border-gray-800">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    API Authentication
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    API requests require authentication. Use your API key in the Authorization header:
                  </p>
                  <pre className="mt-2 rounded-md bg-gray-50 p-2 text-xs text-gray-800 overflow-x-auto dark:bg-gray-900 dark:text-gray-300">
                    Authorization: Bearer YOUR_API_KEY
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <DialogFooter className="mt-6">
          <DialogClose asChild>
            <Button 
              variant="secondary"
              className="dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:border-gray-700"
            >
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 