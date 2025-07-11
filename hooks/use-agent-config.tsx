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
  save: (saveFunction: (data: Agent) => Promise<Agent>) => Promise<Agent>;
  clearSaveStatus: () => void;
  
  // New: Force refresh from parent
  refreshFromParent: (parentAgent: Agent) => void;
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
  
  // Update current data when initial data changes (but only if not dirty)
  useEffect(() => {
    if (initialAgent && (!initialData || initialAgent.id !== initialData.id)) {
      console.log('[AgentConfigProvider] Initial agent changed, updating data');
      setInitialData(initialAgent);
      setCurrentData(initialAgent);
      setSaveStatus('idle');
      setErrorMessage('');
    }
  }, [initialAgent, initialData]);
  
  // Force refresh from parent (used after successful saves)
  const refreshFromParent = useCallback((parentAgent: Agent) => {
    console.log('[AgentConfigProvider] Force refreshing from parent agent', {
      agentId: parentAgent.id,
      agentName: parentAgent.name
    });
    
    setInitialData(parentAgent);
    setCurrentData(parentAgent);
    setSaveStatus('idle');
    setErrorMessage('');
  }, []);
  
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
  
  const save = useCallback(async (saveFunction: (data: Agent) => Promise<Agent>) => {
    if (!currentData || !isDirty) return currentData;
    
    try {
      setIsSaving(true);
      setSaveStatus('saving');
      setErrorMessage('');
      
      const updatedAgent = await saveFunction(currentData);
      
      // Update both initial and current data with the fresh data from the server
      setInitialData(updatedAgent);
      setCurrentData(updatedAgent);
      setSaveStatus('success');
      
      // Auto-reset status after 2 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
      
      return updatedAgent;
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
    refreshFromParent,
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
    refreshFromParent,
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