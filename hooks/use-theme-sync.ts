import { useState, useEffect, useCallback } from 'react';
import { Agent } from '@/types/agent';
import { getThemeFromAgent, getThemeColors } from '@/components/agents/channels/theme-utils';

/**
 * Hook to synchronize theme settings between agent configuration and widget preview
 */
export function useThemeSync(agent: Agent) {
  // Theme state with proper initialization from agent
  const initialTheme = getThemeFromAgent(agent);
  const [buttonTheme, setButtonTheme] = useState<'light' | 'dark'>(initialTheme);
  
  // Get theme-dependent colors
  const themeColors = getThemeColors(initialTheme);
  
  // Theme-related UI colors
  const [bubbleColor, setBubbleColor] = useState(agent.bubbleColor || themeColors.backgroundColor);
  const [bubbleTextColor, setBubbleTextColor] = useState(agent.bubbleTextColor || themeColors.textColor);
  const [chatBackgroundColor, setChatBackgroundColor] = useState(agent.chatBackgroundColor || themeColors.backgroundColor);
  
  // Force initial sync
  useEffect(() => {
    // Determine proper theme value
    const isDarkTheme = agent.buttonTheme === 'dark' || agent.chatBackgroundColor === '#000000';
    const themeValue = isDarkTheme ? 'dark' : 'light';
    
    // Set theme state
    setButtonTheme(themeValue);
    
    // Set color states based on theme
    const colors = getThemeColors(themeValue);
    setBubbleColor(agent.bubbleColor || colors.backgroundColor);
    setBubbleTextColor(agent.bubbleTextColor || colors.textColor);
    setChatBackgroundColor(agent.chatBackgroundColor || colors.backgroundColor);
    
    // Dispatch event for global theme synchronization
    dispatchThemeUpdateEvent(themeValue, colors.backgroundColor, colors.backgroundColor, colors.textColor, false);
  }, [agent.id]); // Only run when agent ID changes to avoid infinite loops
  
  // Dispatch theme update event to coordinate across components
  const dispatchThemeUpdateEvent = useCallback((
    theme: 'light' | 'dark',
    chatBgColor: string,
    bubbleColor: string,
    textColor: string,
    fromUserInteraction: boolean
  ) => {
    try {
      // Create custom event with theme data
      window.dispatchEvent(new CustomEvent('forceThemePreviewUpdate', { 
        detail: {
          buttonTheme: theme,
          chatBackgroundColor: chatBgColor,
          bubbleColor: bubbleColor,
          bubbleTextColor: textColor,
          fromUserInteraction,
          fromInitialLoad: false
        }
      }));
    } catch (err) {
      console.error('[useThemeSync] Error dispatching theme update event:', err);
    }
  }, []);
  
  // Handler for theme toggle
  const handleThemeChange = useCallback((newTheme: 'light' | 'dark') => {
    // Update state
    setButtonTheme(newTheme);
    
    // Get colors for the new theme
    const colors = getThemeColors(newTheme);
    
    // Update color states
    setBubbleColor(colors.backgroundColor);
    setBubbleTextColor(colors.textColor);
    setChatBackgroundColor(colors.backgroundColor);
    
    // Dispatch theme update event
    dispatchThemeUpdateEvent(newTheme, colors.backgroundColor, colors.backgroundColor, colors.textColor, true);
    
    return {
      buttonTheme: newTheme,
      chatBackgroundColor: colors.backgroundColor,
      bubbleColor: colors.backgroundColor,
      bubbleTextColor: colors.textColor
    };
  }, [dispatchThemeUpdateEvent]);
  
  return {
    buttonTheme,
    bubbleColor,
    bubbleTextColor,
    chatBackgroundColor,
    handleThemeChange,
    dispatchThemeUpdateEvent
  };
} 