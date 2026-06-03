"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const consumedOpenRef = useRef("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [showBillModal, setShowBillModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Record<string, any> | null>(
    null,
  );
  const [filterOverdue, setFilterOverdue] = useState(false);

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

      let statusValue = (
        (bill.paymentStatus as string) ||
        (bill.status as string) ||
        ""
      ).toLowerCase();

      // Calculate overdue status based on due date and payment status
      const isOverdue =
        bill.dueDate &&
        new Date(bill.dueDate) < new Date() &&
        statusValue !== "paid";

      if (isOverdue) {
        statusValue = "overdue";
      }

      const matchesStatus =
        selectedStatuses.length === 0 || selectedStatuses.includes(statusValue);

      return matchesSearch && matchesStatus;
    });
  }, [customerBills, searchTerm, selectedStatuses]);

  const viewBillDetails = useCallback((bill: any) => {
    setSelectedBill(bill);
    setShowBillModal(true);
  }, []);

  const closeBillModal = useCallback(() => {
    setShowBillModal(false);
    if (!searchParams.has("open")) return;
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("open");
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const cleanOpenQuery = useCallback(() => {
    if (!searchParams.has("open")) return;
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("open");
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    const openBillId = searchParams.get("open");
    if (!openBillId || isLoading || !customerBills.length) return;
    const bill = customerBills.find((item: any) => String(item._id || item.id || item.billId) === openBillId);
    if (bill) {
      if (consumedOpenRef.current !== openBillId) {
        consumedOpenRef.current = openBillId;
        viewBillDetails(bill);
      }
      cleanOpenQuery();
    }
  }, [cleanOpenQuery, customerBills, isLoading, searchParams, viewBillDetails]);

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

      <ResponsiveAccordion title="Bill's Info">
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
        onClose={closeBillModal}
        selectedBill={selectedBill}
        formatCurrency={formatCurrency}
        getStatusColor={getStatusColor}
      />
    </div>
  );
}
