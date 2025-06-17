import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import type { Agent } from "@/types/agent";
import { Database, Thermometer, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { SettingsTabWrapper } from "../settings-tab-wrapper";

interface KnowledgeSource {
  id: string;
  name: string;
  description?: string;
  vectorStoreId?: string;
}

interface LLMTabProps {
  agent: Agent;
  onSave: (data: Partial<Agent>) => Promise<any>;
}

// Default model selection - only GPT-4o mini is available
const DEFAULT_MODEL_ID = "gpt-4.1-mini-2025-04-14";

// Saving process steps messages
const SAVING_STEPS = [
  "Initializing save process...",
  "Preparing agent configuration...",
  "Training agent with knowledge source...",
  "Optimizing memory patterns...",
  "Configuring language model parameters...",
  "Finalizing agent settings..."
];

export function LLMTab({ agent, onSave }: LLMTabProps) {
  const [temperature, setTemperature] = useState<number>(agent.temperature || 0.7);
  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSource[]>([]);
  const [selectedKnowledgeSource, setSelectedKnowledgeSource] = useState<string>(
    agent.knowledgeSources && agent.knowledgeSources.length > 0 
      ? agent.knowledgeSources[0].id 
      : "none"
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Badge status state
  const [badgeStatus, setBadgeStatus] = useState<{
    status: "Untrained" | "Trained" | "Checking";
    variant: "warning" | "success" | "default";
  }>({ status: "Checking", variant: "default" });
  
  // Saving progress state
  const [saveProgress, setSaveProgress] = useState(0);
  const [savingStep, setSavingStep] = useState("");
  const [showSavingProgress, setShowSavingProgress] = useState(false);
  
  // Keep track of the previous knowledge source selection for change detection
  const prevSelectedSourceRef = useRef(selectedKnowledgeSource);

  // Initialize state with agent data on component mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setBadgeStatus({ status: "Checking", variant: "default" });
      
      try {
        // Set initial values from agent
        setTemperature(agent.temperature || 0.7);
        
        if (agent.knowledgeSources && agent.knowledgeSources.length > 0) {
          setSelectedKnowledgeSource(agent.knowledgeSources[0].id);
          prevSelectedSourceRef.current = agent.knowledgeSources[0].id;
        } else {
          setSelectedKnowledgeSource("none");
          prevSelectedSourceRef.current = "none";
        }
        
        // Fetch knowledge sources
        const response = await fetch('/api/knowledge-sources');
        if (!response.ok) {
          throw new Error(`Failed to fetch knowledge sources: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        setKnowledgeSources(data);
        
        // Update badge status based on agent data
        updateBadgeStatus();
      } catch (error) {
        console.error('Error initializing:', error);
        toast.error(`Failed to load data: ${error instanceof Error ? error.message : String(error)}`);
        setBadgeStatus({ status: "Untrained", variant: "warning" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [agent.id]);

  // Update badge status based on agent data
  const updateBadgeStatus = () => {
    // Check if agent has knowledge sources
    const hasKnowledgeSource = agent.knowledgeSources && agent.knowledgeSources.length > 0;
    
    if (!hasKnowledgeSource) {
      setBadgeStatus({ status: "Untrained", variant: "warning" });
      return;
    }
    
    // Check if the knowledge source has a vector store ID (indicating it's trained)
    const knowledgeSource = agent.knowledgeSources[0];
    if (knowledgeSource.vectorStoreId) {
      setBadgeStatus({ status: "Trained", variant: "success" });
    } else {
      setBadgeStatus({ status: "Untrained", variant: "warning" });
    }
  };

  // Check if any values have changed
  useEffect(() => {
    if (!isLoading) {
      const hasTemperatureChanged = temperature !== agent.temperature;
      
      // Check if knowledge source has changed
      let hasKnowledgeSourceChanged = false;
      if (agent.knowledgeSources && agent.knowledgeSources.length > 0) {
        hasKnowledgeSourceChanged = selectedKnowledgeSource !== agent.knowledgeSources[0].id;
      } else {
        hasKnowledgeSourceChanged = selectedKnowledgeSource !== "none";
      }

      setIsDirty(hasTemperatureChanged || hasKnowledgeSourceChanged);
    }
  }, [temperature, selectedKnowledgeSource, agent, isLoading]);

  const handleTemperatureChange = (value: number[]) => {
    setTemperature(Number(value[0].toFixed(1)));
  };

  const handleKnowledgeSourceChange = (value: string) => {
    setSelectedKnowledgeSource(value);
  };

  // Simulate progress for the saving process
  const simulateSavingProgress = () => {
    setShowSavingProgress(true);
    setSaveProgress(0);
    let step = 0;
    
    // Set initial step message
    setSavingStep(SAVING_STEPS[0]);
    
    // Progress interval (total ~3 seconds)
    const interval = setInterval(() => {
      setSaveProgress(prev => {
        const newProgress = prev + Math.floor(Math.random() * 5) + 3; // Random progress increment
        
        // Update step message based on progress
        if (newProgress >= 20 && step < 1) {
          step = 1;
          setSavingStep(SAVING_STEPS[1]);
        } else if (newProgress >= 40 && step < 2) {
          step = 2;
          setSavingStep(SAVING_STEPS[2]);
        } else if (newProgress >= 60 && step < 3) {
          step = 3;
          setSavingStep(SAVING_STEPS[3]);
        } else if (newProgress >= 75 && step < 4) {
          step = 4;
          setSavingStep(SAVING_STEPS[4]);
        } else if (newProgress >= 90 && step < 5) {
          step = 5;
          setSavingStep(SAVING_STEPS[5]);
        }
        
        // Cap at 95% - the final 5% will happen after the save completes
        return Math.min(newProgress, 95);
      });
    }, 150);
    
    return interval;
  };

  const handleSaveSettings = async () => {
    if (isSaving) return;
    
    // Show checking status in badge
    setBadgeStatus({ status: "Checking", variant: "default" });
    
    // Start the progress simulation
    const progressInterval = simulateSavingProgress();
    
    try {
      setIsSaving(true);
      const selectedSource = knowledgeSources.find(ks => ks.id === selectedKnowledgeSource);
      
      const saveData = {
        modelId: DEFAULT_MODEL_ID, // Always use the default model
        temperature: temperature,
        // Only include knowledge sources if not "none"
        knowledgeSources: selectedKnowledgeSource !== "none" && selectedSource 
          ? [{ 
              id: selectedSource.id, 
              name: selectedSource.name,
              description: selectedSource.description,
              vectorStoreId: selectedSource.vectorStoreId
            }] 
          : [],
      };
      
      // Track the previous selection to determine if it was changed to/from "none"
      const wasNone = prevSelectedSourceRef.current === "none";
      const isNowNone = selectedKnowledgeSource === "none";
      const changedToNone = !wasNone && isNowNone;
      const changedFromNone = wasNone && !isNowNone;
      
      // Update the ref to the current selection
      prevSelectedSourceRef.current = selectedKnowledgeSource;
      
      // Delay slightly to let the progress bar animate
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Actually save the data
      const updatedAgent = await onSave(saveData);
      
      // Complete the progress
      setSaveProgress(100);
      setSavingStep("Settings saved successfully!");
      
      // Update badge status based on new agent data
      if (selectedKnowledgeSource === "none") {
        setBadgeStatus({ status: "Untrained", variant: "warning" });
      } else if (selectedSource?.vectorStoreId) {
        setBadgeStatus({ status: "Trained", variant: "success" });
      } else {
        setBadgeStatus({ status: "Untrained", variant: "warning" });
      }
      
      // Hide progress after completion
      setTimeout(() => {
        setShowSavingProgress(false);
      }, 2000); // Increased to 2 seconds for the success message to be visible longer
      
      setIsDirty(false);
      
      const successMessage = changedToNone 
        ? "Knowledge source removed from agent" 
        : changedFromNone 
          ? "Knowledge source added to agent"
          : "Settings saved successfully";
      
      toast.success(successMessage, {
        duration: 5000,
        icon: <Database className="h-5 w-5 text-neutral-500 animate-bounce" />,
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      setShowSavingProgress(false);
      toast.error(`Failed to save settings: ${error instanceof Error ? error.message : String(error)}`);
      // Reset badge status on error
      updateBadgeStatus();
    } finally {
      clearInterval(progressInterval);
      setIsSaving(false);
    }
  };
  
  const handleCancel = () => {
    // Reset to original values
    setTemperature(agent.temperature || 0.7);
    
    if (agent.knowledgeSources && agent.knowledgeSources.length > 0) {
      setSelectedKnowledgeSource(agent.knowledgeSources[0].id);
      prevSelectedSourceRef.current = agent.knowledgeSources[0].id;
    } else {
      setSelectedKnowledgeSource("none");
      prevSelectedSourceRef.current = "none";
    }
    
    setIsDirty(false);
  };

  // Navigate to knowledge source page
  const navigateToKnowledgeSource = () => {
    const sourceId = selectedKnowledgeSource;
    if (sourceId !== "none") {
      window.location.href = `/dashboard/knowledge-base/${sourceId}`;
    }
  };

  return (
    <SettingsTabWrapper
      tabName="LLM"
      isDirty={isDirty}
      onSave={handleSaveSettings}
      onCancel={handleCancel}
    >
      <div className="space-y-6 pt-0 relative">
        {/* Dynamic Saving Progress Overlay */}
        {showSavingProgress && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-lg max-w-md w-full">
              <div className="flex items-center space-x-2 mb-4">
                <Save className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                <h3 className="text-lg font-medium">Saving Agent Settings</h3>
              </div>
              
              <Progress 
                value={saveProgress} 
                className="h-2 mb-2 bg-neutral-200 dark:bg-neutral-700 [&>div]:bg-neutral-600 dark:[&>div]:bg-neutral-400" 
              />
              
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">{savingStep}</p>
              
              <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-4">
                {saveProgress < 100 
                  ? "Please don't close this window while saving..."
                  : "Save completed successfully!"}
              </p>
            </div>
          </div>
        )}

        {/* Knowledge Source - First Card */}
        <Card className="overflow-hidden p-0 bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
          <div className="border-b border-neutral-200 bg-neutral-100 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                <Label className="font-medium text-neutral-900 dark:text-neutral-50">Knowledge Source</Label>
              </div>
              <Badge 
                variant={badgeStatus.variant}
                className={`text-xs flex items-center gap-1 ${
                  badgeStatus.status === "Trained" 
                    ? "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200"
                    : badgeStatus.status === "Untrained"
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                    : ""
                }`}
              >
                {badgeStatus.status === "Checking" && (
                  <Loader2 className="h-3 w-3 animate-spin" />
                )}
                {badgeStatus.status}
              </Badge>
            </div>
          </div>
          <div className="p-3 bg-white dark:bg-neutral-900">
            <div className="flex-1">
              <div className="relative">
                <Database className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500 dark:text-neutral-400 z-10" />
                <Select 
                  value={selectedKnowledgeSource} 
                  onValueChange={handleKnowledgeSourceChange}
                  disabled={isLoading || isSaving}
                >
                  <SelectTrigger className="pl-9">
                    <SelectValue placeholder={isLoading ? "Loading knowledge sources..." : "Select knowledge source"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Prompt Only)</SelectItem>
                    
                    {knowledgeSources.length > 0 && (
                      knowledgeSources.map((source) => (
                        <SelectItem key={source.id} value={source.id}>
                          {source.name}
                        </SelectItem>
                      ))
                    )}
                    
                    {knowledgeSources.length === 0 && !isLoading && (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No knowledge sources found. Create one in the Knowledge section.
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <p className="mt-2 text-sm/6 text-neutral-500 dark:text-neutral-400">
                Link a knowledge source to enhance your agent with custom data.
              </p>
              {selectedKnowledgeSource !== "none" && (
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="mt-3"
                  onClick={navigateToKnowledgeSource}
                  disabled={isSaving}
                >
                  <Database className="mr-2 h-4 w-4" />
                  Manage Knowledge Source
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Temperature */}
        <Card className="overflow-hidden p-0 bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
          <div className="border-b border-neutral-200 bg-neutral-100 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-800">
            <div className="flex items-center gap-2">
              <Thermometer className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
              <Label className="font-medium text-neutral-900 dark:text-neutral-50">Temperature</Label>
            </div>
          </div>
          <div className="p-3 bg-white dark:bg-neutral-900">
            <div className="space-y-4">
              <Slider
                value={[temperature]}
                onValueChange={handleTemperatureChange}
                min={0}
                max={1}
                step={0.1}
                className="w-full"
                disabled={isSaving}
              />
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Current level:
                <span className="ml-1 font-semibold text-neutral-900 dark:text-neutral-50">
                  {temperature < 0.3 ? "Precise" : 
                   temperature < 0.7 ? "Balanced" : "Creative"}
                  ({temperature.toFixed(1)})
                </span>
              </p>
              <p className="mt-4 text-sm/6 text-neutral-500 dark:text-neutral-400">
                Higher temperature increases creativity but may reduce accuracy.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </SettingsTabWrapper>
  );
}