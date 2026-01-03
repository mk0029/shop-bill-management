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
      "flex h-10 w-full items-center justify-between rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer",
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
      "absolute z-50 min-w-[8rem] overflow-hidden rounded-md border border-gray-600 bg-gray-700 text-white shadow-md mt-1",
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
        "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm text-white outline-none hover:bg-gray-600 focus:bg-gray-600",
        isSelected && "bg-gray-600"
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
