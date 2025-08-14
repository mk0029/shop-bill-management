"use client";

import * as React from "react";
import { ChevronDown, Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Input } from "./input";

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
  searchable?: boolean;
  searchPlaceholder?: string;
}

const sizeClasses = {
  sm: "!leading-none h-auto sm:h-8 text-sm  sm:min-h-[32px]",
  md: "!leading-none h-auto sm:h-10 text-sm  sm:min-h-[40px]",
  lg: "!leading-none h-auto sm:h-12 text-base sm:min-h-[48px]",
};

export function Dropdown({
  options,
  value,
  onValueChange,
  placeholder = "Select option",
  disabled = false,
  className,
  size = "md",
  searchable,
  searchPlaceholder = "Search...",
}: DropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSearchAvialable] = React.useState(searchable || options.length > 10);
  const [searchTerm, setSearchTerm] = React.useState("");
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const selectedOption = options.find((option) => option.value === value);

  // Filter options based on search term
  const filteredOptions = React.useMemo(() => {
    if (!isSearchAvialable || !searchTerm.trim()) {
      return options;
    }
    return options.filter((option) =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm, isSearchAvialable]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  React.useEffect(() => {
    if (isOpen && isSearchAvialable && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, isSearchAvialable]);

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      setIsOpen(false);
      setSearchTerm("");
    }
  };

  const handleSelect = (optionValue: string) => {
    onValueChange(optionValue);
    setIsOpen(false);
    setSearchTerm("");
  };

  return (
    <div
      className={cn("relative", className)}
      ref={dropdownRef}
      onKeyDown={handleKeyDown}>
      <Button
        type="button"
        variant="outline"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          " w-full justify-between bg-gray-800 border-gray-700 text-white hover:bg-gray-700 hover:border-gray-600 touch-manipulation max-md:px-2",
          sizeClasses[size]
        )}>
        <span
          className={`leading-none ${
            selectedOption ? "text-white" : "text-gray-400"
          }`}>
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
        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl shadow-black/50 z-50 max-h-60 sm:max-h-60 overflow-hidden">
          {isSearchAvialable && (
            <div className="p-1 sm:p-2 border-b border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 "
                />
              </div>
            </div>
          )}
          <div className="max-h-48 overflow-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-400 text-center">
                {searchTerm ? "No results found" : "No options available"}
              </div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  onClick={() => !option.disabled && handleSelect(option.value)}
                  disabled={option.disabled}
                  className={cn(
                    "w-full px-3 py-3 sm:py-2 text-left text-sm transition-colors duration-150 flex items-center justify-between touch-manipulation min-h-[44px] sm:min-h-[36px]",
                    option.disabled
                      ? "text-gray-500 cursor-not-allowed"
                      : "text-white hover:bg-gray-700 cursor-pointer",
                    option.value === value &&
                      "bg-blue-600 text-white hover:bg-blue-700"
                  )}>
                  <span>{option.label}</span>
                  {option.value === value && <Check className="h-4 w-4" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
