import { useState, useEffect } from "react";
import { Button } from "@/components/Button";
import { Form, FormField } from "@/hooks/useForms";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { RiAddLine, RiDeleteBinLine, RiDraggable } from "@remixicon/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FormSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: Form | null;
}

export function FormSettingsDialog({
  open,
  onOpenChange,
  form,
}: FormSettingsDialogProps) {
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStatus, setFormStatus] = useState<"active" | "inactive">("active");
  const [fields, setFields] = useState<FormField[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Reset form state when dialog opens/closes or form changes
  useEffect(() => {
    if (form && open) {
      setFormName(form.name);
      setFormDescription(form.description || "");
      setFormStatus(form.status);
      setFields(form.fields);
    }
  }, [form, open]);

  const handleSubmit = async () => {
    if (!form) return;
    
    if (!formName.trim()) {
      toast.error("Form name is required");
      return;
    }
    
    if (fields.length === 0) {
      toast.error("At least one field is required");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/forms/${form.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formName,
          description: formDescription,
          status: formStatus,
          fields: fields.map(field => ({
            id: field.id,
            name: field.name,
            description: field.description,
            type: field.type,
            required: field.required,
            options: field.options,
          })),
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update form");
      }
      
      toast.success("Form updated successfully");
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating form:", error);
      toast.error("Failed to update form");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddField = () => {
    const newField: FormField = {
      id: `temp-${Date.now()}`,
      name: "New Field",
      description: "",
      type: "text",
      required: false,
      position: fields.length,
    };
    
    setFields([...fields, newField]);
  };

  const handleRemoveField = (fieldId: string) => {
    setFields(fields.filter(field => field.id !== fieldId));
  };

  const handleFieldChange = (fieldId: string, key: keyof FormField, value: any) => {
    setFields(fields.map(field => 
      field.id === fieldId ? { ...field, [key]: value } : field
    ));
  };

  if (!form) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Form Settings</DialogTitle>
          <DialogDescription className="mt-1 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
            Update your form settings and fields.
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4 space-y-4">
          {/* Form Name and Description */}
          <div>
            <label htmlFor="form-name" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Form Name
            </label>
            <input
              type="text"
              id="form-name"
              className="mt-1 block w-full rounded-xl border border-neutral-300 px-3 py-2 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 sm:text-sm"
              placeholder="e.g., Customer Inquiry"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
          </div>
          
          <div>
            <label htmlFor="form-description" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Description (optional)
            </label>
            <textarea
              id="form-description"
              rows={2}
              className="mt-1 block w-full rounded-xl border border-neutral-300 px-3 py-2 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 sm:text-sm"
              placeholder="Describe what information this form will collect"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
            />
          </div>
          
          <div>
            <label htmlFor="form-status" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Status
            </label>
            <select
              id="form-status"
              className="mt-1 block w-full rounded-xl border border-neutral-300 px-3 py-2 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 sm:text-sm"
              value={formStatus}
              onChange={(e) => setFormStatus(e.target.value as "active" | "inactive")}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          
          {/* Form Fields */}
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Form Fields
              </h3>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAddField}
              >
                <RiAddLine className="mr-1 h-4 w-4" />
                Add Field
              </Button>
            </div>
            
            <div className="mt-3 space-y-3 max-h-60 overflow-y-auto">
              {fields.map((field, index) => (
                <div 
                  key={field.id}
                  className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-700"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <RiDraggable className="mr-2 h-4 w-4 text-neutral-400" />
                      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        Field {index + 1}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveField(field.id)}
                      className="text-neutral-400 hover:text-red-500 dark:hover:text-red-400"
                    >
                      <RiDeleteBinLine className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="mt-2 space-y-2">
                    <div>
                      <label htmlFor={`field-name-${field.id}`} className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                        Field Name
                      </label>
                      <input
                        type="text"
                        id={`field-name-${field.id}`}
                        className="mt-1 block w-full rounded-xl border border-neutral-300 px-3 py-1.5 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 sm:text-xs"
                        value={field.name}
                        onChange={(e) => handleFieldChange(field.id, "name", e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor={`field-description-${field.id}`} className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                        Description (optional)
                      </label>
                      <input
                        type="text"
                        id={`field-description-${field.id}`}
                        className="mt-1 block w-full rounded-xl border border-neutral-300 px-3 py-1.5 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 sm:text-xs"
                        value={field.description || ""}
                        onChange={(e) => handleFieldChange(field.id, "description", e.target.value)}
                      />
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        <label htmlFor={`field-type-${field.id}`} className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                          Type
                        </label>
                        <select
                          id={`field-type-${field.id}`}
                          className="mt-1 block w-full rounded-xl border border-neutral-300 px-3 py-1.5 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 sm:text-xs"
                          value={field.type}
                          onChange={(e) => handleFieldChange(field.id, "type", e.target.value)}
                        >
                          <option value="text">Text</option>
                          <option value="number">Number</option>
                          <option value="email">Email</option>
                          <option value="phone">Phone</option>
                          <option value="date">Date</option>
                          <option value="select">Select</option>
                          <option value="address">Address</option>
                        </select>
                      </div>
                      
                      <div className="flex items-center pt-5">
                        <input
                          id={`field-required-${field.id}`}
                          type="checkbox"
                          className="h-4 w-4 rounded border-neutral-300 text-neutral-600 focus:ring-neutral-500 dark:border-neutral-700"
                          checked={field.required}
                          onChange={(e) => handleFieldChange(field.id, "required", e.target.checked)}
                        />
                        <label htmlFor={`field-required-${field.id}`} className="ml-2 block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                          Required
                        </label>
                      </div>
                    </div>
                    
                    {field.type === "select" && (
                      <div>
                        <label htmlFor={`field-options-${field.id}`} className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                          Options (comma separated)
                        </label>
                        <input
                          type="text"
                          id={`field-options-${field.id}`}
                          className="mt-1 block w-full rounded-xl border border-neutral-300 px-3 py-1.5 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 sm:text-xs"
                          placeholder="Option 1, Option 2, Option 3"
                          value={(field.options || []).join(", ")}
                          onChange={(e) => handleFieldChange(
                            field.id, 
                            "options", 
                            e.target.value.split(",").map(opt => opt.trim()).filter(Boolean)
                          )}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {fields.length === 0 && (
                <div className="flex justify-center py-4 text-sm text-neutral-500 dark:text-neutral-400">
                  No fields added yet. Click "Add Field" to create your first field.
                </div>
              )}
            </div>
          </div>
        </div>
        
        <DialogFooter className="mt-6">
          <DialogClose asChild>
            <Button
              variant="secondary"
              className="mt-2 w-full sm:mt-0 sm:w-fit"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </DialogClose>
          <Button 
            className="w-full sm:w-fit"
            onClick={handleSubmit}
            disabled={isSubmitting || !formName.trim() || fields.length === 0}
            loading={isSubmitting}
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 