import { useState } from "react";
import { Button } from "@/components/Button";
import { Badge } from "@/components/ui/badge";
import { Divider } from "@/components/Divider";
import { Form, FormSubmission } from "@/hooks/useForms";
import { RiSettings4Line, RiSearchLine, RiLinkM } from "@remixicon/react";
import { FormSubmissionsTable } from "@/components/forms/FormSubmissionsTable";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface FormSubmissionsViewProps {
  form: Form;
  submissions: FormSubmission[];
  onViewSubmission: (submission: FormSubmission) => void;
  onOpenSettings: () => void;
  onOpenIntegrations?: () => void;
}

export function FormSubmissionsView({
  form,
  submissions,
  onViewSubmission,
  onOpenSettings,
  onOpenIntegrations = () => {}
}: FormSubmissionsViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  
  // Filter submissions based on search query
  const filteredSubmissions = searchQuery
    ? submissions.filter(submission => {
        const searchLower = searchQuery.toLowerCase();
        // Search in all data fields
        return Object.values(submission.data).some(
          value => value.toLowerCase().includes(searchLower)
        ) || submission.chatbotName.toLowerCase().includes(searchLower);
      })
    : submissions;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between p-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50">
              {form.name}
            </h1>
            <div className="mt-1 flex items-center gap-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {form.fields.length} fields
              </p>
              <Badge
                variant={form.status === 'active' ? 'success' : 'neutral'}
                className="text-xs"
              >
                {form.status}
              </Badge>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {form._count?.submissions || 0} submissions
              </p>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    onClick={onOpenIntegrations}
                    className="h-9 w-9 p-0"
                  >
                    <RiLinkM className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Form Integrations</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    onClick={onOpenSettings}
                    className="h-9 w-9 p-0"
                  >
                    <RiSettings4Line className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Form Settings</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
      
      {/* Search */}
      <div className="border-b border-gray-200 p-4 dark:border-gray-800">
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <RiSearchLine className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full rounded-xl border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400"
            placeholder="Search submissions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      {/* Submissions Content */}
      <div className="flex-1 overflow-auto p-4">
        {filteredSubmissions.length > 0 ? (
          <FormSubmissionsTable 
            form={form}
            submissions={filteredSubmissions}
            onViewSubmission={onViewSubmission}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <RiSearchLine className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
              {searchQuery ? "No matching submissions" : "No submissions yet"}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {searchQuery
                ? "Try adjusting your search terms"
                : "Submissions will appear here when users fill out this form"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 