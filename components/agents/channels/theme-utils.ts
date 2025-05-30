import { Agent } from "@/types/agent";

// Rive orb color options (from RiveVoiceOrb component)
export const RIVE_COLORS = {
  BLACK: 0,
  WHITE: 1,
  RED: 2,
  ORANGE: 3,
  YELLOW: 4,
  GREEN: 5,
  CYAN: 6,
  BLUE: 7,
  PURPLE: 8,
  PINK: 9,
} as const;

// Map from Rive color ID to hex color for preview
export const riveColorToHex = {
  [RIVE_COLORS.BLACK]: "#000000",
  [RIVE_COLORS.WHITE]: "#FFFFFF",
  [RIVE_COLORS.RED]: "#dc2626",
  [RIVE_COLORS.ORANGE]: "#ea580c",
  [RIVE_COLORS.YELLOW]: "#eab308",
  [RIVE_COLORS.GREEN]: "#16a34a",
  [RIVE_COLORS.CYAN]: "#06b6d4",
  [RIVE_COLORS.BLUE]: "#1a56db",
  [RIVE_COLORS.PURPLE]: "#7e22ce",
  [RIVE_COLORS.PINK]: "#db2777",
};

// Default Rainbow gradient colors
export const RAINBOW_COLORS = ["#2563EB", "#7E22CE", "#F97316"];

// Determine the theme from agent or fallback to chatBackgroundColor
export function getThemeFromAgent(agent: Agent): 'light' | 'dark' {
  // First check if buttonTheme is explicitly set
  if (agent.buttonTheme === 'dark') {
    return 'dark';
  }
  // Then fallback to chatBackgroundColor
  if (agent.chatBackgroundColor === '#000000') {
    return 'dark';
  }
  // Default to light
  return 'light';
}

// Get theme-based colors as a bundle
export function getThemeColors(theme: 'light' | 'dark') {
  const isDark = theme === 'dark';
  return {
    backgroundColor: isDark ? '#000000' : '#FFFFFF',
    textColor: isDark ? '#FFFFFF' : '#000000',
    buttonTheme: theme,
  };
}

// Debounce helper for delayed updates
export const debounce = <F extends (...args: any[]) => any>(func: F, waitFor: number) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<F>): Promise<ReturnType<F>> =>
    new Promise(resolve => {
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => resolve(func(...args)), waitFor);
    });
};

// Shared border gradient options
export const borderGradientOptions = [
  { name: "Indigo", colors: ["#4F46E5", "#4338CA", "#6366F1"] },
  { name: "Blue", colors: ["#2563EB", "#1E40AF", "#3B82F6"] },
  { name: "Purple", colors: ["#7E22CE", "#6D28D9", "#8B5CF6"] },
  { name: "Pink", colors: ["#DB2777", "#BE185D", "#EC4899"] },
  { name: "Rainbow", colors: ["#2563EB", "#7E22CE", "#F97316"] }
];

// Pre-set color options for the orb
export const orbColorOptions = [
  { name: "Black", value: RIVE_COLORS.BLACK },
  { name: "White", value: RIVE_COLORS.WHITE },
  { name: "Indigo", value: RIVE_COLORS.PURPLE },
  { name: "Blue", value: RIVE_COLORS.BLUE },
  { name: "Red", value: RIVE_COLORS.RED },
  { name: "Orange", value: RIVE_COLORS.ORANGE },
  { name: "Green", value: RIVE_COLORS.GREEN },
  { name: "Cyan", value: RIVE_COLORS.CYAN },
  { name: "Yellow", value: RIVE_COLORS.YELLOW },
  { name: "Pink", value: RIVE_COLORS.PINK }
]; 