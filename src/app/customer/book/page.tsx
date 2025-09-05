"use client";

import { useLocaleStore } from "@/store/locale-store";
import { useCustomerBills } from "@/hooks/use-customer-bills";
import { BillsHeader } from "@/components/customer/bills-header";
import { BillsFilters } from "@/components/customer/bills-filters";
import { BillsList } from "@/components/customer/bills-list";
// Using shared BillDetailTrigger within BillsList; no separate modal here

export default function CustomerBillingBook() {
  const { currency } = useLocaleStore();
  const {
    bills,
    isLoading,
    error,
    searchTerm,
    selectedStatus,
    selectedBill,
    showBillModal,
    setSearchTerm,
    setSelectedStatus,
    setShowBillModal,
    handleViewBill,
    handleDownloadBill,
    getBillStatusColor,
    getTotalAmount,
    getServiceTypeLabel,
  } = useCustomerBills();

  // Calculate stats
  const totalBills = bills.length;
  const paidBills = bills.filter((bill) => bill.status === "paid").length;
  const pendingBills = bills.filter((bill) => bill.status === "pending").length;
  const totalAmount = bills.reduce(
    (sum, bill) => sum + getTotalAmount(bill),
    0
  );

  return (
    <div className="space-y-6 max-md:space-y-4 max-md:pb-4">
      <BillsHeader
        totalBills={totalBills}
        paidBills={paidBills}
        pendingBills={pendingBills}
        totalAmount={totalAmount}
        currency={currency}
      />

      <BillsFilters
        searchTerm={searchTerm}
        selectedStatus={selectedStatus}
        onSearchChange={setSearchTerm}
        onStatusChange={setSelectedStatus}
      />

      <BillsList
        bills={bills}
        isLoading={isLoading}
        error={error}
        currency={currency}
        onViewBill={handleViewBill}
        onDownloadBill={handleDownloadBill}
        getBillStatusColor={getBillStatusColor}
        getTotalAmount={getTotalAmount}
        getServiceTypeLabel={getServiceTypeLabel}
      />

      {/* Bill details handled per row via BillDetailTrigger */}
    </div>
  );
}