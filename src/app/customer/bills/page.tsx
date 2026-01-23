/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { useCustomerData } from "@/hooks/use-customer-data";
import {
  useCustomerBillsStore,
  type CustomerBill as StoreBill,
} from "@/store/customer-bills-store";
import { AlertCircle, Receipt } from "lucide-react";
import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useCustomerBillRealtime } from "@/hooks/use-customer-bill-realtime";
import { useDocumentListener } from "@/hooks/use-realtime-sync";
import { sanityClient, queries } from "@/lib/sanity";

// Import new sub-components
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

type SanityBill = StoreBill;

export default function CustomerBillsPage() {
  // Hooks must be called unconditionally at the top level
  const allBills = useCustomerBillsStore((s) => s.bills) || [];
  const billsLoading = useCustomerBillsStore((s) => s.loading);
  const fetchBillsByCustomer = useCustomerBillsStore(
    (s) => s.fetchBillsByCustomer,
  );
  const setBills = useCustomerBillsStore((s) => s.setBills);
  const {
    customer,
    loading: customerLoading,
    error,
    refresh,
  } = useCustomerData();
  const { user } = useAuthStore();

  // Utility: compare business IDs with optional Base64 normalization
  const eqBiz = useCallback((a?: string, b?: string) => {
    if (!a || !b) return false;
    if (a === b) return true;
    try {
      // a could be base64 of b
      if (typeof atob === "function") {
        if (atob(a) === b) return true;
        if (atob(b) === a) return true;
      }
    } catch {}
    return false;
  }, []);

  // Fallback: resolve Sanity customer _id from business customerId if not loaded yet
  const resolvedSanityIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const currentSanityId = (customer as any)?._id as string | undefined;
    const currentBizId = ((customer as any)?.customerId ||
      (user as any)?.customerId) as string | undefined;
    if (currentSanityId) {
      resolvedSanityIdRef.current = currentSanityId;
      return;
    }
    if (!currentBizId) return;
    let cancelled = false;
    (async () => {
      try {
        const q = `*[customerId == $cid][0]{ _id }`;
        const res = await sanityClient.fetch<{ _id?: string }>(q, {
          cid: currentBizId,
        });
        if (!cancelled && res?._id) {
          resolvedSanityIdRef.current = res._id;
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [
    (customer as any)?._id,
    (customer as any)?.customerId,
    (user as any)?.customerId,
  ]);

  // Realtime: subscribe to this customer's bills (supports _id and customerId)
  useCustomerBillRealtime({
    _id: (customer as any)?._id as string | undefined,
    customerId: ((customer as any)?.customerId || (user as any)?.customerId) as
      | string
      | undefined,
  });

  // Also listen to GLOBAL bill updates and filter for current customer only
  useDocumentListener<any>("bill", undefined, {
    onAppear: (doc) => {
      const currentSanityId =
        (customer as any)?._id || resolvedSanityIdRef.current;
      const currentBizId =
        (customer as any)?.customerId || (user as any)?.customerId;
      const belongs = Boolean(
        (doc?.customer?._ref && doc.customer._ref === currentSanityId) ||
          (doc?.customer?._id && doc.customer._id === currentSanityId) ||
          (doc?.customerId && eqBiz(doc.customerId, currentBizId)) ||
          (doc?.customer?.customerId &&
            eqBiz(doc.customer.customerId, currentBizId)) ||
          (doc?.billId && eqBiz(doc.billId, currentBizId)),
      );
      if (belongs) {
        useCustomerBillsStore.getState().addOrUpdateBill(doc as any);
        return;
      }
      // Fallback: if we couldn't match but we have a ref and a bizId, resolve the ref's customerId
      if (!belongs && doc?.customer?._ref && currentBizId) {
        const refId = doc.customer._ref as string;
        sanityClient
          .fetch<{
            customerId?: string;
            bizId?: string;
            businessId?: string;
            id?: string;
          }>(`*[_id == $id][0]{ customerId, bizId, businessId, id }`, {
            id: refId,
          })
          .then((r) => {
            const candidate =
              r?.customerId || r?.bizId || r?.businessId || r?.id;
            const match = eqBiz(candidate, currentBizId);
            if (match) {
              useCustomerBillsStore.getState().addOrUpdateBill(doc as any);
            }
          })
          .catch(() => {});
      }
    },
    onUpdate: (u) => {
      const result = (u as any)?.result as any;
      const currentSanityId =
        (customer as any)?._id || resolvedSanityIdRef.current;
      const currentBizId =
        (customer as any)?.customerId || (user as any)?.customerId;
      const belongs = Boolean(
        (result?.customer?._ref && result.customer._ref === currentSanityId) ||
          (result?.customer?._id && result.customer._id === currentSanityId) ||
          (result?.customerId && eqBiz(result.customerId, currentBizId)) ||
          (result?.customer?.customerId &&
            eqBiz(result.customer.customerId, currentBizId)) ||
          (result?.billId && eqBiz(result.billId, currentBizId)),
      );
      if (belongs) {
        useCustomerBillsStore.getState().addOrUpdateBill(result as any);
        return;
      }
      // Fallback: resolve customerId by ref for updates as well
      if (!belongs && result?.customer?._ref && currentBizId) {
        const refId = result.customer._ref as string;
        sanityClient
          .fetch<{
            customerId?: string;
            bizId?: string;
            businessId?: string;
            id?: string;
          }>(`*[_id == $id][0]{ customerId, bizId, businessId, id }`, {
            id: refId,
          })
          .then((r) => {
            const candidate =
              r?.customerId || r?.bizId || r?.businessId || r?.id;
            const match = eqBiz(candidate, currentBizId);
            if (match) {
              useCustomerBillsStore.getState().addOrUpdateBill(result as any);
            }
          })
          .catch(() => {});
      }
    },
    onDisappear: (id) => {
      useCustomerBillsStore.getState().removeBill(id);
    },
  });

  // Track if bills have been fetched to prevent duplicate requests
  const billsFetchedRef = useRef(false);

  // Reset bills fetched flag when customer changes
  useEffect(() => {
    billsFetchedRef.current = false;
  }, [
    customer?._id,
    (customer as any)?.customerId,
    (customer as any)?.secretKey,
  ]);

  // Fetch customer bills when identifiers are available from either customer API or auth user
  useEffect(() => {
    if (billsFetchedRef.current || billsLoading) return;

    const fetchForCustomer = async () => {
      const identifiers = {
        _id: (customer as any)?._id || (user as any)?.id,
        customerId: (customer as any)?.customerId || (user as any)?.customerId,
        secretKey: (customer as any)?.secretKey || (user as any)?.secretKey,
      } as { _id?: string; customerId?: string; secretKey?: string };

      // If we still have no identifiers, wait
      if (!identifiers._id && !identifiers.customerId && !identifiers.secretKey)
        return;

      billsFetchedRef.current = true;
      await fetchBillsByCustomer(identifiers);
    };

    fetchForCustomer();
  }, [
    customer?._id,
    (customer as any)?.customerId,
    (customer as any)?.secretKey,
    (user as any)?.id,
    (user as any)?.customerId,
    (user as any)?.secretKey,
    billsLoading,
    customer,
    user,
    fetchBillsByCustomer,
  ]);

  // Fallback: if API-backed store returned empty but identifiers exist, fetch directly via GROQ
  useEffect(() => {
    const hasAnyId = Boolean(
      (customer as any)?._id ||
        (customer as any)?.customerId ||
        (user as any)?.customerId ||
        resolvedSanityIdRef.current,
    );
    if (!hasAnyId) return;
    if (billsLoading) return;
    if (allBills && allBills.length > 0) return;
    let cancelled = false;
    (async () => {
      try {
        const cid =
          (customer as any)?._id ||
          resolvedSanityIdRef.current ||
          (customer as any)?.customerId ||
          (user as any)?.customerId;
        if (!cid) return;
        const list = await sanityClient.fetch(
          queries.customerBills(String(cid)),
        );
        if (!cancelled && Array.isArray(list) && list.length > 0) {
          setBills(list as any);
        }
      } catch (e) {
        // silent fallback
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    allBills?.length,
    billsLoading,
    customer?._id,
    (customer as any)?.customerId,
    (user as any)?.customerId,
    setBills,
  ]);

  // Since fetchBillsByCustomer already filters bills by customer,
  // we can use the bills directly from the store
  const customerBills = useMemo(() => {
    return allBills || [];
  }, [allBills]);

  // State for search and filter
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [showBillModal, setShowBillModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState<StoreBill | null>(null);

  const filteredBills = useMemo(() => {
    if (!customerBills.length) return [];

    return customerBills.filter((bill) => {
      // Filter by search term (safe ops)
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

      // Multi-status chips (pending/partial/overdue/paid/draft). Empty => all
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

  // View bill details
  const viewBillDetails = useCallback((bill: any) => {
    setSelectedBill(bill);
    setShowBillModal(true);
  }, []);

  // Show loading state
  if (customerLoading || billsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-500">
        <AlertCircle className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">Error loading bills</p>
        <p className="text-sm text-gray-500 mt-2">{error.message}</p>
        <Button onClick={refresh} className="mt-4" variant="outline">
          Retry
        </Button>
      </div>
    );
  }
  console.log(customer, "custoemr");

  return (
    <div data-dashboard-loaded="true" className="space-y-6 max-md:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">
            {(() => {
              const cleaned = sanitizeUserText(customer?.name);
              return cleaned ? `${cleaned}'s Bills` : "Your Bills";
            })()}
          </h2>
        </div>
      </div>

      {/* Bill Stats */}
      <ResponsiveAccordion title="Bill Stats">
        <CustomerBillStats bills={customerBills} />
      </ResponsiveAccordion>

      {/* Filters */}
      <BillFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedStatuses={selectedStatuses}
        onStatusChange={setSelectedStatuses}
      />

      {/* Bills List */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            All Bills
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {billsLoading ? (
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
            <div className="divide-y divide-gray-800">
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

      {/* Bill Details Modal */}
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
