import { FormLabel, FormDescription } from "@/components/ui/form";
import { LogoUpload } from "../LogoUpload";
import { Agent } from "@/types/agent";
import { useState, useEffect, useCallback } from "react";

interface LogoUploadSectionProps {
  agent: Agent;
  handleLogoSelectedFromUploader: (file: File | null) => void;
  handleClearSavedLogoFromUploader: () => void;
  isUploadingLogo?: boolean;
}

export const LogoUploadSection = ({ 
  agent, 
  handleLogoSelectedFromUploader, 
  handleClearSavedLogoFromUploader, 
  isUploadingLogo 
}: LogoUploadSectionProps) => {
  // Track if we have a visible logo already
  const [hasLogo, setHasLogo] = useState<boolean>(!!agent.chatbotLogoURL);

  // Update hasLogo status when agent changes
  useEffect(() => {
    setHasLogo(!!agent.chatbotLogoURL);
    
    // Log for debugging
    console.log("LogoUploadSection: Agent logo URL changed", {
      hasLogo: !!agent.chatbotLogoURL,
      logoUrl: agent.chatbotLogoURL
    });
  }, [agent.chatbotLogoURL]);

  // Update local state when a logo is selected or cleared
  const handleLogoSelected = useCallback((file: File | null) => {
    console.log("LogoUploadSection: Logo selected", { hasFile: !!file });
    
    // Update parent component
    handleLogoSelectedFromUploader(file);
    
    // Update local state to show we have a logo
    if (file) {
      setHasLogo(true);
    }
  }, [handleLogoSelectedFromUploader]);

  // Handle logo deletion
  const handleClearLogo = useCallback(() => {
    console.log("LogoUploadSection: Logo cleared");
    
    // Update parent component - this will mark the change as requiring save
    // and ensure the logo is deleted from the database when saved
    handleClearSavedLogoFromUploader();
    
    // Update local state to show we don't have a logo
    // This ensures the upload form appears immediately
    setHasLogo(false);
    
    // Log status after clearing with more explicit information
    console.log("LogoUploadSection: Logo deletion requested - will be deleted from storage on save", {
      agentId: agent.id,
      previousLogoUrl: agent.chatbotLogoURL
    });
  }, [handleClearSavedLogoFromUploader, agent.id, agent.chatbotLogoURL]);

  // Add an effect to ensure the LogoUploadSection keeps in sync with agent changes
  // which would happen if the user cancels unsaved changes
  useEffect(() => {
    // When agent changes, synchronize logo state
    // This will restore the original logo display if cancel is clicked
    const newHasLogo = !!agent.chatbotLogoURL;
    if (hasLogo !== newHasLogo) {
      setHasLogo(newHasLogo);
      console.log("LogoUploadSection: Syncing logo state after agent change", {
        previousState: hasLogo,
        newState: newHasLogo,
        agentLogo: agent.chatbotLogoURL
      });
    }
  }, [agent.chatbotLogoURL, hasLogo]);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <FormLabel className="text-sm font-medium text-gray-900 dark:text-gray-50">
        Custom Logo
      </FormLabel>
      <LogoUpload 
        currentLogoUrl={agent.chatbotLogoURL} 
        onLogoSelected={handleLogoSelected}
        onClearSavedLogo={handleClearLogo}
        isLoading={isUploadingLogo}
        chatbotId={agent.id}
      />
      <FormDescription className="text-xs text-gray-500 dark:text-gray-500">
        Upload a PNG, JPG, GIF or SVG. Displayed as a circle. Max 2MB. Recommended: 128x128px.
      </FormDescription>
    </div>
  );
}; 