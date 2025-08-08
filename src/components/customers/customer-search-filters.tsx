import { Search } from "lucide-react";
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
    <Card className="sm:p-4 p-3 bg-gray-900 border-gray-800">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search customers by name, phone, or location..."
            value={filters.searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
          />
        </div>
        <Dropdown
          options={filterOptions}
          value={filters.filterActive}
          onValueChange={onFilterChange}
          placeholder="Filter customers"
          searchable={false}
          className="w-full sm:w-48"
        />
      </div>
    </Card>
  );
}
