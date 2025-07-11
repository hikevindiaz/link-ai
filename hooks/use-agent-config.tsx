"use client";

import { createContext, useContext, useCallback, useMemo, useState, useEffect, ReactNode } from "react";
import { Agent } from "@/types/agent";
import { isEqual } from "lodash";

interface AgentConfigContextType {
  // Initial data (unchanged from server)
  initialData: Agent | null;
  
  // Current data (modified by user)
  currentData: Agent | null;
  
  // Dirty state tracking
  isDirty: boolean;
  
  // Saving state
  isSaving: boolean;
  saveStatus: 'idle' | 'saving' | 'success' | 'error';
  errorMessage: string;
  
  // Actions
  setInitialData: (data: Agent) => void;
  updateCurrentData: (updates: Partial<Agent>) => void;
  resetToInitialData: () => void;
  save: (saveFunction: (data: Agent) => Promise<void>) => Promise<void>;
  clearSaveStatus: () => void;
}

const AgentConfigContext = createContext<AgentConfigContextType | undefined>(undefined);

interface AgentConfigProviderProps {
  children: ReactNode;
  initialAgent?: Agent;
}

export function AgentConfigProvider({ children, initialAgent }: AgentConfigProviderProps) {
  const [initialData, setInitialData] = useState<Agent | null>(initialAgent || null);
  const [currentData, setCurrentData] = useState<Agent | null>(initialAgent || null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Calculate isDirty by comparing initialData and currentData
  const isDirty = useMemo(() => {
    if (!initialData || !currentData) return false;
    return !isEqual(initialData, currentData);
  }, [initialData, currentData]);
  
  // Update current data when initial data changes
  useEffect(() => {
    if (initialAgent && (!initialData || initialAgent.id !== initialData.id)) {
      setInitialData(initialAgent);
      setCurrentData(initialAgent);
    }
  }, [initialAgent, initialData]);
  
  const handleSetInitialData = useCallback((data: Agent) => {
    setInitialData(data);
    setCurrentData(data);
    setSaveStatus('idle');
    setErrorMessage('');
  }, []);
  
  const updateCurrentData = useCallback((updates: Partial<Agent>) => {
    setCurrentData(prev => prev ? { ...prev, ...updates } : null);
  }, []);
  
  const resetToInitialData = useCallback(() => {
    if (initialData) {
      setCurrentData({ ...initialData });
      setSaveStatus('idle');
      setErrorMessage('');
    }
  }, [initialData]);
  
  const save = useCallback(async (saveFunction: (data: Agent) => Promise<void>) => {
    if (!currentData || !isDirty) return;
    
    try {
      setIsSaving(true);
      setSaveStatus('saving');
      setErrorMessage('');
      
      await saveFunction(currentData);
      
      // Update initial data to match current data after successful save
      setInitialData({ ...currentData });
      setSaveStatus('success');
      
      // Auto-reset status after 2 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    } catch (error) {
      console.error('Save failed:', error);
      setSaveStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'An error occurred while saving');
      throw error; // Re-throw to allow caller to handle
    } finally {
      setIsSaving(false);
    }
  }, [currentData, isDirty]);
  
  const clearSaveStatus = useCallback(() => {
    setSaveStatus('idle');
    setErrorMessage('');
  }, []);
  
  const contextValue = useMemo(() => ({
    initialData,
    currentData,
    isDirty,
    isSaving,
    saveStatus,
    errorMessage,
    setInitialData: handleSetInitialData,
    updateCurrentData,
    resetToInitialData,
    save,
    clearSaveStatus,
  }), [
    initialData,
    currentData,
    isDirty,
    isSaving,
    saveStatus,
    errorMessage,
    handleSetInitialData,
    updateCurrentData,
    resetToInitialData,
    save,
    clearSaveStatus,
  ]);
  
  return (
    <AgentConfigContext.Provider value={contextValue}>
      {children}
    </AgentConfigContext.Provider>
  );
}

export function useAgentConfig() {
  const context = useContext(AgentConfigContext);
  if (context === undefined) {
    throw new Error('useAgentConfig must be used within an AgentConfigProvider');
  }
  return context;
}

// Helper hook for managing specific field changes
export function useAgentConfigField<T>(
  fieldName: keyof Agent,
  initialValue?: T
): [T, (value: T) => void, boolean] {
  const { currentData, updateCurrentData, initialData } = useAgentConfig();
  
  const currentValue = (currentData?.[fieldName] as T) || initialValue;
  const initialFieldValue = (initialData?.[fieldName] as T) || initialValue;
  
  const updateField = useCallback((value: T) => {
    updateCurrentData({ [fieldName]: value } as Partial<Agent>);
  }, [fieldName, updateCurrentData]);
  
  const isFieldDirty = !isEqual(currentValue, initialFieldValue);
  
  return [currentValue, updateField, isFieldDirty];
} 