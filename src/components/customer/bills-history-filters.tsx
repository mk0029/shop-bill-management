import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dropdown } from "@/components/ui/dropdown";
import { Search, Filter } from "lucide-react";

interface BillsHistoryFiltersProps {
  searchTerm: string;
  selectedStatus: string;
  timeRange: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onTimeRangeChange: (value: string) => void;
}

const statusOptions = [
  { value: "all", label: "All Status" },
  { value: "paid", label: "Paid" },
  { value: "pending", label: "Pending" },
  { value: "overdue", label: "Overdue" },
  { value: "cancelled", label: "Cancelled" },
];

const timeRangeOptions = [
  { value: "all", label: "All Time" },
  { value: "30", label: "Last 30 Days" },
  { value: "90", label: "Last 3 Months" },
  { value: "180", label: "Last 6 Months" },
  { value: "365", label: "Last Year" },
];

export const BillsHistoryFilters = ({
  searchTerm,
  selectedStatus,
  timeRange,
  onSearchChange,
  onStatusChange,
  onTimeRangeChange,
}: BillsHistoryFiltersProps) => {
  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Filter className="w-5 h-5" />
          Search & Filter
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
          <Input
            placeholder="Search by bill number or items..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-700 text-white"
          />
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-gray-300">Status</label>
            <Dropdown
              options={statusOptions}
              value={selectedStatus}
              onValueChange={onStatusChange}
              placeholder="Select status"
              className="bg-gray-800 border-gray-700"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-300">Time Range</label>
            <Dropdown
              options={timeRangeOptions}
              value={timeRange}
              onValueChange={onTimeRangeChange}
              placeholder="Select time range"
              className="bg-gray-800 border-gray-700"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
