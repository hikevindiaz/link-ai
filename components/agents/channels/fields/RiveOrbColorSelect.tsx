import { FormField, FormItem, FormLabel, FormControl, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UseFormReturn } from "react-hook-form";
import { Agent } from "@/types/agent";
import { riveColorToHex, orbColorOptions } from "../theme-utils";

interface RiveOrbColorSelectProps {
  form: UseFormReturn<any>;
  agent: Agent;
  onWidgetChange: (data: any) => void;
  onSettingsChange?: (settings: any) => void;
  setRiveOrbColor: (color: number) => void;
  setHasChanged: (changed: boolean) => void;
  selectedBorderGradient: string[];
}

export const RiveOrbColorSelect = ({ 
  form, 
  agent, 
  onWidgetChange, 
  onSettingsChange, 
  setRiveOrbColor, 
  setHasChanged, 
  selectedBorderGradient 
}: RiveOrbColorSelectProps) => {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <FormField
        control={form.control}
        name="riveOrbColor"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium text-gray-900 dark:text-gray-50">
              Voice Orb Color
            </FormLabel>
            <Select
              value={field.value?.toString()}
              onValueChange={(value) => {
                const colorValue = parseInt(value);
                
                // Update form field value for orb color only
                field.onChange(colorValue);
                
                // Update local state for orb color
                setRiveOrbColor(colorValue);
                
                // Mark as changed
                setHasChanged(true);
                
                // Send orb-specific update to parent
                const orbUpdate = {
                  riveOrbColor: colorValue
                };
                onWidgetChange(orbUpdate);
                
                // Update live preview - ONLY for the orb color, preserving other settings
                if (onSettingsChange) {
                  onSettingsChange({
                    riveOrbColor: colorValue,
                    name: agent.name,
                    chatTitle: form.getValues("chatTitle"),
                    borderGradientColors: selectedBorderGradient
                  });
                }
              }}
            >
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select orb color" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {orbColorOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    <div className="flex items-center gap-2">
                      <div 
                        className={`h-4 w-4 rounded-full ${option.name === "White" ? "border border-gray-200" : ""}`}
                        style={{ backgroundColor: riveColorToHex[option.value] }}
                      ></div>
                      <span>{option.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription className="text-xs text-gray-500 dark:text-gray-500">
              This color will be used for the voice orb visualization.
            </FormDescription>
          </FormItem>
        )}
      />
    </div>
  );
}; 