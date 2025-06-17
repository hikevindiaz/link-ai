import { FormField, FormItem, FormLabel, FormControl, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";
import { Agent } from "@/types/agent";

interface ChatButtonMessageProps {
  form: UseFormReturn<any>;
  agent: Agent;
  onWidgetChange: (data: any) => void;
  onSettingsChange?: (settings: any) => void;
  setChatTitle: (title: string) => void;
  setHasChanged: (changed: boolean) => void;
}

export const ChatButtonMessage = ({ 
  form, 
  agent, 
  onWidgetChange, 
  onSettingsChange, 
  setChatTitle, 
  setHasChanged 
}: ChatButtonMessageProps) => (
  <div className="space-y-4">
    <FormField
      control={form.control}
      name="chatTitle"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
            Chat Button Message
          </FormLabel>
          <FormControl>
            <Input 
              {...field}
              placeholder="Hi, let's chat!" 
              maxLength={25}
              onChange={(e) => {
                const value = e.target.value;
                
                // Update form field value
                field.onChange(value);
                
                // Update local state
                setChatTitle(value);
                
                // Mark as changed
                setHasChanged(true);
                
                // Send complete form data to parent
                const values = form.getValues();
                const updateData = {
                  ...values,
                  chatTitle: value
                };
                onWidgetChange(updateData);
                
                // Update live preview
                if (onSettingsChange) {
                  onSettingsChange({
                    chatTitle: value,
                    name: agent.name
                  });
                }
              }}
              className="w-full"
            />
          </FormControl>
          <div className="flex items-center justify-between">
            <FormDescription className="text-xs text-neutral-500 dark:text-neutral-400">
              This is the message that appears in the chat button. You can include emojis in your message (e.g., "Let's talk! 👋" or "Need help? 🤔").
            </FormDescription>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {field.value?.length || 0}/25
            </span>
          </div>
        </FormItem>
      )}
    />
  </div>
); 