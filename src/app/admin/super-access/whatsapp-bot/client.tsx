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
import { normalizeBotText } from "@/lib/normalize-bot-text";
import { cn } from "@/lib/utils";

const CACHE_VERSION = "wa_bot_dashboard_cache_v3";
const CACHE_VERSION_KEY = "wa_bot_dashboard_version";

interface BillPaymentWaLog {
  eventType?: string;
  billId?: string;
  billNumber?: string;
  paymentId?: string;
  customerName?: string;
  phone?: string;
  recipientType?: string;
  status?: string;
  error?: string;
  createdAt?: string;
}
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
  botHostname?: string;
  lastConflictTime?: string | null;
  stateTransitionTime?: string | null;
  socketGeneration?: number;
  lastOpenTime?: string | null;
  lastReconnectReason?: string | null;
  hasPendingReconnect?: boolean;
}

type LogLevel = WaBotLog["level"];
const LEVEL_ORDER: LogLevel[] = ["error", "warning", "success", "info"];

const STATE_META: Record<string, { color: string; label: string }> = {
  starting: {
    color: "text-yellow-400 border-yellow-500/30 bg-yellow-500/8",
    label: "Starting",
  },
  ready: {
    color: "text-green-400 border-green-500/30 bg-green-500/8",
    label: "Ready",
  },
  sleeping: {
    color: "text-blue-400 border-blue-500/30 bg-blue-500/8",
    label: "Sleeping",
  },
  waking: {
    color: "text-purple-400 border-purple-500/30 bg-purple-500/8",
    label: "Waking",
  },
  disconnected: {
    color: "text-red-400 border-red-500/30 bg-red-500/8",
    label: "Disconnected",
  },
  conflict: {
    color: "text-red-500 border-red-600/40 bg-red-600/10",
    label: "Conflict",
  },
  qr_required: {
    color: "text-cyan-400 border-cyan-500/30 bg-cyan-500/8",
    label: "QR Required",
  },
  reconnecting: {
    color: "text-orange-400 border-orange-500/30 bg-orange-500/8",
    label: "Reconnecting",
  },
  logged_out: {
    color: "text-gray-400 border-gray-500/30 bg-gray-500/8",
    label: "Logged Out",
  },
  error: {
    color: "text-orange-400 border-orange-500/30 bg-orange-500/8",
    label: "Error",
  },
  auth_corrupted: {
    color: "text-red-600 border-red-700/40 bg-red-700/10",
    label: "Auth Corrupted",
  },
};

const LEVEL_ICON: Record<LogLevel, { icon: string; bg: string }> = {
  info: { icon: "i", bg: "bg-blue-500/20 text-blue-400" },
  success: { icon: "\u2713", bg: "bg-green-500/20 text-green-400" },
  warning: { icon: "!", bg: "bg-orange-500/20 text-orange-400" },
  error: { icon: "\u2717", bg: "bg-red-500/20 text-red-400" },
};

function rel(iso: string | null | undefined): string {
  if (!iso) return "\u2014";
  const d = Date.now() - new Date(iso).getTime();
  if (d < 5_000) return "now";
  if (d < 60_000) return `${Math.floor(d / 1000)}s`;
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}m`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h`;
  return `${Math.floor(d / 86_400_000)}d`;
}

function fmt(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "\u2014";
  }
}

function clearOldCacheIfNeeded() {
  if (typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem(CACHE_VERSION_KEY);
    if (stored !== CACHE_VERSION) {
      localStorage.removeItem("wa_bot_local_logs");
      localStorage.removeItem("wa_bot_last_state");
      localStorage.removeItem("wa_bot_last_success_time");
      localStorage.removeItem("wa_bot_last_queue_size");
      localStorage.removeItem("wa_bot_last_error");
      localStorage.setItem(CACHE_VERSION_KEY, CACHE_VERSION);
    }
  } catch {
    // ignore
  }
}

