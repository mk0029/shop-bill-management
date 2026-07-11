"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCustomerStats } from "@/hooks/use-customer-stats";
import { useCustomerFilters } from "@/hooks/use-customer-filters";
import { useCustomerActions } from "@/hooks/use-customer-actions";
import CustomersPageHeader from "@/components/customers/customers-page-header";
import CustomerSearchFilters from "@/components/customers/customer-search-filters";
import CustomerTable from "@/components/customers/customer-table";
import CustomerDetailModal from "@/components/customers/customer-detail-modal";
import { CustomerRequestsModal } from "@/components/customers/customer-requests-modal";
import { useRegistrationRealtime } from "@/hooks/use-registration-realtime";
import type { CustomerWithStats } from "@/types/customer";

export default function AdminCustomersClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { customersWithStats, isLoadingCustomers } = useCustomerStats();
  const { filters, filteredCustomers, updateSearchTerm, updateFilterActive } =
    useCustomerFilters(customersWithStats);
  const {
    navigateToAddCustomer,
    navigateToEditCustomer,
    navigateToCustomerBills,
    deleteCustomer,
  } = useCustomerActions();

  const { pendingCount: pendingRequestsCount } = useRegistrationRealtime();
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithStats | null>(null);
  const [showRequestsModal, setShowRequestsModal] = useState(false);

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
    const hasUserId = searchParams.has("userId");
    const hasCustomerId = searchParams.has("customerId");
    if (!hasUserId && !hasCustomerId) return;
    const next = new URLSearchParams(searchParams.toString());
    if (hasUserId) next.delete("userId");
    if (hasCustomerId) next.delete("customerId");
    next.delete("modal");
    const qs = next.toString();
    router.replace(qs ? `/admin/customers?${qs}` : "/admin/customers");
  };

  useEffect(() => {
    const userId = searchParams.get("userId") || searchParams.get("customerId");
    const modalParam = searchParams.get("modal");
    if (modalParam && modalParam !== "customerDetails") return;
    if (!userId || !customersWithStats.length) return;
    const customer = customersWithStats.find((c) => c._id === userId);
    if (customer) setSelectedCustomer(customer);
  }, [searchParams, customersWithStats]);

  return (
    <div className="space-y-6 max-md:space-y-4 max-md:pb-3">
      <CustomersPageHeader
        onAddCustomer={navigateToAddCustomer}
        onOpenRequests={() => setShowRequestsModal(true)}
        pendingRequestsCount={pendingRequestsCount}
      />

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

      <CustomerRequestsModal
        isOpen={showRequestsModal}
        onClose={() => setShowRequestsModal(false)}
      />
    </div>
  );
}
