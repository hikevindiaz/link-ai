import { useTheme } from "next-themes"
import RiveVoiceOrb from "@/components/chat-interface/rive-voice-orb"
import { RIVE_COLORS } from "./website-widget-config"
import { useState, useEffect } from "react"

interface WidgetPreviewProps {
  bubbleColor: string;
  selectedBorderGradient: string[];
  agentName: string;
  riveOrbColor?: number;
  useRiveOrb?: boolean;
}

export function WidgetPreview({ 
  bubbleColor, 
  selectedBorderGradient, 
  agentName,
  riveOrbColor = RIVE_COLORS.BLUE,
  useRiveOrb = false 
}: WidgetPreviewProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Widget Preview</h3>
      <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="relative cursor-pointer overflow-hidden animate-border"
          style={{ 
            width: '220px',
            borderRadius: '16px',
            padding: '1px',
            background: `conic-gradient(from var(--border-angle), ${selectedBorderGradient.join(', ')}, ${selectedBorderGradient[0]})`,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          }}
        >
          <div className="flex items-center gap-2 px-3 py-2 rounded-[14px] w-full bg-white dark:bg-gray-950">
            {useRiveOrb ? (
              <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center">
                <div className="scale-150 transform-gpu">
                  <RiveOrbPreview colorValue={riveOrbColor} />
                </div>
              </div>
            ) : (
              <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
                style={{ background: bubbleColor }}
              ></div>
            )}
            <div className="flex flex-col -space-y-1 min-w-0 flex-grow">
              <span className="text-[10px] font-normal opacity-70 truncate text-black dark:text-white">
                {agentName}
              </span>
              <div className="flex items-center">
                <span className="text-base font-bold whitespace-nowrap text-black dark:text-white">
                  Hi, let's talk
                </span>
                <span className="ml-1 text-base flex-shrink-0" role="img" aria-label="wave">
                  👋
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style jsx global>{`
        @property --border-angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        @keyframes border { to { --border-angle: 360deg; } }
        .animate-border { animation: border 4s linear infinite; }
      `}</style>
    </div>
  );
}

// Simplified preview version of the RiveVoiceOrb specifically for the settings panel
function RiveOrbPreview({ colorValue }: { colorValue: number }) {
  // Use a state variable to force re-renders
  const [key, setKey] = useState(`preview-orb-${colorValue}`);
  
  // Force re-render when color changes
  useEffect(() => {
    setKey(`preview-orb-${colorValue}-${Date.now()}`);
    console.log(`Updating orb preview with color value: ${colorValue}`);
  }, [colorValue]);
  
  return (
    <div className="w-6 h-6 pointer-events-none">
      <RiveVoiceOrb 
        isListening={true}
        isThinking={false}
        isSpeaking={false}
        isWaiting={false}
        isAsleep={false}
        isUserSpeaking={false}
        audioLevel={0.7}
        isPreview={true}
        previewColorValue={colorValue}
        key={key}
      />
    </div>
  );
} 