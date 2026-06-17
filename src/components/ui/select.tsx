"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dropdown, DropdownOption } from "./dropdown";

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children?: React.ReactNode;
  disabled?: boolean;
}

interface SelectTriggerProps {
  className?: string;
  children?: React.ReactNode;
}

interface SelectValueProps {
  placeholder?: string;
}

interface SelectContentProps {
  children?: React.ReactNode;
  className?: string;
}

interface SelectItemProps {
  value: string;
  children?: React.ReactNode;
}

const SelectContext = React.createContext<{
  value?: string;
  onValueChange?: (value: string) => void;
}>({});

export const Select: React.FC<SelectProps> = ({ value, onValueChange, children, disabled }) => {
  return (
    <SelectContext.Provider value={{ value, onValueChange }}>
      <div className={`relative ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
        {children}
      </div>
    </SelectContext.Provider>
  );
};

export const SelectTrigger: React.FC<SelectTriggerProps> = ({ className, children }) => {
  return (
    <div className={cn(
      "flex h-10 w-full cursor-pointer items-center justify-between rounded-md border border-white/10 bg-white/[0.055] px-3 py-2 text-sm text-slate-100 shadow-inner shadow-white/[0.03] backdrop-blur-xl placeholder:text-slate-400/80 focus:border-cyan-200/35 focus:outline-none focus:ring-2 focus:ring-cyan-300/20",
      className
    )}>
      {children}
      <ChevronDown className="h-4 w-4 opacity-50" />
    </div>
  );
};

export const SelectValue: React.FC<SelectValueProps> = ({ placeholder }) => {
  const { value } = React.useContext(SelectContext);
  return (
    <span className={value ? "text-white" : "text-gray-400"}>
      {value || placeholder}
    </span>
  );
};

export const SelectContent: React.FC<SelectContentProps> = ({ children, className }) => {
  return (
    <div className={cn(
      "absolute z-[260] mt-1 min-w-[8rem] overflow-hidden rounded-xl border border-cyan-200/15 bg-slate-950/92 text-white shadow-2xl shadow-cyan-950/30 backdrop-blur-2xl",
      className
    )}>
      {children}
    </div>
  );
};

export const SelectItem: React.FC<SelectItemProps> = ({ value, children }) => {
  const { value: selectedValue, onValueChange } = React.useContext(SelectContext);
  const isSelected = selectedValue === value;

  return (
    <div
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-lg py-1.5 pl-8 pr-2 text-sm text-slate-100 outline-none hover:bg-cyan-300/10 focus:bg-cyan-300/10",
        isSelected && "bg-slate-700/85 text-white"
      )}
      onClick={() => onValueChange?.(value)}
    >
      {isSelected && (
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          ✓
        </span>
      )}
      {children}
    </div>
  );
};

// Backward compatibility - use Dropdown for more complex cases
export interface SelectFieldProps {
  value: string;
  onValueChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function SelectField({ 
  value, 
  onValueChange, 
  options, 
  placeholder = "Select an option...",
  className = "",
  disabled = false
}: SelectFieldProps) {
  return (
    <Dropdown
      options={options}
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      placeholder={placeholder}
      className={className}
      searchable={options.length > 10}
    />
  );
}
