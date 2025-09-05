/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBills } from "@/hooks/use-sanity-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  Clock,
  AlertCircle,
  Receipt,
  Sparkles,
} from "lucide-react";

interface Bill {
  locationType: string;
  homeVisitFee: number;
  subtotal: number;
  notes: string | undefined;
  _id: string;
  billNumber: string;
  customer: {
    _id: string;
    name: string;
    phone: string;
  };
  totalAmount: number;
  paidAmount?: number;
  balanceAmount?: number;
  paymentStatus: "pending" | "paid" | "overdue" | "partial";
  status: "draft" | "confirmed" | "completed";
  serviceType: string;
  serviceDate: string;
  createdAt: string;
  updatedAt: string;
}

interface RealtimeBillListProps {
  initialBills: any[];
  customerId?: string; // If provided, only show bills for this customer
  onBillClick?: (bill: any) => void;
  showNewBillAnimation?: boolean;
  maxItems?: number;
  searchTerm?: string;
  filterStatus?: string;
  // Optional action handlers
  onDeleteBill?: (bill: any) => void;
  onCompleteDraft?: (bill: any) => void;
}

export const RealtimeBillList: React.FC<RealtimeBillListProps> = ({
  initialBills,
  customerId,
  onBillClick,
  showNewBillAnimation = true,
  maxItems,
  searchTerm = "",
  filterStatus = "all",
  onDeleteBill,
  onCompleteDraft,
}) => {
  // State for bills and new bill animations
  const [bills, setBills] = useState<Bill[]>([]);
  const [newBillIds, setNewBillIds] = useState<Set<string>>(new Set());
  const [isInitialized, setIsInitialized] = useState(false);
  const [rowLoading, setRowLoading] = useState<Record<string, { completing?: boolean; deleting?: boolean }>>({});

  // Update bills when initialBills changes
  useEffect(() => {
    if (!isInitialized && initialBills.length > 0) {
      // Sort initial bills by creation date (newest first)
      const sortedBills = [...initialBills].sort((a, b) => {
        const dateA = new Date(a.createdAt || a.serviceDate || 0);
        const dateB = new Date(b.createdAt || b.serviceDate || 0);
        return dateB.getTime() - dateA.getTime();
      });
      
      setBills(sortedBills);
      setIsInitialized(true);
    }
  }, [initialBills, isInitialized]);

  // Sync bills from props; RealtimeProvider updates upstream stores/props
  useEffect(() => {
    const filterByCustomer = (list: any[]) => {
      if (!customerId) return list;
      return list.filter((result: any) => {
        const cust: any = result.customer;
        return (
          cust === customerId || cust?._ref === customerId || cust?._id === customerId
        );
      });
    };

    const incoming = filterByCustomer(initialBills);
    setBills((prev) => {
      const prevIds = new Set(prev.map((b) => b._id));

      // Detect new bills for animation
      const newOnes = incoming.filter((b: any) => !prevIds.has(b._id));
      if (showNewBillAnimation && newOnes.length > 0) {
        setNewBillIds((s) => {
          const next = new Set(s);
          newOnes.forEach((b: any) => next.add(b._id));
          return next;
        });
        // Clear highlights
        setTimeout(() => {
          setNewBillIds((s) => {
            const next = new Set(s);
            newOnes.forEach((b: any) => next.delete(b._id));
            return next;
          });
        }, 3000);
      }

      // Sort by date
      const sorted = [...incoming].sort((a, b) => {
        const dateA = new Date(a.createdAt || a.serviceDate || 0);
        const dateB = new Date(b.createdAt || b.serviceDate || 0);
        return dateB.getTime() - dateA.getTime();
      });
      return sorted as any;
    });
  }, [initialBills, customerId, showNewBillAnimation]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-900 text-green-300";
      case "pending":
        return "bg-yellow-900 text-yellow-300";
      case "overdue":
        return "bg-red-900 text-red-300";
      case "completed":
        return "bg-blue-900 text-blue-300";
      default:
        return "bg-gray-900 text-gray-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
      case "completed":
        return CheckCircle;
      case "pending":
        return Clock;
      case "overdue":
        return AlertCircle;
      default:
        return Receipt;
    }
  };

  // Apply search and filter
  const filteredBills = bills.filter((bill) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      bill.customer?.name?.toLowerCase().includes(searchLower) ||
      bill.billNumber?.toLowerCase().includes(searchLower) ||
      bill._id?.toLowerCase().includes(searchLower) ||
      (bill.serviceDate && bill.serviceDate.includes(searchTerm));

    const matchesStatus =
      filterStatus === "all" ||
      bill.paymentStatus === filterStatus ||
      bill.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  // Sort bills by creation date (newest first)
  const sortedBills = filteredBills.sort((a, b) => {
    const dateA = new Date(a.createdAt || a.serviceDate || 0);
    const dateB = new Date(b.createdAt || b.serviceDate || 0);
    return dateB.getTime() - dateA.getTime();
  });

  const displayBills = maxItems ? sortedBills.slice(0, maxItems) : sortedBills;

  return (
    <div className="space-y-4">
      <AnimatePresence mode="popLayout">
        {displayBills.map((bill) => {
          const StatusIcon = getStatusIcon(bill.paymentStatus || bill.status);
          const isNew = newBillIds.has(bill._id);

          return (
            <motion.div
              key={bill._id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                boxShadow: isNew ? "0 0 20px rgba(59, 130, 246, 0.5)" : "none",
              }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className={`relative ${isNew ? "ring-2 ring-blue-500" : ""}`}>
              {isNew && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  className="absolute -top-2 -right-2 z-10">
                  <Badge className="bg-blue-600 text-white flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    New
                  </Badge>
                </motion.div>
              )}

              <Card
                className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors cursor-pointer"
                onClick={() => onBillClick?.(bill)}
                role="button"
                aria-label={`View details for bill ${bill.billNumber}`}
              >
                <CardContent className="p-2 sm:p-4">
                  <div className="flex flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="max-md:hidden w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <StatusIcon className="w-6 h-6 text-blue-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-white truncate">
                          Bill #{bill.billNumber}
                        </h3>
                        <p className="text-sm text-gray-400 truncate capitalize">
                          {bill.customer?.name || "Unknown Customer"} •{" "}
                          {bill.serviceType || "Service"}
                        </p>
                        <p className="text-sm text-gray-400">
                          {bill.serviceDate
                            ? new Date(bill.serviceDate).toLocaleDateString()
                            : new Date(bill.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 lg:gap-6">
                      <div className="text-left sm:text-right">
                        <p className="font-semibold text-white text-lg">
                          ₹
                          {(bill.paymentStatus === "partial"
                            ? bill.balanceAmount ||
                              bill.totalAmount - (bill.paidAmount || 0)
                            : bill.totalAmount
                          )?.toLocaleString() || 0}
                        </p>
                        <div className="flex flex-col sm:items-end gap-1 mt-1">
                          {bill.paymentStatus === "partial" &&
                            bill.paidAmount &&
                            bill.paidAmount > 0 && (
                              <p className="text-xs text-gray-300">
                                ₹{bill.paidAmount.toLocaleString()} paid
                              </p>
                            )}
                          <Badge
                            className={getStatusColor(
                              bill.paymentStatus || bill.status
                            )}>
                            {bill.paymentStatus || bill.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {displayBills.length === 0 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-8 text-center">
            <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400">No bills found</p>
            <p className="text-sm text-gray-500 mt-1">
              Bills will appear here in real-time as they are created
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Real-time bill stats component
export const RealtimeBillStats: React.FC<{
  customerId?: string;
  initialBills?: any[];
}> = ({ customerId, initialBills = [] }) => {
  const [stats, setStats] = useState({
    total: 0,
    paid: 0,
    pending: 0,
    overdue: 0,
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0,
  });

  // Use bills from the centralized data store, fallback to initialBills if store is empty
  const { bills: storeBills } = useBills();

  // Use store bills if available, otherwise use initialBills
  const allBills = storeBills.length > 0 ? storeBills : initialBills;

  // Filter bills by customer if specified
  const filteredBills = useMemo(() => {
    if (!customerId) return allBills;
    return allBills.filter(
      (bill) =>
        bill.customer === customerId ||
        (bill.customer as any)?._ref === customerId ||
        (bill.customer as any)?._id === customerId
    );
  }, [allBills, customerId]);

  // Recalculate stats when bills change
  useEffect(() => {
    const newStats = filteredBills.reduce(
      (acc: any, bill: any) => {
        acc.total += 1;
        acc.totalAmount += bill.totalAmount || 0;

        const paymentStatus = bill.paymentStatus || bill.status;
        switch (paymentStatus) {
          case "paid":
            acc.paid += 1;
            acc.paidAmount += bill.totalAmount || 0;
            break;
          case "pending":
            acc.pending += 1;
            acc.pendingAmount += bill.totalAmount || 0;
            break;
          case "partial":
            acc.pending += 1;
            acc.paidAmount += bill.paidAmount || 0;
            acc.pendingAmount +=
              bill.balanceAmount ||
              bill.totalAmount - (bill.paidAmount || 0) ||
              0;
            break;
          case "overdue":
            acc.overdue += 1;
            acc.pendingAmount +=
              bill.balanceAmount ||
              bill.totalAmount - (bill.paidAmount || 0) ||
              0;
            break;
        }

        return acc;
      },
      {
        total: 0,
        paid: 0,
        pending: 0,
        overdue: 0,
        totalAmount: 0,
        paidAmount: 0,
        pendingAmount: 0,
      }
    );

    // Avoid unnecessary state updates to prevent extra renders
    setStats((prev) => {
      const equal =
        prev.total === newStats.total &&
        prev.paid === newStats.paid &&
        prev.pending === newStats.pending &&
        prev.overdue === newStats.overdue &&
        prev.totalAmount === newStats.totalAmount &&
        prev.paidAmount === newStats.paidAmount &&
        prev.pendingAmount === newStats.pendingAmount;
      return equal ? prev : newStats;
    });
  }, [filteredBills]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <motion.div
        key="total-amount-card"
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 0.3 }}>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="max-sm:p-2">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-gray-400 text-xs sm:text-sm font-medium">
                  Total Amount
                </p>
                <p className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-white sm:mt-1 truncate">
                  ₹{stats.totalAmount.toLocaleString()}
                </p>
              </div>
              <Receipt className="hidden md:inline-block w-8 h-8 text-blue-400 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        key="paid-amount-card"
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 0.3 }}>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="max-sm:p-2">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-gray-400 text-xs sm:text-sm font-medium">Paid Amount</p>
                <p className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-green-400 sm:mt-1 truncate">
                  ₹{stats.paidAmount.toLocaleString()}
                </p>
              </div>
              <CheckCircle className="hidden md:inline-block w-8 h-8 text-green-400 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        key="pending-amount-card"
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 0.3 }}>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="max-sm:p-2">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-gray-400 text-xs sm:text-sm font-medium">
                  Pending Amount
                </p>
                <p className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-orange-400 sm:mt-1 truncate">
                  ₹{stats.pendingAmount.toLocaleString()}
                </p>
              </div>
              <Clock className="hidden md:inline-block w-8 h-8 text-orange-400 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="max-sm:p-2">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-gray-400 text-xs sm:text-sm font-medium">Overdue</p>
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-red-400 sm:mt-1">
                {stats.overdue}
              </p>
            </div>
            <AlertCircle className="hidden md:inline-block w-8 h-8 text-red-400 flex-shrink-0 ml-2" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
