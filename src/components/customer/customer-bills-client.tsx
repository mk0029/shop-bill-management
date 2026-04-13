"use client";

import { useMemo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Receipt } from "lucide-react";
import { CustomerBillStats } from "@/components/customer/customer-bill-stats";
import { BillItem } from "@/components/customer/bill-item";
import { BillFilters } from "@/components/customer/bill-filters";
import { BillDetailsModal } from "@/components/customer/bill-details-modal";
import {
  formatCurrency,
  getStatusColor,
} from "@/components/customer/bill-utils";
import ResponsiveAccordion from "@/components/ui/responsive-accordion";
import { sanitizeUserText } from "@/constants/defaults";
import { useBills } from "@/hooks/use-sanity-data";

export default function CustomerBillsClient() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [showBillModal, setShowBillModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Record<string, any> | null>(
    null,
  );

  const { bills: customerBills, isLoading } = useBills();

  const filteredBills = useMemo(() => {
    if (!customerBills.length) return [];

    return customerBills.filter((bill) => {
      const searchLower = (searchTerm || "").toLowerCase();
      const numberMatch = ((bill.billNumber as string) || "")
        .toLowerCase()
        .includes(searchLower);
      const itemsMatch = Array.isArray(bill.items)
        ? bill.items.some((item: any) =>
            ((item?.productName as string) || "")
              .toLowerCase()
              .includes(searchLower),
          )
        : false;
      const matchesSearch = numberMatch || itemsMatch;

      const statusValue = (
        (bill.paymentStatus as string) ||
        (bill.status as string) ||
        ""
      ).toLowerCase();
      const matchesStatus =
        selectedStatuses.length === 0 || selectedStatuses.includes(statusValue);

      return matchesSearch && matchesStatus;
    });
  }, [customerBills, searchTerm, selectedStatuses]);

  const viewBillDetails = useCallback((bill: any) => {
    setSelectedBill(bill);
    setShowBillModal(true);
  }, []);

  return (
    <div
      data-dashboard-loaded="true"
      className="space-y-6 max-sm:space-y-3 max-md:space-y-4"
    >
      <div className="flex items-center justify-between mb-6 max-sm:hidden">
        <div>
          <h2 className="text-2xl font-bold text-white">Your Bills</h2>
          <p className="text-gray-400">
            View and manage your bills and payments
          </p>
        </div>
      </div>

      <ResponsiveAccordion title="Bill Stats">
        <CustomerBillStats bills={customerBills} />
      </ResponsiveAccordion>

      <BillFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedStatuses={selectedStatuses}
        onStatusChange={setSelectedStatuses}
      />

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            All Bills
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-gray-400">
              Loading bills...
            </div>
          ) : filteredBills.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              {searchTerm || selectedStatuses.length > 0
                ? "No bills match your filters"
                : "No bills found"}
            </div>
          ) : (
            <div className="divide-y divide-gray-800 space-y-1 sm:space-y-2 px-1">
              {filteredBills.map((bill) => (
                <BillItem
                  key={bill._id}
                  bill={bill}
                  onClick={viewBillDetails}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <BillDetailsModal
        isOpen={showBillModal}
        onClose={() => setShowBillModal(false)}
        selectedBill={selectedBill}
        formatCurrency={formatCurrency}
        getStatusColor={getStatusColor}
      />
    </div>
  );
}
