"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, Wallet, Ban } from "lucide-react";
import { CustomerBillStats } from "@/components/customer/customer-bill-stats";
import { BillItem } from "@/components/customer/bill-item";
import { BillFilters } from "@/components/customer/bill-filters";
import { BillDetailsModal } from "@/components/customer/bill-details-modal";
import { UpiPaymentModal } from "@/components/ui/upi-payment-modal";
import { MultiBillPaymentModal } from "@/components/customer/multi-bill-payment-modal";
import { checkPaymentsDisabled } from "@/lib/payments-config";

import ResponsiveAccordion from "@/components/ui/responsive-accordion";
import { useBills } from "@/hooks/use-sanity-data";
import EmptyState from "@/components/ui/empty-state";
import { useAuthStore } from "@/store/auth-store";
import { fetchCustomerAdvanceBalance } from "@/lib/customer-advance";

export default function CustomerBillsClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const consumedOpenRef = useRef("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [showBillModal, setShowBillModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Record<string, any> | null>(null);

  // UPI payment modal for single bill from card
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [upiModalData, setUpiModalData] = useState<any>(null);

  // Multi-bill payment modal
  const [showMultiPayModal, setShowMultiPayModal] = useState(false);
  const multiOrderRef = useRef(0);

  const handleMultiPay = useCallback((amount: number, selectedBills: any[]) => {
    if (checkPaymentsDisabled()) return;
    multiOrderRef.current += 1;
    const billNumbers = selectedBills.map((b: any) => b.billNumber).join(", ");
    setUpiModalData({
      _id: "multi-" + Date.now(),
      billId: "multi-" + multiOrderRef.current,
      billNumber: `Multiple: ${billNumbers}`,
      totalAmount: amount,
      balanceAmount: amount,
      paidAmount: 0,
      customerName: "",
      customerPhone: "",
      billDate: "",
      dueDate: "",
    });
    setShowMultiPayModal(false);
    setTimeout(() => setShowUpiModal(true), 100);
  }, []);

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
      const isOverdue =
        bill.dueDate &&
        new Date(bill.dueDate) < new Date() &&
        statusValue !== "paid";
      if (isOverdue) statusValue = "overdue";
      const matchesStatus =
        selectedStatuses.length === 0 || selectedStatuses.includes(statusValue);
      return matchesSearch && matchesStatus;
    });
  }, [customerBills, searchTerm, selectedStatuses]);

  const unpaidBills = useMemo(() => {
    return filteredBills
      .filter((bill: any) => {
        const status = (bill.paymentStatus || "").toLowerCase();
        if (status === "paid") return false;
        const total = Number(bill.totalAmount || 0);
        const paid = Number(bill.paidAmount || 0);
        const balance = bill.balanceAmount != null ? Number(bill.balanceAmount) : Math.max(0, total - paid);
        return balance > 0;
      })
      .map((bill: any) => {
        const total = Number(bill.totalAmount || 0);
        const paid = Number(bill.paidAmount || 0);
        const balance = bill.balanceAmount != null ? Number(bill.balanceAmount) : Math.max(0, total - paid);
        return { _id: bill._id, billNumber: bill.billNumber, totalAmount: total, paidAmount: paid, balance, dueDate: bill.dueDate };
      });
  }, [filteredBills]);

  const totalPendingAmount = useMemo(() => unpaidBills.reduce((s, b) => s + b.balance, 0), [unpaidBills]);

  const currentUser = useAuthStore((s: any) => s.user);
  const [advanceBalance, setAdvanceBalance] = useState(0);
  useEffect(() => {
    if (currentUser?._id) {
      fetchCustomerAdvanceBalance(currentUser._id).then(setAdvanceBalance).catch(() => setAdvanceBalance(0));
    }
  }, [currentUser?._id]);

  const viewBillDetails = useCallback((bill: any) => {
    setSelectedBill(bill);
    setShowBillModal(true);
  }, []);

  const handleUPIPayment = useCallback((bill: any) => {
    if (checkPaymentsDisabled()) return;
    const total = Number(bill.totalAmount || 0);
    const paid = Number(bill.paidAmount || 0);
    const balance = bill.balanceAmount != null ? Number(bill.balanceAmount) : Math.max(0, total - paid);
    setUpiModalData({
      _id: bill._id,
      billId: bill.billId || bill._id,
      billNumber: bill.billNumber,
      totalAmount: balance,
      balanceAmount: bill.balanceAmount,
      paidAmount: bill.paidAmount,
      customerName: bill.customer?.name || bill.customerName || "",
      customerPhone: bill.customer?.phone || bill.customerPhone || "",
      billDate: bill.billDate || bill.createdAt || "",
      dueDate: bill.dueDate || "",
    });
    setShowUpiModal(true);
  }, []);

  const handleCloseUpiModal = useCallback(() => {
    setShowUpiModal(false);
  }, []);

  const cleanQueryParams = useCallback(() => {
    const nextParams = new URLSearchParams(searchParams.toString());
    const had = nextParams.has("open") || nextParams.has("billId") || nextParams.has("modal");
    if (!had) return;
    nextParams.delete("open");
    nextParams.delete("billId");
    nextParams.delete("modal");
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const closeBillModal = useCallback(() => {
    setShowBillModal(false);
    cleanQueryParams();
  }, [cleanQueryParams]);

  useEffect(() => {
    const openBillId = searchParams.get("open") || searchParams.get("billId");
    const modalParam = searchParams.get("modal");
    if (modalParam && modalParam !== "billDetails") return;
    if (!openBillId || isLoading || !customerBills.length) return;
    const bill = customerBills.find((item: any) => String(item._id || item.id || item.billId) === openBillId);
    if (bill) {
      if (consumedOpenRef.current !== openBillId) {
        consumedOpenRef.current = openBillId;
        viewBillDetails(bill);
      }
      cleanQueryParams();
    }
  }, [cleanQueryParams, customerBills, isLoading, searchParams, viewBillDetails]);

  return (
    <div data-dashboard-loaded="true" className="space-y-6 max-sm:space-y-3 max-md:space-y-4">
      <div className="flex items-center justify-between mb-6 max-sm:hidden">
        <div>
          <h2 className="text-2xl font-bold text-white">Your Bills</h2>
          <p className="text-gray-400">View and manage your bills and payments</p>
        </div>
      </div>

      <ResponsiveAccordion title="Bill's Info">
        <CustomerBillStats bills={customerBills} />
      </ResponsiveAccordion>

      {/* Customer Advance Balance */}
      {advanceBalance > 0 && (
        <Card className="border-emerald-800/40 bg-gradient-to-br from-emerald-900/30 to-emerald-800/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <span className="text-2xl">💰</span>
            </div>
            <div>
              <p className="text-sm text-emerald-300/80">Your Advance Balance</p>
              <p className="text-2xl font-bold text-emerald-400">₹{advanceBalance.toLocaleString()}</p>
              <p className="text-xs text-emerald-300/60">Available for your next purchase.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <BillFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedStatuses={selectedStatuses}
        onStatusChange={setSelectedStatuses}
      />

      {unpaidBills.length > 1 && (
        <div className="flex justify-end">
          <Button
            onClick={() => {
              if (checkPaymentsDisabled()) return;
              setShowMultiPayModal(true);
            }}
            disabled={checkPaymentsDisabled()}
            className={
              checkPaymentsDisabled()
                ? "border-0 rounded-xl gap-2 bg-gray-700 text-gray-500 cursor-not-allowed"
                : "border-0 rounded-xl gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white"
            }
          >
            {checkPaymentsDisabled() ? <Ban className="w-4 h-4" /> : <Wallet className="w-4 h-4" />}
            {checkPaymentsDisabled() ? "Payments Unavailable" : `Pay Multiple Bills (₹${totalPendingAmount.toLocaleString()})`}
          </Button>
        </div>
      )}

      <Card className="border-gray-800 bg-gray-900/58 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            All Bills
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-gray-400">Loading bills...</div>
          ) : filteredBills.length === 0 ? (
            <div className="p-4 sm:p-6">
              <EmptyState
                icon={Receipt}
                compact
                eyebrow={searchTerm || selectedStatuses.length > 0 ? "No matching bill" : "Billing desk"}
                title={searchTerm || selectedStatuses.length > 0 ? "No bills match these filters" : "No bills yet"}
                description={searchTerm || selectedStatuses.length > 0 ? "Try changing the search text or status filters." : "Once the shop creates a bill, it will appear here."}
              />
            </div>
          ) : (
            <div className="divide-y divide-gray-800 space-y-1 sm:space-y-2 px-1">
              {filteredBills.map((bill) => (
                <BillItem
                  key={bill._id}
                  bill={bill}
                  onClick={viewBillDetails}
                  onUPIPayment={handleUPIPayment}
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
      />

      <UpiPaymentModal
        isOpen={showUpiModal}
        onClose={handleCloseUpiModal}
        bill={upiModalData || { billNumber: "", totalAmount: 0 }}
      />

      <MultiBillPaymentModal
        isOpen={showMultiPayModal}
        onClose={() => setShowMultiPayModal(false)}
        bills={unpaidBills}
        onPay={handleMultiPay}
      />
    </div>
  );
}