export default function WhatsAppBotClient() {
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [waking, setWaking] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testPhone, setTestPhone] = useState("+917015493276");
  const [testMessage, setTestMessage] = useState("TEST BOT MESSAGE");
  const [logs, setLogs] = useState<WaBotLog[]>([]);
  const [billPaymentLogs, setBillPaymentLogs] = useState<BillPaymentWaLog[]>([]);
  const [filterLevel, setFilterLevel] = useState<LogLevel | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortNewest, setSortNewest] = useState(true);
  const [showTestForm, setShowTestForm] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [qrData, setQrData] = useState<string | null>(null);
  const [qrStatus, setQrStatus] = useState<string>("");
  const [qrLoading, setQrLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showSimulateForm, setShowSimulateForm] = useState(false);
  const [simEventType, setSimEventType] = useState("billing.created");
  const [simPhone, setSimPhone] = useState("+917015493276");
  const [simPayload, setSimPayload] = useState('{\n  "customerName": "Test Customer",\n  "billNumber": "INV-001",\n  "totalAmount": 5000,\n  "paidAmount": 2000,\n  "balanceAmount": 3000,\n  "shopName": "Jambh Electricals"\n}');
  const [simPreview, setSimPreview] = useState<string | null>(null);
  const [simSending, setSimSending] = useState(false);
  const [simLoadingPreview, setSimLoadingPreview] = useState(false);
  const lastQrFetch = useRef(0);

  useEffect(() => {
    clearOldCacheIfNeeded();
  }, []);

  const refreshLogs = useCallback(() => setLogs(getWaBotLocalLogs()), []);
  useEffect(() => {
    refreshLogs();
  }, [refreshLogs]);
  const fetchBillPaymentLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/bot-manage?logType=bill-payment&limit=30", {
        signal: AbortSignal.timeout(10_000),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(json?.logs)) setBillPaymentLogs(json.logs);
    } catch {
      // Keep the bot dashboard usable even when log fetch fails.
    }
  }, []);

  useEffect(() => {
    fetchBillPaymentLogs();
  }, [fetchBillPaymentLogs]);

  const fetchStatus = useCallback(
    async (isInitial = false) => {
      try {
        const res = await fetch("/api/whatsapp/bot-manage", {
          signal: AbortSignal.timeout(10_000),
        });
        const json = await res.json();
        if (!res.ok || json?.ok === false)
          throw new Error(json?.error || `HTTP ${res.status}`);

        const isReady = json.status === "ready" || json.connected === true;
        const s: BotStatus = {
          botState: isReady ? "ready" : (json.status || "unknown"),
          ready: isReady,
          connected: isReady,
          authenticated: isReady,
          hasQr: json.status === "qr_ready",
          queueSize: json.queueSize ?? 0,
          lastActivityTime: null,
          lastSuccessfulMessageTime: null,
          lastError: json.error || null,
          lastDisconnect: null,
          lastDisconnectReason: null,
          reconnectAttempts: 0,
        };

        setStatus(s);
        setError(null);

        const prev = getLastBotState();
        const old = prev?.botState as string | undefined;
        if (old && old !== s.botState) {
          addWaBotLocalLog({
            level: "warning",
            eventType: "state_change",
            status: s.botState,
            message: `Bot: ${old} \u2192 ${s.botState}`,
          });
          refreshLogs();
        }
        saveBotState({ botState: s.botState });

        if (s.lastSuccessfulMessageTime) {
          const prevTime = getLastSuccessTime();
          if (prevTime !== null && prevTime !== s.lastSuccessfulMessageTime) {
            addWaBotLocalLog({
              level: "success",
              eventType: "message_sent",
              message: `Message sent successfully`,
              metadata: { time: s.lastSuccessfulMessageTime },
            });
            refreshLogs();
          }
          saveLastSuccessTime(s.lastSuccessfulMessageTime);
        }

        const prevQ = getLastQueueSize();
        if (prevQ >= 0 && s.queueSize < prevQ) {
          addWaBotLocalLog({
            level: "info",
            eventType: "message_processed",
            message: `Message processed. Queue: ${prevQ} \u2192 ${s.queueSize}`,
          });
          refreshLogs();
        }
        if (s.queueSize > prevQ && prevQ >= 0) {
          addWaBotLocalLog({
            level: "info",
            eventType: "message_queued",
            message: `Message queued. Queue: ${prevQ} \u2192 ${s.queueSize}`,
          });
          refreshLogs();
        }
        saveLastQueueSize(s.queueSize);

        const prevErr = getLastErrorValue();
        if (s.lastError && s.lastError !== prevErr) {
          addWaBotLocalLog({
            level: "error",
            eventType: "backend_error",
            message: s.lastError,
          });
          refreshLogs();
        }
        saveLastErrorValue(s.lastError);

        if (isInitial) {
          addWaBotLocalLog({
            level: "info",
            eventType: "page_open",
            message: `Page opened. State: ${s.botState}`,
          });
          refreshLogs();
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        if (isInitial) {
          addWaBotLocalLog({
            level: "error",
            eventType: "api_error",
            message: `Status fetch failed: ${msg}`,
          });
          refreshLogs();
        }
      } finally {
        setLoading(false);
      }
    },
    [refreshLogs],
  );

  const QR_INTERVAL = 35_000;

  const doFetchQr = useCallback(async () => {
    setQrLoading(true);
    try {
      const res = await fetch("/api/whatsapp/qr", {
        signal: AbortSignal.timeout(10_000),
      });
      const json = await res.json();
      if (json?.ok && json.qrImageDataUrl) {
        setQrData(json.qrImageDataUrl);
        setQrStatus(json.status || "qr_ready");
      } else {
        setQrData(null);
        setQrStatus(json.status || json.botStatus || "unavailable");
      }
    } catch {
      setQrData(null);
      setQrStatus("unreachable");
    } finally {
      setQrLoading(false);
    }
  }, []);

  const autoFetchQr = useCallback(() => {
    const now = Date.now();
    if (now - lastQrFetch.current >= QR_INTERVAL) {
      lastQrFetch.current = now;
      doFetchQr();
    }
  }, [doFetchQr]);

  const handleRefreshQr = useCallback(() => {
    lastQrFetch.current = Date.now();
    doFetchQr();
  }, [doFetchQr]);

  useEffect(() => {
    fetchStatus(true);
    return () => {};
  }, [fetchStatus]);

  useEffect(() => {
    if (status && !status.connected) {
      autoFetchQr();
    } else if (status?.connected) {
      setQrData(null);
      setQrStatus("");
    }
  }, [status?.connected, autoFetchQr]);

  const act = async (
    action: string,
    setBusy: (v: boolean) => void,
    extraBody: Record<string, unknown> = {},
  ) => {
    setBusy(true);
    addWaBotLocalLog({
      level: "info",
      eventType: action,
      message: `${action} requested...`,
    });
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
        addWaBotLocalLog({
          level: "success",
          eventType: action,
          status: json.botState,
          message: `${action} successful`,
        });
      } else {
        throw new Error(json?.error || `${action} failed`);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`${action} failed: ${msg}`);
      addWaBotLocalLog({
        level: "error",
        eventType: action,
        message: `${action} failed: ${msg}`,
      });
    } finally {
      refreshLogs();
      setBusy(false);
      await fetchStatus(false);
    }
  };

  const handleWake = () => act("wake", setWaking);
  const handleRestart = () => act("restart-safe", setRestarting);

  const handleTestSend = async () => {
    if (!testPhone.trim() || !testMessage.trim()) {
      toast.error("Phone & message required");
      return;
    }
    setTesting(true);
    addWaBotLocalLog({
      level: "info",
      eventType: "test_send",
      phone: testPhone,
      message: `Test send to ${testPhone}...`,
    });
    refreshLogs();
    try {
      const res = await fetch("/api/whatsapp/bot-manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test-send",
          phone: testPhone.trim(),
          message: testMessage.trim(),
        }),
      });
      const json = await res.json();
      if (json?.ok) {
        toast.success("Test message sent");
        addWaBotLocalLog({
          level: "success",
          eventType: "test_send",
          phone: testPhone,
          message: "Test send successful",
        });
      } else {
        throw new Error(json?.error || "test-send failed");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Test send failed: ${msg}`);
      addWaBotLocalLog({
        level: "error",
        eventType: "test_send",
        phone: testPhone,
        message: `Test send failed: ${msg}`,
      });
    } finally {
      refreshLogs();
      setTesting(false);
      await fetchStatus(false);
    }
  };

  const handleSimulatePreview = async () => {
    if (!simPhone.trim() || !simEventType.trim()) {
      toast.error("Phone & event type required");
      return;
    }
    setSimLoadingPreview(true);
    setSimPreview(null);
    try {
      let payload = {};
      try { payload = JSON.parse(simPayload); } catch { toast.error("Invalid JSON payload"); setSimLoadingPreview(false); return; }
      const res = await fetch("/api/whatsapp/simulate-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType: simEventType, phone: simPhone.trim(), payload, previewOnly: true }),
      });
      const json = await res.json();
      if (json?.ok && json?.message) {
        setSimPreview(json.message);
        toast.success("Template rendered");
      } else {
        throw new Error(json?.error || "Preview failed");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Preview failed: ${msg}`);
    } finally {
      setSimLoadingPreview(false);
    }
  };

  const handleSimulateSend = async () => {
    if (!simPhone.trim() || !simEventType.trim()) {
      toast.error("Phone & event type required");
      return;
    }
    setSimSending(true);
    addWaBotLocalLog({
      level: "info",
      eventType: "simulate_send",
      phone: simPhone,
      message: `Simulating ${simEventType} to ${simPhone}...`,
    });
    refreshLogs();
    try {
      let payload = {};
      try { payload = JSON.parse(simPayload); } catch { toast.error("Invalid JSON payload"); setSimSending(false); return; }
      const res = await fetch("/api/whatsapp/simulate-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType: simEventType, phone: simPhone.trim(), payload }),
      });
      const json = await res.json();
      if (json?.ok) {
        toast.success(`Template sent (${json.templateName})`);
        setSimPreview(json.message);
        addWaBotLocalLog({
          level: "success",
          eventType: "simulate_send",
          phone: simPhone,
          message: `Simulated ${simEventType} sent to ${simPhone}`,
        });
      } else {
        throw new Error(json?.error || "Simulate send failed");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Simulate send failed: ${msg}`);
      addWaBotLocalLog({
        level: "error",
        eventType: "simulate_send",
        phone: simPhone,
        message: `Simulate send failed: ${msg}`,
      });
    } finally {
      refreshLogs();
      setSimSending(false);
      await fetchStatus(false);
    }
  };

  const handleRefresh = async () => {
    addWaBotLocalLog({
      level: "info",
      eventType: "refresh",
      message: "Manual refresh",
    });
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

  const filteredLogs = useMemo(() => {
    let r = [...logs];
    if (filterLevel !== "all") r = r.filter((l) => l.level === filterLevel);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      r = r.filter((l) =>
        [l.message, l.phone, l.customerId, l.eventType].some((f) =>
          (f || "").toLowerCase().includes(q),
        ),
      );
    }
    r.sort(
      (a, b) =>
        (sortNewest ? -1 : 1) *
        (new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    );
    return r;
  }, [logs, filterLevel, searchQuery, sortNewest]);

  const meta = STATE_META[status?.botState || ""];
  const isBad =
    status &&
    (status.botState === "error" ||
      (status.botState === "disconnected" &&
        (status.lastError || status.lastDisconnectReason)));

  return (
    <div className="space-y-4 md:space-y-6 max-w-6xl mx-auto px-3 md:px-6 pb-8">
      {/* HEADER */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            WhatsApp Bot
          </h1>
          <p className="text-sm md:text-base text-gray-500 mt-1">
            Super Admin &mdash; Bot control panel
          </p>
        </div>
        <Badge
          variant="outline"
          className="border-blue-500/30 text-blue-400 text-sm px-3 py-1 w-fit"
        >
          Super Admin
        </Badge>
      </div>

      {/* WARNING */}
      {isBad && (
        <div
          className={cn(
            "rounded-xl border px-4 md:px-6 py-3 md:py-4",
            status?.botState === "conflict"
              ? "border-red-500/40 bg-red-500/10"
              : status?.botState === "auth_corrupted"
                ? "border-red-700/40 bg-red-700/10"
                : "border-orange-500/25 bg-orange-500/8",
          )}
        >
          <p
            className={cn(
              "text-sm md:text-base font-semibold",
              status?.botState === "conflict"
                ? "text-red-300"
                : status?.botState === "auth_corrupted"
                  ? "text-red-400"
                  : "text-orange-300",
            )}
          >
            {status?.botState === "conflict"
              ? "\u26A0 WhatsApp Session Conflict"
              : status?.botState === "auth_corrupted"
                ? "\u26A0 Auth State Corrupted"
                : `\u26A0 Bot is ${normalizeBotText(status?.botState, "unknown")}.`}
          </p>
          {status?.botState === "conflict" && (
            <p className="text-sm text-red-400/80 mt-1">
              Another connection is using the same WhatsApp credentials. Go to
              your phone &rarr; WhatsApp &rarr; Linked Devices &rarr; remove all sessions, then
              click <strong>Force Reset &amp; QR</strong> below.
            </p>
          )}
          {status?.botState === "auth_corrupted" && (
            <p className="text-sm text-red-400/80 mt-1">
              The WhatsApp auth state file is corrupted. Click <strong>Force Reset &amp; QR</strong> to clear and regenerate.
            </p>
          )}
          {status?.lastError &&
            status?.botState !== "conflict" &&
            status?.botState !== "auth_corrupted" && (
              <p className="text-sm text-orange-400/80 mt-1 break-words [overflow-wrap:anywhere]">
                {normalizeBotText(status.lastError, "Unknown error")}
              </p>
            )}
          {status?.lastDisconnectReason && (
            <p className="text-sm text-orange-400/60 mt-0.5 break-words [overflow-wrap:anywhere]">
              {normalizeBotText(status.lastDisconnectReason, "Unknown reason")}
            </p>
          )}
        </div>
      )}

      {/* STAT CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        {(
          [
            [
              "Bot State",
              () =>
                loading && !status ? (
                  <span className="text-gray-500 text-sm">...</span>
                ) : (
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "h-3 w-3 rounded-full shrink-0",
                        status?.connected
                          ? "bg-green-400"
                          : status?.botState === "sleeping"
                            ? "bg-blue-400"
                            : status?.botState === "conflict"
                              ? "bg-red-500"
                              : "bg-red-400",
                      )}
                    />
                    <span
                      className={cn(
                        "rounded-md border px-2.5 py-0.5 text-xs md:text-sm font-semibold",
                        meta?.color ||
                          "text-gray-400 border-gray-500/30 bg-gray-500/8",
                      )}
                    >
                      {meta?.label || normalizeBotText(status?.botState, "?")}
                    </span>
                  </div>
                ),
            ],
            [
              "Queue",
              () => (
                <span className="text-2xl md:text-3xl font-bold text-white">
                  {normalizeBotText(status?.queueSize, "\u2014")}
                </span>
              ),
            ],
            [
              isBad ? "Error" : "Activity",
              () => (
                <span className="text-sm md:text-base text-gray-300">
                  {rel(isBad ? status?.lastError : status?.lastActivityTime)}
                </span>
              ),
            ],
            [
              "Msg Sent",
              () => (
                <span className="text-sm md:text-base text-gray-300">
                  {rel(status?.lastSuccessfulMessageTime)}
                </span>
              ),
            ],
            [
              "Connected",
              () => (
                <Badge
                  variant={status?.connected ? "default" : "destructive"}
                  className="text-xs md:text-sm px-2 md:px-3 py-1"
                >
                  {status?.connected ? "Yes" : "No"}
                </Badge>
              ),
            ],
            [
              "Auth",
              () => (
                <Badge
                  variant={status?.authenticated ? "default" : "secondary"}
                  className="text-xs md:text-sm px-2 md:px-3 py-1"
                >
                  {status?.authenticated ? "Yes" : "No"}
                </Badge>
              ),
            ],
          ] as [string, () => React.ReactNode][]
        ).map(([label, render]) => (
          <Card key={label} className="!border-gray-800/60">
            <CardContent className="p-3 md:p-5">
              <p className="text-xs md:text-sm uppercase tracking-wider text-gray-500 mb-1.5 md:mb-2 font-medium">
                {label}
              </p>
              {render()}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* DETAIL ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
        {[
          ["Instance", normalizeBotText(status?.botHostname, "\u2014")],
          ["Socket Gen", normalizeBotText(status?.socketGeneration, "\u2014")],
          ["Reconnects", normalizeBotText(status?.reconnectAttempts, "\u2014")],
          ["Last Open", status?.lastOpenTime ? rel(status.lastOpenTime) : "\u2014"],
          ["Last Conflict", status?.lastConflictTime ? rel(status.lastConflictTime) : "None"],
          ["State Since", status?.stateTransitionTime ? rel(status.stateTransitionTime) : "\u2014"],
          ["Reconnect Reason", normalizeBotText(status?.lastReconnectReason, "\u2014")],
          ["Pending Reconnect", status?.hasPendingReconnect ? "Yes" : "No"],
        ].map(([label, value]) => (
          <Card key={label} className="!border-gray-800/60">
            <CardContent className="p-3 md:p-5 overflow-hidden">
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-1 font-medium">{label}</p>
              <p className="text-sm text-gray-300 truncate [overflow-wrap:anywhere]" title={String(value)}>
                {value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* QR CODE SECTION */}
      {!status?.connected && (
        <Card className="!border-gray-800/60">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 md:gap-6">
              <div className="shrink-0">
                {qrLoading && !qrData ? (
                  <div className="w-48 h-48 md:w-56 md:h-56 rounded-xl bg-gray-800/50 flex items-center justify-center">
                    <span className="text-gray-500 text-sm">Loading QR...</span>
                  </div>
                ) : qrData ? (
                  <div className="relative">
                    <img
                      src={qrData}
                      alt="WhatsApp QR Code"
                      className="w-48 h-48 md:w-56 md:h-56 rounded-xl border border-gray-700/50 bg-white p-2"
                    />
                    {qrLoading && (
                      <div className="absolute inset-0 rounded-xl bg-black/40 flex items-center justify-center">
                        <span className="text-white text-sm">
                          Refreshing...
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-48 h-48 md:w-56 md:h-56 rounded-xl bg-gray-800/30 border border-dashed border-gray-700/50 flex flex-col items-center justify-center gap-2">
                    <span className="text-3xl">\uD83D\uDD11</span>
                    <span className="text-gray-500 text-xs text-center px-2">
                      {qrStatus === "unreachable"
                        ? "Bot unreachable"
                        : qrStatus === "connected" ||
                            qrStatus === "authenticated"
                          ? "Already connected"
                          : "No QR available"}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base md:text-lg font-semibold text-white mb-1">
                  Link WhatsApp
                </h3>
                <p className="text-sm text-gray-400 mb-3">
                  {qrData
                    ? "Scan the QR code with WhatsApp on your phone: Menu \u2192 Linked Devices \u2192 Link a Device"
                    : qrStatus === "connected" || qrStatus === "authenticated"
                      ? "Bot is already connected to WhatsApp."
                      : status?.botState === "reconnecting"
                        ? "Bot is reconnecting with stored credentials. If this persists, use Force Reset."
                        : status?.botState === "starting" ||
                            status?.botState === "waking"
                          ? "Bot is starting up. QR will appear shortly."
                          : "Bot is offline. Try Wake or Force Reset."}
                </p>
                {qrData && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => {
                        const w = window.open("", "_blank");
                        if (w) {
                          w.document.write(
                            `<img src="${qrData}" alt="WhatsApp QR code for authentication - scan with your WhatsApp app" style="width:100%;max-width:400px;margin:auto;display:block"/>`,
                          );
                        }
                      }}
                      size="sm"
                      variant="outline"
                    >
                      Open QR in Tab
                    </Button>
                    <Button
                      onClick={handleRefreshQr}
                      loading={qrLoading}
                      disabled={qrLoading}
                      size="sm"
                      variant="outline"
                    >
                      Refresh QR
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CONTROLS */}
      <Card className="!border-gray-800/60">
        <CardContent className="p-3 md:p-5">
          <div className="flex flex-wrap gap-2 md:gap-3">
            <Button
              onClick={handleWake}
              loading={waking}
              disabled={waking || restarting || resetting}
              size="sm"
            >
              Wake Bot
            </Button>
            <Button
              onClick={handleRefresh}
              loading={loading}
              disabled={loading}
              size="sm"
              variant="outline"
            >
              Refresh
            </Button>
            <Button
              onClick={() => setShowTestForm(!showTestForm)}
              size="sm"
              variant={showTestForm ? "default" : "outline"}
            >
              {showTestForm ? "Hide Test" : "Test Send"}
            </Button>
            <Button
              onClick={() => setShowSimulateForm(!showSimulateForm)}
              size="sm"
              variant={showSimulateForm ? "default" : "outline"}
            >
              {showSimulateForm ? "Hide Simulate" : "Simulate Template"}
            </Button>
            <Button
              onClick={handleRestart}
              loading={restarting}
              disabled={restarting || waking || resetting}
              size="sm"
              variant="secondary"
            >
              Safe Restart
            </Button>
            <Button
              onClick={() => act("force-reset", setResetting)}
              loading={resetting}
              disabled={resetting || waking || restarting}
              size="sm"
              variant="destructive"
            >
              Force Reset &amp; QR
            </Button>
            <Button onClick={handleClearLogs} size="sm" variant="outline">
              Clear Logs
            </Button>
          </div>

          {showTestForm && (
            <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-end">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1 font-medium">
                  Phone (with country code)
                </label>
                <Input
                  placeholder="e.g. 919876543210"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  className="!h-11 !w-full sm:!w-64 !text-sm !border-gray-700 !bg-gray-800/50"
                />
              </div>
              <div className="flex-[2]">
                <label className="block text-xs text-gray-500 mb-1 font-medium">
                  Message
                </label>
                <Input
                  placeholder="Type your test message..."
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="!h-11 !w-full !text-sm !border-gray-700 !bg-gray-800/50"
                />
              </div>
              <Button
                onClick={handleTestSend}
                loading={testing}
                disabled={testing}
                className="w-full sm:w-auto mt-1 sm:mt-0"
              >
                Send Test
              </Button>
            </div>
          )}

          {showSimulateForm && (
            <div className="mt-4 border-t border-gray-800/60 pt-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Simulate Message Template</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1 font-medium">Event Type</label>
                  <select
                    value={simEventType}
                    onChange={(e) => { setSimEventType(e.target.value); setSimPreview(null); }}
                    className="!h-11 !w-full !text-sm !border-gray-700 !bg-gray-800/50 !text-gray-200 rounded-md px-3"
                  >
                    <optgroup label="Billing">
                      <option value="billing.created">billing.created</option>
                      <option value="billing.created.unpaid">billing.created.unpaid</option>
                      <option value="billing.created.partial">billing.created.partial</option>
                      <option value="billing.created.paid">billing.created.paid</option>
                      <option value="billing.created.zero_balance">billing.created.zero_balance</option>
                      <option value="billing.updated">billing.updated</option>
                      <option value="billing.deleted">billing.deleted</option>
                      <option value="bill.cancelled">bill.cancelled</option>
                      <option value="bill.reminder.due">bill.reminder.due</option>
                    </optgroup>
                    <optgroup label="Payment">
                      <option value="billing.payment.partial">billing.payment.partial</option>
                      <option value="billing.payment.paid">billing.payment.paid</option>
                      <option value="billing.payment.updated">billing.payment.updated</option>
                      <option value="billing.payment.removed">billing.payment.removed</option>
                      <option value="billing.multiPaid">billing.multiPaid</option>
                      <option value="billing.bulkPaid">billing.bulkPaid</option>
                    </optgroup>
                    <optgroup label="Customer">
                      <option value="customer.created">customer.created</option>
                      <option value="customer.request.created">customer.request.created</option>
                    </optgroup>
                    <optgroup label="Work Task">
                      <option value="workTask.created">workTask.created</option>
                      <option value="workTask.updated">workTask.updated</option>
                      <option value="workTask.completed">workTask.completed</option>
                      <option value="workTask.cancelled">workTask.cancelled</option>
                      <option value="workTask.hold">workTask.hold</option>
                      <option value="urgentWork.created">urgentWork.created</option>
                      <option value="urgentWork.completed">urgentWork.completed</option>
                    </optgroup>
                    <optgroup label="Tool Rent">
                      <option value="toolRent.created">toolRent.created</option>
                      <option value="toolRent.updated">toolRent.updated</option>
                      <option value="toolRent.returned">toolRent.returned</option>
                      <option value="toolRent.overdue">toolRent.overdue</option>
                    </optgroup>
                    <optgroup label="Scheduled">
                      <option value="scheduled.goodMorning">scheduled.goodMorning</option>
                      <option value="scheduled.festivalGreeting">scheduled.festivalGreeting</option>
                    </optgroup>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1 font-medium">Phone (with country code)</label>
                  <Input
                    placeholder="e.g. 919876543210"
                    value={simPhone}
                    onChange={(e) => setSimPhone(e.target.value)}
                    className="!h-11 !w-full !text-sm !border-gray-700 !bg-gray-800/50"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Button onClick={handleSimulatePreview} loading={simLoadingPreview} disabled={simLoadingPreview || simSending} size="sm" variant="secondary">
                    Preview
                  </Button>
                  <Button onClick={handleSimulateSend} loading={simSending} disabled={simSending || simLoadingPreview} size="sm">
                    Send
                  </Button>
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-xs text-gray-500 mb-1 font-medium">Payload (JSON)</label>
                <textarea
                  value={simPayload}
                  onChange={(e) => setSimPayload(e.target.value)}
                  rows={6}
                  className="!w-full !text-sm !border-gray-700 !bg-gray-800/50 !text-gray-200 rounded-md px-3 py-2 font-mono resize-y"
                />
              </div>
              {simPreview && (
                <div className="mt-3">
                  <label className="block text-xs text-gray-500 mb-1 font-medium">Rendered Preview</label>
                  <pre className="!w-full !text-sm !border-gray-700 !bg-gray-950 !text-gray-300 rounded-md px-3 py-2 whitespace-pre-wrap font-sans max-h-60 overflow-y-auto">
                    {simPreview}
                  </pre>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* EVENT LOGS */}
      <Card className="!border-gray-800/60">
        <CardContent className="p-3 md:p-5">
          {/* Header row */}
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <h2 className="text-sm md:text-lg font-semibold text-white">
              Event Logs{" "}
              <span className="text-gray-500 font-normal text-xs md:text-sm">
                ({filteredLogs.length}/{logs.length})
              </span>
            </h2>

            {/* Desktop filter chips */}
            <div className="hidden sm:flex items-center gap-1.5">
              {(["all", ...LEVEL_ORDER] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setFilterLevel(l)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                    filterLevel === l
                      ? l === "all"
                        ? "bg-gray-700 text-white"
                        : l === "error"
                          ? "bg-red-500/20 text-red-300"
                          : l === "warning"
                            ? "bg-orange-500/20 text-orange-300"
                            : l === "success"
                              ? "bg-green-500/20 text-green-300"
                              : "bg-blue-500/20 text-blue-300"
                      : "bg-gray-800/40 text-gray-500 hover:text-gray-300",
                  )}
                >
                  {l === "all" ? "All" : l[0].toUpperCase() + l.slice(1)}
                </button>
              ))}
            </div>

            {/* Mobile filter toggle */}
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="sm:hidden rounded-lg bg-gray-800/40 px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
            >
              {showMobileFilters ? "Close" : "Filter"}
            </button>
          </div>

          {/* Mobile filter sheet */}
          {showMobileFilters && (
            <div className="sm:hidden mb-3 p-3 rounded-xl bg-gray-800/30 border border-gray-700/50 space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {(["all", ...LEVEL_ORDER] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setFilterLevel(l)}
                    className={cn(
                      "rounded-lg px-3 py-2 text-sm font-medium transition-colors flex-1 min-w-[60px]",
                      filterLevel === l
                        ? l === "all"
                          ? "bg-gray-700 text-white"
                          : l === "error"
                            ? "bg-red-500/20 text-red-300"
                            : l === "warning"
                              ? "bg-orange-500/20 text-orange-300"
                              : l === "success"
                                ? "bg-green-500/20 text-green-300"
                                : "bg-blue-500/20 text-blue-300"
                        : "bg-gray-800/40 text-gray-500 hover:text-gray-300",
                    )}
                  >
                    {l === "all" ? "All" : l[0].toUpperCase() + l.slice(1)}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="!h-10 !text-sm !border-gray-700 !bg-gray-800/40 !pr-8"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-sm"
                    >
                      \u2715
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setSortNewest(!sortNewest)}
                  className="shrink-0 rounded-lg border border-gray-700 bg-gray-800/30 px-3 py-2 text-sm text-gray-500 hover:text-white transition-colors"
                >
                  {sortNewest ? "New \u2193" : "Old \u2191"}
                </button>
              </div>
            </div>
          )}

          {/* Desktop search + sort */}
          <div className="hidden sm:flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Input
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="!h-10 !text-sm !border-gray-700 !bg-gray-800/40 !pr-8"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-sm"
                >
                  \u2715
                </button>
              )}
            </div>
            <button
              onClick={() => setSortNewest(!sortNewest)}
              className="shrink-0 rounded-lg border border-gray-700 bg-gray-800/30 px-4 py-2 text-sm text-gray-500 hover:text-white transition-colors"
            >
              {sortNewest ? "Newest \u2193" : "Oldest \u2191"}
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
                  <div
                    key={log.id}
                    className="group flex items-start gap-2.5 md:gap-3 rounded-lg md:rounded-xl border border-gray-800/30 bg-gray-900/20 px-3 md:px-4 py-2.5 md:py-3 hover:bg-gray-800/20 transition-colors"
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-5 w-5 md:h-6 md:w-6 shrink-0 items-center justify-center rounded-full text-[10px] md:text-xs font-bold",
                        li.bg,
                      )}
                    >
                      {li.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mb-0.5">
                        <span className="text-gray-500 text-xs md:text-sm">
                          {fmt(log.timestamp)}
                        </span>
                        {log.eventType && (
                          <span className="rounded-md bg-gray-800 px-1.5 md:px-2 py-0.5 text-[10px] md:text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {normalizeBotText(log.eventType, "event")}
                          </span>
                        )}
                        {log.phone && (
                          <span className="text-gray-500 text-xs font-mono">
                            {log.phone}
                          </span>
                        )}
                      </div>
                      <p className="text-sm md:text-base text-gray-200 break-words leading-snug md:leading-relaxed [overflow-wrap:anywhere]">
                        {normalizeBotText(log.message, "No message")}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveLog(log.id)}
                      className="mt-0.5 shrink-0 rounded-md p-1.5 text-gray-600 opacity-0 hover:bg-red-500/20 hover:text-red-400 group-hover:opacity-100 transition-all text-xs md:text-sm"
                    >
                      \u2715
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* BILL PAYMENT WHATSAPP LOGS */}
      <Card className="!border-gray-800/60">
        <CardContent className="p-3 md:p-5">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <h2 className="text-sm md:text-lg font-semibold text-white">Bill Payment WhatsApp Logs</h2>
            <Button onClick={fetchBillPaymentLogs} size="sm" variant="outline">Refresh</Button>
          </div>
          {billPaymentLogs.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-600">No bill payment WhatsApp logs yet.</div>
          ) : (
            <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
              {billPaymentLogs.map((log, idx) => (
                <div key={`${log.eventType || "payment"}-${log.paymentId || idx}-${log.createdAt || idx}`} className="rounded border border-gray-800/70 bg-gray-950/40 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-200 truncate">
                        {normalizeBotText(log.eventType, "billing.payment")}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {normalizeBotText(log.customerName, "Customer")} | {normalizeBotText(log.billNumber || log.billId, "Bill")} | {normalizeBotText(log.paymentId, "payment")}
                      </p>
                    </div>
                    <Badge variant="outline" className="border-gray-700 text-gray-300">
                      {normalizeBotText(log.status, "pending")}
                    </Badge>
                  </div>
                  <div className="mt-2 grid gap-1 text-xs text-gray-500 sm:grid-cols-3">
                    <span className="truncate">{log.phone || "No phone"}</span>
                    <span className="truncate">{normalizeBotText(log.recipientType, "customer")}</span>
                    <span className="truncate">{log.createdAt ? fmt(log.createdAt) : "-"}</span>
                  </div>
                  {log.error ? (
                    <p className="mt-2 text-xs text-red-400 break-words [overflow-wrap:anywhere]">
                      {normalizeBotText(log.error, "Unknown error")}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* OFFLINE STATE */}
      {!status && !loading && (
        <Card className="!border-gray-800/60">
          <CardContent className="p-6 md:p-8 text-center">
            <p className="text-base md:text-lg text-gray-600">
              {error ? (
                <span className="text-red-400">{normalizeBotText(error, "Unknown error")}</span>
              ) : (
                "Bot service not reachable."
              )}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
