import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckboxProps {
  id?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function Checkbox({
  id,
  checked = false,
  onCheckedChange,
  disabled = false,
  className,
}: CheckboxProps) {
  return (
    <button
      id={id}
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "relative h-4 w-4 rounded border border-gray-600 bg-gray-800 transition-colors focus:outline-none   focus:ring-offset-2 focus:ring-offset-gray-900",
        checked && "bg-blue-600 border-blue-600",
        disabled && "opacity-50 cursor-not-allowed",
        !disabled && "hover:border-gray-500",
        className
      )}
    >
      {checked && <Check className="absolute inset-0 h-4 w-4 text-white" />}
    </button>
  );
}
