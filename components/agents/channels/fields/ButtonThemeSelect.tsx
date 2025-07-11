import { useState, useEffect, useCallback, useRef } from "react";
import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Agent } from "@/types/agent";
import { getThemeFromAgent, getThemeColors } from "../theme-utils";

interface ButtonThemeSelectProps {
  form: UseFormReturn<any>;
  agent: Agent;
  onWidgetChange: (data: any) => void;
  onSettingsChange?: (settings: any) => void;
  setButtonTheme: (theme: 'light' | 'dark') => void;
  setHasChanged: (changed: boolean) => void; 
}

export const ButtonThemeSelect = ({ 
  form, 
  agent, 
  onWidgetChange, 
  onSettingsChange, 
  setButtonTheme, 
  setHasChanged 
}: ButtonThemeSelectProps) => {
  // Compute the initial theme explicitly
  const initialTheme = getThemeFromAgent(agent);
  
  // Use a ref to track if we're mounted to avoid state updates on unmounted component
  const isMounted = useRef(true);
  
  // Initialize state with the determined theme
  const [currentTheme, setCurrentTheme] = useState(initialTheme);
  
  // Store a key to force re-rendering when theme changes
  const [renderKey, setRenderKey] = useState(0);

  // Handle theme initial sync with database
  useEffect(() => {
    const fetchLatestTheme = async () => {
      try {
        // Fetch fresh data from the database
        const response = await fetch(`/api/chatbots/${agent.id}`);
        if (!response.ok) throw new Error("Failed to fetch chatbot data");
        
        const data = await response.json();
        
        // Cache the theme data in localStorage for persistence
        try {
          localStorage.setItem(`theme_cache_${agent.id}`, JSON.stringify({
            buttonTheme: data.buttonTheme,
            chatBackgroundColor: data.chatBackgroundColor,
            timestamp: Date.now()
          }));
        } catch (err) {
          // Ignore localStorage errors
        }
        
        // Determine correct theme from DB data
        const dbTheme = getThemeFromAgent(data);
        
        // CRITICAL: Set form value first
        form.setValue("buttonTheme", dbTheme, { 
          shouldDirty: false,
          shouldTouch: false
        });
        
        // Then update state
        setCurrentTheme(dbTheme);
        setButtonTheme(dbTheme);
        
        // Force re-render with new theme
        setRenderKey(prev => prev + 1);
        
        // Also update other theme-related form values for consistency
        const { backgroundColor, textColor } = getThemeColors(dbTheme);
        form.setValue("chatBackgroundColor", backgroundColor, { shouldDirty: false });
        form.setValue("bubbleColor", backgroundColor, { shouldDirty: false });
        form.setValue("bubbleTextColor", textColor, { shouldDirty: false });
      } catch (error) {
        // Try to use cached theme from localStorage as fallback
        try {
          const cachedThemeData = localStorage.getItem(`theme_cache_${agent.id}`);
          if (cachedThemeData) {
            const cache = JSON.parse(cachedThemeData);
            
            // Check if cache is recent (within last day)
            const isRecent = (Date.now() - cache.timestamp) < (24 * 60 * 60 * 1000);
            
            if (isRecent && (cache.buttonTheme === 'dark' || cache.chatBackgroundColor === '#000000')) {
              // Use the cached dark theme
              form.setValue("buttonTheme", 'dark', { shouldDirty: false });
              setCurrentTheme('dark');
              setButtonTheme('dark');
              setRenderKey(prev => prev + 1);
            }
          }
        } catch (err) {
          // Ignore localStorage errors
        }
      }
    };
    
    // Run this immediately
    fetchLatestTheme();
  }, [agent.id, form, setButtonTheme]);

  // IMPORTANT: Force synchronization with agent props on every render
  useEffect(() => {
    const correctTheme = getThemeFromAgent(agent);
    
    // Always update if themes don't match
    if (correctTheme !== currentTheme) {
      // Set local state
      setCurrentTheme(correctTheme);
      
      // Update parent state
      setButtonTheme(correctTheme);
      
      // Update form value
      form.setValue("buttonTheme", correctTheme);
      
      // Force re-render
      setRenderKey(prev => prev + 1);
    }
  }, [agent, currentTheme, form, setButtonTheme]);

  // On component unmount, update the flag
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Theme change handler 
  const handleThemeChange = async (value: 'light' | 'dark') => {
    // Skip if no change or component unmounted
    if (value === currentTheme || !isMounted.current) {
      return;
    }
    
    // Set local state immediately
    setCurrentTheme(value);
    
    // Force re-render
    setRenderKey(prev => prev + 1);
    
    // Get colors based on theme
    const { backgroundColor, textColor } = getThemeColors(value);
    
    // Theme update data
    const themeUpdate = {
      buttonTheme: value,
      chatBackgroundColor: backgroundColor,
      bubbleColor: backgroundColor,
      bubbleTextColor: textColor
    };
    
    // Update form values
    form.setValue("buttonTheme", value, { shouldDirty: true });
    form.setValue("chatBackgroundColor", backgroundColor, { shouldDirty: true });
    form.setValue("bubbleColor", backgroundColor, { shouldDirty: true });
    form.setValue("bubbleTextColor", textColor, { shouldDirty: true });
    
    // Update parent state
    setButtonTheme(value);
    setHasChanged(true);
    
    // Send update to parent
    onWidgetChange(themeUpdate);
    
    // Update live preview
    if (onSettingsChange) {
      onSettingsChange(themeUpdate);
    }
    
    // Force a theme preview update
    window.dispatchEvent(new CustomEvent('forceThemePreviewUpdate', { 
      detail: themeUpdate
    }));
    
    // Save to database directly
    try {
      const response = await fetch(`/api/chatbots/${agent.id}/update-theme`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(themeUpdate),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save theme: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.data?.buttonTheme && isMounted.current) {
        // Force a final UI refresh
        setCurrentTheme(result.data.buttonTheme);
        setRenderKey(prev => prev + 1);
      }
      
      toast.success(`Theme changed to ${value}`);
    } catch (error) {
      toast.error("Failed to update theme");
    }
  };

  // Create explicit visual indicators for the current theme
  const ThemeDisplay = () => {
    if (currentTheme === 'dark') {
      return (
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-black"></div>
          <span>Dark</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-full bg-white border border-neutral-200"></div>
        <span>Light</span>
      </div>
    );
  };

  return (
    <div className="space-y-4" key={`theme-select-${renderKey}`}>
      <FormField
        control={form.control}
        name="buttonTheme"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between">
              <FormLabel className="text-sm font-medium text-neutral-900 dark:text-white">
                Button Theme
              </FormLabel>
            </div>
            
            <Select
              value={currentTheme}
              onValueChange={handleThemeChange}
              defaultValue={currentTheme}
            >
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select button theme">
                    <ThemeDisplay />
                  </SelectValue>
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="light">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full bg-white border border-neutral-200"></div>
                    <span>Light</span>
                  </div>
                </SelectItem>
                <SelectItem value="dark">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full bg-black"></div>
                    <span>Dark</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <FormDescription className="text-xs text-neutral-500 dark:text-neutral-400">
              Choose the color theme for the chat button.
            </FormDescription>
          </FormItem>
        )}
      />
    </div>
  );
}; 