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
  closeOnOutsideClick?: boolean;
}

const sizeClasses = {
  sm: "!leading-none h-auto text-sm  ",
  md: "!leading-none h-auto text-sm ",
  lg: "!leading-none h-auto text-base",
};

const DROPDOWN_EVENT = "dropdown:open";
let dropdownIdCounter = 0;

function getNextDropdownId() {
  dropdownIdCounter += 1;
  return `dropdown-${dropdownIdCounter}`;
}

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
  closeOnOutsideClick = true,
}: DropdownProps) {
  const idRef = React.useRef(getNextDropdownId());
  const [menuState, setMenuState] = React.useState<"closed" | "open" | "closing">("closed");
  const isOpen = menuState !== "closed";
  const [isSearchAvialable, setIsSearch] = React.useState(false || searchable);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [menuRect, setMenuRect] = React.useState<React.CSSProperties | null>(
    null,
  );
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const prevOverflowRef = React.useRef<string | null>(null);
  const closeTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedOption = options.find((option) => option.value === value);

  const filteredOptions = React.useMemo(() => {
    if (!isSearchAvialable || !searchTerm.trim()) {
      return options;
    }
    return options.filter((option) =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [options, searchTerm, isSearchAvialable]);

  const close = React.useCallback(() => {
    if (menuState === "closed") return;
    setMenuState("closing");
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => {
      setMenuState("closed");
      setSearchTerm("");
    }, 150);
  }, [menuState]);

  // Listen for outside clicks and custom dropdown events (one-at-a-time)
  React.useEffect(() => {
    let touchStartedInside = false;

    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as Node;
      touchStartedInside =
        (dropdownRef.current?.contains(target) ||
         menuRef.current?.contains(target)) ?? false;
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (!closeOnOutsideClick) return;
      // On mobile, mousedown is synthetic from touch — ignore it
      // if the touch started inside the dropdown (user was scrolling, not tapping outside)
      if (touchStartedInside) {
        touchStartedInside = false;
        return;
      }
      const target = event.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        close();
      }
    };

    const handleDropdownOpen = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail !== idRef.current && menuState !== "closed") {
        close();
      }
    };

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener(DROPDOWN_EVENT, handleDropdownOpen);
    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener(DROPDOWN_EVENT, handleDropdownOpen);
    };
  }, [close, menuState, closeOnOutsideClick]);

  // Ensure no orphaned render after unmount
  React.useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  const open = React.useCallback(() => {
    if (disabled || menuState !== "closed") return;
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
    setMenuState("open");
    document.dispatchEvent(new CustomEvent(DROPDOWN_EVENT, { detail: idRef.current }));
  }, [disabled, menuState, dropLeft, dropTop, minW]);

  // Lock body scroll when requested and menu is open
  React.useEffect(() => {
    if (!scrollLock) return;
    const body = document.body;
    if (menuState === "open") {
      prevOverflowRef.current = body.style.overflow;
      body.style.overflow = "hidden";
    } else {
      body.style.overflow = prevOverflowRef.current ?? "";
    }
    return () => {
      if (scrollLock) body.style.overflow = prevOverflowRef.current ?? "";
    };
  }, [menuState, scrollLock]);

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
    if (menuState === "open" && isSearchAvialable && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [menuState, isSearchAvialable]);

  // Recalculate position on scroll/resize when open
  React.useEffect(() => {
    if (menuState !== "open") return;
    const updateRect = (e?: Event) => {
      // Ignore scroll events from within the menu itself (e.g. scrolling the options list)
      if (e && menuRef.current && (e.target as Node) !== document && menuRef.current.contains(e.target as Node)) {
        return;
      }
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const mnw = minW ? Math.max(rect.width, 250) : rect.width;
      const gap = 6;
      const leftPos = dropLeft
        ? rect.left
        : Math.max(12, rect.right - mnw);

      setMenuRect((prev) =>
        prev
          ? {
              ...prev,
              left: Math.min(leftPos, window.innerWidth - mnw - 12),
              top: undefined,
              bottom: undefined,
            }
          : prev,
      );
    };
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [menuState, dropLeft, minW]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      close();
    }
  };

  const handleSelect = (optionValue: string) => {
    onValueChange(optionValue);
    close();
  };

  const showMenu = menuState !== "closed" && menuRect;
  const isAnimatingIn = menuState === "open";
  const isAnimatingOut = menuState === "closing";

  const menu = showMenu
      ? createPortal(
          <div
            ref={menuRef}
            style={menuRect}
            className={cn(
              "overflow-hidden rounded-xl border border-cyan-200/15 bg-slate-950/92 pb-2 text-white shadow-2xl shadow-cyan-950/30 backdrop-blur-2xl transition-all duration-150 overscroll-contain",
              isAnimatingIn && "opacity-100 scale-100",
              isAnimatingOut && "opacity-0 scale-95 pointer-events-none",
              !isAnimatingIn && !isAnimatingOut && "opacity-0 scale-95",
            )}
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
          if (menuState === "closed") {
            open();
          } else {
            close();
          }
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
            menuState === "open" && "rotate-180",
          )}
        />
      </Button>
      {menu}
    </div>
  );
}
