import { useState, useEffect, useCallback } from "react"
import { Form } from "@/components/ui/form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import type { Agent } from "@/types/agent"
import { Separator } from "@/components/ui/separator"
import { AdvancedSettings } from "./advanced-settings"
import { EmbedOptions } from "./embed-options"
import { getThemeFromAgent, RIVE_COLORS, RAINBOW_COLORS } from "./theme-utils"
import { ChatButtonMessage } from "./fields/ChatButtonMessage"
import { ButtonThemeSelect } from "./fields/ButtonThemeSelect"
import { RiveOrbColorSelect } from "./fields/RiveOrbColorSelect"
import { BorderGradientSelect } from "./fields/BorderGradientSelect"
import { IconTypeSelector } from "./fields/IconTypeSelector"
import { LogoUploadSection } from "./fields/LogoUploadSection"
import { logger } from "./logger"
import { useThemeSync } from "@/hooks/use-theme-sync"

// Schema for website widget configuration
export const websiteWidgetSchema = z.object({
  chatTitle: z.string().default("Hi, let's chat!"),
  chatMessagePlaceHolder: z.string().optional(),
  chatInputStyle: z.enum(['default', 'full-width']).default('default'),
  chatHistoryEnabled: z.boolean().default(false),
  bubbleColor: z.string().default('#FFFFFF'),
  riveOrbColor: z.number().default(0), // Default to BLACK (0) instead of BLUE (7)
  chatHeaderBackgroundColor: z.string().default('#FFFFFF'),
  chatHeaderTextColor: z.string().default('#000000'),
  userReplyBackgroundColor: z.string().default('#e4e4e7'),
  userReplyTextColor: z.string().default('#000000'),
  displayBranding: z.boolean().default(true),
  chatFileAttachementEnabled: z.boolean().default(false),
  iconType: z.enum(['orb', 'logo']).default('orb'),
  chatbotLogoURL: z.string().nullable().optional(),
  borderGradientColors: z.array(z.string()).default(["#2563EB", "#7E22CE", "#F97316"]),
  chatBackgroundColor: z.string().default('#FFFFFF'),
  bubbleTextColor: z.string().default('#000000'),
  buttonTheme: z.enum(['light', 'dark']).default('light'),
});

interface WebsiteWidgetConfigProps {
  agent: Agent;
  onWidgetChange: (data: Partial<Agent> & { selectedLogoFile?: File | null }) => void;
  onSettingsChange?: (settings: { 
    riveOrbColor?: number; 
    borderGradientColors?: string[];
    bubbleColor?: string;
    name?: string;
    chatTitle?: string;
    iconType?: 'orb' | 'logo';
    logoUrl?: string | null;
    displayBranding?: boolean;
    chatFileAttachementEnabled?: boolean;
    chatBackgroundColor?: string;
    bubbleTextColor?: string;
    buttonTheme?: 'light' | 'dark';
  }) => void;
  isUploadingLogo?: boolean;
}

