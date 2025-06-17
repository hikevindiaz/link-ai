import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Settings } from "lucide-react";
import { LinkAIAgentIcon } from "../icons/LinkAIAgentIcon";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Agent {
  id: string;
  name: string;
}

interface DashboardHeaderProps {
  loading: boolean;
  userFirstName: string;
  selectedAgent: string;
  onAgentChange: (value: string) => void;
  selectedPeriod: string;
  onPeriodChange: (value: string) => void;
}

export function DashboardHeader({ 
  loading, 
  userFirstName,
  selectedAgent,
  onAgentChange,
  selectedPeriod,
  onPeriodChange
}: DashboardHeaderProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const router = useRouter();

  const greet = () => {
    const h = new Date().getHours();
    if (h < 12) return `Good morning, ${userFirstName}`;
    if (h < 18) return `Good afternoon, ${userFirstName}`;
    return `Good evening, ${userFirstName}`;
  };

  // Fetch agents for filter
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await fetch('/api/agents');
        if (response.ok) {
          const data = await response.json();
          setAgents(data.agents || []);
        }
      } catch (error) {
        console.error('Failed to fetch agents:', error);
      }
    };

    fetchAgents();
  }, []);

  const handleSettingsClick = () => {
    router.push('/dashboard/settings');
  };

  return (
    <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black">
      <div className="px-4 sm:px-6">
        <div className="flex h-14 items-center justify-between">
          {/* Left: Active calls indicator */}
          <div className="flex items-center">
            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/20 dark:text-green-400">
              ● Active calls: 0
            </span>
          </div>

          {/* Center: Title - Hidden on small screens */}
          <h1 className="hidden sm:block text-xl font-normal text-neutral-700 dark:text-neutral-200">
            {loading ? 'Loading…' : greet()}
          </h1>

          {/* Right: Filters and Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Agent Filter */}
            <Select value={selectedAgent} onValueChange={onAgentChange}>
              <SelectTrigger className="w-[100px] sm:w-[140px] h-9 text-xs sm:text-sm">
                <SelectValue placeholder="All agents" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All agents</SelectItem>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Period Filter */}
            <Select value={selectedPeriod} onValueChange={onPeriodChange}>
              <SelectTrigger className="w-[90px] sm:w-[120px] h-9 text-xs sm:text-sm">
                <SelectValue placeholder="Last month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7d</SelectItem>
                <SelectItem value="30d">Last month</SelectItem>
                <SelectItem value="90d">Last 3m</SelectItem>
              </SelectContent>
            </Select>

            {/* Settings */}
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-9 w-9 p-0"
              onClick={handleSettingsClick}
            >
              <Settings className="size-4" />
            </Button>
          </div>
        </div>
        
        {/* Mobile title - Show only on small screens */}
        <div className="block sm:hidden pb-3">
                      <h1 className="text-lg font-normal text-neutral-600 dark:text-neutral-400">
            {loading ? 'Loading…' : greet()}
          </h1>
        </div>
      </div>
    </div>
  );
} 