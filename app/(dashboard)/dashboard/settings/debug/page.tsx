"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { 
  configureLogging, 
  disableDebugLogging, 
  enableDebugForModules,
  resetLoggingToDefaults,
  noisyModules 
} from "@/lib/log-config"
import { logger } from "@/lib/logger"

export default function DebugSettings() {
  const [verbosity, setVerbosity] = useState<'low' | 'medium' | 'high'>('medium');
  const [enabledModules, setEnabledModules] = useState<string[]>(['api', 'core', 'agent']);
  const [customModule, setCustomModule] = useState('');
  
  // Test logs to demonstrate the effect of settings changes
  const logTestMessages = () => {
    logger.debug('This is a debug message', { testId: '123' }, 'test');
    logger.info('This is an info message', { testId: '123' }, 'test');
    logger.warn('This is a warning message', { testId: '123' }, 'test');
    logger.error('This is an error message', { testId: '123' }, 'test');
  }
  
  const updateLoggingSettings = () => {
    configureLogging({
      verbosity,
      enabledModules
    });
    
    // Log to show changes took effect
    logger.info('Logging settings updated', { 
      verbosity, 
      enabledModules 
    }, 'core');
    
    // Test new settings
    logTestMessages();
  }
  
  const toggleModule = (module: string, enabled: boolean) => {
    if (enabled) {
      setEnabledModules(prev => [...prev, module]);
    } else {
      setEnabledModules(prev => prev.filter(m => m !== module));
    }
  }
  
  const addCustomModule = () => {
    if (customModule && !enabledModules.includes(customModule)) {
      setEnabledModules(prev => [...prev, customModule]);
      setCustomModule('');
    }
  }
  
  useEffect(() => {
    // Apply settings when component mounts to ensure UI matches actual settings
    updateLoggingSettings();
  }, []);
  
  useEffect(() => {
    // Update when settings change
    updateLoggingSettings();
  }, [verbosity, enabledModules]);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Debug Settings</h1>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Logging Configuration</CardTitle>
            <CardDescription>
              Control what gets logged during development
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6">
              <div>
                <Label htmlFor="verbosity">Verbosity Level</Label>
                <Select 
                  value={verbosity} 
                  onValueChange={(val) => setVerbosity(val as 'low' | 'medium' | 'high')}
                >
                  <SelectTrigger id="verbosity">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low (Errors & Warnings Only)</SelectItem>
                    <SelectItem value="medium">Medium (Info, Errors & Warnings)</SelectItem>
                    <SelectItem value="high">High (All Logs Including Debug)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="mb-2 block">Enabled Log Modules</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="core" 
                        checked={enabledModules.includes('core')}
                        onCheckedChange={(checked) => toggleModule('core', checked)}
                      />
                      <Label htmlFor="core">Core System</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="api" 
                        checked={enabledModules.includes('api')}
                        onCheckedChange={(checked) => toggleModule('api', checked)}
                      />
                      <Label htmlFor="api">API Requests</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="agent" 
                        checked={enabledModules.includes('agent')}
                        onCheckedChange={(checked) => toggleModule('agent', checked)}
                      />
                      <Label htmlFor="agent">Agent System</Label>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="matching" 
                        checked={enabledModules.includes('matching')}
                        onCheckedChange={(checked) => toggleModule('matching', checked)}
                      />
                      <Label htmlFor="matching">Agent Matching</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="ui-updates" 
                        checked={enabledModules.includes('ui-updates')}
                        onCheckedChange={(checked) => toggleModule('ui-updates', checked)}
                      />
                      <Label htmlFor="ui-updates">UI Updates</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="animation" 
                        checked={enabledModules.includes('animation')}
                        onCheckedChange={(checked) => toggleModule('animation', checked)}
                      />
                      <Label htmlFor="animation">Animations</Label>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label htmlFor="custom-module">Add Custom Module</Label>
                  <Input
                    id="custom-module"
                    value={customModule}
                    onChange={(e) => setCustomModule(e.target.value)}
                    placeholder="Enter module name" 
                  />
                </div>
                <Button onClick={addCustomModule}>Add</Button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <div className="space-x-2">
              <Button variant="secondary" onClick={() => disableDebugLogging()}>
                Disable All Debug
              </Button>
              <Button variant="secondary" onClick={() => resetLoggingToDefaults()}>
                Reset to Defaults
              </Button>
            </div>
            <Button 
              variant="primary" 
              onClick={logTestMessages}
            >
              Test Log Output
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Current Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="p-4 bg-muted rounded-xl overflow-auto max-h-60">
              {JSON.stringify({verbosity, enabledModules}, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 