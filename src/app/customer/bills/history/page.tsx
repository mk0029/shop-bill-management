"use client";

import { useLocaleStore } from "@/store/locale-store";
import { useBillsHistory } from "@/hooks/use-bills-history";
import { BillsHistoryHeader } from "@/components/customer/bills-history-header";
import { BillsHistoryFilters } from "@/components/customer/bills-history-filters";
import { BillsList } from "@/components/customer/bills-list";
import { BillDetailModal } from "@/components/customer/bill-detail-modal";

export default function BillsHistoryPage() {
  const { currency } = useLocaleStore();
  const {
    bills,
    isLoading,
    error,
    searchTerm,
    selectedStatus,
    timeRange,
    selectedBill,
    showBillModal,
    setSearchTerm,
    setSelectedStatus,
    setTimeRange,
    setShowBillModal,
    handleViewBill,
    handleDownloadBill,
    getBillStatusColor,
    getTotalAmount,
    getServiceTypeLabel,
    getStats,
  } = useBillsHistory();

  const stats = getStats();

  return (
    <div className="space-y-6 max-md:pb-4">
      <BillsHistoryHeader stats={stats} currency={currency} />

      <BillsHistoryFilters
        searchTerm={searchTerm}
        selectedStatus={selectedStatus}
        timeRange={timeRange}
        onSearchChange={setSearchTerm}
        onStatusChange={setSelectedStatus}
        onTimeRangeChange={setTimeRange}
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

      <BillDetailModal
        isOpen={showBillModal}
        onClose={() => setShowBillModal(false)}
        bill={selectedBill}
        currency={currency}
        getBillStatusColor={getBillStatusColor}
        getTotalAmount={getTotalAmount}
        getServiceTypeLabel={getServiceTypeLabel}
        onDownloadBill={handleDownloadBill}
      />
    </div>
  );
}