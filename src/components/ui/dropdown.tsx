import * as React from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface DropdownProps {
  options: DropdownOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-8 text-sm",
  md: "h-10 text-sm",
  lg: "h-12 text-base",
};

export function Dropdown({
  options,
  value,
  onValueChange,
  placeholder = "Select option",
  disabled = false,
  className,
  size = "md",
}: DropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const selectedOption = options.find((option) => option.value === value);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (optionValue: string) => {
    onValueChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <Button
        variant="outline"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "w-full justify-between bg-gray-800 border-gray-700 text-white hover:bg-gray-700 hover:border-gray-600",
          sizeClasses[size]
        )}
      >
        <span className={selectedOption ? "text-white" : "text-gray-400"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50 max-h-60 overflow-auto">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => !option.disabled && handleSelect(option.value)}
              disabled={option.disabled}
              className={cn(
                "w-full px-3 py-2 text-left text-sm transition-colors duration-150 flex items-center justify-between",
                option.disabled
                  ? "text-gray-500 cursor-not-allowed"
                  : "text-white hover:bg-gray-700 cursor-pointer",
                option.value === value && "bg-blue-600 text-white hover:bg-blue-700"
              )}
            >
              <span>{option.label}</span>
              {option.value === value && <Check className="h-4 w-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
