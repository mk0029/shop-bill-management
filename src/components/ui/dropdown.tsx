"use client";

import * as React from "react";
import { ChevronDown, Check, Search } from "lucide-react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Input } from "./input";

export interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface DropdownProps {
  options: DropdownOption[];
  dropLeft?: boolean;
  dropTop?: boolean;
  minW?: boolean;
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
  searchable?: boolean;
  removeSearchForce?: boolean;
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
  removeSearchForce,
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
  const [menuRect, setMenuRect] = React.useState<React.CSSProperties | null>(
    null,
  );
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const prevOverflowRef = React.useRef<string | null>(null);

  const selectedOption = options.find((option) => option.value === value);

  // Filter options based on search term
  const filteredOptions = React.useMemo(() => {
    if (!isSearchAvialable || !searchTerm.trim()) {
      return options;
    }
    return options.filter((option) =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [options, searchTerm, isSearchAvialable]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const updateMenuRect = React.useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const minWidth = minW ? Math.max(rect.width, 250) : rect.width;
    const gap = 6;
    const maxMenuHeight = Math.min(280, window.innerHeight - 24);
    const openAbove =
      dropTop || (!dropTop && rect.bottom + maxMenuHeight + gap > window.innerHeight);
    const left = dropLeft
      ? rect.left
      : Math.max(12, rect.right - minWidth);

    setMenuRect({
      position: "fixed",
      left: Math.min(left, window.innerWidth - minWidth - 12),
      top: openAbove ? undefined : rect.bottom + gap,
      bottom: openAbove ? window.innerHeight - rect.top + gap : undefined,
      width: minW ? undefined : rect.width,
      minWidth,
      maxWidth: "calc(100vw - 24px)",
      zIndex: 260,
    });
  }, [dropLeft, dropTop, minW]);

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
    if (removeSearchForce) {
      setIsSearch(false);
      return;
    } else {
      setIsSearch(options.length > 5 || searchable);
    }
  }, [options, removeSearchForce]);

  // Focus search input when dropdown opens
  React.useEffect(() => {
    if (isOpen && isSearchAvialable && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, isSearchAvialable]);

  React.useEffect(() => {
    if (!isOpen) return;
    updateMenuRect();
    window.addEventListener("resize", updateMenuRect);
    window.addEventListener("scroll", updateMenuRect, true);
    return () => {
      window.removeEventListener("resize", updateMenuRect);
      window.removeEventListener("scroll", updateMenuRect, true);
    };
  }, [isOpen, updateMenuRect]);

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

  const menu =
    isOpen && menuRect
      ? createPortal(
          <div
            ref={menuRef}
            style={menuRect}
            className="overflow-hidden rounded-xl border border-cyan-200/15 bg-slate-950/92 pb-2 text-white shadow-2xl shadow-cyan-950/30 backdrop-blur-2xl"
          >
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(56,189,248,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.08)_1px,transparent_1px)] bg-[size:22px_22px] opacity-35" />
            <div className="relative">
              {isSearchAvialable && (
                <div className="border-b border-white/10 p-1.5 sm:p-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-cyan-100/60" />
                    <Input
                      ref={searchInputRef}
                      type="text"
                      placeholder={searchPlaceholder}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 max-sm:!py-1"
                    />
                  </div>
                </div>
              )}
              <div className="max-h-56 overflow-auto p-1">
                {filteredOptions.length === 0 ? (
                  <div className="px-3 py-3 text-center text-sm text-slate-400">
                    {searchTerm ? "No results found" : "No options available"}
                  </div>
                ) : (
                  filteredOptions.map((option) => (
                    <button
                      type="button"
                      key={option.value}
                      onClick={() =>
                        !option.disabled && handleSelect(option.value)
                      }
                      disabled={option.disabled}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors duration-150 touch-manipulation",
                        option.disabled
                          ? "cursor-not-allowed text-slate-600"
                          : "cursor-pointer text-slate-100 hover:bg-cyan-300/10 hover:text-white",
                        option.value === value &&
                          "bg-slate-700/85 text-white ring-1 ring-cyan-200/20",
                      )}
                    >
                      <span className="min-w-0 truncate">{option.label}</span>
                      {option.value === value && (
                        <Check className="h-4 w-4 shrink-0 text-cyan-200" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div
      className={cn("relative rounded-md", className)}
      ref={dropdownRef}
      onKeyDown={handleKeyDown}
    >
      <Button
        ref={buttonRef}
        type="button"
        variant="outline"
        size="icon"
        onClick={() => {
          if (disabled) return;
          updateMenuRect();
          setIsOpen(!isOpen);
        }}
        disabled={disabled}
        className={cn(
          "max-sm:text-sm !h-[42px] !min-h-[42px] w-full justify-between border-white/10 !bg-white/[0.055] text-white shadow-inner shadow-white/[0.03] backdrop-blur-xl hover:!bg-white/[0.09] hover:border-cyan-200/25 touch-manipulation max-md:px-2 !py-1.5 sm:!py-2.5 px-2 sm:px-2.5",
          sizeClasses[size],
          classNameButton,
        )}
      >
        <span
          className={`leading-none text-sm min-w-0 truncate ${
            selectedOption ? "text-white" : "text-gray-400"
          }`}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </Button>
      {menu}
    </div>
  );
}
