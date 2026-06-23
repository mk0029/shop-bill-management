"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  addWaBotLocalLog,
  getWaBotLocalLogs,
  clearWaBotLocalLogs,
  removeWaBotLocalLog,
  getLastBotState,
  saveBotState,
  getLastSuccessTime,
  saveLastSuccessTime,
  getLastQueueSize,
  saveLastQueueSize,
  getLastErrorValue,
  saveLastErrorValue,
  type WaBotLog,
} from "@/lib/wa-bot-local-logs";
import { cn } from "@/lib/utils";

interface BotStatus {
  botState: string;
  ready: boolean;
  connected: boolean;
  authenticated: boolean;
  hasQr: boolean;
  queueSize: number;
  lastActivityTime: string | null;
  lastSuccessfulMessageTime: string | null;
  lastError: string | null;
  lastDisconnect: string | null;
  lastDisconnectReason: string | null;
  reconnectAttempts: number;
}

type LogLevel = WaBotLog["level"];
const LEVEL_ORDER: LogLevel[] = ["error", "warning", "success", "info"];

const STATE_META: Record<string, { color: string; label: string }> = {
  starting: { color: "text-yellow-400 border-yellow-500/30 bg-yellow-500/8", label: "Starting" },
  ready: { color: "text-green-400 border-green-500/30 bg-green-500/8", label: "Ready" },
  sleeping: { color: "text-blue-400 border-blue-500/30 bg-blue-500/8", label: "Sleeping" },
  waking: { color: "text-purple-400 border-purple-500/30 bg-purple-500/8", label: "Waking" },
  disconnected: { color: "text-red-400 border-red-500/30 bg-red-500/8", label: "Disconnected" },
  error: { color: "text-orange-400 border-orange-500/30 bg-orange-500/8", label: "Error" },
};

const LEVEL_ICON: Record<LogLevel, { icon: string; bg: string }> = {
  info: { icon: "i", bg: "bg-blue-500/20 text-blue-400" },
  success: { icon: "✓", bg: "bg-green-500/20 text-green-400" },
  warning: { icon: "!", bg: "bg-orange-500/20 text-orange-400" },
  error: { icon: "✕", bg: "bg-red-500/20 text-red-400" },
};

