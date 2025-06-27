import React, { useState } from 'react';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  RadioCardGroup, 
  RadioCardItem,
  RadioCardIndicator 
} from "@/components/ui/radio-group";
import { Icons } from "@/components/icons";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CreateAgentDrawerProps {
  open: boolean;
  onClose: () => void;
  onCreateAgent: (name: string, templateId: string) => Promise<void>;
}

const agentTemplates = [
  {
    id: 'custom',
    name: 'Custom Agent',
    description: 'Create a custom agent from scratch',
    isRecommended: true,
    disabled: false,
  },
  {
    id: 'customer-service',
    name: 'Customer Service',
    description: 'General purpose customer service agent',
    isRecommended: false,
    disabled: true,
  },
  {
    id: 'sales',
    name: 'Sales Representative',
    description: 'Specialized in product sales and inquiries',
    isRecommended: false,
    disabled: true,
  },
  {
    id: 'support',
    name: 'Technical Support',
    description: 'Handles technical issues and troubleshooting',
    isRecommended: false,
    disabled: true,
  },
];

export function CreateAgentDrawer({ open, onClose, onCreateAgent }: CreateAgentDrawerProps) {
  const [name, setName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('custom');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [createdAgentId, setCreatedAgentId] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError("Please enter a name for your agent");
      return;
    }
    
    if (isSubmitting) {
      return; // Prevent multiple submissions
    }
    
    setIsSubmitting(true);
    setError("");
    
    try {
      await onCreateAgent(name, selectedTemplate);
      // Reset form
      setName('');
      setSelectedTemplate('custom');
      // Close the drawer
      onClose();
    } catch (err) {
      console.error("Error creating agent:", err);
      setError("Failed to create agent. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset form state when closing
    setName('');
    setSelectedTemplate('custom');
    setError('');
    setIsSubmitting(false);
    onClose();
  };

  return (
    <>
      <Drawer open={open} onOpenChange={handleClose}>
        <DrawerContent>
          <form id="create-agent-form" onSubmit={handleSubmit}>
            <DrawerHeader className="border-neutral-100 dark:border-neutral-800 pb-4">
              <DrawerTitle className="text-neutral-900 dark:text-neutral-100 text-lg font-semibold after:content-none">
                Create New Agent
              </DrawerTitle>
              <DrawerDescription>
                Give your agent a name and choose a template to get started.
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 py-2 space-y-6">
              <div>
                <Label className="font-medium text-neutral-900 dark:text-neutral-100">Agent Name</Label>
                <div className="mt-2">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter agent name"
                    className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 border-neutral-200 dark:border-neutral-800"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <fieldset className="space-y-3">
                <Label className="font-medium text-neutral-900 dark:text-neutral-100">Template</Label>
                <RadioCardGroup
                  value={selectedTemplate}
                  onValueChange={setSelectedTemplate}
                  className="mt-2 grid grid-cols-1 gap-4 text-sm"
                >
                  {agentTemplates.map((template) => (
                    <RadioCardItem 
                      key={template.id} 
                      value={template.id}
                      disabled={template.disabled}
                      className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
                    >
                      <div className="flex items-start gap-3">
                        <RadioCardIndicator className="mt-1 text-blue-500 dark:text-blue-400" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="leading-6 text-neutral-900 dark:text-neutral-100">
                              {template.name}
                            </span>
                            {template.isRecommended && (
                              <Badge variant="default">Recommended</Badge>
                            )}
                            {template.disabled && (
                              <Badge variant="secondary">Coming Soon</Badge>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                            {template.description}
                          </p>
                        </div>
                      </div>
                    </RadioCardItem>
                  ))}
                </RadioCardGroup>
              </fieldset>

              {error && (
                <div className="text-sm font-medium text-red-500">
                  {error}
                </div>
              )}
            </div>
            <DrawerFooter className="border-t border-neutral-100 dark:border-neutral-800">
              <DrawerClose asChild>
                <Button variant="secondary" type="button" disabled={isSubmitting}>Cancel</Button>
              </DrawerClose>
              <Button 
                type="submit"
                variant="primary"
                disabled={!name.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Agent'
                )}
              </Button>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>

      {/* Success Dialog */}
      <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="flex flex-col items-center text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-2" />
            <DialogTitle className="font-semibold text-neutral-900 dark:text-neutral-50 text-xl">
              Agent Created
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm leading-6 text-neutral-500 dark:text-neutral-400">
              Your agent has been successfully created.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex justify-center">
            <Button
              variant="primary"
              onClick={() => setSuccessDialogOpen(false)}
              className="w-full sm:w-32"
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 