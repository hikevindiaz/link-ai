import { Card } from "@/components/ui/homepage/card";
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

const colorCombinations = [
  { text: 'text-fuchsia-800 dark:text-fuchsia-500', bg: 'bg-fuchsia-100 dark:bg-fuchsia-500/20' },
  { text: 'text-indigo-800 dark:text-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-500/20' },
  { text: 'text-pink-800 dark:text-pink-500', bg: 'bg-pink-100 dark:bg-pink-500/20' },
  { text: 'text-emerald-800 dark:text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-500/20' },
  { text: 'text-orange-800 dark:text-orange-500', bg: 'bg-orange-100 dark:bg-orange-500/20' },
  { text: 'text-indigo-800 dark:text-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-500/20' },
  { text: 'text-yellow-800 dark:text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-500/20' },
];

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
    <div className={cn("w-80 border-r border-gray-200 dark:border-gray-800 flex flex-col", className)}>
      <div className="p-4 pb-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
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
          <div className="grid grid-cols-1 gap-3 mt-1">
            {forms.map((form, index) => (
              <Card 
                key={form.id} 
                asChild 
                className={cn(
                  "group transition-all duration-200",
                  "hover:bg-gray-50 dark:hover:bg-gray-900",
                  "hover:shadow-sm",
                  "hover:border-gray-300 dark:hover:border-gray-700",
                  selectedForm?.id === form.id && [
                    "border-indigo-500 dark:border-indigo-500",
                    "bg-indigo-50/50 dark:bg-indigo-500/5",
                    "ring-1 ring-indigo-500/20 dark:ring-indigo-500/20"
                  ]
                )}
              >
                <div className="relative px-3.5 py-2.5">
                  <div className="flex items-center space-x-3">
                    <span
                      className={cn(
                        colorCombinations[index % colorCombinations.length].bg,
                        colorCombinations[index % colorCombinations.length].text,
                        'flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-medium',
                        'transition-transform duration-200 group-hover:scale-[1.02]',
                        selectedForm?.id === form.id && [
                          "border-2 border-indigo-500 dark:border-indigo-500",
                          "shadow-[0_0_0_4px_rgba(59,130,246,0.1)]"
                        ]
                      )}
                      aria-hidden={true}
                    >
                      {getInitials(form.name)}
                    </span>
                    <div className="truncate min-w-0">
                      <p className={cn(
                        "truncate text-sm font-medium text-gray-900 dark:text-gray-50",
                        selectedForm?.id === form.id && "text-indigo-600 dark:text-indigo-400"
                      )}>
                        <button 
                          onClick={() => onSelectForm(form)}
                          className="focus:outline-none hover:no-underline no-underline"
                          type="button"
                        >
                          <span className="absolute inset-0" aria-hidden="true" />
                          {form.name}
                        </button>
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p className="text-xs text-gray-500 dark:text-gray-500 pointer-events-none no-underline">
                          {form.fields.length} fields
                        </p>
                        <Badge
                          variant={form.status === 'active' ? 'success' : 'neutral'}
                          className="text-xs py-0 px-1.5"
                        >
                          {form.status}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="absolute right-2.5 top-2.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-6 w-6 p-0"
                        >
                          <RiMoreFill className="h-3.5 w-3.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300" />
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
              </Card>
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