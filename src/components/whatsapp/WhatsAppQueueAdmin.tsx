"use client";

import { useCallback, useEffect, useState } from "react";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw.js";
import Send from "lucide-react/dist/esm/icons/send.js";
import RotateCcw from "lucide-react/dist/esm/icons/rotate-ccw.js";
import Inbox from "lucide-react/dist/esm/icons/inbox.js";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Status = "queued" | "sending" | "sent" | "delivered" | "failed" | "cancelled";

type QueueEntry = {
  _id: string;
  messageId?: string;
  customerId?: string;
  customerName?: string;
  billId?: string;
  phoneNumber?: string;
  messageType?: string;
  status: Status;
  failureReason?: string;
  errorCode?: string;
  retryCount: number;
  maxRetries: number;
  retryAt?: string;
  sentAt?: string;
  queuedAt?: string;
  failedAt?: string;
};

type Stats = {
  queued: number;
  sending: number;
  sent: number;
  delivered: number;
  failed: number;
  cancelled: number;
  retrying: number;
  total: number;
  sentToday: number;
  failedToday: number;
};

type ApiResponse = {
  success: boolean;
  error?: string;
  stats?: Stats;
  messages?: QueueEntry[];
  result?: {
    processed: number;
    succeeded: number;
    failed: number;
    skipped: number;
  };
};

const statusTone: Record<Status, string> = {
  queued: "border-amber-300/25 bg-amber-500/10 text-amber-200",
  sending: "border-blue-300/25 bg-blue-500/10 text-blue-200",
  sent: "border-emerald-300/25 bg-emerald-500/10 text-emerald-200",
  delivered: "border-emerald-300/40 bg-emerald-500/20 text-emerald-100",
  failed: "border-red-300/25 bg-red-500/10 text-red-200",
  cancelled: "border-slate-300/20 bg-white/[0.06] text-slate-300",
};

function statCard(label: string, value: number, tone: string) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.055] px-4 py-3 shadow-lg shadow-black/10 backdrop-blur-xl">
      <div className={`text-2xl font-bold ${tone}`}>{value}</div>
      <div className="mt-0.5 text-xs uppercase tracking-wide text-slate-400">{label}</div>
    </div>
  );
}

export default function WhatsAppQueueAdmin() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [messages, setMessages] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/whatsapp/queue");
      const data: ApiResponse = await res.json();
      if (!data.success || !data.stats) {
        toast.error(data.error || "Failed to load queue");
        return;
      }
      setStats(data.stats);
      setMessages(data.messages || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load queue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function runAction(action: "process" | "retry", messageId?: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/whatsapp/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, messageId, limit: 20 }),
      });
      const data: ApiResponse = await res.json();
      if (!data.success) {
        toast.error(data.error || "Action failed");
        return;
      }
      if (action === "process") {
        const r = data.result;
        toast.success(`Drained: ${r?.succeeded} sent, ${r?.failed} failed, ${r?.skipped} retried`);
      } else {
        toast.success("Message retried");
      }
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  function fmtDate(value?: string) {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">WhatsApp Message Queue</h1>
          <p className="mt-1 text-sm text-slate-400">
            Every message is logged with full lifecycle: queued → sending → sent | failed. Only transient
            failures are retried with backoff — nothing is dropped silently.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading || busy}>
            <RefreshCw className={`mr-1.5 size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button size="sm" onClick={() => runAction("process")} disabled={busy || !stats || stats.queued === 0}>
            <Send className="mr-1.5 size-4" /> Drain Queue
          </Button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {statCard("Queued", stats.queued, "text-amber-300")}
          {statCard("Retrying", stats.retrying, "text-orange-300")}
          {statCard("Sent", stats.sent, "text-emerald-300")}
          {statCard("Delivered", stats.delivered, "text-teal-300")}
          {statCard("Failed", stats.failed, "text-red-300")}
        </div>
      )}

      {stats && (
        <div className="flex flex-wrap gap-2 text-xs text-slate-400">
          <span className="rounded border border-white/10 bg-white/[0.04] px-2 py-1">
            Sent today: <span className="font-semibold text-emerald-300">{stats.sentToday}</span>
          </span>
          <span className="rounded border border-white/10 bg-white/[0.04] px-2 py-1">
            Failed today: <span className="font-semibold text-red-300">{stats.failedToday}</span>
          </span>
          <span className="rounded border border-white/10 bg-white/[0.04] px-2 py-1">
            Total tracked: <span className="font-semibold text-slate-200">{stats.total}</span>
          </span>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.04] shadow-lg shadow-black/10 backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
            <Inbox className="mr-1.5 inline size-4 text-slate-400" /> Recent Messages
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Customer</th>
                <th className="px-4 py-2.5">Phone</th>
                <th className="px-4 py-2.5">Type</th>
                <th className="px-4 py-2.5">Retries</th>
                <th className="px-4 py-2.5">Queued At</th>
                <th className="px-4 py-2.5">Failure</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {messages.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    No messages yet
                  </td>
                </tr>
              )}
              {messages.map((m) => (
                <tr key={m._id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-2.5">
                    <Badge className={statusTone[m.status]}>{m.status}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-slate-200">
                    {m.customerName || "—"}
                    <div className="text-xs text-slate-500">{m.customerId || ""}</div>
                  </td>
                  <td className="px-4 py-2.5 text-slate-300">{m.phoneNumber || "—"}</td>
                  <td className="px-4 py-2.5 text-slate-400">{m.messageType || "—"}</td>
                  <td className="px-4 py-2.5 text-slate-400">
                    {m.retryCount}/{m.maxRetries}
                    {m.retryAt ? (
                      <div className="text-xs text-orange-300">retry {fmtDate(m.retryAt)}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-2.5 text-slate-400">{fmtDate(m.queuedAt)}</td>
                  <td className="max-w-[280px] truncate px-4 py-2.5 text-red-300" title={m.failureReason}>
                    {m.failureReason || "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {["failed", "cancelled"].includes(m.status) ? (
                      <Button variant="ghost" size="sm" onClick={() => runAction("retry", m._id)} disabled={busy}>
                        <RotateCcw className="size-3.5" /> Retry
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
