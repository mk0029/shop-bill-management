"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCustomerStats } from "@/hooks/use-customer-stats";
import { useCustomerFilters } from "@/hooks/use-customer-filters";
import { useCustomerActions } from "@/hooks/use-customer-actions";
import CustomersPageHeader from "@/components/customers/customers-page-header";
import CustomerStatsCards from "@/components/customers/customer-stats-cards";
import CustomerSearchFilters from "@/components/customers/customer-search-filters";
import CustomerTable from "@/components/customers/customer-table";
import CustomerDetailModal from "@/components/customers/customer-detail-modal";
import type { CustomerWithStats } from "@/types/customer";

export default function AdminCustomersClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { customersWithStats, stats, isLoadingCustomers, isLoadingStats } =
    useCustomerStats();
  const { filters, filteredCustomers, updateSearchTerm, updateFilterActive } =
    useCustomerFilters(customersWithStats);
  const {
    navigateToAddCustomer,
    navigateToEditCustomer,
    navigateToCustomerBills,
    deleteCustomer,
  } = useCustomerActions();

  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerWithStats | null>(null);

  const handleViewCustomer = (customer: CustomerWithStats) => {
    setSelectedCustomer(customer);
  };

  const handleEditCustomer = (customer: CustomerWithStats) => {
    navigateToEditCustomer(customer._id);
  };

  const handleViewBills = (customer: CustomerWithStats) => {
    navigateToCustomerBills(customer._id);
  };

  const handleCloseModal = () => {
    setSelectedCustomer(null);
    if (!searchParams.has("userId")) return;
    const next = new URLSearchParams(searchParams.toString());
    next.delete("userId");
    const qs = next.toString();
    router.replace(qs ? `/admin/customers?${qs}` : "/admin/customers");
  };

  useEffect(() => {
    const userId = searchParams.get("userId");
    if (!userId || !customersWithStats.length) return;
    const customer = customersWithStats.find((c) => c._id === userId);
    if (customer) setSelectedCustomer(customer);
  }, [searchParams, customersWithStats]);

  return (
    <div className="space-y-6 max-md:space-y-4 max-md:pb-3">
      <CustomersPageHeader onAddCustomer={navigateToAddCustomer} />

      {/* <CustomerStatsCards stats={stats} isLoading={isLoadingStats} /> */}

      <CustomerSearchFilters
        filters={filters}
        onSearchChange={updateSearchTerm}
        onFilterChange={updateFilterActive}
      />

      <CustomerTable
        customers={filteredCustomers}
        isLoading={isLoadingCustomers}
        searchTerm={filters.searchTerm}
        onViewCustomer={handleViewCustomer}
        onEditCustomer={handleEditCustomer}
        onDeleteCustomer={deleteCustomer}
      />

      <CustomerDetailModal
        customer={selectedCustomer}
        isOpen={!!selectedCustomer}
        onClose={handleCloseModal}
        onViewBills={handleViewBills}
        onEditCustomer={handleEditCustomer}
      />
    </div>
  );
}
