"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  calculateOverdueExtraCharge,
  type DurationType,
  listenToolRentals,
  listenTools,
  toolRentalService,
  type ToolRental,
} from "@/lib/tool-rental-service";
import { toast } from "sonner";
import { sendViaWaBot } from "@/lib/wa-bot-send";
import { formatDayDateTime } from "@/lib/date-time";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import {
  Clock,
  User,
  Wrench,
  DollarSign,
  Calendar,
  CheckCircle,
  AlertCircle,
  XCircle,
  MessageSquare,
  Trash2,
} from "lucide-react";

function formatINR(value: number) {
  return `Rs ${Number(value || 0).toFixed(2)}`;
}

function getStatusIcon(status: string) {
  switch (status) {
    case "active":
      return <CheckCircle className="w-3 h-3" />;
    case "overdue":
      return <AlertCircle className="w-3 h-3" />;
    case "returned":
      return <XCircle className="w-3 h-3" />;
    default:
      return null;
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "active":
      return "bg-green-900/40 text-green-300 border-green-700/50";
    case "overdue":
      return "bg-red-900/40 text-red-300 border-red-700/50";
    case "returned":
      return "bg-gray-800 text-gray-300 border-gray-600";
    default:
      return "bg-gray-800 text-gray-300 border-gray-600";
  }
}

function getPaymentColor(status: string) {
  switch (status) {
    case "paid":
      return "bg-emerald-900/40 text-emerald-300 border-emerald-700/50";
    case "unpaid":
      return "bg-orange-900/40 text-orange-300 border-orange-700/50";
    case "partial":
      return "bg-blue-900/40 text-blue-300 border-blue-700/50";
    default:
      return "bg-gray-800 text-gray-300 border-gray-600";
  }
}

function formatDateTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return `Today at ${date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isYesterday) {
    return `Yesterday at ${date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
  }

  return formatDayDateTime(date);
}

function getRemainingText(r: ToolRental) {
  if (r.rentalStatus === "returned") return "Returned";
  const now = Date.now();
  const exp = new Date(r.expectedReturnTime).getTime();
  const diff = exp - now;
  const abs = Math.abs(diff);
  const h = Math.floor(abs / (60 * 60 * 1000));
  const m = Math.floor((abs % (60 * 60 * 1000)) / (60 * 1000));
  return diff >= 0 ? `${h}h ${m}m left` : `${h}h ${m}m overdue`;
}

function overdueReminderMessage(r: ToolRental) {
  return `Tool Return Reminder\n\nHello ${r.customerName},\n\nTool: ${r.toolName}\nExpected Return: ${formatDayDateTime(r.expectedReturnTime)}\nStatus: Overdue\n\nExtra charges may apply for next ${r.durationType}.\nPlease return as soon as possible.\n\nJambh Electrical Services`;
}

