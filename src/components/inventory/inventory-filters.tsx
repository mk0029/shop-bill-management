"use client";

import { Search, X } from "lucide-react";

interface InventoryFiltersProps {
  searchTerm: string;
  selectedCategory: string;
  categories: any[];
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
}

export const InventoryFilters = ({
  searchTerm,
  selectedCategory,
  categories,
  onSearchChange,
  onCategoryChange,
}: InventoryFiltersProps) => {
  return (
    <div className="space-y-2">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search..."
          className="w-full rounded-lg border border-white/[0.06] bg-white/[0.04] pl-9 pr-8 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-200/35 transition-all"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Category pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto hide-scroll">
        <button
          type="button"
          onClick={() => onCategoryChange("all")}
          className={`px-2.5 py-1 text-[11px] rounded-full border whitespace-nowrap transition-all ${
            selectedCategory === "all"
              ? "bg-blue-600 text-white border-blue-500"
              : "bg-white/[0.04] text-gray-400 border-white/[0.06] hover:text-gray-200"
          }`}
        >
          All
        </button>
        {categories.map((category) => (
          <button
            key={category._id}
            type="button"
            onClick={() => onCategoryChange(category.name)}
            className={`px-2.5 py-1 text-[11px] rounded-full border whitespace-nowrap transition-all ${
              selectedCategory === category.name
                ? "bg-blue-600 text-white border-blue-500"
                : "bg-white/[0.04] text-gray-400 border-white/[0.06] hover:text-gray-200"
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>
    </div>
  );
};
