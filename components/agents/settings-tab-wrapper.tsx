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
  // Start with card hidden - only show when changes are made
  const [showCard, setShowCard] = useState(false);

  // Reset showCard when component mounts
  useEffect(() => {
    setShowCard(false);
  }, []);

  // Control when to show the card based on isDirty and save status
  useEffect(() => {
    console.log("isDirty changed:", isDirty);
    
    if (isDirty) {
      // When changes are detected, show the card
      setShowCard(true);
    } else if (saveStatus === 'success') {
      // After successful save, hide after delay
      const timer = setTimeout(() => {
        setShowCard(false);
        setSaveStatus('idle');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isDirty, saveStatus]);

  const handleSave = async () => {
    if (!isDirty) {
      // Nothing to save, don't show the saving UI
      return;
    }
    
    setIsSaving(true);
    setSaveStatus('saving');
    setErrorMessage('');
    
    try {
      await onSave();
      
      toast.success(`${tabName} settings saved successfully`);
      setSaveStatus('success');
      
      // The card will auto-hide via the useEffect
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
    // Prevent canceling while saving
    if (isSaving) return;
    
    // Call the provided onCancel to reset form values
    onCancel();
    
    // Reset our UI state
    setSaveStatus('idle');
    setErrorMessage('');
    setShowCard(false);
  };

  return (
    <div className="relative">
      {children}
      
      {showCard && (
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