export default function AdminRentToolsClient() {
  const router = useRouter();
  const [tools, setTools] = useState<any[]>([]);
  const [rentals, setRentals] = useState<ToolRental[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const [returnTarget, setReturnTarget] = useState<ToolRental | null>(null);
  const [payTarget, setPayTarget] = useState<ToolRental | null>(null);
  const [payInput, setPayInput] = useState(0);
  const [editTarget, setEditTarget] = useState<ToolRental | null>(null);
  const [editDurationType, setEditDurationType] = useState<DurationType>("hour");
  const [editDurationValue, setEditDurationValue] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<ToolRental | null>(null);
  const [deletingRentalId, setDeletingRentalId] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const [toolsData, rentalsData] = await Promise.all([
        toolRentalService.getTools(),
        toolRentalService.getToolRentals(),
      ]);
      setTools(toolsData || []);
      const deduped = Array.from(
        new Map((rentalsData || []).map((r) => [r._id, r])).values(),
      );
      setRentals(deduped);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Failed to load rent tools data",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const subA = listenTools(load);
    const subB = listenToolRentals(load);
    return () => {
      subA.unsubscribe();
      subB.unsubscribe();
    };
  }, []);

  const filteredRentals = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rentals;
    return rentals.filter(
      (r) =>
        r.customerName?.toLowerCase().includes(q) ||
        r.customerPhone?.toLowerCase().includes(q) ||
        r.toolName?.toLowerCase().includes(q) ||
        r.rentalStatus?.toLowerCase().includes(q) ||
        r.paymentStatus?.toLowerCase().includes(q),
    );
  }, [rentals, query]);

  const confirmReturn = async () => {
    if (!returnTarget) return;
    const target = returnTarget;
    setReturnTarget(null);
    try {
      const tool = tools.find((t) => t._id === target.toolId);
      if (!tool) return toast.error("Tool not found");
      await toolRentalService.markToolReturned(target, tool);
      toast.success("Tool returned and customer notified");
      await load();
    } catch (e) {
      setReturnTarget(target);
      toast.error(e instanceof Error ? e.message : "Failed to return tool");
    }
  };

  const confirmMarkPaid = async () => {
    if (!payTarget) return;
    const target = payTarget;
    const total = Number(
      target.currentTotalAmount || target.totalAmount || 0,
    );
    if (payInput > total)
      return toast.error("Paid amount cannot be greater than total amount");
    try {
      setPayTarget(null);
      await toolRentalService.markRentalPaid(target._id, total, payInput);
      toast.success("Payment updated, cashbook updated, customer notified");
      await load();
    } catch (e) {
      setPayTarget(target);
      toast.error(e instanceof Error ? e.message : "Failed to update payment");
    }
  };

  const confirmEditDuration = async () => {
    if (!editTarget) return;
    const target = editTarget;
    try {
      setEditTarget(null);
      await toolRentalService.updateRentalDuration(target._id, {
        durationType: editDurationType,
        durationValue: editDurationValue,
      });
      toast.success("Rental duration updated");
      await load();
    } catch (e) {
      setEditTarget(target);
      toast.error(e instanceof Error ? e.message : "Failed to update rental duration");
    }
  };

  const confirmDeleteRental = async () => {
    if (!deleteTarget) return;
    const targetId = deleteTarget._id;
    const previousRentals = rentals;
    try {
      setDeletingRentalId(targetId);
      setRentals((prev) => prev.filter((r) => r._id !== targetId));
      await toolRentalService.deleteToolRental(targetId);
      toast.success("Rental deleted successfully");
      setDeleteTarget(null);
      setEditTarget(null);
    } catch (e) {
      setRentals(previousRentals);
      toast.error(e instanceof Error ? e.message : "Failed to delete rental");
    } finally {
      setDeletingRentalId(null);
    }
  };

  const onReminder = async (r: ToolRental) => {
    try {
      if (!r.customerPhone) return toast.error("Customer phone missing");
      const res = await sendViaWaBot({
        phones: [r.customerPhone],
        message: overdueReminderMessage(r),
      });
      if (!res.ok) throw new Error(res.error || "Failed to send reminder");
      toast.success("Reminder sent on WhatsApp");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send reminder");
    }
  };

  return (
    <div className="space-y-5 pb-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-white">
          Rental Tracking
        </h1>
        <button
          type="button"
          onClick={() => router.push("/admin/rent-tools/create")}
          className="bg-blue-600 hover:bg-blue-500 text-white rounded px-4 py-2"
        >
          Rent Tool{" "}
        </button>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="text-white font-semibold">Rental Tracking</h3>
          <input
            className="bg-gray-950 border border-gray-700 rounded px-3 py-2 text-white w-full sm:max-w-xs"
            placeholder="Search rentals"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {loading ? (
          <p className="text-gray-400">Loading rentals...</p>
        ) : filteredRentals.length === 0 ? (
          <p className="text-gray-400">No rentals found.</p>
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
            {filteredRentals.map((r) => {
              const baseTotal = Number(r.totalAmount || 0);
              const overdue =
                r.rentalStatus !== "returned"
                  ? calculateOverdueExtraCharge({
                      durationType: r.durationType,
                      expectedReturnTime: r.expectedReturnTime,
                      rentAmount: r.rentAmount,
                    })
                  : {
                      extraChargeAmount: Number(r.extraChargeAmount || 0),
                      overdueUnits: 0,
                    };
              const liveTotal =
                r.rentalStatus === "returned"
                  ? Number(r.currentTotalAmount || baseTotal)
                  : baseTotal + overdue.extraChargeAmount;
              const alreadyPaid =
                r.paymentStatus === "paid" ||
                Number(r.paidAmount || 0) >= Number(liveTotal || 0);
              const statusClass =
                r.rentalStatus === "active"
                  ? "bg-green-900/40 text-green-300"
                  : r.rentalStatus === "overdue"
                    ? "bg-red-900/40 text-red-300"
                    : "bg-gray-800 text-gray-300";

              return (
                <motion.div
                  key={r._id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: deletingRentalId === r._id ? 0.4 : 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0, scale: 0.98 }}
                  transition={{ duration: 0.22 }}
                  className="border border-gray-800 rounded-lg p-3 sm:p-4 bg-gray-950/60 space-y-3 sm:space-y-4 hover:border-gray-700 transition-colors"
                >
                  {/* Status Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1 ${getStatusColor(
                          r.rentalStatus,
                        )}`}
                      >
                        {getStatusIcon(r.rentalStatus)}
                        {r.rentalStatus.charAt(0).toUpperCase() +
                          r.rentalStatus.slice(1)}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border ${getPaymentColor(
                          r.paymentStatus,
                        )}`}
                      >
                        {r.paymentStatus.charAt(0).toUpperCase() +
                          r.paymentStatus.slice(1)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      {getRemainingText(r)}
                    </div>
                  </div>

                  {/* Customer & Tool Info - Consolidated */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <p className="text-white font-medium text-sm">
                          {r.customerName}
                        </p>
                        <span className="text-gray-400 text-sm">
                          ({r.customerPhone})
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-gray-400" />
                      <p className="text-gray-300 text-sm">{r.toolName}</p>
                      <span className="text-gray-400 text-xs">
                        [{r.toolCode}] | {r.durationValue} {r.durationType}
                      </span>
                    </div>
                  </div>

                  {/* Time & Payment - Simplified */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-gray-400 mb-1">
                        Start: {formatDateTime(r.rentStartTime)}
                      </p>
                      <p className="text-gray-400">
                        Return: {formatDateTime(r.expectedReturnTime)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-400 mb-1">
                        Total: {formatINR(liveTotal)}
                      </p>
                      <p
                        className={`text-xs font-medium ${
                          Number(r.paidAmount || 0) >= liveTotal
                            ? "text-emerald-400"
                            : "text-orange-400"
                        }`}
                      >
                        Paid: {formatINR(Number(r.paidAmount || 0))}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons - Compact */}
                  {r.rentalStatus !== "returned" && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setReturnTarget(r)}
                        className="flex items-center gap-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded px-2 py-1 text-xs transition-colors"
                      >
                        <CheckCircle className="w-3 h-3" />
                        Return
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditTarget(r);
                          setEditDurationType(r.durationType);
                          setEditDurationValue(r.durationValue);
                        }}
                        className="flex items-center gap-1 bg-violet-700 hover:bg-violet-600 text-white rounded px-2 py-1 text-xs transition-colors"
                      >
                        <Calendar className="w-3 h-3" />
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={alreadyPaid}
                        onClick={() => {
                          if (alreadyPaid) return;
                          setPayTarget(r);
                          setPayInput(
                            Number(
                              r.paidAmount ||
                                r.currentTotalAmount ||
                                r.totalAmount ||
                                0,
                            ),
                          );
                        }}
                        className={`flex items-center gap-1 text-white rounded px-2 py-1 text-xs transition-colors ${
                          alreadyPaid
                            ? "bg-blue-900/50 cursor-not-allowed opacity-60"
                            : "bg-blue-700 hover:bg-blue-600"
                        }`}
                      >
                        <DollarSign className="w-3 h-3" />
                        {alreadyPaid ? "Paid" : "Pay"}
                      </button>
                      <button
                        type="button"
                        onClick={() => onReminder(r)}
                        className="flex items-center gap-1 bg-amber-700 hover:bg-amber-600 text-white rounded px-2 py-1 text-xs transition-colors"
                      >
                        <MessageSquare className="w-3 h-3" />
                        Remind
                      </button>
                    </div>
                  )}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={deletingRentalId === r._id}
                      onClick={() => setDeleteTarget(r)}
                      className={`flex items-center gap-1 text-white rounded px-2 py-1 text-xs transition-colors ${deletingRentalId === r._id ? "bg-red-900/50 cursor-not-allowed opacity-60" : "bg-red-800/80 hover:bg-red-700"}`}
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  </div>
                </motion.div>
              );
            })}
            </AnimatePresence>
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={!!returnTarget}
        onClose={() => setReturnTarget(null)}
        onConfirm={confirmReturn}
        type="confirm"
        title="Confirm Return"
        message={
          returnTarget
            ? `Mark ${returnTarget.toolName} as returned for ${returnTarget.customerName}?`
            : ""
        }
        confirmText="Return Tool"
      />

      <ConfirmationModal
        isOpen={!!payTarget}
        onClose={() => setPayTarget(null)}
        onConfirm={confirmMarkPaid}
        type="confirm"
        title="Update Payment"
        message={payTarget ? `Set paid amount for ${payTarget.toolName}` : ""}
        confirmText="Update Payment"
        content={
          <div className="space-y-2">
            <p className="text-sm text-gray-300">
              Total amount:{" "}
              {formatINR(
                Number(
                  payTarget?.currentTotalAmount || payTarget?.totalAmount || 0,
                ),
              )}
            </p>
            <input
              type="number"
              min={0}
              value={payInput}
              onChange={(e) => setPayInput(Number(e.target.value || 0))}
              className="bg-gray-950 border border-gray-700 rounded px-3 py-2 text-white w-full"
              placeholder="Enter paid amount"
            />
          </div>
        }
      />

      <ConfirmationModal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        onConfirm={confirmEditDuration}
        type="confirm"
        title="Edit Rental Duration"
        message={editTarget ? `Update rental duration for ${editTarget.toolName}` : ""}
        confirmText="Update Duration"
        content={
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400">Duration Type</label>
              <select
                className="mt-1 w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-white"
                value={editDurationType}
                onChange={(e) => setEditDurationType(e.target.value as DurationType)}
              >
                <option value="hour">Hour</option>
                <option value="day">Day</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400">Duration Value</label>
              <input
                type="number"
                min={1}
                value={editDurationValue}
                onChange={(e) => setEditDurationValue(Number(e.target.value || 1))}
                className="mt-1 w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-white"
              />
            </div>
            <p className="text-xs text-gray-500">
              This will reset overdue reminders and update expected return time from original rent start.
            </p>
            <button
              type="button"
              onClick={() => editTarget && setDeleteTarget(editTarget)}
              className="w-full mt-1 bg-red-800/80 hover:bg-red-700 text-white rounded px-3 py-2 text-sm"
            >
              Delete This Rental
            </button>
          </div>
        }
      />

      <ConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteRental}
        type="confirm"
        title="Delete Rental"
        message={
          deleteTarget
            ? `Delete rental for ${deleteTarget.customerName} - ${deleteTarget.toolName}? This action cannot be undone.`
            : ""
        }
        confirmText="Delete Rental"
      />
    </div>
  );
}
