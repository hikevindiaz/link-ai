"use client";

import { useState, useEffect, useCallback, ReactNode } from "react";
import { Agent } from "@/types/agent";
import { UniversalSavingCard } from "@/components/universal-saving-card";
import { toast } from "sonner";
import { useAgentConfig } from "@/hooks/use-agent-config";

interface UniversalTabWrapperProps {
  children: ReactNode;
  tabName: string;
  agent: Agent;
  onSave: (data: Partial<Agent>) => Promise<Agent>;
  // Custom save handler for tabs that need special logic
  customSaveHandler?: (data: Partial<Agent>) => Promise<Partial<Agent>>;
}

/**
 * Universal tab wrapper that provides consistent save functionality
 * across all agent configuration tabs. Uses the UniversalSavingCard
 * for a consistent UI and handles all the save logic.
 */
export function UniversalTabWrapper({
  children,
  tabName,
  agent,
  onSave,
  customSaveHandler
}: UniversalTabWrapperProps) {
  const {
    currentData,
    isDirty,
    isSaving,
    saveStatus,
    errorMessage,
    save,
    resetToInitialData,
    refreshFromParent
  } = useAgentConfig();
  
  const [localErrorMessage, setLocalErrorMessage] = useState("");
  
  // Sync with parent agent changes
  useEffect(() => {
    if (agent && currentData && agent.id === currentData.id) {
      // Check if the parent agent has been updated (e.g., after a save from another tab)
      if (JSON.stringify(agent) !== JSON.stringify(currentData) && !isDirty) {
        console.log(`[${tabName}TabWrapper] Parent agent updated, refreshing local state`);
        refreshFromParent(agent);
      }
    }
  }, [agent, currentData, isDirty, refreshFromParent, tabName]);
  
  // Handle save operation
  const handleSave = useCallback(async () => {
    if (!isDirty || !currentData) return;
    
    try {
      setLocalErrorMessage("");
      
      // If there's a custom save handler, use it to prepare the data
      let saveData = currentData;
      if (customSaveHandler) {
        const customData = await customSaveHandler(currentData);
        saveData = { ...currentData, ...customData };
      }
      
      // Use the AgentConfig save function which handles the state management
      const updatedAgent = await save(async (data) => {
        console.log(`[${tabName}TabWrapper] Saving data:`, data);
        
        // Call the parent's onSave function
        const result = await onSave(data);
        
        // The parent onSave should return the updated agent
        return result;
      });
      
      console.log(`[${tabName}TabWrapper] Save successful, updated agent:`, updatedAgent);
      
      toast.success(`${tabName} settings saved successfully!`);
      
    } catch (error) {
      console.error(`[${tabName}TabWrapper] Save failed:`, error);
      const errorMsg = error instanceof Error ? error.message : 'An error occurred while saving';
      setLocalErrorMessage(errorMsg);
      toast.error(`Failed to save ${tabName} settings: ${errorMsg}`);
    }
  }, [isDirty, currentData, customSaveHandler, save, onSave, tabName]);
  
  // Handle cancel operation
  const handleCancel = useCallback(() => {
    resetToInitialData();
    setLocalErrorMessage("");
    toast.info(`${tabName} changes discarded`);
  }, [resetToInitialData, tabName]);
  
  // Use the error message from the context or local state
  const displayErrorMessage = errorMessage || localErrorMessage;
  
  return (
    <div className="relative">
      {children}
      
      {/* Universal Saving Card */}
      <UniversalSavingCard
        isDirty={isDirty}
        isSaving={isSaving}
        saveStatus={saveStatus}
        errorMessage={displayErrorMessage}
        onSave={handleSave}
        onDiscard={handleCancel}
        position="fixed-bottom"
      />
    </div>
  );
} 