import { useState, useCallback } from 'react';
import { FloatingActionCard } from '@/components/agents/floating-action-card';
import { Agent } from '@/types/agent';
import { ExtendedWidgetConfigData } from '../hooks/useWidgetSettings';
import { ChannelState } from '../hooks/useChannelState';
import { toast } from 'sonner';
import { logger } from '../logger';

interface SaveChangesHandlerProps {
  agent: Agent;
  channelState: ChannelState;
  widgetSettings: ExtendedWidgetConfigData | null;
  isDirty: boolean;
  isUploadingLogo: boolean;
  setIsUploadingLogo: (uploading: boolean) => void;
  onSave: (data: Partial<Agent>) => Promise<void>;
  onCancel: () => void;
}

/**
 * Component to handle saving agent channel and widget settings
 */
export function SaveChangesHandler({
  agent,
  channelState,
  widgetSettings,
  isDirty,
  isUploadingLogo,
  setIsUploadingLogo,
  onSave,
  onCancel
}: SaveChangesHandlerProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Handler for saving changes
  const handleSaveChanges = useCallback(async () => {
    if (!isDirty) return;
    
    logger.debug('SaveChangesHandler', 'Saving changes', {
      channelState,
      hasWidgetSettings: !!widgetSettings,
      hasLogoFile: !!widgetSettings?.selectedLogoFile
    });
    
    try {
      setIsSaving(true);
      setSaveStatus('saving');
      setErrorMessage('');
      
      // Base update data with channel states
      const updateData: Partial<Agent> & { selectedLogoFile?: File | null; chatbotLogoURL?: string | null } = {
        ...channelState
      };
      
      // Handle logo upload if needed
      let logoUrl = widgetSettings?.chatbotLogoURL;
      if (widgetSettings?.selectedLogoFile) {
        setIsUploadingLogo(true);
        
        try {
          logger.debug('SaveChangesHandler', 'Uploading logo file', { 
            fileName: widgetSettings.selectedLogoFile.name,
            fileSize: widgetSettings.selectedLogoFile.size
          });
          
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
          
          logger.debug('SaveChangesHandler', 'Logo uploaded successfully', { logoUrl });
        } catch (error) {
          logger.error('SaveChangesHandler', 'Error uploading logo', error);
          toast.error('Failed to upload logo');
          throw error;
        } finally {
          setIsUploadingLogo(false);
        }
      }
      
      // Add widget settings if available
      if (widgetSettings) {
        // Extract fields we don't want to send to the API
        const { selectedLogoFile, fromUserInteraction, fromInitialLoad, ...settings } = widgetSettings;
        
        // Add settings to update data
        Object.assign(updateData, settings);
        
        // Update with the new logo URL if we uploaded one
        if (logoUrl) {
          updateData.chatbotLogoURL = logoUrl;
        }
      }
      
      // Save changes
      await onSave(updateData);
      
      // Update status
      setSaveStatus('success');
      toast.success('Channels updated successfully!');
      logger.debug('SaveChangesHandler', 'Changes saved successfully');
    } catch (error) {
      // Handle errors
      const errorMsg = error instanceof Error ? error.message : String(error);
      setSaveStatus('error');
      setErrorMessage(errorMsg);
      logger.error('SaveChangesHandler', 'Error saving changes', error);
      toast.error('Failed to update channels');
    } finally {
      setIsSaving(false);
    }
  }, [
    agent.id,
    channelState,
    widgetSettings,
    isDirty,
    onSave,
    setIsUploadingLogo
  ]);
  
  // Don't render anything if there's nothing to save
  if (!isDirty) return null;
  
  return (
    <FloatingActionCard
      isSaving={isSaving}
      isDirty={isDirty}
      onSave={handleSaveChanges}
      onCancel={onCancel}
      saveStatus={saveStatus}
      errorMessage={errorMessage}
    />
  );
} 