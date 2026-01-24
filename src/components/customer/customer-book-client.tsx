"use client";

import { useMemo, useState } from "react";
import { useLocaleStore } from "@/store/locale-store";
import { BillsHeader } from "@/components/customer/bills-header";
import { BillsFilters } from "@/components/customer/bills-filters";
import { BillsList } from "@/components/customer/bills-list";

export type CustomerBookClientProps = {
  bills: Array<Record<string, any>>;
};

export default function CustomerBookClient({ bills }: CustomerBookClientProps) {
  const { currency } = useLocaleStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const filteredBills = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return (bills || []).filter((bill) => {
      const matchesSearch =
        bill.billNumber?.toLowerCase().includes(term) ||
        bill.billId?.toLowerCase().includes(term) ||
        bill.items?.some((item: any) =>
          item.product?.name?.toLowerCase().includes(term),
        );
      const matchesStatus =
        selectedStatus === "all" || bill.status === selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }, [bills, searchTerm, selectedStatus]);

  const totalBills = filteredBills.length;
  const paidBills = filteredBills.filter(
    (bill) => bill.status === "paid",
  ).length;
  const pendingBills = filteredBills.filter(
    (bill) => bill.status === "pending",
  ).length;
  const totalAmount = filteredBills.reduce(
    (sum, bill) => sum + (bill.totalAmount || 0),
    0,
  );

  const handleViewBill = () => {};
  const handleDownloadBill = async () => {};
  const getBillStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };
  const getTotalAmount = (bill: any) => bill.totalAmount || 0;
  const getServiceTypeLabel = (serviceType: string) => serviceType || "";

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
        bills={filteredBills}
        isLoading={false}
        error={null}
        currency={currency}
        onViewBill={handleViewBill}
        onDownloadBill={handleDownloadBill}
        getBillStatusColor={getBillStatusColor}
        getTotalAmount={getTotalAmount}
        getServiceTypeLabel={getServiceTypeLabel}
      />
    </div>
  );
}
