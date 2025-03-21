import { cn } from "@/lib/utils";
import { RiLoader2Line } from "@remixicon/react";

interface SpinnerProps {
  className?: string;
}

export function Spinner({ className }: SpinnerProps) {
  return (
    <RiLoader2Line 
      className={cn("h-4 w-4 animate-spin", className)} 
    />
  );
} 