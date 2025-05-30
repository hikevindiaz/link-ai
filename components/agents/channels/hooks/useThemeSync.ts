import { useState, useEffect, useRef } from 'react';
import { Agent } from '@/types/agent';
import { getThemeColors, getThemeFromAgent } from '../theme-utils';
import { logger } from '../logger';

interface UseThemeSyncParams {
  agent: Agent;
  onThemeUpdate?: (themeData: ThemeData) => void;
}

export interface ThemeData {
  buttonTheme: 'light' | 'dark';
  chatBackgroundColor: string;
  bubbleColor: string;
  bubbleTextColor: string;
}

/**
 * Custom hook to manage theme synchronization between agent data, UI state and live preview
 */
export function useThemeSync({ agent, onThemeUpdate }: UseThemeSyncParams) {
  // Determine initial theme
  const initialTheme = getThemeFromAgent(agent);
  const { backgroundColor, textColor } = getThemeColors(initialTheme);

  // Theme-related state
  const [buttonTheme, setButtonTheme] = useState<'light' | 'dark'>(initialTheme);
  const [chatBackgroundColor, setChatBackgroundColor] = useState(backgroundColor);
  const [bubbleColor, setBubbleColor] = useState(backgroundColor);
  const [bubbleTextColor, setBubbleTextColor] = useState(textColor);

  // Force re-render key for components using this theme
  const [renderKey, setRenderKey] = useState(0);

  // Refs to track previous values
  const prevValues = useRef({
    buttonTheme: initialTheme,
    chatBackgroundColor: backgroundColor,
    bubbleColor: backgroundColor,
    bubbleTextColor: textColor
  });

  // Sync theme with agent data on first load and when agent changes
  useEffect(() => {
    const theme = getThemeFromAgent(agent);
    const colors = getThemeColors(theme);

    setButtonTheme(theme);
    setChatBackgroundColor(colors.backgroundColor);
    setBubbleColor(colors.backgroundColor);
    setBubbleTextColor(colors.textColor);
    setRenderKey(prev => prev + 1);

    // Update previous values
    prevValues.current = {
      buttonTheme: theme,
      chatBackgroundColor: colors.backgroundColor,
      bubbleColor: colors.backgroundColor,
      bubbleTextColor: colors.textColor
    };

    logger.debug('useThemeSync', 'Theme initialized from agent', {
      theme,
      backgroundColor: colors.backgroundColor,
      textColor: colors.textColor
    });

    // Call the update callback if provided
    if (onThemeUpdate) {
      onThemeUpdate({
        buttonTheme: theme,
        chatBackgroundColor: colors.backgroundColor,
        bubbleColor: colors.backgroundColor,
        bubbleTextColor: colors.textColor
      });
    }
  }, [agent, onThemeUpdate]);

  // Handler for theme updates
  const updateTheme = (newTheme: 'light' | 'dark') => {
    const colors = getThemeColors(newTheme);
    
    // Update state
    setButtonTheme(newTheme);
    setChatBackgroundColor(colors.backgroundColor);
    setBubbleColor(colors.backgroundColor);
    setBubbleTextColor(colors.textColor);
    
    // Force re-render
    setRenderKey(prev => prev + 1);
    
    // Update previous values
    prevValues.current = {
      buttonTheme: newTheme,
      chatBackgroundColor: colors.backgroundColor,
      bubbleColor: colors.backgroundColor,
      bubbleTextColor: colors.textColor
    };
    
    logger.debug('useThemeSync', 'Theme updated', {
      theme: newTheme,
      backgroundColor: colors.backgroundColor,
      textColor: colors.textColor
    });
    
    // Call the update callback if provided
    if (onThemeUpdate) {
      onThemeUpdate({
        buttonTheme: newTheme,
        chatBackgroundColor: colors.backgroundColor,
        bubbleColor: colors.backgroundColor,
        bubbleTextColor: colors.textColor
      });
    }
    
    return {
      buttonTheme: newTheme,
      chatBackgroundColor: colors.backgroundColor,
      bubbleColor: colors.backgroundColor,
      bubbleTextColor: colors.textColor
    };
  };

  // Theme event handler for listening to theme events
  const handleThemeEvent = (event: CustomEvent) => {
    const { buttonTheme: newTheme } = event.detail;
    
    if (newTheme && newTheme !== buttonTheme) {
      updateTheme(newTheme);
    }
  };
  
  // Setup event listener for theme changes
  useEffect(() => {
    window.addEventListener('forceThemePreviewUpdate' as any, handleThemeEvent);
    return () => {
      window.removeEventListener('forceThemePreviewUpdate' as any, handleThemeEvent);
    };
  }, [buttonTheme]);

  return {
    buttonTheme,
    chatBackgroundColor,
    bubbleColor,
    bubbleTextColor,
    renderKey,
    updateTheme,
    
    // Getter for all theme data
    getThemeData: (): ThemeData => ({
      buttonTheme,
      chatBackgroundColor,
      bubbleColor,
      bubbleTextColor
    })
  };
} 