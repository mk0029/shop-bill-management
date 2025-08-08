import { useState, useMemo } from "react";
import type { CustomerWithStats, CustomerFilters } from "@/types/customer";

export function useCustomerFilters(customers: CustomerWithStats[]) {
  const [filters, setFilters] = useState<CustomerFilters>({
    searchTerm: "",
    filterActive: "all",
  });

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const matchesSearch =
        customer.name
          .toLowerCase()
          .includes(filters.searchTerm.toLowerCase()) ||
        customer.phone.includes(filters.searchTerm) ||
        customer.location
          .toLowerCase()
          .includes(filters.searchTerm.toLowerCase()) ||
        customer.email
          ?.toLowerCase()
          .includes(filters.searchTerm.toLowerCase());

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
