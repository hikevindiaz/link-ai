import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { RiAddLine, RiDeleteBinLine, RiDraggable, RiCheckLine } from "@remixicon/react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface FormField {
  id: string;
  name: string;
  description: string;
  type: 'text' | 'number' | 'email' | 'phone' | 'date' | 'select' | 'address';
  required: boolean;
  options?: string[];
}

interface CreateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateForm: (formData: any) => void;
}

// Predefined field templates
const predefinedFields = [
  {
    name: "Full Name",
    description: "Customer's full name",
    type: "text",
    required: true
  },
  {
    name: "Email",
    description: "Contact email address",
    type: "email",
    required: true
  },
  {
    name: "Phone Number",
    description: "Contact phone number",
    type: "phone",
    required: false
  },
  {
    name: "Address",
    description: "Physical address",
    type: "address",
    required: false
  },
  {
    name: "Date",
    description: "Preferred date",
    type: "date",
    required: false
  }
];

export function CreateFormDialog({ open, onOpenChange, onCreateForm }: CreateFormDialogProps) {
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [fields, setFields] = useState<FormField[]>([]);
  const [customFieldName, setCustomFieldName] = useState("");
  const [customFieldDescription, setCustomFieldDescription] = useState("");
  const [customFieldRequired, setCustomFieldRequired] = useState(false);
  const [showCustomField, setShowCustomField] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const dialogContentRef = useRef<HTMLDivElement>(null);
  const fieldsEndRef = useRef<HTMLDivElement>(null);

  const resetForm = () => {
    setFormName("");
    setFormDescription("");
    setFields([]);
    setCustomFieldName("");
    setCustomFieldDescription("");
    setCustomFieldRequired(false);
    setShowCustomField(false);
    setIsSubmitting(false);
    setIsSuccess(false);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  // Scroll to the bottom of the fields list when a new field is added
  useEffect(() => {
    if (fieldsEndRef.current && fields.length > 0) {
      fieldsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [fields.length]);

  // Reset success state after a delay
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isSuccess) {
      timer = setTimeout(() => {
        handleClose();
      }, 1500);
    }
    return () => clearTimeout(timer);
  }, [isSuccess]);

  const addPredefinedField = (template: typeof predefinedFields[0]) => {
    const newField: FormField = {
      id: `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: template.name,
      description: template.description,
      type: template.type as FormField['type'],
      required: template.required
    };
    
    setFields(prev => [...prev, newField]);
  };

  const addCustomField = () => {
    if (!customFieldName.trim()) return;
    
    const newField: FormField = {
      id: `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: customFieldName,
      description: customFieldDescription || `Information about ${customFieldName}`,
      type: "text",
      required: customFieldRequired
    };
    
    setFields(prev => [...prev, newField]);
    setCustomFieldName("");
    setCustomFieldDescription("");
    setCustomFieldRequired(false);
    setShowCustomField(false);
  };

  const removeField = (id: string) => {
    setFields(prev => prev.filter(field => field.id !== id));
  };

  const handleSubmit = async () => {
    if (!formName.trim()) {
      toast.error("Please enter a form name");
      return;
    }
    
    if (fields.length === 0) {
      toast.error("Please add at least one field");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Format fields for API submission - remove temporary IDs and ensure all required properties
      const formattedFields = fields.map((field, index) => ({
        name: field.name,
        description: field.description || "",
        type: field.type,
        required: field.required || false,
        options: field.options || [],
        position: index
      }));
      
      const formData = {
        name: formName.trim(),
        description: formDescription.trim() || `Form for collecting ${formName} information`,
        status: 'active',
        fields: formattedFields
      };
      
      console.log("Submitting form data:", JSON.stringify(formData, null, 2));
      
      await onCreateForm(formData);
      setIsSuccess(true);
    } catch (error) {
      console.error("Error creating form:", error);
      setIsSubmitting(false);
      toast.error("Failed to create form. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col" ref={dialogContentRef}>
        <DialogHeader>
          <DialogTitle>Create New Form</DialogTitle>
          <DialogDescription className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-400">
            Create a form to collect information from conversations with your AI agents.
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4 space-y-4 overflow-y-auto flex-1">
          <div className="px-1">
            {/* Form Name and Description */}
            <div>
              <label htmlFor="form-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Form Name
              </label>
              <input
                type="text"
                id="form-name"
                className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 sm:text-sm"
                placeholder="e.g., Customer Inquiry"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            
            <div className="mt-4">
              <label htmlFor="form-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Description (optional)
              </label>
              <textarea
                id="form-description"
                rows={2}
                className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 sm:text-sm"
                placeholder="Describe what information this form will collect"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>
            
            {/* Field Selection */}
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Fields
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Choose what information your AI agent should collect during conversations.
              </p>
              
              <div className="grid grid-cols-2 gap-2 mb-4">
                {predefinedFields.map((field, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => addPredefinedField(field)}
                    className="flex items-center justify-between rounded-xl border border-gray-300 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 dark:text-gray-200"
                  >
                    <span className="font-medium">{field.name}</span>
                    <RiAddLine className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  </button>
                ))}
                
                <button
                  type="button"
                  onClick={() => setShowCustomField(true)}
                  className="flex items-center justify-between rounded-xl border border-dashed border-gray-300 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 dark:text-gray-200"
                >
                  <span className="font-medium">Custom Field</span>
                  <RiAddLine className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
              
              {/* Custom Field Form */}
              {showCustomField && (
                <div className="rounded-xl border border-gray-300 p-3 mb-4 dark:border-gray-700">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Add Custom Field
                  </h4>
                  
                  <div className="space-y-3">
                    <div>
                      <label htmlFor="custom-field-name" className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                        Field Name
                      </label>
                      <input
                        type="text"
                        id="custom-field-name"
                        className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-1.5 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 sm:text-xs"
                        placeholder="e.g., Company Size"
                        value={customFieldName}
                        onChange={(e) => setCustomFieldName(e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="custom-field-description" className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                        Description (optional)
                      </label>
                      <input
                        type="text"
                        id="custom-field-description"
                        className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-1.5 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 sm:text-xs"
                        placeholder="e.g., Number of employees"
                        value={customFieldDescription}
                        onChange={(e) => setCustomFieldDescription(e.target.value)}
                      />
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        id="custom-field-required"
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-neutral-600 focus:ring-neutral-500 dark:border-gray-700"
                        checked={customFieldRequired}
                        onChange={(e) => setCustomFieldRequired(e.target.checked)}
                      />
                      <label htmlFor="custom-field-required" className="ml-2 block text-xs font-medium text-gray-700 dark:text-gray-300">
                        Required field
                      </label>
                    </div>
                    
                    <div className="flex justify-end space-x-2 pt-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowCustomField(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={addCustomField}
                        disabled={!customFieldName.trim()}
                      >
                        Add Field
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Selected Fields List */}
              {fields.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Selected Fields
                  </h4>
                  <ul className="space-y-2 max-h-60 overflow-y-auto">
                    {fields.map((field) => (
                      <li 
                        key={field.id}
                        className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700"
                      >
                        <div className="flex items-center">
                          <RiDraggable className="mr-2 h-4 w-4 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-700 dark:text-gray-300">{field.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{field.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          {field.required && (
                            <span className="mr-2 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
                              Required
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => removeField(field.id)}
                            className="text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                          >
                            <RiDeleteBinLine className="h-4 w-4" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div ref={fieldsEndRef} />
                </div>
              )}
            </div>
          </div>
        </div>
        
        <DialogFooter className="mt-6 flex-shrink-0">
          <DialogClose asChild>
            <Button
              variant="secondary"
              className="mt-2 w-full sm:mt-0 sm:w-fit"
              onClick={handleClose}
              disabled={isSubmitting || isSuccess}
            >
              Cancel
            </Button>
          </DialogClose>
          <Button 
            className={cn(
              "w-full sm:w-fit transition-all duration-200",
              isSuccess && "bg-green-600 hover:bg-green-700"
            )}
            onClick={handleSubmit}
            disabled={isSubmitting || isSuccess || !formName.trim() || fields.length === 0}
            isLoading={isSubmitting}
          >
            {isSuccess ? (
              <span className="flex items-center">
                <RiCheckLine className="mr-1 h-4 w-4" />
                Form Created
              </span>
            ) : (
              "Create Form"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 