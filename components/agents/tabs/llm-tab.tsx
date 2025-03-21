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

        // Set initial selected knowledge source
        if (agent.knowledgeSources && agent.knowledgeSources.length > 0) {
          console.log("Setting initial knowledge source:", agent.knowledgeSources[0].id);
          setSelectedKnowledgeSource(agent.knowledgeSources[0].id);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error(`Failed to load data: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [agent]);

  // Check if any values have changed
  useEffect(() => {
    const hasModelChanged = selectedModel !== agent.modelId;
    const hasTemperatureChanged = temperature !== agent.temperature;
    
    // Check if knowledge source has changed
    let hasKnowledgeSourceChanged = false;
    if (agent.knowledgeSources && agent.knowledgeSources.length > 0) {
      hasKnowledgeSourceChanged = selectedKnowledgeSource !== agent.knowledgeSources[0].id;
    } else {
      hasKnowledgeSourceChanged = selectedKnowledgeSource !== "none";
    }

    setIsDirty(hasModelChanged || hasTemperatureChanged || hasKnowledgeSourceChanged);
  }, [selectedModel, temperature, selectedKnowledgeSource, agent]);

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
      const selectedSource = knowledgeSources.find(ks => ks.id === selectedKnowledgeSource);
      
      const saveData = {
        modelId: selectedModel,
        temperature: temperature,
        // Only include knowledge sources if not "none"
        knowledgeSources: selectedKnowledgeSource !== "none" && selectedSource 
          ? [{ 
              id: selectedSource.id, 
              name: selectedSource.name,
              description: selectedSource.description 
            }] 
          : [],
      };
      
      await onSave(saveData);
    } catch (error) {
      console.error('Error saving LLM settings:', error);
      throw error;
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
  };

  // Toggle training options
  const toggleTrainingOptions = () => {
    setShowTrainingOptions(!showTrainingOptions);
  };

  // Update training options
  const updateTrainingOption = (
    option: keyof TrainingOptions,
    value: boolean
  ) => {
    setTrainingOptions((prev) => ({
      ...prev,
      [option]: value,
    }));
  };

  // Handle training the agent
  const handleTrainAgent = async () => {
    setTrainingStatus({
      status: "training",
      message: "Training in progress...",
      progress: 0,
    });

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setTrainingStatus((prev) => ({
        ...prev,
        progress: Math.min((prev.progress || 0) + 5, 95),
      }));
    }, 1000);

    try {
      const response = await fetch(`/api/chatbots/${agent.id}/train`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(trainingOptions),
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to train agent");
      }

      const data = await response.json();

      setTrainingStatus({
        status: "success",
        lastTrainedAt: new Date(),
        message: data.message || "Training completed successfully",
        progress: 100,
      });

      toast.success("Agent trained successfully");
    } catch (error) {
      clearInterval(progressInterval);
      console.error("Error training agent:", error);
      
      setTrainingStatus({
        status: "error",
        message: error instanceof Error ? error.message : "Failed to train agent",
        progress: 0,
      });
      
      toast.error("Failed to train agent");
    }
  };

  return (
    <SettingsTabWrapper
      isDirty={isDirty}
      onSave={handleSaveSettings}
      onCancel={handleCancel}
      tabName="LLM"
    >
      <div className="mt-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* OpenAI Model Selection */}
          <Card className="overflow-hidden p-0 bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800">
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center gap-2">
                <Codepen className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <Label className="font-medium text-gray-900 dark:text-gray-100">LLM Model</Label>
              </div>
            </div>
            <div className="p-4 bg-white dark:bg-gray-900/50">
              <div className="flex-1">
                <div className="relative">
                  <Codepen className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400 z-10" />
                  <Select 
                    value={selectedModel} 
                    onValueChange={handleModelChange}
                    disabled={isLoading || models.length === 0}
                  >
                    <SelectTrigger className="pl-9 bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800">
                      <SelectValue placeholder={isLoading ? "Loading models..." : "Select model"} />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="p-2 text-xs text-muted-foreground font-medium uppercase">
                        Available Models
                      </div>
                      {models.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name}
                        </SelectItem>
                      ))}
                      <div className="p-2 text-xs text-muted-foreground font-medium uppercase mt-2">
                        Coming Soon
                      </div>
                      {DISABLED_MODELS.map((modelName) => (
                        <SelectItem key={modelName} value={`disabled-${modelName}`} disabled className="text-gray-400 dark:text-gray-600">
                          {modelName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="mt-2 text-sm/6 text-gray-500 dark:text-gray-400">
                  Select the AI model that will power your agent.
                </p>
              </div>
            </div>
          </Card>

          {/* Temperature */}
          <Card className="overflow-hidden p-0 bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800">
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <Label className="font-medium text-gray-900 dark:text-gray-100">Response Temperature</Label>
              </div>
            </div>
            <div className="p-4 bg-white dark:bg-gray-900/50">
              <div className="flex-1">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Slider
                        id="temperature"
                        value={[temperature]}
                        max={1.0}
                        min={0}
                        step={0.1}
                        onValueChange={handleTemperatureChange}
                      />
                    </div>
                    <div className="w-16">
                      <Input
                        type="number"
                        value={temperature}
                        onChange={(e) => setTemperature(Number(parseFloat(e.target.value).toFixed(1)))}
                        min={0}
                        max={1}
                        step={0.1}
                        className="w-full"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">More Precise</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">More Creative</span>
                  </div>
                  
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Current level:
                    <span className="ml-1 font-semibold text-gray-900 dark:text-gray-100">
                      {temperature < 0.3 ? "Precise" : 
                       temperature < 0.7 ? "Balanced" : "Creative"}
                      ({temperature.toFixed(1)})
                    </span>
                  </p>
                </div>
                <p className="mt-4 text-sm/6 text-gray-500 dark:text-gray-400">
                  Higher temperature increases creativity but may reduce accuracy.
                </p>
              </div>
            </div>
          </Card>
        </div>

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
                      <div className="flex flex-col">
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
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="mt-3"
                  onClick={() => {
                    // You would implement navigation to knowledge source editing page here
                    toast.info("This would navigate to edit the selected knowledge source");
                  }}
                >
                  <Database className="mr-2 h-4 w-4" />
                  Manage Knowledge Source
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Training Section */}
        <Card className="overflow-hidden p-0 bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <Label className="font-medium text-gray-900 dark:text-gray-100">Training</Label>
            </div>
          </div>
          <div className="p-4 bg-white dark:bg-gray-900/50">
            <div className="flex-1">
              <Collapsible>
                <div className="flex items-center justify-between">
                  <CollapsibleTrigger asChild>
                    <Button variant="secondary" onClick={toggleTrainingOptions}>
                      {showTrainingOptions ? "Hide" : "Show"} Training Options
                    </Button>
                  </CollapsibleTrigger>
                  <Button
                    onClick={handleTrainAgent}
                    disabled={trainingStatus.status === "training" || 
                             (selectedKnowledgeSource === "none" && 
                              !trainingOptions.forceRetrain)}
                    className="ml-2"
                  >
                    {trainingStatus.status === "training" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Training...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Train Agent
                      </>
                    )}
                  </Button>
                </div>

                <CollapsibleContent className="mt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="force-retrain">Force Retrain</Label>
                      <p className="text-xs text-muted-foreground">
                        Ignore cached data and retrain from scratch.
                      </p>
                    </div>
                    <Switch
                      id="force-retrain"
                      checked={trainingOptions.forceRetrain}
                      onCheckedChange={(checked) =>
                        updateTrainingOption("forceRetrain", checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="optimize-speed">Optimize for Speed</Label>
                      <p className="text-xs text-muted-foreground">
                        Process knowledge sources faster with simpler processing.
                      </p>
                    </div>
                    <Switch
                      id="optimize-speed"
                      checked={trainingOptions.optimizeForSpeed}
                      onCheckedChange={(checked) =>
                        updateTrainingOption("optimizeForSpeed", checked)
                      }
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {trainingStatus.status !== "idle" && (
                <div className="space-y-2 mt-4">
                  {trainingStatus.status === "training" && (
                    <Progress value={trainingStatus.progress} className="h-2" />
                  )}
                  <div
                    className={`text-sm ${
                      trainingStatus.status === "error"
                        ? "text-destructive"
                        : trainingStatus.status === "success"
                        ? "text-green-600"
                        : "text-muted-foreground"
                    }`}
                  >
                    {trainingStatus.message}
                  </div>
                  {trainingStatus.lastTrainedAt && (
                    <div className="text-xs text-muted-foreground">
                      Last trained:{" "}
                      {trainingStatus.lastTrainedAt.toLocaleString()}
                    </div>
                  )}
                </div>
              )}
              
              <p className="mt-4 text-sm/6 text-gray-500 dark:text-gray-400">
                Train your agent with the selected knowledge source to make it ready for use.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </SettingsTabWrapper>
  );
}