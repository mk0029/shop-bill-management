/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { sanityClient } from "@/lib/sanity";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  FileText,
  Edit3,
  CreditCard,
  RefreshCw,
  AlertTriangle,
  RotateCcw,
  DollarSign,
  MessageSquare,
  Lock,
  Trash2,
  Shuffle,
  Calendar,
  ChevronDown,
  ChevronUp,
  History,
  Loader2,
  BookOpen,
  CheckCircle2,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface TimelineChange {
  field: string;
  label: string;
  oldValue?: string;
  newValue?: string;
}

interface TimelineEvent {
  _id: string;
  eventId: string;
  eventType: string;
  timestamp: string;
  actorName: string;
  actorRole: string;
  description: string;
  changes?: TimelineChange[];
  notes: string;
  isPublic: boolean;
  paymentId?: string;
  paymentAmount?: number;
  paymentMethod?: string;
  cashBookEntryId?: string;
}

interface TimelineCardProps {
  billId: string;
  isAdmin?: boolean;
}

const EVENT_ICONS: Record<string, any> = {
  bill_created: FileText,
  bill_edited: Edit3,
  payment_received: CreditCard,
  payment_updated: RefreshCw,
  payment_removed: Trash2,
  advance_adjusted: Shuffle,
  payment_method_changed: CreditCard,
  status_changed: RefreshCw,
  due_date_changed: Calendar,
  notes_added: MessageSquare,
  admin_notes_added: Lock,
  bill_cancelled: AlertTriangle,
  bill_restored: RotateCcw,
  refund_issued: DollarSign,
  cashbook_synced: RefreshCw,
  payment_deleted: Trash2,
};

const EVENT_COLORS: Record<string, string> = {
  bill_created: "text-blue-400 border-blue-500/30 bg-blue-500/10",
  bill_edited: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  payment_received: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  payment_updated: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
  payment_removed: "text-rose-400 border-rose-500/30 bg-rose-500/10",
  advance_adjusted: "text-violet-400 border-violet-500/30 bg-violet-500/10",
  payment_method_changed: "text-sky-400 border-sky-500/30 bg-sky-500/10",
  status_changed: "text-indigo-400 border-indigo-500/30 bg-indigo-500/10",
  due_date_changed: "text-orange-400 border-orange-500/30 bg-orange-500/10",
  notes_added: "text-teal-400 border-teal-500/30 bg-teal-500/10",
  admin_notes_added: "text-gray-400 border-gray-500/30 bg-gray-500/10",
  bill_cancelled: "text-red-400 border-red-500/30 bg-red-500/10",
  bill_restored: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  refund_issued: "text-rose-400 border-rose-500/30 bg-rose-500/10",
  cashbook_synced: "text-purple-400 border-purple-500/30 bg-purple-500/10",
  payment_deleted: "text-rose-400 border-rose-500/30 bg-rose-500/10",
};

