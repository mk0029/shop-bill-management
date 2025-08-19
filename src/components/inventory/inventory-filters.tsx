import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dropdown } from "@/components/ui/dropdown";
import { Search, Filter, SortAsc, SortDesc } from "lucide-react";

interface InventoryFiltersProps {
  searchTerm: string;
  selectedCategory: string;
  selectedBrand: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
  categories: any[];
  brands: any[];
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onBrandChange: (value: string) => void;
  onSortChange: (field: string) => void;
  onSortOrderToggle: () => void;
  timeFilter: "all" | "7" | "30" | "90" | "365" | "custom";
  dateFrom: string;
  dateTo: string;
  onTimeFilterChange: (value: "all" | "7" | "30" | "90" | "365" | "custom") => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
}

export const InventoryFilters = ({
  searchTerm,
  selectedCategory,
  selectedBrand,
  sortBy,
  sortOrder,
  categories,
  brands,
  onSearchChange,
  onCategoryChange,
  onBrandChange,
  onSortChange,
  onSortOrderToggle,
  timeFilter,
  dateFrom,
  dateTo,
  onTimeFilterChange,
  onDateFromChange,
  onDateToChange,
}: InventoryFiltersProps) => {
  return (
        <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Filter className="w-5 h-5" />
          Filters & Search
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-10 bg-background border-border text-foreground"
          />
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
          <div className="space-y-1 md:space-y-2">
            <label className="text-sm text-gray-300">Category</label>
            <Dropdown
              options={[
                { value: "all", label: "All Categories" },
                ...categories.map((category) => ({
                  value: category.name,
                  label: category.name,
                })),
              ]}
              value={selectedCategory}
              onValueChange={onCategoryChange}
              placeholder="Select Category"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-300">Brand</label>
            <Dropdown
              options={[
                { value: "all", label: "All Brands" },
                ...brands.map((brand) => ({
                  value: brand.name,
                  label: brand.name,
                })),
              ]}
              value={selectedBrand}
              onValueChange={onBrandChange}
              placeholder="Select Brand"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-300">Sort By</label>
            <div className="flex gap-2">
              <Dropdown
                options={[
                  { value: "name", label: "Name" },
                  { value: "category", label: "Category" },
                  { value: "brand", label: "Brand" },
                  { value: "currentStock", label: "Stock" },
                  { value: "sellingPrice", label: "Price" },
                  { value: "createdAt", label: "Created" },
                  { value: "updatedAt", label: "Updated" },
                ]}
                value={sortBy}
                onValueChange={onSortChange}
                placeholder="Sort By"
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={onSortOrderToggle}
                className="px-3"
              >
                {sortOrder === "asc" ? (
                  <SortAsc className="w-4 h-4" />
                ) : (
                  <SortDesc className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-300">Time</label>
            <Dropdown
              options={[
                { value: "all", label: "All Time" },
                { value: "7", label: "Last 7 Days" },
                { value: "30", label: "Last 30 Days" },
                { value: "90", label: "Last 3 Months" },
                { value: "365", label: "Last Year" },
                { value: "custom", label: "Custom range" },
              ]}
              value={timeFilter}
              onValueChange={(val) => onTimeFilterChange(val as any)}
              placeholder="Time"
            />
          </div>
        </div>

        {timeFilter === "custom" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-sm text-gray-300">From</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => onDateFromChange(e.target.value)}
                className="bg-background border-border text-foreground"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-gray-300">To</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => onDateToChange(e.target.value)}
                className="bg-background border-border text-foreground"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
