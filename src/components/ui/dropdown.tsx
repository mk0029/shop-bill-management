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
  options: DropdownOption[];  dropLeft?: boolean;
  dropTop?:boolean,
  minW?: boolean,
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
  searchable?: boolean;
  searchPlaceholder?: string;
  classNameButton?: string;
  scrollLock?: boolean;
}

const sizeClasses = {
  sm: "!leading-none h-auto text-sm  ",
  md: "!leading-none h-auto text-sm ",
  lg: "!leading-none h-auto text-base",
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
  classNameButton = "",
  dropLeft = false,
  dropTop = false,
  minW = false,
  scrollLock = false,
}: DropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSearchAvialable, setIsSearch] = React.useState(false || searchable); // Default to false if not provided
  const [searchTerm, setSearchTerm] = React.useState("");
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const prevOverflowRef = React.useRef<string | null>(null);

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

  // Lock body scroll when requested and dropdown is open
  React.useEffect(() => {
    if (!scrollLock) return;
    const body = document.body;
    if (isOpen) {
      prevOverflowRef.current = body.style.overflow;
      body.style.overflow = "hidden";
    } else {
      body.style.overflow = prevOverflowRef.current ?? "";
    }
    return () => {
      if (scrollLock) body.style.overflow = prevOverflowRef.current ?? "";
    };
  }, [isOpen, scrollLock]);
  React.useEffect(() => {
    setIsSearch(options.length > 5 || searchable);
  }, [options]);

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
        size="icon"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          " !h-[38px] !min-h-[38px] w-full justify-between bg-gray-800 border-gray-700 text-white hover:bg-gray-700 hover:border-gray-600 touch-manipulation max-md:px-2 !py-1.5 sm:!py-2.5 px-2 sm:px-2.5",
          sizeClasses[size],
          classNameButton
        )}>
        <span
          className={`leading-none text-sm ${
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
        <div className={`absolute ${minW?'min-w-[250px]':'w-full'} ${dropLeft?'left-0':'right-0'} ${!dropTop?'top-full mt-1':'bottom-full mb-1'}   bg-gray-800 border border-gray-400 rounded-lg shadow-2xl shadow-black/50 z-50 max-h-60 sm:max-h-60 overflow-hidden pb-2`}>
          {isSearchAvialable && (
            <div className="p-1 sm:p-2 border-b border-gray-400">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 max-sm:!py-1 bg-gray-700 !border-gray-600 text-white placeholder-gray-400 !outline-none"
                />
              </div>
            </div>
          )}
          <div className="max-h-48 overflow-auto pb-1.5 sm:pb-3">
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
                    "w-full px-3 py-1.5 sm:py-2 text-left text-sm transition-colors duration-150 flex items-center justify-between touch-manipulation",
                    option.disabled
                      ? "text-gray-500 cursor-not-allowed"
                      : "text-white hover:bg-gray-700 cursor-pointer",
                    option.value === value &&
                      "bg-slate-600 text-white hover:bg-slate-700"
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
