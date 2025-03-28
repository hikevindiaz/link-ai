import * as React from "react";
import { Button } from "./button";
import { RiCheckLine, RiCloseLine, RiLoader4Line } from "@remixicon/react";

interface FloatingActionBarProps {
  isSaving?: boolean;
  onSave: () => void;
  onCancel: () => void;
  message?: string;
}

export function FloatingActionBar({
  isSaving = false,
  onSave,
  onCancel,
  message = "You have unsaved changes"
}: FloatingActionBarProps) {
  return (
    <div className="fixed bottom-4 left-0 right-0 z-50 mx-auto w-full max-w-2xl px-4">
      <div className="flex items-center justify-between rounded-lg bg-white p-4 shadow-lg dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
        <div className="text-sm font-medium">{message}</div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isSaving}
          >
            <RiCloseLine className="mr-1 h-4 w-4" />
            Cancel
          </Button>
          <Button 
            size="sm"
            onClick={onSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <RiLoader4Line className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <RiCheckLine className="mr-1 h-4 w-4" />
            )}
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
} 