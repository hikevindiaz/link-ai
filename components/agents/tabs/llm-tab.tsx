import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import type { Agent } from "@/types/agent";
import { Bot, Brain, Settings, Codepen, Database, ArrowRightCircle, Sparkles, Thermometer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Loader2, RefreshCw } from "lucide-react";
import { SettingsTabWrapper } from "../settings-tab-wrapper";

interface ChatbotModel {
  id: string;
  name: string;
}

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

// List of additional models to show as disabled
const DISABLED_MODELS = [
  "gpt-4o-2024-05-13",
  "gpt-4-turbo-2024-04-09",
  "claude-3-opus-20240229",
  "claude-3-sonnet-20240229",
  "llama-3-70b-instruct",
  "mistral-large-2",
  "gemini-1.5-pro-latest"
];

interface TrainingOptions {
  forceRetrain: boolean;
  optimizeForSpeed: boolean;
}

interface TrainingStatus {
  status: "idle" | "training" | "success" | "error";
  lastTrainedAt?: Date | null;
  message?: string;
  progress?: number;
}

export function LLMTab({ agent, onSave }: LLMTabProps) {
  const [temperature, setTemperature] = useState<number>(agent.temperature || 0.7);
  const [models, setModels] = useState<ChatbotModel[]>([]);
  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSource[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>(agent.modelId || "");
  const [selectedKnowledgeSource, setSelectedKnowledgeSource] = useState<string>(
    agent.knowledgeSources && agent.knowledgeSources.length > 0 
      ? agent.knowledgeSources[0].id 
      : "none"
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  
  // Training related states
  const [showTrainingOptions, setShowTrainingOptions] = useState(false);
  const [trainingOptions, setTrainingOptions] = useState<TrainingOptions>({
    forceRetrain: false,
    optimizeForSpeed: true,
  });
  const [trainingStatus, setTrainingStatus] = useState<TrainingStatus>({
    status: agent.trainingStatus || "idle",
    lastTrainedAt: agent.lastTrainedAt ? new Date(agent.lastTrainedAt) : null,
    message: agent.trainingMessage || "",
    progress: 0,
  });

  // Initialize state with agent data on first render
  useEffect(() => {
    if (agent) {
      setSelectedModel(agent.modelId || "");
      setTemperature(agent.temperature || 0.7);
      
      if (agent.knowledgeSources && agent.knowledgeSources.length > 0) {
        setSelectedKnowledgeSource(agent.knowledgeSources[0].id);
        console.log("Initial knowledge source set to:", agent.knowledgeSources[0].id, 
          "with vectorStoreId:", agent.knowledgeSources[0].vectorStoreId);
      } else {
        setSelectedKnowledgeSource("none");
      }
    }
  }, []);

  // Fetch models and knowledge sources on component mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch models
        const modelsResponse = await fetch('/api/models');
        if (!modelsResponse.ok) {
          throw new Error(`Failed to fetch models: ${modelsResponse.status} ${modelsResponse.statusText}`);
        }
        const modelsData = await modelsResponse.json();
        console.log("Models fetched:", modelsData);
        setModels(modelsData);

        // Fetch knowledge sources
        const knowledgeResponse = await fetch('/api/knowledge-sources');
        if (!knowledgeResponse.ok) {
          throw new Error(`Failed to fetch knowledge sources: ${knowledgeResponse.status} ${knowledgeResponse.statusText}`);
        }
        const knowledgeData = await knowledgeResponse.json();
        console.log("Knowledge sources fetched:", knowledgeData);
        setKnowledgeSources(knowledgeData);

        // Set initial selected knowledge source if it exists in the fetched sources
        if (agent.knowledgeSources && agent.knowledgeSources.length > 0) {
          const sourceId = agent.knowledgeSources[0].id;
          const sourceExists = knowledgeData.some((source: KnowledgeSource) => source.id === sourceId);
          
          if (sourceExists) {
            console.log("Setting knowledge source from agent data:", sourceId);
            setSelectedKnowledgeSource(sourceId);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error(`Failed to load data: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [agent.id]); // Only re-fetch when agent ID changes, not on every agent prop change
 
  // Sync agent props with state when they change
  useEffect(() => {
    // Only update if not loading and if the agent has changed
    if (!isLoading) {
      // Set model if available
      if (agent.modelId) {
        setSelectedModel(agent.modelId);
      }
      
      // Set temperature if available
      if (agent.temperature !== undefined) {
        setTemperature(agent.temperature);
      }
      
      // Set knowledge source if available
      if (agent.knowledgeSources && agent.knowledgeSources.length > 0) {
        setSelectedKnowledgeSource(agent.knowledgeSources[0].id);
        console.log("Syncing knowledge source from agent props:", agent.knowledgeSources[0].id, 
          "vectorStoreId:", agent.knowledgeSources[0].vectorStoreId);
      } else {
        setSelectedKnowledgeSource("none");
      }
      
      // Set training status if available
      if (agent.trainingStatus) {
        setTrainingStatus({
          status: agent.trainingStatus,
          lastTrainedAt: agent.lastTrainedAt ? new Date(agent.lastTrainedAt) : null,
          message: agent.trainingMessage || "",
          progress: agent.trainingStatus === "success" ? 100 : 0,
        });
      }
    }
  }, [agent, isLoading]);

  // Check if any values have changed
  useEffect(() => {
    // Only compute isDirty if agent data is loaded and not in loading state
    if (!isLoading && agent) {
      const hasModelChanged = selectedModel !== agent.modelId;
      const hasTemperatureChanged = temperature !== agent.temperature;
      
      // Check if knowledge source has changed
      let hasKnowledgeSourceChanged = false;
      if (agent.knowledgeSources && agent.knowledgeSources.length > 0) {
        hasKnowledgeSourceChanged = selectedKnowledgeSource !== agent.knowledgeSources[0].id;
      } else {
        hasKnowledgeSourceChanged = selectedKnowledgeSource !== "none";
      }

      const newIsDirty = hasModelChanged || hasTemperatureChanged || hasKnowledgeSourceChanged;
      
      // Debug logging to help track what's happening
      if (newIsDirty !== isDirty) {
        console.log("Setting isDirty:", newIsDirty, {
          hasModelChanged,
          hasTemperatureChanged,
          hasKnowledgeSourceChanged,
          selectedModel,
          agentModelId: agent.modelId,
          temperature,
          agentTemperature: agent.temperature,
          selectedKnowledgeSource,
          agentKnowledgeSource: agent.knowledgeSources?.length ? agent.knowledgeSources[0].id : "none"
        });
      }
      
      setIsDirty(newIsDirty);
    }
  }, [selectedModel, temperature, selectedKnowledgeSource, agent, isLoading, isDirty]);

  const handleTemperatureChange = (value: number[]) => {
    setTemperature(Number(value[0].toFixed(1)));
  };

  const handleModelChange = (value: string) => {
    setSelectedModel(value);
  };

  const handleKnowledgeSourceChange = (value: string) => {
    setSelectedKnowledgeSource(value);
  };

  const handleSaveSettings = async () => {
    try {
      setIsLoading(true);
      const selectedSource = knowledgeSources.find(ks => ks.id === selectedKnowledgeSource);
      
      const saveData = {
        modelId: selectedModel,
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
      
      console.log("Saving LLM settings with data:", JSON.stringify(saveData, null, 2));
      const response = await onSave(saveData);
      console.log("Save response:", response);
      
      // Explicitly set isDirty to false after saving
      setIsDirty(false);
      
      toast.success("LLM settings saved successfully");
    } catch (error) {
      console.error('Error saving LLM settings:', error);
      toast.error(`Failed to save settings: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCancel = () => {
    // Reset to original values
    setTemperature(agent.temperature || 0.7);
    setSelectedModel(agent.modelId || "");
    
    if (agent.knowledgeSources && agent.knowledgeSources.length > 0) {
      setSelectedKnowledgeSource(agent.knowledgeSources[0].id);
    } else {
      setSelectedKnowledgeSource("none");
    }
    
    // Explicitly set isDirty to false
    setIsDirty(false);
  };

  // Navigate to knowledge source page
  const navigateToKnowledgeSource = () => {
    const sourceId = selectedKnowledgeSource;
    if (sourceId !== "none") {
      // Navigate to the knowledge source page
      window.location.href = `dashboard/knowledge-base/${sourceId}`;
    }
  };

  return (
    <SettingsTabWrapper
      tabName="LLM"
      isDirty={isDirty}
      onSave={handleSaveSettings}
      onCancel={handleCancel}
    >
      <div className="space-y-6 pt-4">
        {/* Model Selection */}
        <Card className="overflow-hidden p-0 bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <Label className="font-medium text-gray-900 dark:text-gray-100">Model</Label>
            </div>
          </div>
          <div className="p-4 bg-white dark:bg-gray-900/50">
            <div className="flex-1">
              <div className="relative">
                <Brain className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400 z-10" />
                <Select 
                  value={selectedModel} 
                  onValueChange={handleModelChange}
                  disabled={isLoading}
                >
                  <SelectTrigger className="pl-9 bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800">
                    <SelectValue placeholder={isLoading ? "Loading models..." : "Select model"} />
                  </SelectTrigger>
                  <SelectContent>
                    {models.length > 0 && (
                      <div className="py-2">
                        <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium uppercase">
                          Available Models
                        </div>
                        {models.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            <div className="flex flex-col">
                              <span>{model.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </div>
                    )}
                    
                    {models.length === 0 && !isLoading && (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No models available.
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <p className="mt-2 text-sm/6 text-gray-500 dark:text-gray-400">
                Choose the language model that will power your agent.
              </p>
            </div>
          </div>
        </Card>

        {/* Temperature */}
        <Card className="overflow-hidden p-0 bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-2">
              <Thermometer className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <Label className="font-medium text-gray-900 dark:text-gray-100">Temperature</Label>
            </div>
          </div>
          <div className="p-4 bg-white dark:bg-gray-900/50">
            <div className="space-y-4">
              <Slider
                value={[temperature]}
                onValueChange={handleTemperatureChange}
                min={0}
                max={1}
                step={0.1}
                className="w-full"
              />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Current level:
                <span className="ml-1 font-semibold text-gray-900 dark:text-gray-100">
                  {temperature < 0.3 ? "Precise" : 
                   temperature < 0.7 ? "Balanced" : "Creative"}
                  ({temperature.toFixed(1)})
                </span>
              </p>
              <p className="mt-4 text-sm/6 text-gray-500 dark:text-gray-400">
                Higher temperature increases creativity but may reduce accuracy.
              </p>
            </div>
          </div>
        </Card>

        {/* Knowledge Source */}
        <Card className="overflow-hidden p-0 bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <Label className="font-medium text-gray-900 dark:text-gray-100">Knowledge Source</Label>
            </div>
          </div>
          <div className="p-4 bg-white dark:bg-gray-900/50">
            <div className="flex-1">
              <div className="relative">
                <Database className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400 z-10" />
                <Select 
                  value={selectedKnowledgeSource} 
                  onValueChange={handleKnowledgeSourceChange}
                  disabled={isLoading}
                >
                  <SelectTrigger className="pl-9 bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800">
                    <SelectValue placeholder={isLoading ? "Loading knowledge sources..." : "Select knowledge source"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <div className="flex flex-col items-left">
                        <span>None (Base model only)</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Agent will only use its built-in knowledge
                        </span>
                      </div>
                    </SelectItem>
                    
                    {knowledgeSources.length > 0 && (
                      <div className="py-2">
                        <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium uppercase">
                          Your Knowledge Sources
                        </div>
                        {knowledgeSources.map((source) => (
                          <SelectItem key={source.id} value={source.id}>
                            <div className="flex flex-col">
                              <span>{source.name}</span>
                              {source.description && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[250px]">
                                  {source.description}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </div>
                    )}
                    
                    {knowledgeSources.length === 0 && !isLoading && (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No knowledge sources found. Create one in the Knowledge section.
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <p className="mt-2 text-sm/6 text-gray-500 dark:text-gray-400">
                Link a knowledge source to enhance your agent with custom data.
              </p>
              {selectedKnowledgeSource !== "none" && (
                <>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="mt-3"
                    onClick={navigateToKnowledgeSource}
                  >
                    <Database className="mr-2 h-4 w-4" />
                    Manage Knowledge Source
                  </Button>
                  
                  {/* Debug info */}
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 border-t pt-2">
                    <p>Selected source: {selectedKnowledgeSource}</p>
                    <p>Vector Store ID: {knowledgeSources.find(ks => ks.id === selectedKnowledgeSource)?.vectorStoreId || "Not available"}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </Card>
      </div>
    </SettingsTabWrapper>
  );
}