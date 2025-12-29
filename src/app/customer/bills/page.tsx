/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

import { useCustomerData } from "@/hooks/use-customer-data";
import { useCustomerBillsStore, type CustomerBill as StoreBill } from "@/store/customer-bills-store";
import {
  CheckCircle,
  Clock,
  Download,
  Receipt,
  Search,
  AlertCircle,
} from "lucide-react";
import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import { useCustomerBillRealtime } from "@/hooks/use-customer-bill-realtime";
import { useDocumentListener } from "@/hooks/use-realtime-sync";
import { sanityClient, queries } from "@/lib/sanity";
import { Badge } from "@/components/ui/badge";
type SanityBill = StoreBill;

// Customer-specific bill stats component that uses filtered data
function CustomerBillStats({ bills = [] }: { bills: any[] }) {
  const stats = useMemo(() => {
    const total = bills.length;

    // Count bills by status
    const paidBills = bills.filter((bill) => bill.paymentStatus === "paid");
    const pendingBills = bills.filter(
      (bill) => bill.paymentStatus === "pending"
    );
    const partialBills = bills.filter(
      (bill) => bill.paymentStatus === "partial"
    );
    const overdueBills = bills.filter(
      (bill) => bill.paymentStatus === "overdue"
    );

    // Calculate amounts
    const totalAmount = bills.reduce(
      (sum, bill) => sum + (bill.totalAmount || 0),
      0
    );

    // Total paid amount (including partial payments)
    const paidAmount = bills.reduce((sum, bill) => {
      if (bill.paymentStatus === "paid") {
        return sum + (bill.totalAmount || 0);
      } else if (bill.paymentStatus === "partial") {
        return sum + (bill.paidAmount || 0);
      }
      return sum;
    }, 0);

    // Total pending amount (including remaining balance of partial payments)
    const pendingAmount = bills.reduce((sum, bill) => {
      if (bill.paymentStatus === "pending") {
        return sum + (bill.totalAmount || 0);
      } else if (bill.paymentStatus === "partial") {
        return sum + (bill.balanceAmount || 0);
      }
      return sum;
    }, 0);

    return {
      total,
      paid: paidBills.length,
      pending: pendingBills.length,
      partial: partialBills.length,
      overdue: overdueBills.length,
      totalAmount,
      paidAmount,
      pendingAmount,
    };
  }, [bills]);

  const statsConfig = [
    {
      title: "Total Amount",
      value: `₹${stats.totalAmount.toLocaleString()}`,
      subtitle: `${stats.total} total bills`,
      subtitleColor: "text-gray-400",
      icon: Receipt,
      iconColor: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Paid Amount",
      value: `₹${stats.paidAmount.toLocaleString()}`,
      subtitle: `${stats.paid} paid`,
      subtitleColor: "text-green-600",
      icon: CheckCircle,
      iconColor: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Pending Amount",
      value: `₹${stats.pendingAmount.toLocaleString()}`,
      subtitle: `${stats.pending} pending, ${stats.partial} partial`,
      subtitleColor: "text-yellow-500",
      icon: Clock,
      iconColor: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
    {
      title: "Overdue",
      value: stats.overdue,
      subtitle: `${stats.overdue} ${stats.overdue === 1 ? "bill" : "bills"}`,
      subtitleColor: "text-red-500",
      icon: AlertCircle,
      iconColor: "text-red-500",
      bgColor: "bg-red-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {statsConfig.map((stat, index) => (
        <Card
          key={index}
          className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-gray-400 font-medium truncate">
                  {stat.title}
                </p>
                <p
                  className={`text-xl sm:text-2xl font-bold mt-1 truncate ${stat.iconColor}`}>
                  {stat.value}
                </p>
                <p className={`text-xs ${stat.subtitleColor} truncate`}>
                  {stat.subtitle}
                </p>
              </div>
              <div className={`p-2 rounded-full ${stat.bgColor}`}>
                <stat.icon
                  className={`h-5 w-5 sm:h-6 sm:w-6 ${stat.iconColor}`}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case "paid":
      return CheckCircle;
    case "pending":
      return Clock;
    case "overdue":
      return AlertCircle;
    default:
      return Clock;
  }
};

const getBillStatusColor = (status: string) => {
  switch (status) {
    case "paid":
      return "bg-green-500/20 text-green-400";
    case "partial":
      return "bg-yellow-800/20 text-yellow-400";
    case "overdue":
      return "bg-red-500/20 text-red-400";
    default:
      return "bg-yellow-500 text-yellow-900";
  }
};

interface BillItemProps {
  bill: SanityBill;
  onClick: (bill: SanityBill) => void;
}

const BillItem = ({ bill, onClick }: BillItemProps) => {
  const statusColor = getBillStatusColor(bill.paymentStatus || bill.status);
  const StatusIcon = getStatusIcon(bill.paymentStatus || bill.status);

  return (
    <div
      className="p-4 border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer transition-colors"
      onClick={() => onClick(bill)}>
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <StatusIcon />
            <span className="font-medium text-white">#{bill.billNumber}</span>
            <span
              className={`text-xs px-2 py-1 rounded-full capitalize ${statusColor}`}>
              {bill.paymentStatus || bill.status}
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            {new Date(bill.serviceDate || bill.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="text-right">
          <p
            className={` ${bill.totalAmount - bill.paidAmount < 1 ? "text-green-400" : "text-yellow-300"} font-medium`}>
            {new Intl.NumberFormat("en-IN", {
              style: "currency",
              currency: "INR",
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
              .format(
                bill.totalAmount - bill.paidAmount < 1
                  ? bill.totalAmount
                  : bill.totalAmount - bill.paidAmount || 0
              )
              .replace("₹", "₹")}
          </p>
          {bill.paymentStatus === "paid" ? (
            <span className="inline-block bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
              Paid
            </span>
          ) : (
            <p className="text-xs text-gray-400">
              {bill.paymentStatus === "partial"
                ? `Paid: ${new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: "INR",
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }).format(bill.paidAmount || 0)} of ${new Intl.NumberFormat(
                    "en-IN",
                    {
                      style: "currency",
                      currency: "INR",
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }
                  ).format(bill.totalAmount || 0)}`
                : "Payment pending"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default function CustomerBillsPage() {
  // Hooks must be called unconditionally at the top level
  const allBills = useCustomerBillsStore((s) => s.bills) || [];
  const billsLoading = useCustomerBillsStore((s) => s.loading);
  const fetchBillsByCustomer = useCustomerBillsStore(
    (s) => s.fetchBillsByCustomer
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
          // debug log removed for production
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
        (customer as any)?._id || resolvedSanityIdRef.current; // Sanity _id (fallback resolved)
      const currentBizId =
        (customer as any)?.customerId || (user as any)?.customerId;
      const belongs = Boolean(
        (doc?.customer?._ref && doc.customer._ref === currentSanityId) ||
          (doc?.customer?._id && doc.customer._id === currentSanityId) ||
          (doc?.customerId && eqBiz(doc.customerId, currentBizId)) ||
          (doc?.customer?.customerId &&
            eqBiz(doc.customer.customerId, currentBizId)) ||
          (doc?.billId && eqBiz(doc.billId, currentBizId))
      );
      // debug log removed for production
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
            // debug log removed for production
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
        (customer as any)?._id || resolvedSanityIdRef.current; // Sanity _id (fallback resolved)
      const currentBizId =
        (customer as any)?.customerId || (user as any)?.customerId;
      const belongs = Boolean(
        (result?.customer?._ref && result.customer._ref === currentSanityId) ||
          (result?.customer?._id && result.customer._id === currentSanityId) ||
          (result?.customerId && eqBiz(result.customerId, currentBizId)) ||
          (result?.customer?.customerId &&
            eqBiz(result.customer.customerId, currentBizId)) ||
          (result?.billId && eqBiz(result.billId, currentBizId))
      );
      // debug log removed for production
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
            // debug log removed for production
            if (match) {
              useCustomerBillsStore.getState().addOrUpdateBill(result as any);
            }
          })
          .catch(() => {});
      }
    },
    onDisappear: (id) => {
      // Optimistic remove; if this wasn't our bill the check above would have blocked anyway
      // debug log removed for production
      useCustomerBillsStore.getState().removeBill(id);
    },
  });

  // Expose identifiers for quick debugging
  useEffect(() => {
    const ids = {
      _id: (customer as any)?._id,
      customerId: (customer as any)?.customerId || (user as any)?.customerId,
      secretKey: (customer as any)?.secretKey || (user as any)?.secretKey,
    } as { _id?: string; customerId?: string; secretKey?: string };
    // debug exposure removed for production
  }, [
    customer?._id,
    (customer as any)?.customerId,
    (customer as any)?.secretKey,
    (user as any)?.id,
    (user as any)?.customerId,
    (user as any)?.secretKey,
  ]);

  // State for search and filter
  const [searchTerm, setSearchTerm] = useState("");
  // Admin-like multi-status filter chips
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [showBillModal, setShowBillModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState<StoreBill | null>(null);

  // Add currency constant
  const currency = "₹";

  // Razorpay helpers
  const [payLoading, setPayLoading] = useState(false);

  const loadRazorpay = useCallback(async () => {
    if (typeof window === "undefined") return false;
    if ((window as any).Razorpay) return true;
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load Razorpay"));
      document.body.appendChild(s);
    });
    return Boolean((window as any).Razorpay);
  }, []);

  const handlePayOnline = useCallback(
    async (b: any) => {
      try {
        if (!b) return;
        if (typeof window === "undefined") return;
        const key =
          process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
          (window as any).NEXT_PUBLIC_RAZORPAY_KEY_ID;
        if (!key) {
          toast.error(
            "Payment key not configured. Set NEXT_PUBLIC_RAZORPAY_KEY_ID."
          );
          return;
        }
        setPayLoading(true);
        const total = Number(b.totalAmount || 0) || 0;
        const paid = Number(b.paidAmount || 0) || 0;
        const balance = Math.max(0, total - paid);
        if (balance <= 0) {
          toast.info("This bill is already fully paid.");
          return;
        }

        const orderRes = await fetch("/api/payments/razorpay/order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            billId: String(b._id || b.id || b.billId),
            amount: balance,
          }),
        });
        const orderJson = await orderRes.json().catch(() => ({}));
        if (!orderRes.ok || !orderJson?.order?.id) {
          toast.error("Failed to start payment.");
          return;
        }

        const ok = await loadRazorpay();
        if (!ok) {
          toast.error("Unable to load payment SDK.");
          return;
        }

        const options: any = {
          key,
          order_id: orderJson.order.id,
          name: "Jambh Electrics",
          description: b.billNumber
            ? `Payment for ${b.billNumber}`
            : "Bill Payment",
          theme: { color: "#059669" },
          method: {
            upi: true,
            netbanking: true,
            card: true,
            wallet: true,
            emandate: false,
            emi: false,
          },
          upi: {
            flow: "otp",
          },
          handler: async (resp: any) => {
            try {
              const verifyRes = await fetch("/api/payments/razorpay/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpay_order_id: resp.razorpay_order_id,
                  razorpay_payment_id: resp.razorpay_payment_id,
                  razorpay_signature: resp.razorpay_signature,
                  billId: String(b._id || b.id || b.billId),
                  amount: balance,
                }),
              });
              const verifyJson = await verifyRes.json().catch(() => ({}));
              if (!verifyRes.ok || verifyJson?.success === false) {
                toast.error(verifyJson?.error || "Payment verification failed");
                return;
              }
              toast.success("Payment successful");
              setShowBillModal(false);
            } catch (e) {
              toast.error("Verification failed");
            }
          },
          modal: { ondismiss: () => {} },
          prefill: {
            name: b?.customer?.name || "",
            email: b?.customer?.email || "",
            contact: b?.customer?.phone || "",
          },
        };

        const rz = new (window as any).Razorpay(options);
        rz.open();
      } catch (e) {
        toast.error("Payment failed to start");
      } finally {
        setPayLoading(false);
      }
    },
    [loadRazorpay]
  );

  // Track if bills have been fetched to prevent duplicate requests
  const billsFetchedRef = useRef(false);

  // Debug: subscribe to store changes to confirm updates trigger
  useEffect(() => {
    const unsub = useCustomerBillsStore.subscribe((state) => {
      // debug log removed for production
    });
    // debug helper removed for production
    return () => {
      try {
        unsub();
      } catch {}
    };
  }, []);

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
      // debug log removed for production
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
        resolvedSanityIdRef.current
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
          queries.customerBills(String(cid))
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
    // Show whatever the customer bills store currently holds.
    // We already fetch using customer/user identifiers, so this list is scoped.
    return allBills || [];
  }, [allBills]);

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
              .includes(searchLower)
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

  // Debug: log counts to verify rendering data path
  useEffect(() => {
    // debug counts removed for production
  }, [allBills.length, filteredBills.length]);

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

  // Format currency helper function
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "paid":
        return "bg-green-900 text-green-300 border-green-700";
      case "partial":
        return "bg-orange-400 text-orange-300 border-orange-700";
      case "pending":
        return "bg-yellow-800 text-yellow-300 border-yellow-700";
      case "overdue":
        return "bg-red-900 text-red-300 border-red-700";
      default:
        return "bg-gray-900 text-gray-300 border-gray-700";
    }
  };
  return (
    <div className="space-y-6 max-md:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">
            {customer?.name ? `${customer.name}'s Bills` : "Your Bills"}
          </h2>
          <p className="text-gray-400">View and manage your billing history</p>
        </div>
      </div>

      {/* Bill Stats */}
      <CustomerBillStats bills={customerBills} />

      {/* Filters (admin-like) */}
      <Card className="bg-gray-900 border-gray-800">
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-[1]" />
              <Input
                type="text"
                placeholder="Search by bill number or item name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {(["pending", "partial", "overdue", "paid"] as const).map(
                (status) => {
                  const active = selectedStatuses.includes(status);
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => {
                        setSelectedStatuses((prev) => {
                          const set = new Set(prev);
                          if (set.has(status)) set.delete(status);
                          else set.add(status);
                          return Array.from(set);
                        });
                      }}
                      className={`px-3 py-1 text-xs rounded-full border ${
                        active
                          ? "bg-blue-600 text-white border-blue-500"
                          : "bg-gray-800 text-gray-300 border-gray-700"
                      }`}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  );
                }
              )}
              <button
                type="button"
                onClick={() => setSelectedStatuses([])}
                className={`px-3 py-1 text-xs rounded-full border ${
                  selectedStatuses.length === 0
                    ? "bg-blue-600 text-white border-blue-500"
                    : "bg-gray-800 text-gray-300 border-gray-700"
                }`}>
                All
              </button>
              {/* More Filters button removed per request */}
            </div>
          </div>
        </CardContent>
      </Card>

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
      <Modal
        isOpen={showBillModal}
        onClose={() => setShowBillModal(false)}
        size="lg"
        title={`Bill #${selectedBill?.billNumber}`}>
        {selectedBill && (
          <div className="space-y-6 max-md:space-y-4">
            {/* Bill Info */}
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex justify-between gap-3 flex-wrap">
                {" "}
                <h4 className="font-medium text-white">Bill Information</h4>
                <Badge
                  className={`${getStatusColor(selectedBill.paymentStatus || selectedBill.status)} px-2 py-0.5 text-xs font-medium `}>
                  {(
                    selectedBill.paymentStatus ||
                    selectedBill.status ||
                    "pending"
                  ).toUpperCase()}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                <div>
                  <p className="text-gray-400">Service Type</p>
                  <p className="text-white capitalize">
                    {selectedBill.serviceType}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Location</p>
                  <p className="text-white capitalize">
                    {selectedBill.locationType}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Bill Number</p>
                  <p className="text-white capitalize">
                    {selectedBill.billNumber}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Bill Date</p>
                  <p className="text-white capitalize">
                    {selectedBill.serviceDate
                      ? new Date(selectedBill.serviceDate).toLocaleDateString()
                      : "-"}
                  </p>
                </div>
              </div>
            </div>
            {/* Bill Items */}
            {selectedBill.items && selectedBill.items.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-3 sm:p-4">
                <h4 className="font-medium text-white mb-3">Bill Items</h4>
                <div className="space-y-3">
                  {selectedBill.items.map((item: any, index: number) => (
                    <div
                      key={index}
                      className="flex justify-between items-center py-2 border-b border-gray-700 last:border-b-0">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {" "}
                          <p className="text-white">
                            {item.productName || "Product"}
                          </p>
                          <Badge
                            variant="outline"
                            className="text-purple-400 border-purple-600 max-sm:!py-0.5 max-sm:px-2 max-sm:text-xs">
                            {item.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-400">
                          {item.quantity} × ₹{item.unitPrice?.toLocaleString()}
                        </p>
                        {item.specifications && (
                          <p className="text-xs text-gray-500">
                            {item.specifications}
                          </p>
                        )}
                      </div>
                      <p className="font-semibold text-white">
                        ₹{item.totalPrice?.toLocaleString() || "0"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Charges & Totals */}
            <div className="bg-gray-800 rounded-lg p-3 sm:p-4">
              <h4 className="font-medium text-white mb-3">Charges & Totals</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {selectedBill.subtotal !== selectedBill.totalAmount && (
                  <div>
                    <p className="text-gray-400">Items Subtotal</p>
                    <p className="text-white">
                      {currency}
                      {selectedBill.subtotal?.toLocaleString() || "-"}
                    </p>
                  </div>
                )}
                {selectedBill.homeVisitFee !== null &&
                  selectedBill?.homeVisitFee > 0 && (
                    <div>
                      <p className="text-gray-400">Home Visit Fee</p>
                      <p className="text-white">
                        {currency}
                        {selectedBill.homeVisitFee?.toLocaleString() || "-"}
                      </p>
                    </div>
                  )}
                {selectedBill?.repairFee !== null &&
                  selectedBill?.repairFee > 0 && (
                    <div>
                      <p className="text-gray-400">Repair Charges</p>
                      <p className="text-white">
                        {currency}
                        {(selectedBill as any).repairFee?.toLocaleString?.() ||
                          (
                            selectedBill as any
                          ).repairCharges?.toLocaleString?.() ||
                          "-"}
                      </p>
                    </div>
                  )}
                {selectedBill?.laborCharges !== null &&
                  selectedBill?.laborCharges > 0 && (
                    <div>
                      <p className="text-gray-400">Labor Charges</p>
                      <p className="text-white">
                        {currency}
                        {selectedBill.laborCharges?.toLocaleString() || "-"}
                      </p>
                    </div>
                  )}
                {selectedBill?.taxAmount !== null &&
                  selectedBill?.taxAmount > 0 && (
                    <div>
                      <p className="text-gray-400">Tax</p>
                      <p className="text-white">
                        {formatCurrency(selectedBill.taxAmount)}
                      </p>
                    </div>
                  )}
                {selectedBill?.discount !== null &&
                  selectedBill?.discount > 0 && (
                    <div>
                      <p className="text-gray-400">Discount</p>
                      <p className="text-white">
                        {formatCurrency(selectedBill.discount)}
                      </p>
                    </div>
                  )}
                <div>
                  <p className="text-gray-400">Total</p>
                  <p className="text-white font-bold text-base md:text-lg">
                    {formatCurrency(selectedBill.totalAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-green-400">Paid</p>
                  <p className="text-green-500">
                    {formatCurrency(selectedBill.paidAmount)}
                  </p>
                </div>
                {selectedBill.balanceAmount !== selectedBill.paidAmount && (
                  <div>
                    <p className="text-gray-400">Balance</p>
                    <p className="text-white">
                      {formatCurrency(selectedBill.balanceAmount)}
                    </p>
                  </div>
                )}
              </div>
              {selectedBill.notes && (
                <div className="mt-4">
                  <p className="text-gray-400">Notes</p>
                  <p className="text-white">{selectedBill.notes}</p>
                </div>
              )}
            </div>{" "}
            <div className="bg-gray-800 rounded-lg p-3 sm:p-4">
              <h4 className="font-medium text-white mb-3">Pay Online</h4>
              {(() => {
                const total = Number(selectedBill.totalAmount || 0) || 0;
                const paid = Number(selectedBill.paidAmount || 0) || 0;
                const balance = Math.max(0, total - paid);
                if (selectedBill.paymentStatus === "paid" || balance <= 0)
                  return null;
                return (
                  <Button
                    onClick={() => handlePayOnline(selectedBill)}
                    disabled={payLoading}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white w-full">
                    {payLoading
                      ? "Processing..."
                      : `Pay ${formatCurrency(selectedBill.balanceAmount)}`}
                  </Button>
                );
              })()}
            </div>
            {/* <div className="flex gap-3">
              <Button className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
              <Button variant="outline" onClick={() => setShowBillModal(false)}>
                Close
              </Button>
            </div> */}
          </div>
        )}
      </Modal>
    </div>
  );
}
