"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDataStore } from "@/store/data-store";
import { useAuthStore } from "@/store/auth-store";
import { paymentService } from "@/lib/payment-service";
import { generateBillReference } from "@/lib/upi-utils";
import {
  Search,
  CheckCircle2,
  Clock,
  Phone,
  FileText,
  Loader2,
  AlertCircle,
  CheckCheck,
  UserCheck,
  CalendarClock,
} from "lucide-react";

interface PendingBill {
  id: string;
  billNumber: string;
  billReference: string;
  customerName: string;
  customerPhone: string;
  amount: number;
  paymentStatus: string;
  createdAt: string;
}

export function PaymentVerificationPanel() {
  const { bills } = useDataStore();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const currentUserName =
    (user as any)?.name || (user as any)?.phone || "admin";

  const pendingBills: PendingBill[] = useMemo(() => {
    return Array.from(bills.values())
      .filter((b: any) => {
        const status = (b.paymentStatus || "").toLowerCase();
        return status === "pending" || status === "overdue" || status === "partial";
      })
      .map((b: any) => ({
        id: b._id || b.id,
        billNumber: b.billNumber || "",
        billReference: generateBillReference(b.billNumber || "", b._id),
        customerName: b.customer?.name || "Unknown",
        customerPhone: b.customer?.phone || "N/A",
        amount: b.totalAmount || 0,
        paymentStatus: b.paymentStatus || "pending",
        createdAt: b.createdAt || b.serviceDate || "",
      }))
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }, [bills]);

  const filteredBills = useMemo(() => {
    if (!searchQuery.trim()) return pendingBills;
    const q = searchQuery.toLowerCase();
    return pendingBills.filter(
      (b) =>
        b.billReference.toLowerCase().includes(q) ||
        b.billNumber.toLowerCase().includes(q) ||
        b.customerName.toLowerCase().includes(q) ||
        b.customerPhone.includes(q)
    );
  }, [pendingBills, searchQuery]);

  const handleMarkAsPaid = useCallback(
    async (bill: PendingBill) => {
      setProcessingId(bill.id);
      setVerifyError(null);

      try {
        const result = await paymentService.markAsPaid(
          bill.id,
          currentUserName
        );

        if (result.success) {
          setSuccessId(bill.id);
          setTimeout(() => setSuccessId(null), 3000);
        } else {
          setVerifyError(result.message);
        }
      } catch {
        setVerifyError("Failed to update payment status");
      } finally {
        setProcessingId(null);
      }
    },
    [currentUserName]
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-900/50 text-yellow-300 border border-yellow-700/30";
      case "overdue":
        return "bg-red-900/50 text-red-300 border border-red-700/30";
      case "partial":
        return "bg-blue-900/50 text-blue-300 border border-blue-700/30";
      default:
        return "bg-gray-800 text-gray-300 border border-gray-700/30";
    }
  };

  return (
    <Card className="bg-gray-900/60 border-gray-800/60 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white text-base flex items-center gap-2">
          <CheckCheck className="w-5 h-5 text-green-400" />
          <span>Payment Verification</span>
          <span className="text-xs text-gray-500 font-normal">
            ({pendingBills.length} pending)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-[1]" />
          <Input
            type="text"
            placeholder="Search by Bill Reference, bill number, name, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-gray-800/80 border-gray-700/80 text-white placeholder-gray-500 text-sm"
          />
        </div>

        {verifyError && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <p className="text-xs text-red-300">{verifyError}</p>
          </div>
        )}

        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
          {filteredBills.length === 0 && (
            <div className="text-center py-10">
              <CheckCircle2 className="w-10 h-10 text-green-600/50 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">
                {searchQuery
                  ? "No bills match your search."
                  : "All bills are paid! No pending payments."}
              </p>
            </div>
          )}

          {filteredBills.map((bill, idx) => (
            <motion.div
              key={bill.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.02 }}
              className={`group flex items-center justify-between p-3 rounded-xl transition-all border ${
                successId === bill.id
                  ? "bg-green-900/20 border-green-700/40"
                  : "bg-gray-800/40 border border-transparent hover:bg-gray-800/70 hover:border-gray-700/50"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-600/20 to-yellow-600/20 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-white truncate">
                      {bill.customerName}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full ${getStatusBadge(bill.paymentStatus)} shrink-0`}
                    >
                      {bill.paymentStatus}
                    </span>
                    {successId === bill.id && (
                      <span className="text-[10px] text-green-400 flex items-center gap-0.5">
                        <CheckCircle2 className="w-3 h-3" />
                        Marked Paid
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-gray-500 mt-0.5 flex-wrap">
                    <span className="flex items-center gap-0.5">
                      <FileText className="w-3 h-3" />
                      {bill.billReference}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Phone className="w-3 h-3" />
                      {bill.customerPhone}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-3">
                <span className="text-sm font-semibold text-white">
                  &#x20B9;{bill.amount.toLocaleString()}
                </span>
                <Button
                  onClick={() => handleMarkAsPaid(bill)}
                  disabled={processingId === bill.id}
                  size="sm"
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white text-xs px-3 py-1.5 h-auto rounded-lg transition-all"
                >
                  {processingId === bill.id ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  )}
                  Mark Paid
                </Button>
              </div>
            </motion.div>
          ))}
        </div>

        {filteredBills.length > 0 && (
          <div className="mt-4 pt-3 border-t border-white/[0.06] text-[10px] text-gray-600 flex items-center gap-4">
            <span className="flex items-center gap-1">
              <CalendarClock className="w-3 h-3" />
              Verify using Bill Reference in your UPI app
            </span>
            <span className="flex items-center gap-1">
              <UserCheck className="w-3 h-3" />
              Verified by: {currentUserName}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
