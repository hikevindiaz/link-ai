"use client";

import { useState, useEffect, ReactNode } from "react";
import { FloatingActionCard } from "./floating-action-card";
import { toast } from "sonner";

interface SettingsTabWrapperProps {
  children: ReactNode;
  isDirty: boolean;
  onSave: () => Promise<void>;
  onCancel: () => void;
  tabName: string;
}

/**
 * A wrapper component that provides a consistent way to handle saving changes
 * across all agent settings tabs.
 */
export function SettingsTabWrapper({
  children,
  isDirty,
  onSave,
  onCancel,
  tabName
}: SettingsTabWrapperProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('saving');
    setErrorMessage('');
    
    try {
      await onSave();
      
      toast.success(`${tabName} settings saved successfully`);
      setSaveStatus('success');
      
      // Reset the save status after 3 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    } catch (error) {
      console.error(`Error saving ${tabName} settings:`, error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      toast.error(`Failed to save ${tabName} settings: ${errorMsg}`);
      setSaveStatus('error');
      setErrorMessage(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setSaveStatus('idle');
    setErrorMessage('');
    onCancel();
  };

  return (
    <div className="relative">
      {children}
      
      {isDirty && (
        <FloatingActionCard 
          isSaving={isSaving}
          isDirty={isDirty}
          onSave={handleSave}
          onCancel={handleCancel}
          saveStatus={saveStatus}
          errorMessage={errorMessage}
        />
      )}
    </div>
  );
} 