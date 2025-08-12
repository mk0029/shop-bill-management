"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDocumentListener } from "@/hooks/use-realtime-sync";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Eye,
  Download,
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
  paymentStatus: "pending" | "paid" | "overdue";
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
}

export const RealtimeBillList: React.FC<RealtimeBillListProps> = ({
  initialBills,
  customerId,
  onBillClick,
  showNewBillAnimation = true,
  maxItems,
  searchTerm = "",
  filterStatus = "all",
}) => {
  const [bills, setBills] = useState<Bill[]>(initialBills);
  const [newBillIds, setNewBillIds] = useState<Set<string>>(new Set());

  // Listen to bill changes
  useDocumentListener("bill", undefined, {
    onUpdate: (update: any) => {
      const { transition, result } = update;

      // Filter by customer if specified
      if (
        customerId &&
        result?.customer?._ref !== customerId &&
        result?.customer?._id !== customerId
      ) {
        return; // Bill not for this customer
      }

      switch (transition) {
        case "appear":
          setBills((prev) => {
            const exists = prev.find((b) => b._id === result._id);
            if (!exists) {
              console.log(
                "✅ Adding new bill to customer view:",
                result.billNumber
              );
              if (showNewBillAnimation) {
                setNewBillIds((prev) => new Set(prev).add(result._id));
                // Remove the highlight after 3 seconds
                setTimeout(() => {
                  setNewBillIds((prev) => {
                    const newSet = new Set(prev);
                    newSet.delete(result._id);
                    return newSet;
                  });
                }, 3000);
              }
              return [result, ...prev];
            }
            return prev;
          });
          break;

        case "update":
          setBills((prev) =>
            prev.map((bill) =>
              bill._id === result._id ? { ...bill, ...result } : bill
            )
          );
          break;

        case "disappear":
          setBills((prev) => prev.filter((bill) => bill._id !== result._id));
          break;
      }
    },
  });

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

  const displayBills = maxItems
    ? filteredBills.slice(0, maxItems)
    : filteredBills;

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

              <Card className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors cursor-pointer">
                <CardContent className="sm:p-4 p-3">
                  <div className="flex flex-col gap-y-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
                        <StatusIcon className="min-w-6 min-h-6 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-medium text-white">
                          Bill #{bill.billNumber}
                        </h3>
                        <p className="text-sm text-gray-400">
                          {bill.customer?.name} • {bill.serviceType}
                        </p>
                        <p className="text-sm text-gray-400">
                          {bill.serviceDate
                            ? new Date(bill.serviceDate).toLocaleDateString()
                            : new Date(bill.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-end sm:items-center max-sm:justify-between gap-4">
                      <div className="sm:text-right">
                        <p className="font-semibold text-white">
                          ₹{bill.totalAmount?.toLocaleString() || 0}
                        </p>
                        <Badge
                          className={getStatusColor(
                            bill.paymentStatus || bill.status
                          )}>
                          {bill.paymentStatus || bill.status}
                        </Badge>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onBillClick?.(bill)}
                          className="!w-full !py-1.5">
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="!w-full !py-1.5">
                          <Download className="w-4 h-4 mr-2" />
                          PDF
                        </Button>
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

  const [bills, setBills] = useState<unknown[]>(initialBills);

  // Initialize bills with initial data
  useEffect(() => {
    if (initialBills.length > 0) {
      setBills(initialBills);
    }
  }, [initialBills]);

  // Remove duplicate bill listener - use bill store's real-time handling instead
  // This prevents redundant API calls when bills change

  // Recalculate stats when bills change
  useEffect(() => {
    const newStats = bills.reduce(
      (acc: any, bill: unknown) => {
        acc.total += 1;
        acc.totalAmount += bill.totalAmount || 0;

        const paymentStatus = bill.paymentStatus || bill.status;
        switch (paymentStatus) {
          case "paid":
            acc.paid += 1;
            acc.paidAmount += bill.totalAmount || 0;
            break;
          case "pending":
          case "partial":
            acc.pending += 1;
            acc.pendingAmount += bill.totalAmount || 0;
            break;
          case "overdue":
            acc.overdue += 1;
            acc.pendingAmount += bill.totalAmount || 0;
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

    setStats(newStats);
  }, [bills]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 md:gap-6 sm:gap-4 gap-3">
      <motion.div
        key={stats.totalAmount}
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 0.3 }}>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs sm:text-sm font-medium">
                  Total Amount
                </p>
                <p className="text-xl md:text-2xl font-bold text-white sm:mt-1">
                  ₹{stats.totalAmount.toLocaleString()}
                </p>
              </div>
              <Receipt className=" h-6 w-6 sm:w-8 sm:h-8  text-blue-400" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Card className="bg-gray-900 border-gray-800">
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs sm:text-sm font-medium">
                Paid Bills
              </p>
              <p className="text-xl sm:text-2xl font-bold !leading-[125%] text-green-400 mt-1">
                {stats.paid}
              </p>
            </div>
            <CheckCircle className=" h-6 w-6 sm:w-8 sm:h-8  text-green-400" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-800">
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs sm:text-sm font-medium">
                Pending
              </p>
              <p className="text-xl sm:text-2xl font-bold !leading-[125%] text-yellow-400 mt-1">
                {stats.pending}
              </p>
            </div>
            <Clock className=" h-6 w-6 sm:w-8 sm:h-8  text-yellow-400" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-800">
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs sm:text-sm font-medium">
                Overdue
              </p>
              <p className="text-xl sm:text-2xl font-bold !leading-[125%] text-red-400 mt-1">
                {stats.overdue}
              </p>
            </div>
            <AlertCircle className=" h-6 w-6 sm:w-8 sm:h-8  text-red-400" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
