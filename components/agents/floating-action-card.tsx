"use client";

import { useState, useEffect } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FloatingActionCardProps {
  isDirty: boolean;
  saveStatus: "idle" | "saving" | "success" | "error";
  onSave: () => void;
  onCancel?: () => void;
  isSaving?: boolean;
  errorMessage?: string;
}

export function FloatingActionCard({
  isDirty,
  saveStatus,
  onSave,
  onCancel,
  isSaving = false,
  errorMessage = "",
}: FloatingActionCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  // Show the card when isDirty changes to true
  useEffect(() => {
    if (isDirty) {
      setIsVisible(true);
    } else {
      // Hide the card after a delay when isDirty changes to false
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isDirty]);

  // Update status message based on saveStatus
  useEffect(() => {
    switch (saveStatus) {
      case "saving":
        setStatusMessage("Saving changes...");
        break;
      case "success":
        setStatusMessage("Changes saved successfully!");
        // Hide the card after a delay on success
        const timer = setTimeout(() => {
          setIsVisible(false);
        }, 2000);
        return () => clearTimeout(timer);
      case "error":
        setStatusMessage(errorMessage || "Failed to save changes");
        break;
      default:
        setStatusMessage("You have unsaved changes");
    }
  }, [saveStatus, errorMessage]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-4 flex justify-center z-50 pointer-events-none">
      <div
        className={cn(
          "bg-white border-gray-200 rounded-lg shadow-lg p-4 flex items-center gap-4 max-w-md w-full mx-4 pointer-events-auto transition-all duration-300 dark:bg-black dark:text-white dark:border-gray-700",
          isVisible ? "opacity-100 transform translate-y-0" : "opacity-0 transform translate-y-8",
          saveStatus === "error" ? "border-destructive" : "border-border"
        )}
      >
        <div className="flex-1">
          <p
            className={cn(
              "text-sm font-medium",
              saveStatus === "error" ? "text-destructive" : "text-foreground"
            )}
          >
            {statusMessage}
          </p>
        </div>
        <div className="flex gap-2">
          {onCancel && (
            <Button
              variant="secondary"
              onClick={onCancel}
              disabled={isSaving || saveStatus === "saving"}
              className="h-9"
            >
              Cancel
            </Button>
          )}
          <Button
            onClick={onSave}
            disabled={saveStatus === "saving" || isSaving || !isDirty}
            className="h-9"
          >
            {saveStatus === "saving" || isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
} 