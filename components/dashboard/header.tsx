import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { LinkAIAgentIcon } from "../icons/LinkAIAgentIcon";

interface DashboardHeaderProps {
  loading: boolean;
  userFirstName: string;
}

export function DashboardHeader({ 
  loading, 
  userFirstName, 
}: DashboardHeaderProps) {
  const greet = () => {
    const h = new Date().getHours();
    if (h < 12) return `Good morning, ${userFirstName}!`;
    if (h < 18) return `Good afternoon, ${userFirstName}!`;
    return `Good evening, ${userFirstName}!`;
  };

  return (
    <div className="border-b border-gray-200 dark:border-gray-800">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
            {loading ? 'Loading…' : greet()}
          </h1>
          <div className="flex items-center gap-4">
            <Button asChild className="ml-auto">
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
    </div>
  );
} 