export function WebsiteWidgetConfig({ agent, onWidgetChange, onSettingsChange, isUploadingLogo }: WebsiteWidgetConfigProps) {
  logger.debug("WebsiteWidgetConfig", "Component initializing", { id: agent.id });
  
  // Use our theme sync hook
  const { buttonTheme, handleThemeChange } = useThemeSync(agent);
  
  // State for icon type and other UI elements
  const [iconType, setIconType] = useState<'orb' | 'logo'>(agent.iconType || (agent.chatbotLogoURL ? 'logo' : 'orb'));
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(agent.chatbotLogoURL || null);
  const [hasChanged, setHasChanged] = useState(false);
  
  // Form setup with explicit theme initialization
  const form = useForm<z.infer<typeof websiteWidgetSchema>>({
    resolver: zodResolver(websiteWidgetSchema),
    defaultValues: {
      displayBranding: agent.displayBranding ?? true,
      chatFileAttachementEnabled: agent.chatFileAttachementEnabled ?? false,
      riveOrbColor: agent.riveOrbColor ?? RIVE_COLORS.BLACK,
      bubbleColor: agent.bubbleColor || "#FFFFFF",
      bubbleTextColor: agent.bubbleTextColor || "#000000",
      chatTitle: agent.chatTitle && agent.chatTitle !== '2' ? agent.chatTitle : "Hi, let's chat!",
      iconType: agent.iconType || (agent.chatbotLogoURL ? 'logo' : 'orb'),
      chatbotLogoURL: agent.chatbotLogoURL || null,
      borderGradientColors: agent.borderGradientColors?.length ? agent.borderGradientColors : RAINBOW_COLORS,
      chatBackgroundColor: agent.chatBackgroundColor ?? "#FFFFFF",
      buttonTheme: getThemeFromAgent(agent),
    },
  });

  // Effect to subscribe to form changes and propagate them
  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      if (type === 'change') {
        setHasChanged(true);
        
        // Always send complete form values to parent components
        const currentValues = form.getValues();
        
        // Create a complete update package that includes all relevant data
        const updateData = {
          ...currentValues,
          iconType: currentValues.iconType,
          selectedLogoFile: currentValues.iconType === 'logo' ? selectedLogoFile : null,
          chatbotLogoURL: currentValues.iconType === 'logo' ? (logoPreviewUrl || currentValues.chatbotLogoURL) : null
        };
        
        // Send complete update to parent
        onWidgetChange(updateData);

        // Update preview if needed
        if (onSettingsChange) {
          onSettingsChange({
            name: agent.name,
            chatTitle: currentValues.chatTitle,
            riveOrbColor: currentValues.riveOrbColor,
            borderGradientColors: currentValues.borderGradientColors,
            iconType: currentValues.iconType,
            logoUrl: currentValues.iconType === 'logo' ? (logoPreviewUrl || currentValues.chatbotLogoURL) : null,
            buttonTheme: currentValues.buttonTheme,
            chatBackgroundColor: currentValues.chatBackgroundColor,
            bubbleColor: currentValues.bubbleColor,
            bubbleTextColor: currentValues.bubbleTextColor,
            displayBranding: currentValues.displayBranding,
            chatFileAttachementEnabled: currentValues.chatFileAttachementEnabled
          });
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form, onWidgetChange, onSettingsChange, agent.name, selectedLogoFile, logoPreviewUrl]);

  // Handler for icon type change
  const handleIconTypeChange = useCallback((newIconType: 'orb' | 'logo') => {
    logger.debug("WebsiteWidgetConfig", `Icon type changing from ${iconType} to ${newIconType}`);
    
    // If switching to orb mode, clear selected logo file
    if (newIconType === 'orb' && selectedLogoFile) {
      setSelectedLogoFile(null);
    }
    
    // Update local state
    setIconType(newIconType);
    
    // Explicitly set form value with shouldDirty flag
    form.setValue("iconType", newIconType, { shouldDirty: true, shouldTouch: true });
    setHasChanged(true);
    
    // Dispatch an event to notify other components about the icon type change
    try {
      window.dispatchEvent(new CustomEvent('iconTypeChanged', { 
        detail: { 
          newIconType,
          agentId: agent.id 
        }
      }));
    } catch (err) {
      console.error("Error dispatching icon type change event:", err);
    }
    
    // Always update widget data
    onWidgetChange({
      iconType: newIconType, 
      selectedLogoFile: newIconType === 'logo' ? selectedLogoFile : null 
    });
    
    // Always update live preview
    if (onSettingsChange) {
      onSettingsChange({
        iconType: newIconType,
        logoUrl: newIconType === 'logo' ? logoPreviewUrl : null,
        riveOrbColor: newIconType === 'orb' ? form.getValues("riveOrbColor") : undefined,
        chatTitle: form.getValues("chatTitle"),
        name: agent.name,
        borderGradientColors: form.getValues("borderGradientColors")
      });
    }
  }, [iconType, form, onWidgetChange, onSettingsChange, agent.name, agent.id, selectedLogoFile, logoPreviewUrl]);
  
  // Handler for logo selected/cleared from LogoUpload component
  const handleLogoSelectedFromUploader = useCallback((file: File | null) => {
    setSelectedLogoFile(file);
    const newPreviewUrl = file ? URL.createObjectURL(file) : null;
    
    // Clean up old blob URL if one existed and a new one is made or file is cleared
    if (logoPreviewUrl && logoPreviewUrl.startsWith('blob:') && (newPreviewUrl || !file)) {
      if (logoPreviewUrl !== newPreviewUrl) { // Don't revoke if it happens to be the same (unlikely but safe)
        URL.revokeObjectURL(logoPreviewUrl);
      }
    }
    
    setLogoPreviewUrl(newPreviewUrl);
    form.setValue('chatbotLogoURL', newPreviewUrl || (file ? null : agent.chatbotLogoURL) || null, { shouldDirty: true }); 
    setHasChanged(true);

    const updateData = {
        iconType: 'logo' as 'logo',
        selectedLogoFile: file,
        chatbotLogoURL: newPreviewUrl,
        fromUserInteraction: true // Explicitly mark as user interaction
    };
    
    // Call to update parent component
    onWidgetChange(updateData);

    if (onSettingsChange) {
      onSettingsChange({ 
        iconType: 'logo', 
        logoUrl: newPreviewUrl 
      });
    }
    
    // Force dirty state to trigger save button
    setHasChanged(true);
    
    logger.debug("WebsiteWidgetConfig", "Logo selected/updated", { hasFile: !!file });
  }, [agent.chatbotLogoURL, onWidgetChange, form, logoPreviewUrl, onSettingsChange]);

  // Handler for when user explicitly wants to remove the saved logo
  const handleClearSavedLogoFromUploader = useCallback(() => {
    // Clean up any blob URLs
    if (logoPreviewUrl && logoPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(logoPreviewUrl);
    }
    
    // Clear file selection state
    setSelectedLogoFile(null);
    setLogoPreviewUrl(null); 
    
    // Update form - explicitly set to null to indicate deletion
    form.setValue('chatbotLogoURL', null, { shouldDirty: true }); 
    setHasChanged(true);

    // IMPORTANT: Mark this as a logo deletion that should be persisted to DB
    const updateData = {
      iconType: 'logo' as 'logo',
      selectedLogoFile: null,
      chatbotLogoURL: null,
      logoWasDeleted: true, // Add a flag to indicate explicit deletion
      fromUserInteraction: true // Explicitly mark as user interaction
    };
    
    // Call to update parent component - ensure the logo is deleted from the database
    onWidgetChange(updateData);

    if (onSettingsChange) {
      onSettingsChange({ 
        iconType: 'logo', 
        logoUrl: null 
      });
    }
    
    // Force dirty state to trigger save button
    setHasChanged(true);
    
    logger.debug("WebsiteWidgetConfig", "Logo deleted by user action - will be removed from database when saved", {
      agentId: agent.id,
      previousLogo: agent.chatbotLogoURL
    });
  }, [onWidgetChange, form, logoPreviewUrl, onSettingsChange, agent.id, agent.chatbotLogoURL]);

  // Fix the baseUrl logic to handle different environments correctly
  const baseUrl = typeof window !== 'undefined' 
    ? (window.location.hostname === 'localhost' 
       ? 'http://localhost:3000' 
       : 'https://dashboard.getlinkai.com')
    : 'https://dashboard.getlinkai.com';
   
  // Add two types of embed codes with correct URLs
  const widgetCode = `<script>
    window.chatbotConfig = { chatbotId: '${agent.id}' };
    (function() {
        var script = document.createElement('script');
        script.src = '${baseUrl}/chatbot.js';
        document.head.appendChild(script);
    })();
</script>`;

  const windowCode = `<iframe 
    src="${baseUrl}/embed/${agent.id}/window"
    style="border: none; width: 100%; height: 600px;"
    allow="microphone"
></iframe>`;

  return (
    <div className="p-2 pl-4 w-full space-y-8">
      <Form {...form}>
        <div className="space-y-6">
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
              Widget Appearance
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Customize how your chat widget looks and behaves on your website.
            </p>
          </div>

          {/* Chat Button Message */}
          <ChatButtonMessage 
            form={form} 
            agent={agent} 
            onWidgetChange={onWidgetChange} 
            onSettingsChange={onSettingsChange} 
            setChatTitle={() => {}} 
            setHasChanged={setHasChanged} 
          />

          <Separator className="my-6" />

          {/* Icon Type Selection */}
          <IconTypeSelector 
            iconType={iconType} 
            handleIconTypeChange={handleIconTypeChange} 
          />

          {/* Button Theme Selection */}
          <ButtonThemeSelect 
            form={form} 
            agent={agent} 
            onWidgetChange={onWidgetChange} 
            onSettingsChange={onSettingsChange} 
            setButtonTheme={() => {}} 
            setHasChanged={setHasChanged}
          />

          {/* Conditional: Rive Orb Color */}
          {iconType === 'orb' && (
            <RiveOrbColorSelect 
              form={form} 
              agent={agent} 
              onWidgetChange={onWidgetChange} 
              onSettingsChange={onSettingsChange} 
              setRiveOrbColor={() => {}} 
              setHasChanged={setHasChanged} 
              selectedBorderGradient={form.watch('borderGradientColors')} 
            />
          )}

          {/* Conditional: Logo Upload */}
          {iconType === 'logo' && (
            <div className="animate-in fade-in-0 duration-300">
              <LogoUploadSection 
                agent={agent} 
                handleLogoSelectedFromUploader={handleLogoSelectedFromUploader} 
                handleClearSavedLogoFromUploader={handleClearSavedLogoFromUploader} 
                isUploadingLogo={isUploadingLogo} 
              />
            </div>
          )}

          <Separator className="my-6" />

          {/* Border Gradient Selection */}
          <BorderGradientSelect 
            form={form} 
            agent={agent} 
            onWidgetChange={onWidgetChange} 
            onSettingsChange={onSettingsChange} 
            selectedBorderGradient={form.watch('borderGradientColors')} 
            setSelectedBorderGradient={() => {}} 
            setHasChanged={setHasChanged} 
          />

          <Separator className="my-6" />

          {/* Embed Options */}
          <div className="space-y-4">
            <EmbedOptions widgetCode={widgetCode} windowCode={windowCode} agent={agent} />
          </div>

          <Separator className="my-6" />

          {/* Advanced Settings */}
          <div className="space-y-4">
            <AdvancedSettings
              displayBranding={form.watch('displayBranding')}
              setDisplayBranding={(value) => form.setValue('displayBranding', value, { shouldDirty: true })}
              chatFileAttachementEnabled={form.watch('chatFileAttachementEnabled')}
              setChatFileAttachementEnabled={(value) => form.setValue('chatFileAttachementEnabled', value, { shouldDirty: true })}
            />
          </div>
        </div>
      </Form>
    </div>
  )
} 