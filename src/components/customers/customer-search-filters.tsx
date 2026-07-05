import { Search, Filter, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dropdown } from "@/components/ui/dropdown";
import type { CustomerFilters } from "@/types/customer";

interface CustomerSearchFiltersProps {
  filters: CustomerFilters;
  onSearchChange: (searchTerm: string) => void;
  onFilterChange: (filterActive: "all" | "active" | "inactive") => void;
}

const filterOptions = [
  { value: "all", label: "All Customers" },
  { value: "active", label: "Active Only" },
  { value: "inactive", label: "Inactive Only" },
];

export default function CustomerSearchFilters({
  filters,
  onSearchChange,
  onFilterChange,
}: CustomerSearchFiltersProps) {
  return (
    <Card className="bg-gray-900/80 border-gray-800 backdrop-blur-sm">
      <div className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
            <Input
              placeholder="Search customers by name, phone, or location..."
              value={filters.searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="!pl-10 pr-10 bg-gray-800/80 border-gray-700 text-white placeholder-gray-400 focus:border-gray-500 transition-colors"
            />
            {filters.searchTerm && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500 hidden sm:block" />
            <Dropdown
              options={filterOptions}
              value={filters.filterActive}
              onValueChange={onFilterChange as any}
              placeholder="Filter customers"
              searchable={false}
              className="w-full sm:w-44 bg-gray-800/80 border-gray-700"
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
