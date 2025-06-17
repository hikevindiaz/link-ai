import { Card } from "@/components/ui/card";
import { Button } from "@/components/Button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Divider } from "@/components/Divider";
import { LoadingState } from "@/components/LoadingState";
import { RiMoreFill, RiAddLine, RiDeleteBinLine, RiSettings4Line } from "@remixicon/react";
import { Form } from "@/hooks/useForms";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/DropdownMenu";

interface FormsSidebarProps {
  forms: Form[];
  selectedForm: Form | null;
  isLoading: boolean;
  onSelectForm: (form: Form) => void;
  onCreateForm: () => void;
  onDeleteForm: (form: Form) => void;
  className?: string;
}

// Remove colorCombinations - using simple neutral styling instead

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export function FormsSidebar({
  forms,
  selectedForm,
  isLoading,
  onSelectForm,
  onCreateForm,
  onDeleteForm,
  className
}: FormsSidebarProps) {
  return (
    <div className={cn("w-80 border-r border-neutral-200 dark:border-neutral-800 flex flex-col", className)}>
      <div className="p-4 pb-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
            Forms
          </h2>
          <Button
            variant="secondary"
            className="h-8 w-8 p-0"
            onClick={onCreateForm}
          >
            <RiAddLine className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <Divider className="mt-4" />
      
      <div className="px-4 pb-4 flex-1 overflow-auto">
        {isLoading ? (
          <LoadingState text="Loading forms..." />
        ) : forms.length > 0 ? (
          <div className="grid grid-cols-1 gap-2 mt-1">
            {forms.map((form) => (
              <div 
                key={form.id} 
                onClick={() => onSelectForm(form)}
                className={cn(
                  "group transition-all duration-200 cursor-pointer p-3 rounded-lg border relative",
                  "hover:bg-neutral-50 dark:hover:bg-neutral-900",
                  "hover:shadow-sm",
                  "bg-white dark:bg-black border-neutral-200 dark:border-neutral-800",
                  "hover:border-neutral-300 dark:hover:border-neutral-700",
                  selectedForm?.id === form.id && [
                    "border-neutral-400 dark:border-white",
                    "bg-neutral-50 dark:bg-neutral-900"
                  ]
                )}
              >
                <div className="flex items-center">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-medium">
                    {getInitials(form.name)}
                  </span>
                  <div className="ml-3 w-full overflow-hidden">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center max-w-[70%]">
                        <div className="truncate text-sm font-medium text-neutral-700 dark:text-neutral-200">
                          {form.name}
                        </div>
                        <div className="ml-2 flex-shrink-0">
                          <Badge
                            variant={form.status === 'active' ? 'success' : 'neutral'}
                            className="text-xs py-0 px-1.5"
                          >
                            {form.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <p className="mt-1 truncate text-xs text-neutral-600 dark:text-neutral-400">
                      {form.fields.length} fields
                    </p>
                  </div>
                </div>

                <div className="absolute right-2 top-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <RiMoreFill className="h-3.5 w-3.5 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="min-w-56">
                      <DropdownMenuLabel>Form Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuGroup>
                        <DropdownMenuItem onClick={() => window.location.href = `/dashboard/forms/${form.id}/edit`}>
                          <span className="flex items-center gap-x-2">
                            <RiSettings4Line className="size-4 text-inherit" />
                            <span>Edit Form</span>
                          </span>
                        </DropdownMenuItem>
                      </DropdownMenuGroup>

                      <DropdownMenuSeparator />

                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteForm(form);
                        }}
                        className="text-red-600 dark:text-red-400"
                      >
                        <span className="flex items-center gap-x-2">
                          <RiDeleteBinLine className="size-4 text-inherit" />
                          <span>Delete</span>
                        </span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center py-8 text-center">
            <div className="flex flex-col items-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No forms yet.
              </p>
              <Button 
                variant="secondary"
                className="mt-4"
                onClick={onCreateForm}
              >
                <RiAddLine className="mr-2 h-4 w-4" />
                Create New Form
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 