function rel(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = Date.now() - new Date(iso).getTime();
  if (d < 5_000) return "now";
  if (d < 60_000) return `${Math.floor(d / 1000)}s`;
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}m`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h`;
  return `${Math.floor(d / 86_400_000)}d`;
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function WhatsAppBotClient() {
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [waking, setWaking] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [logs, setLogs] = useState<WaBotLog[]>([]);
  const [filterLevel, setFilterLevel] = useState<LogLevel | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortNewest, setSortNewest] = useState(true);
  const [showTestForm, setShowTestForm] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const intRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshLogs = useCallback(() => setLogs(getWaBotLocalLogs()), []);
  useEffect(() => { refreshLogs(); }, [refreshLogs]);

  /* ================================
     FETCH STATUS
  ================================ */

  const fetchStatus = useCallback(async (isInitial = false) => {
    try {
      const res = await fetch("/api/whatsapp/bot-manage", { signal: AbortSignal.timeout(10_000) });
      const json = await res.json();
      if (!res.ok || json?.ok === false) throw new Error(json?.error || `HTTP ${res.status}`);

      const s: BotStatus = {
        botState: json.botState || "unknown",
        ready: json.ready ?? false,
        connected: json.connected ?? false,
        authenticated: json.authenticated ?? false,
        hasQr: json.hasQr ?? false,
        queueSize: json.queueSize ?? 0,
        lastActivityTime: json.lastActivityTime || null,
        lastSuccessfulMessageTime: json.lastSuccessfulMessageTime || null,
        lastError: json.lastError || null,
        lastDisconnect: json.lastDisconnect || null,
        lastDisconnectReason: json.lastDisconnectReason || null,
        reconnectAttempts: json.reconnectAttempts ?? 0,
      };

      setStatus(s);
      setError(null);

      const prev = getLastBotState();
      const old = prev?.botState as string | undefined;
      if (old && old !== s.botState) {
        addWaBotLocalLog({ level: "warning", eventType: "state_change", status: s.botState, message: `Bot: ${old} → ${s.botState}` });
        refreshLogs();
      }
      saveBotState({ botState: s.botState });

      if (s.lastSuccessfulMessageTime) {
        const prevTime = getLastSuccessTime();
        if (prevTime !== null && prevTime !== s.lastSuccessfulMessageTime) {
          addWaBotLocalLog({ level: "success", eventType: "message_sent", message: `Message sent successfully`, metadata: { time: s.lastSuccessfulMessageTime } });
          refreshLogs();
        }
        saveLastSuccessTime(s.lastSuccessfulMessageTime);
      }

      const prevQ = getLastQueueSize();
      if (prevQ >= 0 && s.queueSize < prevQ) {
        addWaBotLocalLog({ level: "info", eventType: "message_processed", message: `Message processed. Queue: ${prevQ} → ${s.queueSize}` });
        refreshLogs();
      }
      if (s.queueSize > prevQ && prevQ >= 0) {
        addWaBotLocalLog({ level: "info", eventType: "message_queued", message: `Message queued. Queue: ${prevQ} → ${s.queueSize}` });
        refreshLogs();
      }
      saveLastQueueSize(s.queueSize);

      const prevErr = getLastErrorValue();
      if (s.lastError && s.lastError !== prevErr) {
        addWaBotLocalLog({ level: "error", eventType: "backend_error", message: s.lastError });
        refreshLogs();
      }
      saveLastErrorValue(s.lastError);

      if (isInitial) {
        addWaBotLocalLog({ level: "info", eventType: "page_open", message: `Page opened. State: ${s.botState}` });
        refreshLogs();
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      if (isInitial) {
        addWaBotLocalLog({ level: "error", eventType: "api_error", message: `Status fetch failed: ${msg}` });
        refreshLogs();
      }
    } finally {
      setLoading(false);
    }
  }, [refreshLogs]);

  useEffect(() => {
    fetchStatus(true);
    intRef.current = setInterval(() => fetchStatus(false), 5_000);
    return () => { if (intRef.current) clearInterval(intRef.current); };
  }, [fetchStatus]);

  /* ================================
     ACTIONS
  ================================ */

  const act = async (
    action: string,
    setBusy: (v: boolean) => void,
    extraBody: Record<string, unknown> = {},
  ) => {
    setBusy(true);
    addWaBotLocalLog({ level: "info", eventType: action, message: `${action} requested...` });
    refreshLogs();
    try {
      const res = await fetch("/api/whatsapp/bot-manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extraBody }),
      });
      const json = await res.json();
      if (json?.ok) {
        toast.success(`${action} successful`);
        addWaBotLocalLog({ level: "success", eventType: action, status: json.botState, message: `${action} successful` });
      } else {
        throw new Error(json?.error || `${action} failed`);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`${action} failed: ${msg}`);
      addWaBotLocalLog({ level: "error", eventType: action, message: `${action} failed: ${msg}` });
    } finally {
      refreshLogs();
      setBusy(false);
      await fetchStatus(false);
    }
  };

  const handleWake = () => act("wake", setWaking);
  const handleRestart = () => act("restart-safe", setRestarting);

  const handleTestSend = async () => {
    if (!testPhone.trim() || !testMessage.trim()) { toast.error("Phone & message required"); return; }
    setTesting(true);
    addWaBotLocalLog({ level: "info", eventType: "test_send", phone: testPhone, message: `Test send to ${testPhone}...` });
    refreshLogs();
    try {
      const res = await fetch("/api/whatsapp/bot-manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test-send", phone: testPhone.trim(), message: testMessage.trim() }),
      });
      const json = await res.json();
      if (json?.ok) {
        toast.success("Test message sent");
        addWaBotLocalLog({ level: "success", eventType: "test_send", phone: testPhone, message: "Test send successful" });
      } else {
        throw new Error(json?.error || "test-send failed");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Test send failed: ${msg}`);
      addWaBotLocalLog({ level: "error", eventType: "test_send", phone: testPhone, message: `Test send failed: ${msg}` });
    } finally {
      refreshLogs();
      setTesting(false);
      await fetchStatus(false);
    }
  };

  const handleRefresh = async () => {
    addWaBotLocalLog({ level: "info", eventType: "refresh", message: "Manual refresh" });
    refreshLogs();
    setLoading(true);
    await fetchStatus(false);
    setLoading(false);
    toast.success("Status refreshed");
  };

  const handleClearLogs = () => {
    clearWaBotLocalLogs();
    setLogs([]);
    toast.success("Logs cleared");
  };

  const handleRemoveLog = (id: string) => {
    removeWaBotLocalLog(id);
    refreshLogs();
  };

  /* ================================
     FILTER
  ================================ */

  const filteredLogs = useMemo(() => {
    let r = [...logs];
    if (filterLevel !== "all") r = r.filter((l) => l.level === filterLevel);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      r = r.filter((l) =>
        [l.message, l.phone, l.customerId, l.eventType].some((f) => (f || "").toLowerCase().includes(q)),
      );
    }
    r.sort((a, b) => (sortNewest ? -1 : 1) * (new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()));
    return r;
  }, [logs, filterLevel, searchQuery, sortNewest]);

  /* ================================
     RENDER
  ================================ */

  const meta = STATE_META[status?.botState || ""];
  const isBad = status && (status.botState === "error" || (status.botState === "disconnected" && (status.lastError || status.lastDisconnectReason)));

  return (
    <div className="space-y-4 md:space-y-6 max-w-6xl mx-auto px-3 md:px-6 pb-8">

      {/* ── HEADER ── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">WhatsApp Bot</h1>
          <p className="text-sm md:text-base text-gray-500 mt-1">Super Admin — Bot control panel</p>
        </div>
        <Badge variant="outline" className="border-blue-500/30 text-blue-400 text-sm px-3 py-1 w-fit">Super Admin</Badge>
      </div>

      {/* ── WARNING ── */}
      {isBad && (
        <div className="rounded-xl border border-orange-500/25 bg-orange-500/8 px-4 md:px-6 py-3 md:py-4">
          <p className="text-sm md:text-base font-semibold text-orange-300">
            ⚠ Bot is <strong>{status?.botState}</strong>.
          </p>
          {status?.lastError && <p className="text-sm text-orange-400/80 mt-1">{status.lastError}</p>}
          {status?.lastDisconnectReason && <p className="text-sm text-orange-400/60 mt-0.5">{status.lastDisconnectReason}</p>}
        </div>
      )}

      {/* ── STAT CARDS ── */}
      {/* Desktop: 6-column grid. Mobile: 2-column grid with compact labels */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        {([
          ["Bot State", () => (loading && !status ? <span className="text-gray-500 text-sm">...</span> : (
            <div className="flex items-center gap-2">
              <span className={cn("h-3 w-3 rounded-full shrink-0",
                status?.connected ? "bg-green-400" : status?.botState === "sleeping" ? "bg-blue-400" : "bg-red-400")} />
              <span className={cn("rounded-md border px-2.5 py-0.5 text-xs md:text-sm font-semibold",
                meta?.color || "text-gray-400 border-gray-500/30 bg-gray-500/8")}>
                {meta?.label || status?.botState || "?"}
              </span>
            </div>
          ))],
          ["Queue", () => <span className="text-2xl md:text-3xl font-bold text-white">{status?.queueSize ?? "—"}</span>],
          [isBad ? "Error" : "Activity", () => (
            <span className="text-sm md:text-base text-gray-300">{rel(isBad ? status?.lastError : status?.lastActivityTime)}</span>
          )],
          ["Msg Sent", () => (
            <span className="text-sm md:text-base text-gray-300">{rel(status?.lastSuccessfulMessageTime)}</span>
          )],
          ["Connected", () => (
            <Badge variant={status?.connected ? "default" : "destructive"} className="text-xs md:text-sm px-2 md:px-3 py-1">
              {status?.connected ? "Yes" : "No"}
            </Badge>
          )],
          ["Auth", () => (
            <Badge variant={status?.authenticated ? "default" : "secondary"} className="text-xs md:text-sm px-2 md:px-3 py-1">
              {status?.authenticated ? "Yes" : "No"}
            </Badge>
          )],
        ] as [string, () => React.ReactNode][]).map(([label, render]) => (
          <Card key={label} className="!border-gray-800/60">
            <CardContent className="p-3 md:p-5">
              <p className="text-xs md:text-sm uppercase tracking-wider text-gray-500 mb-1.5 md:mb-2 font-medium">{label}</p>
              {render()}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── CONTROLS ── */}
      <Card className="!border-gray-800/60">
        <CardContent className="p-3 md:p-5">
          <div className="flex flex-wrap gap-2 md:gap-3">
            <Button onClick={handleWake} loading={waking} disabled={waking || restarting} size="sm">Wake Bot</Button>
            <Button onClick={handleRefresh} loading={loading} disabled={loading} size="sm" variant="outline">Refresh</Button>
            <Button onClick={() => setShowTestForm(!showTestForm)} size="sm"
              variant={showTestForm ? "default" : "outline"}>{showTestForm ? "Hide Test" : "Test Send"}</Button>
            <Button onClick={handleRestart} loading={restarting} disabled={restarting || waking} size="sm" variant="secondary">Safe Restart</Button>
            <Button onClick={handleClearLogs} size="sm" variant="destructive">Clear Logs</Button>
          </div>

          {showTestForm && (
            <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-end">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1 font-medium">Phone (with country code)</label>
                <Input placeholder="e.g. 919876543210" value={testPhone} onChange={(e) => setTestPhone(e.target.value)}
                  className="!h-11 !w-full sm:!w-64 !text-sm !border-gray-700 !bg-gray-800/50" />
              </div>
              <div className="flex-[2]">
                <label className="block text-xs text-gray-500 mb-1 font-medium">Message</label>
                <Input placeholder="Type your test message..." value={testMessage} onChange={(e) => setTestMessage(e.target.value)}
                  className="!h-11 !w-full !text-sm !border-gray-700 !bg-gray-800/50" />
              </div>
              <Button onClick={handleTestSend} loading={testing} disabled={testing}
                className="w-full sm:w-auto mt-1 sm:mt-0">Send Test</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── EVENT LOGS ── */}
      <Card className="!border-gray-800/60">
        <CardContent className="p-3 md:p-5">

          {/* Header row */}
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <h2 className="text-sm md:text-lg font-semibold text-white">
              Event Logs <span className="text-gray-500 font-normal text-xs md:text-sm">({filteredLogs.length}/{logs.length})</span>
            </h2>

            {/* Desktop filter chips */}
            <div className="hidden sm:flex items-center gap-1.5">
              {(["all", ...LEVEL_ORDER] as const).map((l) => (
                <button key={l} onClick={() => setFilterLevel(l)}
                  className={cn("rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                    filterLevel === l
                      ? l === "all" ? "bg-gray-700 text-white"
                        : l === "error" ? "bg-red-500/20 text-red-300"
                          : l === "warning" ? "bg-orange-500/20 text-orange-300"
                            : l === "success" ? "bg-green-500/20 text-green-300"
                              : "bg-blue-500/20 text-blue-300"
                      : "bg-gray-800/40 text-gray-500 hover:text-gray-300"
                  )}>
                  {l === "all" ? "All" : l[0].toUpperCase() + l.slice(1)}
                </button>
              ))}
            </div>

            {/* Mobile filter toggle */}
            <button onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="sm:hidden rounded-lg bg-gray-800/40 px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors">
              {showMobileFilters ? "Close" : "Filter"}
            </button>
          </div>

          {/* Mobile filter sheet */}
          {showMobileFilters && (
            <div className="sm:hidden mb-3 p-3 rounded-xl bg-gray-800/30 border border-gray-700/50 space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {(["all", ...LEVEL_ORDER] as const).map((l) => (
                  <button key={l} onClick={() => setFilterLevel(l)}
                    className={cn("rounded-lg px-3 py-2 text-sm font-medium transition-colors flex-1 min-w-[60px]",
                      filterLevel === l
                        ? l === "all" ? "bg-gray-700 text-white"
                          : l === "error" ? "bg-red-500/20 text-red-300"
                            : l === "warning" ? "bg-orange-500/20 text-orange-300"
                              : l === "success" ? "bg-green-500/20 text-green-300"
                                : "bg-blue-500/20 text-blue-300"
                        : "bg-gray-800/40 text-gray-500 hover:text-gray-300"
                    )}>
                    {l === "all" ? "All" : l[0].toUpperCase() + l.slice(1)}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    className="!h-10 !text-sm !border-gray-700 !bg-gray-800/40 !pr-8" />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-sm">✕</button>
                  )}
                </div>
                <button onClick={() => setSortNewest(!sortNewest)}
                  className="shrink-0 rounded-lg border border-gray-700 bg-gray-800/30 px-3 py-2 text-sm text-gray-500 hover:text-white transition-colors">
                  {sortNewest ? "New ↓" : "Old ↑"}
                </button>
              </div>
            </div>
          )}

          {/* Desktop search + sort (always visible on desktop) */}
          <div className="hidden sm:flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Input placeholder="Search logs..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="!h-10 !text-sm !border-gray-700 !bg-gray-800/40 !pr-8" />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-sm">✕</button>
              )}
            </div>
            <button onClick={() => setSortNewest(!sortNewest)}
              className="shrink-0 rounded-lg border border-gray-700 bg-gray-800/30 px-4 py-2 text-sm text-gray-500 hover:text-white transition-colors">
              {sortNewest ? "Newest ↓" : "Oldest ↑"}
            </button>
          </div>

          {/* Log entries */}
          {filteredLogs.length === 0 ? (
            <div className="py-12 md:py-16 text-center text-sm md:text-base text-gray-600">
              No logs yet. Perform bot actions to see them here.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[500px] md:max-h-[600px] overflow-y-auto pr-1">
              {filteredLogs.map((log) => {
                const li = LEVEL_ICON[log.level];
                return (
                  <div key={log.id}
                    className="group flex items-start gap-2.5 md:gap-3 rounded-lg md:rounded-xl border border-gray-800/30 bg-gray-900/20 px-3 md:px-4 py-2.5 md:py-3 hover:bg-gray-800/20 transition-colors">
                    <span className={cn("mt-0.5 flex h-5 w-5 md:h-6 md:w-6 shrink-0 items-center justify-center rounded-full text-[10px] md:text-xs font-bold", li.bg)}>
                      {li.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mb-0.5">
                        <span className="text-gray-500 text-xs md:text-sm">{fmt(log.timestamp)}</span>
                        {log.eventType && (
                          <span className="rounded-md bg-gray-800 px-1.5 md:px-2 py-0.5 text-[10px] md:text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {log.eventType}
                          </span>
                        )}
                        {log.phone && <span className="text-gray-500 text-xs font-mono">{log.phone}</span>}
                      </div>
                      <p className="text-sm md:text-base text-gray-200 break-words leading-snug md:leading-relaxed">{log.message}</p>
                    </div>
                    <button onClick={() => handleRemoveLog(log.id)}
                      className="mt-0.5 shrink-0 rounded-md p-1.5 text-gray-600 opacity-0 hover:bg-red-500/20 hover:text-red-400 group-hover:opacity-100 transition-all text-xs md:text-sm">
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── OFFLINE STATE ── */}
      {!status && !loading && (
        <Card className="!border-gray-800/60">
          <CardContent className="p-6 md:p-8 text-center">
            <p className="text-base md:text-lg text-gray-600">
              {error ? <span className="text-red-400">{error}</span> : "Bot service not reachable."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
