"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SessionDetail {
  id: string;
  name: string;
  status: string;
  phone?: string | null;
  pushName?: string | null;
  connectedAt?: string | null;
  lastActive?: string | null;
  createdAt?: string;
  updatedAt?: string;
  lastError?: string | null;
}

interface ReminderResult {
  sent: number;
  skipped: number;
  failed: number;
}

const STATUS_COLOR: Record<string, string> = {
  ready: "text-green-400 border-green-500/30 bg-green-500/8",
  created: "text-gray-400 border-gray-500/30 bg-gray-500/8",
  initializing: "text-yellow-400 border-yellow-500/30 bg-yellow-500/8",
  qr_ready: "text-cyan-400 border-cyan-500/30 bg-cyan-500/8",
  authenticating: "text-purple-400 border-purple-500/30 bg-purple-500/8",
  disconnected: "text-red-400 border-red-500/30 bg-red-500/8",
  failed: "text-red-500 border-red-600/40 bg-red-600/10",
};

function rel(iso: string | null | undefined): string {
  if (!iso) return "\u2014";
  const d = Date.now() - new Date(iso).getTime();
  if (d < 5_000) return "now";
  if (d < 60_000) return `${Math.floor(d / 1000)}s ago`;
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}m ago`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h ago`;
  return `${Math.floor(d / 86_400_000)}d ago`;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "\u2014";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

const REFRESH_INTERVAL = 30_000;

export default function WhatsAppBotClient() {
  const [sessions, setSessions] = useState<SessionDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [, setTick] = useState(0); // forces re-render every 1s so relative time ticks
  const [reminderLoading, setReminderLoading] = useState(false);
  const [reminderResult, setReminderResult] = useState<ReminderResult | null>(null);
  const [reminderError, setReminderError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/sessions", {
        signal: AbortSignal.timeout(10_000),
      });
      const json = await res.json();
      if (json?.ok && Array.isArray(json.sessions)) {
        setSessions(json.sessions);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  }, []);

  useEffect(() => {
    fetchSessions();
    const timer = setInterval(fetchSessions, REFRESH_INTERVAL);
    return () => clearInterval(timer);
  }, [fetchSessions]);

  const triggerBillReminder = useCallback(async () => {
    setReminderLoading(true);
    setReminderResult(null);
    setReminderError(null);
    try {
      const res = await fetch("/api/super/bill-reminder/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (json.success) {
        setReminderResult({ sent: json.sent || 0, skipped: json.skipped || 0, failed: json.failed || 0 });
      } else {
        setReminderError(json.error || "Failed to trigger reminder");
      }
    } catch (err) {
      setReminderError(err instanceof Error ? err.message : "Network error");
    } finally {
      setReminderLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="space-y-4 md:space-y-6 max-w-6xl mx-auto px-3 md:px-6 pb-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">WhatsApp Bot</h1>
          <p className="text-sm md:text-base text-gray-500 mt-1">
            All registered sessions on the bot
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-xs text-gray-600">
              Last: {lastRefresh.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
          <Badge variant="outline" className="border-blue-500/30 text-blue-400 text-sm px-3 py-1 w-fit">
            Super Admin
          </Badge>
        </div>
      </div>

      <Card className="!border-gray-800/60">
        <CardContent className="p-4 md:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">Daily Bill Reminder</p>
              <p className="text-xs text-gray-500">Manually trigger WhatsApp payment reminders for all pending bills</p>
            </div>
            <button
              onClick={triggerBillReminder}
              disabled={reminderLoading}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                reminderLoading
                  ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-500 active:bg-blue-700",
              )}
            >
              {reminderLoading ? "Sending..." : "Trigger Reminders"}
            </button>
          </div>
          {reminderResult && (
            <div className="mt-3 rounded-lg border border-green-500/20 bg-green-500/5 px-3 py-2">
              <p className="text-xs text-green-400">
                Done — Sent: {reminderResult.sent} | Skipped: {reminderResult.skipped} | Failed: {reminderResult.failed}
              </p>
            </div>
          )}
          {reminderError && (
            <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2">
              <p className="text-xs text-red-400">{reminderError}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="!border-gray-800/60">
        <CardContent className="p-3 md:p-5">
          {loading && sessions.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500">No sessions found on bot.</div>
          ) : (
            <div className="space-y-3">
              {sessions.map((s) => {
                const sMeta = STATUS_COLOR[s.status];
                return (
                  <div key={s.id} className="rounded-xl border border-gray-800/50 bg-gray-900/30 p-4 md:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "h-2.5 w-2.5 rounded-full shrink-0",
                            s.status === "ready"
                              ? "bg-green-400"
                              : s.status === "failed"
                                ? "bg-red-500"
                                : "bg-yellow-400",
                          )}
                        />
                        <div>
                          <p className="text-sm font-semibold text-white">{s.name || "Unnamed"}</p>
                          <p className="text-xs text-gray-500 font-mono">{s.id}</p>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "rounded-md border px-2.5 py-0.5 text-xs font-semibold w-fit",
                          sMeta || "text-gray-400 border-gray-500/30 bg-gray-500/8",
                        )}
                      >
                        {s.status}
                      </span>
                    </div>

                    <div className="grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <span className="text-gray-500">Phone:</span>{" "}
                        <span className="text-gray-300">{s.phone || "\u2014"}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Push Name:</span>{" "}
                        <span className="text-gray-300">{s.pushName || "\u2014"}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Connected:</span>{" "}
                        <span className="text-gray-300">{rel(s.connectedAt)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Last Active:</span>{" "}
                        <span className="text-gray-300">{rel(s.lastActive)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Created:</span>{" "}
                        <span className="text-gray-300">{fmtDate(s.createdAt)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Updated:</span>{" "}
                        <span className="text-gray-300">{fmtDate(s.updatedAt)}</span>
                      </div>
                    </div>

                    {s.lastError && (
                      <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2">
                        <p className="text-xs font-medium text-red-400 mb-0.5">Last Error</p>
                        <p className="text-xs text-red-300 break-words [overflow-wrap:anywhere]">
                          {s.lastError}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
