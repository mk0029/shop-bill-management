import { useState, useMemo } from "react";
import type { CustomerWithStats, CustomerFilters } from "@/types/customer";

export function useCustomerFilters(customers: CustomerWithStats[]) {
  const [filters, setFilters] = useState<CustomerFilters>({
    searchTerm: "",
    filterActive: "all",
  });

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const normalizedSearchTerm = (filters.searchTerm ?? "")
        .trim()
        .toLowerCase();

      const matchesSearch =
        normalizedSearchTerm === "" ||
        (customer.name ?? "")
          .toLowerCase()
          .includes(normalizedSearchTerm) ||
        (customer.phone ?? "").includes(filters.searchTerm ?? "") ||
        (customer.location ?? "")
          .toLowerCase()
          .includes(normalizedSearchTerm) ||
        (customer.email ?? "")
          .toLowerCase()
          .includes(normalizedSearchTerm);

      const matchesFilter =
        filters.filterActive === "all" ||
        (filters.filterActive === "active" && customer.isActive) ||
        (filters.filterActive === "inactive" && !customer.isActive);

      return matchesSearch && matchesFilter;
    });
  }, [customers, filters]);

  const updateSearchTerm = (searchTerm: string) => {
    setFilters((prev) => ({ ...prev, searchTerm }));
  };

  const updateFilterActive = (filterActive: "all" | "active" | "inactive") => {
    setFilters((prev) => ({ ...prev, filterActive }));
  };

  return {
    filters,
    filteredCustomers,
    updateSearchTerm,
    updateFilterActive,
  };
}
