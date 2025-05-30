import { useState, useCallback, useEffect } from "react";
import { FloatingActionCard } from "@/components/agents/floating-action-card";
import { Agent } from "@/types/agent";
import { useWidgetSettings } from "@/hooks/use-widget-settings";
import { useChannelState } from "@/hooks/use-channel-state";
import { toast } from "sonner";

interface SaveChangesHandlerProps {
  agent: Agent;
  onSave: (data: Partial<Agent>) => Promise<void>;
  widgetSettingsHasChanged: boolean;
  channelsHasChanged: boolean;
  widgetSettings: any;
  channels: any;
  onResetWidgetSettings: () => void;
  onResetChannels: () => void;
}

export function SaveChangesHandler({
  agent,
  onSave,
  widgetSettingsHasChanged,
  channelsHasChanged,
  widgetSettings,
  channels,
  onResetWidgetSettings,
  onResetChannels
}: SaveChangesHandlerProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // Check if any changes have been made
  const isDirty = widgetSettingsHasChanged || channelsHasChanged;
  
  // Track if component is mounted
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Handle saving changes
  const handleSaveChanges = useCallback(async () => {
    if (!isDirty) return;
    
    console.log("SaveChangesHandler: Saving changes", {
      channelsHasChanged,
      widgetSettingsHasChanged,
      hasLogoChanges: widgetSettings && 
        (!!widgetSettings.selectedLogoFile || widgetSettings.chatbotLogoURL !== agent.chatbotLogoURL),
      currentLogoUrl: widgetSettings?.chatbotLogoURL,
      originalLogoUrl: agent.chatbotLogoURL
    });
    
    try {
      setIsSaving(true);
      setSaveStatus('saving');
      
      // Create basic update data with channel info
      const updateData: Partial<Agent> & { selectedLogoFile?: File | null } = {
        ...channels
      };
      
      // Handle logo upload
      let logoUrl = widgetSettings?.chatbotLogoURL;
      
      // IMPORTANT: Check if the logo was removed (chatbotLogoURL was set to null)
      const logoWasDeleted = 
        widgetSettings && 
        (widgetSettings.logoWasDeleted === true || 
         (widgetSettings.chatbotLogoURL === null && agent.chatbotLogoURL !== null));
        
      if (logoWasDeleted) {
        console.log("SaveChangesHandler: Logo was deleted, explicitly setting null in update data");
        // Explicitly include null chatbotLogoURL to remove from database
        updateData.chatbotLogoURL = null;
      }
      else if (widgetSettings?.selectedLogoFile) {
        setIsUploadingLogo(true);
        
        try {
          // Prepare form data for upload
          const formData = new FormData();
          formData.append('logo', widgetSettings.selectedLogoFile);
          formData.append('agentId', agent.id);
          
          // Upload the logo
          const response = await fetch('/api/upload-logo', {
            method: 'POST',
            body: formData
          });
          
          if (!response.ok) {
            throw new Error(`Logo upload failed: ${response.statusText}`);
          }
          
          const result = await response.json();
          logoUrl = result.logoUrl;
        } catch (error) {
          console.error("Error uploading logo:", error);
          toast.error("Failed to upload logo");
          throw error;
        } finally {
          setIsUploadingLogo(false);
        }
      }
      
      // Merge widget settings
      Object.assign(updateData, {
        chatTitle: widgetSettings?.chatTitle,
        iconType: widgetSettings?.iconType,
        riveOrbColor: widgetSettings?.riveOrbColor,
        borderGradientColors: widgetSettings?.borderGradientColors,
        displayBranding: widgetSettings?.displayBranding,
        chatFileAttachementEnabled: widgetSettings?.chatFileAttachementEnabled,
        buttonTheme: widgetSettings?.buttonTheme,
        bubbleColor: widgetSettings?.bubbleColor,
        bubbleTextColor: widgetSettings?.bubbleTextColor,
        chatBackgroundColor: widgetSettings?.chatBackgroundColor
      });
      
      // IMPORTANT: Only set chatbotLogoURL if we have a new logo or it was explicitly deleted
      // This ensures we don't accidentally overwrite an existing logo with undefined
      if (logoUrl !== undefined || logoWasDeleted) {
        updateData.chatbotLogoURL = logoUrl;
      }
      
      console.log("SaveChangesHandler: Final update data", {
        ...updateData,
        logoChanged: logoUrl !== agent.chatbotLogoURL || logoWasDeleted,
        hasLogoUrl: !!logoUrl,
        logoWasDeleted
      });
      
      // Save to server
      await onSave(updateData);
      
      setSaveStatus('success');
      toast.success("Changes saved successfully!");
      
      // Dispatch a settingsSaved event to notify other components
      try {
        window.dispatchEvent(new CustomEvent('settingsSaved', { 
          detail: { agentId: agent.id }
        }));
        console.log("SaveChangesHandler: Dispatched settingsSaved event");
      } catch (err) {
        console.error("Error dispatching settingsSaved event:", err);
      }
    } catch (error) {
      console.error("Error saving changes:", error);
      setSaveStatus('error');
      setErrorMessage(error instanceof Error ? error.message : "An error occurred");
      toast.error("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  }, [agent.id, agent.chatbotLogoURL, channels, isDirty, onSave, widgetSettings, channelsHasChanged, widgetSettingsHasChanged]);

  // Handle canceling changes
  const handleCancel = useCallback(() => {
    // Log what's being canceled
    console.log("SaveChangesHandler: Canceling changes", {
      hasPendingWidgetChanges: widgetSettingsHasChanged,
      hasPendingChannelChanges: channelsHasChanged,
      hasLogoChanges: !!widgetSettings?.selectedLogoFile || widgetSettings?.chatbotLogoURL !== agent.chatbotLogoURL
    });
    
    if (widgetSettingsHasChanged) {
      // Reset widget settings including any logo changes
      onResetWidgetSettings();
    }
    
    if (channelsHasChanged) {
      onResetChannels();
    }
    
    // Reset UI states
    setSaveStatus('idle');
    setErrorMessage('');
    
    // Force a DOM update to ensure components refresh after cancel
    setTimeout(() => {
      // Dispatch a special event to notify components about the cancel action
      try {
        window.dispatchEvent(new CustomEvent('settingsChangesCanceled', { 
          detail: { agentId: agent.id }
        }));
      } catch (e) {
        console.error("Error dispatching cancel event:", e);
      }
    }, 0);
  }, [agent.id, channelsHasChanged, onResetChannels, onResetWidgetSettings, widgetSettings, widgetSettingsHasChanged]);

  // Only render if there are unsaved changes
  if (!isDirty) {
    return null;
  }

  return (
    <FloatingActionCard 
      isSaving={isSaving}
      isDirty={isDirty}
      onSave={handleSaveChanges}
      onCancel={handleCancel}
      saveStatus={saveStatus}
      errorMessage={errorMessage}
    />
  );
} 