"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, User, X } from "lucide-react";
import type { CustomerSelection } from "@/lib/cashbook-calculations";

interface CustomerSearchResult {
  _id: string;
  name: string;
  nickname?: string;
  phone?: string;
}

interface CustomNameSearchResult {
  _id: string;
  name: string;
  usageCount: number;
  lastUsedAt: string;
}

type SearchItem =
  | { kind: "customer"; data: CustomerSearchResult }
  | { kind: "custom"; data: CustomNameSearchResult };

interface Props {
  customers: CustomerSearchResult[];
  customNames?: CustomNameSearchResult[];
  value: CustomerSelection;
  onChange: (selection: CustomerSelection) => void;
  disabled?: boolean;
}

export function SearchableCustomerInput({
  customers,
  customNames = [],
  value,
  onChange,
  disabled,
}: Props) {
  const [query, setQuery] = useState(value.customerName || "");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const matches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [] as SearchItem[];

    const customerMatches: SearchItem[] = customers
      .filter((c) => {
        const name = (c.name || "").toLowerCase();
        const nick = (c.nickname || "").toLowerCase();
        const phone = (c.phone || "").toLowerCase();
        return name.includes(q) || nick.includes(q) || phone.includes(q);
      })
      .map((c) => ({ kind: "customer" as const, data: c }));

    const customMatches: SearchItem[] = customNames
      .filter((cn) => {
        const name = (cn.name || "").toLowerCase();
        return name.includes(q);
      })
      .map((cn) => ({ kind: "custom" as const, data: cn }))
      .sort((a, b) => {
        const aExact = a.data.name.toLowerCase() === q;
        const bExact = b.data.name.toLowerCase() === q;
        if (aExact !== bExact) return aExact ? -1 : 1;
        return (b.data.usageCount || 0) - (a.data.usageCount || 0);
      });

    return [...customerMatches, ...customMatches].slice(0, 15);
  }, [customers, customNames, searchQuery]);

  const hasExactCustomerMatch = useMemo(() => {
    if (!searchQuery.trim()) return false;
    const q = searchQuery.trim().toLowerCase();
    return customers.some(
      (c) =>
        (c.name || "").toLowerCase() === q ||
        (c.nickname || "").toLowerCase() === q,
    );
  }, [customers, searchQuery]);

  const hasExactCustomMatch = useMemo(() => {
    if (!searchQuery.trim()) return false;
    const q = searchQuery.trim().toLowerCase();
    return customNames.some((cn) => (cn.name || "").toLowerCase() === q);
  }, [customNames, searchQuery]);

  const showCustomOption =
    searchQuery.trim().length > 0 &&
    !hasExactCustomerMatch &&
    !hasExactCustomMatch &&
    isOpen;

  const debouncedSearch = useCallback((val: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchQuery(val);
    }, 150);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (value.customerName && !isOpen) {
      setQuery(value.customerName);
    }
  }, [value.customerName, isOpen]);

  const totalOptions = matches.length + (showCustomOption ? 1 : 0);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setIsOpen(true);
        setActiveIndex(0);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) => (prev < totalOptions - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : totalOptions - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < matches.length) {
          selectItem(matches[activeIndex]);
        } else if (showCustomOption && activeIndex === matches.length) {
          selectCustomName();
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
        break;
    }
  };

  const selectItem = (item: SearchItem) => {
    if (item.kind === "customer") {
      setQuery(item.data.name);
      setSearchQuery("");
      setIsOpen(false);
      setActiveIndex(-1);
      onChange({
        customerId: item.data._id,
        customerName: item.data.name,
        isCustomName: false,
      });
    } else {
      setQuery(item.data.name);
      setSearchQuery("");
      setIsOpen(false);
      setActiveIndex(-1);
      onChange({
        customerId: null,
        customerName: item.data.name,
        isCustomName: true,
      });
    }
  };

  const selectCustomName = () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    setQuery(trimmed);
    setSearchQuery("");
    setIsOpen(false);
    setActiveIndex(-1);
    onChange({
      customerId: null,
      customerName: trimmed,
      isCustomName: true,
    });
  };

  const handleClear = () => {
    setQuery("");
    setSearchQuery("");
    setIsOpen(false);
    setActiveIndex(-1);
    onChange({
      customerId: null,
      customerName: "",
      isCustomName: false,
    });
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    debouncedSearch(val);
    if (!isOpen) setIsOpen(true);
    setActiveIndex(-1);
  };

  const customerCount = matches.filter((m) => m.kind === "customer").length;
  const customCount = matches.filter((m) => m.kind === "custom").length;

  return (
    <div className="space-y-1">
      <Label className="text-gray-300 text-sm">Customer / Name</Label>
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          <Input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={() => {
              setIsOpen(true);
              if (query) debouncedSearch(query);
            }}
            onBlur={() => {
              setTimeout(() => {
                setIsOpen(false);
                setActiveIndex(-1);
              }, 200);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search customer by name, nickname, or phone..."
            disabled={disabled}
            autoComplete="off"
            aria-label="Customer / Name"
            aria-expanded={isOpen}
            aria-controls="customer-listbox"
            aria-activedescendant={
              activeIndex >= 0 ? `customer-option-${activeIndex}` : undefined
            }
            role="combobox"
            className="bg-gray-800/50 border-gray-700/70 text-white placeholder-gray-500 !pl-8 !pr-8"
          />
          {query && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
              aria-label="Clear"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {isOpen && (matches.length > 0 || showCustomOption) && (
          <div
            ref={listRef}
            id="customer-listbox"
            role="listbox"
            className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border border-gray-700/70 bg-gray-900/95 backdrop-blur-xl shadow-xl"
          >
            {customerCount > 0 && (
              <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-gray-500 font-medium bg-white/[0.02]">
                Customers
              </div>
            )}
            {matches.map((item, idx) => {
              if (item.kind === "customer") {
                return (
                  <button
                    key={`c-${item.data._id}`}
                    id={`customer-option-${idx}`}
                    type="button"
                    role="option"
                    aria-selected={activeIndex === idx}
                    onClick={() => selectItem(item)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors ${
                      activeIndex === idx
                        ? "bg-cyan-500/15 text-white"
                        : "text-gray-200 hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full bg-cyan-500/15 flex items-center justify-center shrink-0">
                      <User className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">
                        {item.data.name}
                      </div>
                      <div className="text-[11px] text-gray-500 flex items-center gap-2 truncate">
                        {item.data.nickname && (
                          <span>{item.data.nickname}</span>
                        )}
                        {item.data.phone && <span>{item.data.phone}</span>}
                      </div>
                    </div>
                    <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded shrink-0">
                      Customer
                    </span>
                  </button>
                );
              } else {
                return (
                  <button
                    key={`m-${item.data._id}`}
                    id={`customer-option-${idx}`}
                    type="button"
                    role="option"
                    aria-selected={activeIndex === idx}
                    onClick={() => selectItem(item)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors ${
                      activeIndex === idx
                        ? "bg-amber-500/15 text-white"
                        : "text-gray-200 hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
                      <User className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">
                        {item.data.name}
                      </div>
                      <div className="text-[11px] text-gray-500 truncate">
                        Used {item.data.usageCount} time
                        {item.data.usageCount !== 1 ? "s" : ""}
                      </div>
                    </div>
                    <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded shrink-0">
                      Custom
                    </span>
                  </button>
                );
              }
            })}
            {showCustomOption && (
              <>
                {matches.length > 0 && (
                  <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-gray-500 font-medium border-t border-gray-700/50 bg-white/[0.02]">
                    New Name
                  </div>
                )}
                <button
                  id={`customer-option-${matches.length}`}
                  type="button"
                  role="option"
                  aria-selected={activeIndex === matches.length}
                  onClick={selectCustomName}
                  onMouseEnter={() => setActiveIndex(matches.length)}
                  className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors ${
                    activeIndex === matches.length
                      ? "bg-emerald-500/15 text-white"
                      : "text-gray-200 hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="w-7 h-7 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                    <User className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">
                      Use &ldquo;{searchQuery.trim()}&rdquo;
                    </div>
                    <div className="text-[11px] text-gray-500">
                      No matching customer found
                    </div>
                  </div>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {value.isCustomName && value.customerName && (
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[11px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
            Custom Name
          </span>
          <span className="text-[11px] text-gray-400">
            {value.customerName}
          </span>
        </div>
      )}
      {value.customerId && value.customerName && !value.isCustomName && (
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[11px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md">
            Existing Customer
          </span>
          <span className="text-[11px] text-gray-400">
            {value.customerName}
          </span>
        </div>
      )}
    </div>
  );
}
