import { ReactNode } from "react"
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

interface ChannelItemProps {
  id: string;
  name: string;
  description?: string;
  icon: ReactNode;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  disabled?: boolean;
  isComingSoon?: boolean;
  children?: ReactNode;
}

export function ChannelItem({
  id,
  name,
  description,
  icon,
  enabled,
  onToggle,
  disabled = false,
  isComingSoon = false,
  children
}: ChannelItemProps) {
  return (
    <AccordionItem 
      value={id} 
      className={cn(
        "border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden mb-4",
        !enabled && "opacity-80",
        disabled && "opacity-70"
      )}
      disabled={disabled || (!enabled && !isComingSoon)}
    >
      <div className="bg-gray-50 dark:bg-gray-900 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <Label className="font-medium text-gray-900 dark:text-gray-100">{name}</Label>
          {isComingSoon && (
            <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              Coming Soon
            </span>
          )}
        </div>
        <Switch 
          checked={enabled} 
          onCheckedChange={onToggle}
          disabled={disabled}
        />
      </div>
      
      {/* Only render trigger and content if enabled and has children */}
      {enabled && children && (
        <>
          <AccordionTrigger className="px-4 hover:no-underline">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {description || `Configure ${name.toLowerCase()} integration`}
            </span>
          </AccordionTrigger>
          <AccordionContent 
            className={cn(
              "transition-all duration-300",
              enabled ? "animate-in fade-in-50" : "hidden"
            )}
          >
            {children}
          </AccordionContent>
        </>
      )}
    </AccordionItem>
  )
} 