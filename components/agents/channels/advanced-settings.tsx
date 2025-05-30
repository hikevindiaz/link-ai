import { Label } from "@/components/ui/label"
import { FormDescription } from "@/components/ui/form"
import { useEffect, useState, useRef, useCallback } from "react"
import { Switch } from "@/components/ui/switch"
import React from "react"

// Using the standard Switch component instead of a custom toggle to ensure better form integration
const ToggleSwitch = React.memo(function ToggleSwitch({
  checked = false,
  onCheckedChange,
}: {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}) {
  return (
    <Switch
      checked={checked}
      onCheckedChange={(value) => {
        if (onCheckedChange) {
          onCheckedChange(value);
        }
      }}
    />
  );
});

interface AdvancedSettingsProps {
  displayBranding: boolean;
  setDisplayBranding: (value: boolean) => void;
  chatFileAttachementEnabled: boolean;
  setChatFileAttachementEnabled: (value: boolean) => void;
}

export function AdvancedSettings({ 
  displayBranding, 
  setDisplayBranding, 
  chatFileAttachementEnabled, 
  setChatFileAttachementEnabled 
}: AdvancedSettingsProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-900 dark:text-white">Advanced Settings</h3>
      <div className="flex flex-row items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label className="text-base text-gray-900 dark:text-white">
            Display Branding
          </Label>
          <FormDescription className="text-sm text-gray-500 dark:text-gray-400">
            Show "Powered by" branding in the chatbot
          </FormDescription>
        </div>
        <ToggleSwitch
          checked={displayBranding}
          onCheckedChange={setDisplayBranding}
        />
      </div>

      <div className="flex flex-row items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label className="text-base text-gray-900 dark:text-white">
            File Attachment
          </Label>
          <FormDescription className="text-sm text-gray-500 dark:text-gray-400">
            Allow users to attach files in the chat
          </FormDescription>
        </div>
        <ToggleSwitch
          checked={chatFileAttachementEnabled}
          onCheckedChange={setChatFileAttachementEnabled}
        />
      </div>
    </div>
  );
} 