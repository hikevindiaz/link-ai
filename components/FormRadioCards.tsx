import * as React from "react";
import { cn } from "@/lib/utils";

interface FormRadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
}

export function FormRadioGroup({
  name,
  value,
  onValueChange,
  children,
  className,
  ...props
}: FormRadioGroupProps) {
  return (
    <div className={cn("", className)} {...props}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<FormRadioItemProps>, {
            name,
            checked: child.props.value === value,
            onChange: () => onValueChange(child.props.value),
          });
        }
        return child;
      })}
    </div>
  );
}

interface FormRadioItemProps extends React.InputHTMLAttributes<HTMLInputElement> {
  children: React.ReactNode;
}

export function FormRadioItem({
  children,
  className,
  checked,
  onChange,
  name,
  value,
  ...props
}: FormRadioItemProps) {
  return (
    <label
      className={cn(
        "flex cursor-pointer flex-col rounded-lg border border-neutral-200 p-4 transition-all hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700",
        checked && "border-neutral-500 ring-1 ring-neutral-500 dark:border-neutral-500 dark:ring-neutral-500",
        className
      )}
    >
      <input
        type="radio"
        className="sr-only"
        checked={checked}
        onChange={onChange}
        name={name}
        value={value}
        {...props}
      />
      {children}
    </label>
  );
} 