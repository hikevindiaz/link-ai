import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { LinkAIAgentIcon } from "../icons/LinkAIAgentIcon";

interface DashboardHeaderProps {
  loading: boolean;
  userFirstName: string;
}

export function DashboardHeader({ loading, userFirstName }: DashboardHeaderProps) {
  return (
    <div className="border-b border-gray-200 dark:border-gray-800">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
            {loading ? 'Loading...' : `${userFirstName}, welcome to your dashboard`}
          </h1>
          <Button asChild className="ml-4">
            <a href="/dashboard/agents" className="flex items-center gap-2">
              <LinkAIAgentIcon 
                className="size-5 text-white dark:text-black" 
                aria-hidden="true"
              />
              My Agents
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
} 