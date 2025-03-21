import { useState, useCallback } from 'react'

interface AddonConfig {
  [key: string]: any // We'll type this properly based on addon types
}

export function useAddonConfig(agentId: string) {
  const [configs, setConfigs] = useState<Record<string, AddonConfig>>({})
  
  const updateConfig = useCallback((addonId: string, config: AddonConfig) => {
    setConfigs(prev => ({
      ...prev,
      [addonId]: config
    }))
  }, [])

  return {
    configs,
    updateConfig
  }
} 