function TimelineEventRow({
  event,
  isAdmin,
  billId,
}: {
  event: TimelineEvent;
  isAdmin: boolean;
  billId: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [cashbookSaved, setCashbookSaved] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(true);

  // Check if this specific payment event was already saved to cashbook
  useEffect(() => {
    if (event.eventType !== "payment_received" || !event.eventId) {
      setChecking(false);
      return;
    }
    let cancelled = false;
    sanityClient
      .fetch(
        `*[_type == "cashBookEntry" && transactionId == $tid][0]._id`,
        { tid: event.eventId }
      )
      .then((id: string | null) => {
        if (!cancelled) setCashbookSaved(!!id);
      })
      .catch(() => {
        if (!cancelled) setCashbookSaved(false);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => { cancelled = true; };
  }, [event.eventId, event.eventType]);

  const handleSaveToCashbook = async () => {
    if (!event.paymentAmount || event.paymentAmount <= 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/mutations/cashbook/create-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entry: {
            user: { _type: "reference", _ref: event.actorUserId || "" },
            userName: event.actorName || "Admin",
            customerName: event.actorName || "Admin",
            customerId: event.actorUserId || "",
            amount: event.paymentAmount,
            totalAmount: event.paymentAmount,
            pendingAmount: 0,
            receivedAmount: event.paymentAmount,
            status: "completed",
            type: "credit",
            source: "Bill Payment",
            notes: event.description || `Payment received`,
            bill: { _type: "reference", _ref: billId },
            createdAt: event.timestamp,
            transactionId: event.eventId,
          },
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.success) {
        toast.success("Payment saved to cash book");
        setCashbookSaved(true);
      } else {
        toast.error(json?.error || "Failed to save to cash book");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to save to cash book");
    } finally {
      setSaving(false);
    }
  };

  const isPaymentEvent = event.eventType === "payment_received";
  const Icon = EVENT_ICONS[event.eventType] || History;
  const colorClasses =
    EVENT_COLORS[event.eventType] ||
    "text-white/40 border-white/10 bg-white/[0.04]";
  const hasChanges = event.changes && event.changes.length > 0;
  const hasDetails = hasChanges || event.notes;

  const eventLabel = event.eventType.replace(/_/g, " ");
  const formattedLabel =
    eventLabel.charAt(0).toUpperCase() + eventLabel.slice(1);

  const ts = event.timestamp ? new Date(event.timestamp) : new Date();
  const dateStr = format(ts, "dd MMM yyyy");
  const timeStr = format(ts, "hh:mm a");
  const relativeStr = formatDistanceToNow(ts, { addSuffix: true });

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="relative pl-10 pb-4 group">
      {/* Timeline line */}
      <div className="absolute left-[17px] top-8 bottom-0 w-px bg-white/[0.06]" />

      {/* Icon */}
      <div
        className={cn(
          "absolute left-0.5 top-1 w-8 h-8 rounded-full border flex items-center justify-center",
          colorClasses,
        )}>
        <Icon className="w-4 h-4" />
      </div>

      {/* Content */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-white/90">
            {formattedLabel}
          </h4>
          <span className="text-[10px] text-white/30">{relativeStr}</span>
        </div>

        {event.description && (
          <p className="text-sm text-white/70">{event.description}</p>
        )}

        <div className="flex items-center gap-3 text-[11px] text-white/40">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {dateStr} • {timeStr}
          </span>
          {event.actorName && (
            <span>
              by {event.actorName}
              {event.actorRole &&
                event.actorRole !== "system" &&
                ` (${event.actorRole})`}
            </span>
          )}
          {event.paymentAmount && event.paymentAmount > 0 && (
            <span className="text-emerald-400/70 font-medium">
              ₹{event.paymentAmount.toLocaleString()}
              {event.paymentMethod && ` via ${event.paymentMethod}`}
            </span>
          )}
        </div>

        {/* Per-payment Save to Cash Book button — only for payment_received events */}
        {isAdmin && isPaymentEvent && event.paymentAmount && event.paymentAmount > 0 && (
          <div className="pt-1.5">
            {checking ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-white/30">
                <Loader2 className="w-3 h-3 animate-spin" />
                Checking cash book...
              </span>
            ) : cashbookSaved ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400/70 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Saved to Cash Book
              </span>
            ) : (
              <button
                onClick={handleSaveToCashbook}
                disabled={saving}
                className="inline-flex items-center gap-1.5 text-[11px] text-purple-400 hover:text-purple-300 font-medium transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <BookOpen className="w-3.5 h-3.5" />
                )}
                {saving ? "Saving..." : "Save to Cash Book"}
              </button>
            )}
          </div>
        )}

        {hasDetails && (
          <>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-[11px] text-white/30 hover:text-white/60 transition-colors">
              {expanded ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
              {expanded ? "Hide details" : "Show details"}
            </button>

            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden">
                  <div className="mt-2 space-y-2 pl-2 border-l-2 border-white/[0.06]">
                    {hasChanges && (
                      <div className="space-y-1">
                        {event.changes!.map((change, i) => (
                          <div key={i} className="text-xs text-white/60">
                            <span className="text-white/80">
                              {change.label}:{" "}
                            </span>
                            <span className="text-rose-400/70 line-through">
                              {change.oldValue || "(empty)"}
                            </span>
                            {" → "}
                            <span className="text-emerald-400/70">
                              {change.newValue || "(empty)"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {event.notes && (
                      <p className="text-xs text-white/50 italic">
                        "{event.notes}"
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </motion.div>
  );
}

export function TimelineCard({ billId, isAdmin = true }: TimelineCardProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const subRef = useRef<any>(null);

  const fetchTimeline = useCallback(async () => {
    if (!billId) return;
    try {
      const res = await fetch(
        `/api/bills/${encodeURIComponent(billId)}/timeline`,
      );
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.success) {
        setEvents(json.data || []);
        setError("");
      } else {
        if (!json?.error?.includes("Missing bill id")) {
          setError(json?.error || "Failed to load timeline");
        }
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [billId]);

  // Initial fetch
  useEffect(() => {
    if (billId) {
      setLoading(true);
      fetchTimeline();
    }
  }, [billId, fetchTimeline]);

  // Real-time: Sanity Listen subscription
  useEffect(() => {
    if (!billId) return;
    const query = `*[_type == "billTimelineEvent" && bill._ref == $billId]`;
    const params = { billId };
    subRef.current = sanityClient
      .listen(query, params, { includeResult: true, visibility: "query" })
      .subscribe({
        next: () => { fetchTimeline(); },
        error: () => {},
      });
    return () => { subRef.current?.unsubscribe(); };
  }, [billId, fetchTimeline]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-white/40" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-rose-400/70">{error}</p>
        <button
          onClick={fetchTimeline}
          className="mt-2 text-xs text-white/40 hover:text-white/60 underline">
          Try again
        </button>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8">
        <History className="w-8 h-8 text-white/20 mx-auto mb-2" />
        <p className="text-sm text-white/40">No activity recorded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-white/70 flex items-center gap-2">
          <History className="w-4 h-4" />
          Activity Timeline
        </h3>
        <button
          onClick={fetchTimeline}
          className="text-xs text-white/30 hover:text-white/50 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="space-y-0">
        {events.map((event) => (
          <TimelineEventRow key={event._id} event={event} isAdmin={isAdmin} billId={billId} />
        ))}
      </div>
    </div>
  );
}
