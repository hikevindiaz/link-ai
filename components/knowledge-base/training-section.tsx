import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Brain, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

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

interface TrainingSectionProps {
  knowledgeSourceId: string;
  initialStatus?: TrainingStatus;
}

export function TrainingSection({ knowledgeSourceId, initialStatus }: TrainingSectionProps) {
  const [showTrainingOptions, setShowTrainingOptions] = useState(false);
  const [trainingOptions, setTrainingOptions] = useState<TrainingOptions>({
    forceRetrain: false,
    optimizeForSpeed: true,
  });
  const [trainingStatus, setTrainingStatus] = useState<TrainingStatus>(
    initialStatus || {
      status: "idle",
      message: "",
      progress: 0,
    }
  );

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

  // Handle training the knowledge source
  const handleTrainKnowledgeSource = async () => {
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
      const response = await fetch(`/api/knowledge-sources/${knowledgeSourceId}/train`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(trainingOptions),
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to train knowledge source");
      }

      const data = await response.json();

      setTrainingStatus({
        status: "success",
        lastTrainedAt: new Date(),
        message: data.message || "Training completed successfully",
        progress: 100,
      });

      toast.success("Knowledge source trained successfully");
    } catch (error) {
      clearInterval(progressInterval);
      console.error("Error training knowledge source:", error);
      
      setTrainingStatus({
        status: "error",
        message: error instanceof Error ? error.message : "Failed to train knowledge source",
        progress: 0,
      });
      
      toast.error("Failed to train knowledge source");
    }
  };

  return (
    <div className="space-y-4">
      <Collapsible>
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <Button variant="secondary" onClick={toggleTrainingOptions}>
              {showTrainingOptions ? "Hide" : "Show"} Training Options
            </Button>
          </CollapsibleTrigger>
          <Button
            onClick={handleTrainKnowledgeSource}
            disabled={trainingStatus.status === "training"}
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
                Retrain Assigned Agents
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
      
      <p className="text-sm/6 text-gray-500 dark:text-gray-400">
        Train your knowledge source to update all assigned agents with the latest data.
      </p>
    </div>
  );
} 