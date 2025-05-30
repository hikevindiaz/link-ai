"use client";

import { useState, useEffect } from "react";
import { Loader2, Save, Check, X } from "lucide-react";
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
  const [statusMessage, setStatusMessage] = useState("");
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  // Handle visibility based on isDirty flag
  useEffect(() => {
    if (!isDirty) {
      // When isDirty becomes false, start the animation out
      setIsAnimatingOut(true);
    } else {
      setIsAnimatingOut(false);
    }
  }, [isDirty]);

  // Set animation state when status changes to success
  useEffect(() => {
    if (saveStatus === "success") {
      setIsAnimatingOut(true);
    }
  }, [saveStatus]);

  // Update status message based on saveStatus
  useEffect(() => {
    switch (saveStatus) {
      case "saving":
        setStatusMessage("Saving changes...");
        break;
      case "success":
        setStatusMessage("Changes saved successfully!");
        break;
      case "error":
        setStatusMessage(errorMessage || "Failed to save changes");
        break;
      default:
        setStatusMessage("You have unsaved changes");
    }
  }, [saveStatus, errorMessage]);

  // If we're not dirty, don't show the card
  if (!isDirty && saveStatus !== "success" && saveStatus !== "saving") {
    return null;
  }

  // Determine button content based on save status
  const getButtonContent = () => {
    switch (saveStatus) {
      case "saving":
        return (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        );
      case "success":
        return (
          <>
            <Check className="mr-2 h-4 w-4" />
            Saved!
          </>
        );
      case "error":
        return (
          <>
            <X className="mr-2 h-4 w-4" />
            Save Failed
          </>
        );
      default:
        return (
          <>
            <Save className="mr-2 h-4 w-4" />
            Save
          </>
        );
    }
  };

  // Determine button variant based on status
  const getButtonVariant = () => {
    switch (saveStatus) {
      case "success":
        return "primary"; // Use primary for success
      case "error":
        return "destructive";
      default:
        return "primary";
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-4 flex justify-center z-50 pointer-events-none">
      <div
        className={cn(
          "bg-white border border-gray-200 rounded-lg shadow-lg p-4 flex items-center gap-4 max-w-md w-full mx-4 pointer-events-auto transition-all duration-300 dark:bg-gray-900 dark:text-white dark:border-gray-800",
          isAnimatingOut ? "opacity-0 transform translate-y-8" : "opacity-100 transform translate-y-0",
          saveStatus === "error" ? "border-red-500 dark:border-red-600" : "border-gray-200 dark:border-gray-800"
        )}
      >
        <div className="flex-1">
          <p
            className={cn(
              "text-sm font-medium",
              saveStatus === "error" ? "text-red-600 dark:text-red-400" : "text-gray-800 dark:text-gray-200"
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
            variant={getButtonVariant()}
            onClick={onSave}
            disabled={saveStatus === "saving" || isSaving || !isDirty}
            className="h-9"
          >
            {getButtonContent()}
          </Button>
        </div>
      </div>
    </div>
  );
} 