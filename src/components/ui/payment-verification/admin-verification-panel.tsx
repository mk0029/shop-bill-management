"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  FileText,
  User,
  Phone,
  Hash,
  CheckCheck,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  Image as ImageIcon,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QueueItem {
  _id: string;
  amount: number;
  originalAmount: number;
  discountApplied: number;
  remainingAmount: number;
  status: string;
  utr?: string;
  transactionId?: string;
  merchantName?: string;
  billReference?: string;
  ocrConfidence?: number;
  receiptImage?: string;
  notes?: string;
  createdAt: string;
  bill?: {
    _id: string;
    billNumber: string;
    totalAmount: number;
    customer?: { name: string; phone: string };
  };
}

export function AdminVerificationPanel() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<QueueItem | null>(null);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/payments/verification-queue");
      const data = await res.json();
      if (data.success) setQueue(data.queue);
      else setError(data.error);
    } catch {
      setError("Failed to load verification queue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handleAction = useCallback(
    async (
      paymentId: string,
      action: "approve" | "reject" | "mark_paid" | "mark_partial",
      notes?: string
    ) => {
      setProcessingId(paymentId);
      setError(null);
      try {
        const res = await fetch("/api/payments/admin-verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId, action, notes }),
        });
        const data = await res.json();
        if (data.success) {
          setQueue((prev) => prev.filter((p) => p._id !== paymentId));
          setSelectedPayment(null);
        } else {
          setError(data.error);
        }
      } catch {
        setError("Failed to process action");
      } finally {
        setProcessingId(null);
      }
    },
    []
  );

  const filtered = queue.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.utr?.toLowerCase().includes(q) ||
      p.billReference?.toLowerCase().includes(q) ||
      p.bill?.billNumber?.toLowerCase().includes(q) ||
      p.bill?.customer?.name?.toLowerCase().includes(q) ||
      p.bill?.customer?.phone?.includes(q)
    );
  });

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: "bg-gray-800 text-gray-300",
      PENDING_VERIFICATION: "bg-amber-500/15 text-amber-300",
      MANUAL_REVIEW: "bg-purple-500/15 text-purple-300",
      PARTIALLY_PAID: "bg-blue-500/15 text-blue-300",
      PAID: "bg-green-500/15 text-green-300",
      FAILED: "bg-red-500/15 text-red-300",
    };
    return styles[status] || "bg-gray-800 text-gray-300";
  };

  return (
    <Card className="bg-gray-900/60 border-gray-800/60 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white text-base flex items-center gap-2">
          <CheckCheck className="w-5 h-5 text-purple-400" />
          <span>Payment Verification Queue</span>
          <span className="text-xs text-gray-500 font-normal">
            ({queue.length} pending)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-[1]" />
          <input
            type="text"
            placeholder="Search by UTR, reference, bill, name, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-gray-800/80 border border-gray-700/80 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
          />
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <p className="text-xs text-red-300">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10">
            <CheckCircle2 className="w-10 h-10 text-green-600/50 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              {searchQuery ? "No matching payments." : "No pending verifications."}
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {filtered.map((item) => (
              <motion.div
                key={item._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "rounded-xl border transition-all cursor-pointer",
                  selectedPayment?._id === item._id
                    ? "border-purple-500/30 bg-purple-500/5"
                    : "border-transparent bg-gray-800/40 hover:bg-gray-800/70 hover:border-gray-700/50"
                )}
                onClick={() =>
                  setSelectedPayment(
                    selectedPayment?._id === item._id ? null : item
                  )
                }
              >
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-sm font-medium text-white truncate">
                        {item.bill?.customer?.name || "Unknown"}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full shrink-0",
                          statusBadge(item.status)
                        )}
                      >
                        {item.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-white shrink-0 ml-2">
                      ₹{item.amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-500">
                    <span className="flex items-center gap-0.5">
                      <Hash className="w-3 h-3" />
                      {item.billReference || "N/A"}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <FileText className="w-3 h-3" />
                      UTR: {item.utr || "N/A"}
                    </span>
                    {item.ocrConfidence !== undefined && (
                      <span
                        className={cn(
                          "flex items-center gap-0.5",
                          item.ocrConfidence >= 0.7
                            ? "text-green-500"
                            : "text-amber-500"
                        )}
                      >
                        Confidence: {Math.round(item.ocrConfidence * 100)}%
                      </span>
                    )}
                  </div>
                </div>

                <AnimatePresence>
                  {selectedPayment?._id === item._id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-white/[0.06]"
                    >
                      <div className="p-3 space-y-3">
                        {item.receiptImage && (
                          <div className="rounded-lg overflow-hidden bg-black/40 max-h-40">
                            <img
                              src={`data:image/png;base64,${item.receiptImage}`}
                              alt="Receipt"
                              className="w-full h-full object-contain"
                            />
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2 rounded-lg bg-white/[0.04]">
                            <span className="text-gray-500">Bill No</span>
                            <p className="text-white">
                              {item.bill?.billNumber || "N/A"}
                            </p>
                          </div>
                          <div className="p-2 rounded-lg bg-white/[0.04]">
                            <span className="text-gray-500">Amount</span>
                            <p className="text-white">
                              ₹{item.originalAmount.toLocaleString()}
                            </p>
                          </div>
                          <div className="p-2 rounded-lg bg-white/[0.04]">
                            <span className="text-gray-500">Received</span>
                            <p className="text-white">
                              ₹{item.amount.toLocaleString()}
                            </p>
                          </div>
                          <div className="p-2 rounded-lg bg-white/[0.04]">
                            <span className="text-gray-500">UTR</span>
                            <p className="text-white font-mono text-[11px]">
                              {item.utr || "N/A"}
                            </p>
                          </div>
                          {item.transactionId && (
                            <div className="col-span-2 p-2 rounded-lg bg-white/[0.04]">
                              <span className="text-gray-500">Txn ID</span>
                              <p className="text-white font-mono text-[11px] break-all">
                                {item.transactionId}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleAction(item._id, "approve")}
                            disabled={processingId === item._id}
                            size="sm"
                            className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white text-xs"
                          >
                            {processingId === item._id ? (
                              <Loader2 className="w-3 h-3 animate-spin mr-1" />
                            ) : (
                              <ThumbsUp className="w-3 h-3 mr-1" />
                            )}
                            Approve
                          </Button>
                          <Button
                            onClick={() => handleAction(item._id, "mark_partial")}
                            disabled={processingId === item._id}
                            size="sm"
                            className="flex-1 bg-white/[0.08] hover:bg-white/[0.12] text-gray-300 text-xs border border-white/[0.1]"
                          >
                            Mark Partial
                          </Button>
                          <Button
                            onClick={() =>
                              handleAction(item._id, "reject", "Rejected by admin")
                            }
                            disabled={processingId === item._id}
                            size="sm"
                            className="flex-1 bg-red-600/20 hover:bg-red-600/30 text-red-300 text-xs border border-red-500/20"
                          >
                            <ThumbsDown className="w-3 h-3 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}

        {!loading && queue.length > 0 && (
          <div className="mt-4 pt-3 border-t border-white/[0.06] text-[10px] text-gray-600 flex items-center gap-2">
            <Clock className="w-3 h-3" />
            Receipts are processed via OCR. Low confidence results require manual review.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
