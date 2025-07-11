"use client";

import { useState, useEffect } from "react";
import { Loader2, Save, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface UniversalSavingCardProps {
  isDirty: boolean;
  isSaving: boolean;
  saveStatus: 'idle' | 'saving' | 'success' | 'error';
  errorMessage?: string;
  onSave: () => void;
  onDiscard: () => void;
  position?: 'fixed-bottom' | 'fixed-top' | 'relative';
  className?: string;
}

export function UniversalSavingCard({
  isDirty,
  isSaving,
  saveStatus,
  errorMessage = "",
  onSave,
  onDiscard,
  position = 'fixed-bottom',
  className,
}: UniversalSavingCardProps) {
  const [statusMessage, setStatusMessage] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  // Control visibility based on isDirty and save status
  useEffect(() => {
    if (isDirty || saveStatus === 'saving') {
      setIsVisible(true);
      setIsAnimatingOut(false);
    } else if (saveStatus === 'success') {
      // Keep visible for success message, then hide
      setIsVisible(true);
      setIsAnimatingOut(false);
      
      const timer = setTimeout(() => {
        setIsAnimatingOut(true);
        setTimeout(() => setIsVisible(false), 300); // Hide after animation
      }, 2000);
      
      return () => clearTimeout(timer);
    } else {
      setIsAnimatingOut(true);
      setTimeout(() => setIsVisible(false), 300); // Hide after animation
    }
  }, [isDirty, saveStatus]);

  // Update status message based on current state
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

  // Don't render if not visible
  if (!isVisible) {
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
            Retry
          </>
        );
      default:
        return (
          <>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </>
        );
    }
  };

  // Determine button variant based on status
  const getButtonVariant = () => {
    switch (saveStatus) {
      case "success":
        return "primary" as const;
      case "error":
        return "destructive" as const;
      default:
        return "primary" as const;
    }
  };

  // Position classes
  const positionClasses = {
    'fixed-bottom': 'fixed inset-x-0 bottom-4 flex justify-center z-50',
    'fixed-top': 'fixed inset-x-0 top-4 flex justify-center z-50',
    'relative': 'relative w-full flex justify-center'
  };

  const handleSave = () => {
    if (saveStatus === 'error') {
      // If it's an error state, show a toast and retry
      toast.error("Retrying save...");
    }
    onSave();
  };

  const handleDiscard = () => {
    onDiscard();
    toast.info("Changes discarded");
  };

  return (
    <div className={cn(positionClasses[position], className)}>
      <div
        className={cn(
          "bg-white border border-neutral-200 rounded-xl shadow-lg p-4 flex items-center gap-4 max-w-md w-full mx-4 transition-all duration-300 dark:bg-neutral-900 dark:text-white dark:border-neutral-800",
          isAnimatingOut ? "opacity-0 transform translate-y-2" : "opacity-100 transform translate-y-0",
          saveStatus === "error" ? "border-red-500 dark:border-red-600" : "border-neutral-200 dark:border-neutral-800",
          saveStatus === "success" ? "border-green-500 dark:border-green-600" : ""
        )}
      >
        <div className="flex-1">
          <p
            className={cn(
              "text-sm font-medium",
              saveStatus === "error" ? "text-red-600 dark:text-red-400" : 
              saveStatus === "success" ? "text-green-600 dark:text-green-400" :
              "text-neutral-800 dark:text-neutral-200"
            )}
          >
            {statusMessage}
          </p>
          {saveStatus === "error" && errorMessage && (
            <p className="text-xs text-red-500 dark:text-red-400 mt-1">
              {errorMessage}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={handleDiscard}
            disabled={isSaving || saveStatus === "saving"}
            className="h-9 text-sm"
          >
            Discard
          </Button>
          <Button
            variant={getButtonVariant()}
            onClick={handleSave}
            disabled={saveStatus === "saving" || isSaving}
            className="h-9 text-sm"
          >
            {getButtonContent()}
          </Button>
        </div>
      </div>
    </div>
  );
} 