import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface BillFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedStatuses: string[];
  onStatusChange: (statuses: string[] | ((prev: string[]) => string[])) => void;
}

export function BillFilters({
  searchTerm,
  onSearchChange,
  selectedStatuses,
  onStatusChange,
}: BillFiltersProps) {
  const handleStatusToggle = (status: string) => {
    onStatusChange((prev) => {
      const set = new Set(prev);
      if (set.has(status)) set.delete(status);
      else set.add(status);
      return Array.from(set);
    });
  };

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-[1]" />
            <Input
              type="text"
              placeholder="Search by bill number or item name..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onStatusChange([])}
              className={`px-3 py-1 text-xs rounded-full border ${
                selectedStatuses.length === 0
                  ? "bg-blue-600 text-white border-blue-500"
                  : "bg-gray-800 text-gray-300 border-gray-700"
              }`}
            >
              All
            </button>{" "}
            {(["pending", "partial", "overdue", "paid"] as const).map(
              (status) => {
                const active = selectedStatuses.includes(status);
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => handleStatusToggle(status)}
                    className={`px-3 py-1 text-xs rounded-full border ${
                      active
                        ? "bg-blue-600 text-white border-blue-500"
                        : "bg-gray-800 text-gray-300 border-gray-700"
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                );
              }
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
