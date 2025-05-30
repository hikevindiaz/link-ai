import { FormLabel, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UseFormReturn } from "react-hook-form";
import { Agent } from "@/types/agent";
import { borderGradientOptions } from "../theme-utils";

interface BorderGradientSelectProps {
  form: UseFormReturn<any>;
  agent: Agent;
  onWidgetChange: (data: any) => void;
  onSettingsChange?: (settings: any) => void;
  selectedBorderGradient: string[];
  setSelectedBorderGradient: (gradient: string[]) => void;
  setHasChanged: (changed: boolean) => void;
}

export const BorderGradientSelect = ({ 
  form, 
  agent, 
  onWidgetChange, 
  onSettingsChange, 
  selectedBorderGradient, 
  setSelectedBorderGradient, 
  setHasChanged 
}: BorderGradientSelectProps) => {
  return (
    <div className="space-y-4">
      <FormLabel className="text-sm font-medium text-gray-900 dark:text-gray-50">
        Widget Border Gradient
      </FormLabel>
      <Select
        value={borderGradientOptions.find(opt => 
          JSON.stringify(opt.colors) === JSON.stringify(selectedBorderGradient)
        )?.name || "Rainbow"}
        onValueChange={(gradientName) => {
          const selectedOpt = borderGradientOptions.find(opt => opt.name === gradientName);
          if (selectedOpt) {
            // Update local state
            setSelectedBorderGradient(selectedOpt.colors);
            
            // Update form value
            form.setValue("borderGradientColors", selectedOpt.colors, { shouldDirty: true });
            
            // Mark as changed
            setHasChanged(true);
            
            // Send gradient-specific update to parent
            const gradientUpdate = {
              borderGradientColors: selectedOpt.colors
            };
            onWidgetChange(gradientUpdate);
            
            // Update live preview
            if (onSettingsChange) {
              onSettingsChange({
                borderGradientColors: selectedOpt.colors,
                name: agent.name,
                chatTitle: form.getValues("chatTitle"),
                riveOrbColor: form.getValues("riveOrbColor")
              });
            }
          }
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select border gradient" />
        </SelectTrigger>
        <SelectContent>
          {borderGradientOptions.map((option) => (
            <SelectItem key={option.name} value={option.name}>
              <div className="flex items-center gap-2">
                <div className="h-4 w-8 rounded flex">
                  {option.colors.map((color, idx) => (
                    <div key={idx} style={{ flex: 1, backgroundColor: color }}></div>
                  ))}
                </div>
                <span>{option.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FormDescription className="text-xs text-gray-500 dark:text-gray-500">
        Select a gradient for the chat widget button border.
      </FormDescription>
    </div>
  );
}; 