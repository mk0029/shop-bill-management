"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Zap, Loader2, AlertCircle, User, Phone, X } from "lucide-react";
import { NotificationDebug } from "@/components/fcm/notification-debug";
import { FcmTokenButton } from "@/components/fcm/fcm-token-button";
import { NotificationReset } from "@/components/fcm/notification-reset";
import { FcmTestSend } from "@/components/admin/fcm-test-send";
import { AdminNotificationDebug } from "@/components/admin/admin-notification-debug";
import NotificationBroadcastModal from "@/components/notifications/NotificationBroadcastModal";
import {
  getTrackedNotifications,
  loadTrackedNotifications,
  clearTrackedNotifications,
  onTrackedNotificationsChange,
  type TrackEntry,
} from "@/lib/notification-tracker";

type Tab = "simulate" | "fcm" | "tracker";
type TrackerFilter = "all" | "fcm";
type TraceStep = { step: string; ts: string; [k: string]: any };

const ROLE_BADGES: Record<string, string> = {
  customer: "bg-blue-900 text-blue-300",
  admin: "bg-amber-900 text-amber-300",
  super_admin: "bg-red-900 text-red-300",
  technician: "bg-purple-900 text-purple-300",
};

const CHANNEL_COLORS: Record<string, string> = {
  fcm: "text-blue-400",
  socket: "text-purple-400",
};

function TraceView({ trace }: { trace: TraceStep[] }) {
  if (!trace?.length) return null;
  return (
    <div className="mt-3 space-y-2">
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
        Trace ({trace.length} steps)
      </div>
      {trace.map((step, i) => (
        <div
          key={i}
          className="bg-gray-950 border border-gray-800 rounded-lg p-3"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-blue-400 font-mono text-xs font-bold">
              {i + 1}. {step.step}
            </span>
            <span className="text-gray-600 text-xs ml-auto">
              {step.ts?.split("T")[1]?.split(".")[0]}
            </span>
          </div>
          <pre className="text-green-400 text-xs font-mono whitespace-pre-wrap break-all max-h-48 overflow-auto">
            {JSON.stringify(
              Object.fromEntries(
                Object.entries(step).filter(
                  ([k]) => k !== "step" && k !== "ts",
                ),
              ),
              null,
              2,
            )}
          </pre>
        </div>
      ))}
    </div>
  );
}

function HealthBadge({ ok, label }: { ok: boolean | null; label: string }) {
  if (ok === null)
    return <span className="text-gray-500 text-xs">Not checked</span>;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${ok ? "text-green-400" : "text-red-400"}`}
    >
      <span
        className={`w-2 h-2 rounded-full ${ok ? "bg-green-400" : "bg-red-400"}`}
      />
      {label}
    </span>
  );
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  const ms = String(d.getMilliseconds()).padStart(3, "0");
  return `${y}-${mo}-${da} ${h}:${mi}:${s}.${ms}`;
}

function fmtMs(ts: number) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}.${String(d.getMilliseconds()).padStart(3, "0")}`;
}

const SIM_CATEGORIES = [
  "Customer",
  "Billing",
  "Tool Rental",
  "Work Task",
  "Technician",
  "Offer",
  "Scheduled",
];

function SimulatePanel() {
  const [simEvents, setSimEvents] = useState<
    { key: string; label: string; category: string; channels: string[] }[]
  >([]);
  const [catFilter, setCatFilter] = useState<string>("all");
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [channels, setChannels] = useState<string[]>(["fcm"]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [trace, setTrace] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<
    {
      event: string;
      label: string;
      ts: number;
      ok: boolean;
      channels: string[];
      phone: string;
    }[]
  >([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalPhone, setModalPhone] = useState("");
  const [modalName, setModalName] = useState("");
  const [modalError, setModalError] = useState("");

  const [offers, setOffers] = useState<any[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [offersOpen, setOffersOpen] = useState(false);
  const [offerAction, setOfferAction] = useState<string>("");
  const [offerTarget, setOfferTarget] = useState<any>(null);
  const [offerResult, setOfferResult] = useState<any>(null);
  const [offerTrace, setOfferTrace] = useState<any[]>([]);
  const [offerLoading, setOfferLoading] = useState(false);

  useEffect(() => {
    fetch("/api/super/simulate")
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setSimEvents(j.events);
      })
      .catch(() => {});
  }, []);

  function loadOffers() {
    setOffersLoading(true);
    fetch("/api/super/simulate?offers=true")
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setOffers(j.offers || []);
      })
      .catch(() => {})
      .finally(() => setOffersLoading(false));
  }

  async function fireOfferAction(
    action: string,
    offerId: string,
    extra?: Record<string, any>,
  ) {
    setOfferLoading(true);
    setOfferResult(null);
    setOfferTrace([]);
    try {
      const res = await fetch("/api/super/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, offerId, ...extra }),
      });
      const json = await res.json();
      setOfferResult(json);
      const allTrace: any[] = [];
      if (json.trace) allTrace.push(...json.trace);
      setOfferTrace(allTrace);
      if (json.error) setError(json.error);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setOfferLoading(false);
    }
  }

  const filtered =
    catFilter === "all"
      ? simEvents
      : simEvents.filter((e) => e.category === catFilter);
  const selectedMeta = simEvents.find((e) => e.key === selectedEvent);

  function openModal() {
    if (!selectedEvent) return;
    setModalError("");
    setModalOpen(true);
  }

  async function fireSimulate() {
    const phone = modalPhone.replace(/\D/g, "");
    if (!phone || phone.length < 7) {
      setModalError("Enter a valid phone number (min 7 digits)");
      return;
    }
    if (!modalName.trim()) {
      setModalError("Customer name is required");
      return;
    }

    setModalOpen(false);

    // Offer FCM test action
    if (offerAction === "offer.fcmTest" && offerTarget) {
      setOfferLoading(true);
      setOfferResult(null);
      setOfferTrace([]);
      try {
        const res = await fetch("/api/super/simulate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "offer.fcmTest",
            offerId: offerTarget.id,
            customerPhone: phone,
            customerName: modalName.trim(),
          }),
        });
        const json = await res.json();
        setOfferResult(json);
        if (json.trace) setOfferTrace(json.trace);
        if (json.error) setError(json.error);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setOfferLoading(false);
        setOfferAction("");
        setOfferTarget(null);
      }
      return;
    }

    // Standard event simulation
    setLoading(true);
    setResult(null);
    setTrace([]);
    setError("");
    try {
      const res = await fetch("/api/super/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: selectedEvent,
          channels,
          customerPhone: phone,
          customerName: modalName.trim(),
        }),
      });
      const json = await res.json();
      setResult(json);
      const allTrace: any[] = [];
      if (json.results?.fcm?.trace) allTrace.push(...json.results.fcm.trace);
      setTrace(allTrace);
      if (json.error) setError(json.error);
      setHistory((h) =>
        [
          {
            event: selectedEvent,
            label: json.label || selectedEvent,
            ts: Date.now(),
            ok: json.ok,
            channels,
            phone: phone.slice(0, 4) + "****",
          },
          ...h,
        ].slice(0, 50),
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Event Picker */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-orange-400" />
          <span className="font-semibold text-white">Simulate Event</span>
          <span className="text-xs text-orange-400/60 ml-1">
            super admin only
          </span>
        </div>
        <p className="text-xs text-gray-500 -mt-2">
          Real customer phone &amp; name required. Fires actual FCM push.
          No business data saved.
        </p>

        {/* Category chips */}
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setCatFilter("all")}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${catFilter === "all" ? "bg-orange-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}
          >
            All
          </button>
          {SIM_CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCatFilter(c)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${catFilter === c ? "bg-orange-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Event grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {filtered.map((ev) => (
            <button
              key={ev.key}
              onClick={() => setSelectedEvent(ev.key)}
              className={`p-2 rounded text-left text-xs transition-colors ${selectedEvent === ev.key ? "bg-orange-600/30 border border-orange-500" : "bg-gray-800 border border-gray-700 hover:border-gray-500"}`}
            >
              <div className="font-medium text-white truncate">{ev.label}</div>
              <div className="text-gray-500 text-[10px] mt-0.5">{ev.key}</div>
              <div className="flex gap-1 mt-1">
                {ev.channels.includes("fcm") && (
                  <span className="text-[10px] px-1 rounded bg-blue-900/50 text-blue-400">
                    FCM
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Channel toggles + fire button */}
        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-1 text-xs text-gray-400">
            <input
              type="checkbox"
              checked={channels.includes("fcm")}
              onChange={(e) =>
                setChannels((ch) =>
                  e.target.checked
                    ? [...ch, "fcm"]
                    : ch.filter((c) => c !== "fcm"),
                )
              }
              className="w-3.5 h-3.5 rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
            />
            FCM
          </label>
          <button
            onClick={openModal}
            disabled={!selectedEvent || loading || channels.length === 0}
            className="flex items-center gap-1 px-4 py-1.5 rounded bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium disabled:opacity-40 transition-colors"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            {loading ? "Running..." : "Simulate"}
          </button>
          {selectedMeta && (
            <span className="text-xs text-gray-600">
              {selectedMeta.label} — {selectedMeta.channels.join(" + ")}
            </span>
          )}
        </div>
      </div>

      {/* Offers API Panel */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        <button
          onClick={() => {
            setOffersOpen(!offersOpen);
            if (!offersOpen && offers.length === 0) loadOffers();
          }}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-800/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">🎁</span>
            <span className="font-semibold text-white text-sm">Offers API</span>
            <span className="text-xs text-gray-500">
              — real offers from Sanity
            </span>
          </div>
          <span className="text-gray-500 text-xs">
            {offersOpen ? "▲" : "▼"}
          </span>
        </button>

        {offersOpen && (
          <div className="px-4 pb-4 space-y-3 border-t border-gray-800">
            <div className="flex items-center gap-2 pt-3">
              <button
                onClick={loadOffers}
                disabled={offersLoading}
                className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded transition-colors disabled:opacity-40"
              >
                {offersLoading ? "Loading..." : "Refresh Offers"}
              </button>
              <span className="text-xs text-gray-500">
                {offers.length} offer(s) found
              </span>
            </div>

            {offers.length === 0 && !offersLoading && (
              <p className="text-xs text-gray-500">
                No offers in Sanity. Create one from Admin → Offers first.
              </p>
            )}

            {offers.map((offer) => (
              <div
                key={offer.id}
                className="bg-gray-950 border border-gray-800 rounded-lg p-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-white text-sm truncate">
                      {offer.title}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${offer.status === "active" ? "bg-green-900 text-green-400" : offer.status === "inactive" ? "bg-gray-700 text-gray-400" : "bg-yellow-900 text-yellow-400"}`}
                      >
                        {offer.status}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {offer.type}: {offer.discount}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        audience: {offer.audience}
                      </span>
                      {offer.claims > 0 && (
                        <span className="text-[10px] text-gray-500">
                          {offer.claims} claims
                        </span>
                      )}
                      <span
                        className={`text-[10px] ${offer.pushEnabled ? "text-blue-400" : "text-gray-600"}`}
                      >
                        push {offer.pushEnabled ? "ON" : "OFF"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-1.5 flex-wrap">
                  <button
                    onClick={() =>
                      fireOfferAction("offer.liveNotify", offer.id)
                    }
                    disabled={offerLoading}
                    className="text-[11px] bg-blue-900/50 hover:bg-blue-800/50 text-blue-300 px-2.5 py-1 rounded transition-colors disabled:opacity-40"
                  >
                    {offerLoading ? "..." : "Live Notify (FCM)"}
                  </button>
                  <button
                    onClick={() => {
                      setOfferAction("offer.fcmTest");
                      setOfferTarget(offer);
                      setModalOpen(true);
                    }}
                    disabled={offerLoading}
                    className="text-[11px] bg-purple-900/50 hover:bg-purple-800/50 text-purple-300 px-2.5 py-1 rounded transition-colors disabled:opacity-40"
                  >
                    FCM to Phone
                  </button>
                </div>
              </div>
            ))}

            {offerResult && (
              <div
                className={`rounded-lg p-3 text-xs ${offerResult.ok ? "bg-green-950/30 border border-green-900 text-green-400" : "bg-red-950/30 border border-red-900 text-red-400"}`}
              >
                <span className="font-bold">
                  {offerResult.ok ? "OK" : "FAILED"}
                </span>
                {offerResult.offer && (
                  <span className="ml-2 text-gray-400">
                    {offerResult.offer.title}
                  </span>
                )}
                {offerResult.result && (
                  <pre className="mt-1 font-mono text-[10px] whitespace-pre-wrap break-all max-h-32 overflow-auto opacity-80">
                    {JSON.stringify(offerResult.result, null, 2)}
                  </pre>
                )}
              </div>
            )}

            {offerTrace.length > 0 && (
              <div className="space-y-0.5 font-mono text-[10px]">
                {offerTrace.map((t: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 py-0.5">
                    <span className="text-gray-600 w-20 flex-shrink-0">
                      {fmtMs(new Date(t.ts).getTime())}
                    </span>
                    <span className="text-gray-500 w-14 flex-shrink-0">
                      {t.step}
                    </span>
                    <span className="text-gray-400 break-all">
                      {JSON.stringify(t)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Customer Details Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-gray-900 border border-orange-500/40 rounded-xl p-6 w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-white font-semibold">
                  {offerAction === "offer.fcmTest"
                    ? "FCM to Phone"
                    : "Customer Details"}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {offerAction === "offer.fcmTest" ? (
                    <>
                      Sending:{" "}
                      <span className="text-purple-400">
                        {offerTarget?.title}
                      </span>
                    </>
                  ) : (
                    <>
                      Simulating:{" "}
                      <span className="text-orange-400">
                        {selectedMeta?.label}
                      </span>
                    </>
                  )}
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={modalPhone}
                    onChange={(e) => {
                      setModalPhone(e.target.value);
                      setModalError("");
                    }}
                    placeholder="9876543210"
                    autoFocus
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">
                  Customer Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={modalName}
                    onChange={(e) => {
                      setModalName(e.target.value);
                      setModalError("");
                    }}
                    placeholder="Enter real customer name"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {modalError && (
                <div className="flex items-center gap-2 text-red-400 text-xs">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {modalError}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-gray-800 text-gray-400 text-sm font-medium hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={fireSimulate}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium disabled:opacity-40 transition-colors"
                >
                  <Zap className="w-4 h-4" /> Fire Notification
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-950/30 border border-red-900 rounded p-3 text-red-400 text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-white">
              Simulate: {result.label}
            </span>
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${result.ok ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"}`}
            >
              {result.ok ? "OK" : "FAILED"}
            </span>
          </div>
          {result.results &&
            Object.entries(result.results).map(([ch, r]: [string, any]) => (
              <div
                key={ch}
                className={`rounded p-3 text-xs ${ch === "fcm" ? "bg-blue-950/30 border border-blue-900" : "bg-gray-950/30 border border-gray-800"}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`font-medium ${ch === "fcm" ? "text-blue-400" : "text-gray-400"}`}
                  >
                    {ch === "fcm" ? "FCM" : "FCM"}
                  </span>
                  <span className={r.ok ? "text-green-400" : "text-red-400"}>
                    {r.ok ? "Success" : r.error || "Failed"}
                  </span>
                </div>
                {r.trace && (
                  <div className="space-y-1 mt-2">
                    {r.trace.map((t: any, i: number) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-gray-600">
                          {fmtMs(new Date(t.ts).getTime())}
                        </span>
                        <span className="text-gray-400">{t.step}</span>
                        {t.status !== undefined && (
                          <span
                            className={t.ok ? "text-green-400" : "text-red-400"}
                          >
                            HTTP {t.status}
                          </span>
                        )}
                        {t.count !== undefined && (
                          <span className="text-gray-500">
                            {t.count} token(s)
                          </span>
                        )}
                        {t.error && (
                          <span className="text-red-400 truncate max-w-xs">
                            {t.error}
                          </span>
                        )}
                        {t.body && (
                          <span className="text-gray-500 truncate max-w-xs">
                            {JSON.stringify(t.body)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
        </div>
      )}

      {/* Full Trace */}
      {trace.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 space-y-2">
          <span className="text-sm font-semibold text-white">Full Trace</span>
          <div className="space-y-0.5 font-mono text-[11px]">
            {trace.map((t: any, i: number) => (
              <div key={i} className="flex items-start gap-2 py-0.5">
                <span className="text-gray-600 w-24 flex-shrink-0">
                  {fmtMs(new Date(t.ts).getTime())}
                </span>
                <span className="text-gray-500 w-16 flex-shrink-0">
                  {t.step}
                </span>
                <span className="text-gray-400 break-all">
                  {JSON.stringify(t)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-white">
              Simulation History
            </span>
            <span className="text-xs text-gray-500">last {history.length}</span>
          </div>
          <div className="space-y-1">
            {history.map((h, i) => (
              <div key={i} className="flex items-center gap-3 text-xs">
                <span className="text-gray-600 font-mono w-24 flex-shrink-0">
                  {fmtMs(h.ts)}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${h.ok ? "bg-green-900 text-green-400" : "bg-red-900 text-red-400"}`}
                >
                  {h.ok ? "OK" : "FAIL"}
                </span>
                <span className="text-white">{h.label}</span>
                <span className="text-gray-600">{h.phone}</span>
                <span className="text-gray-600">{h.channels.join("+")}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationTrackerPanel() {
  const [entries, setEntries] = useState<TrackEntry[]>([]);
  const [filter, setFilter] = useState<TrackerFilter>("all");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [source, setSource] = useState<"local" | "sanity">("local");
  const [syncing, setSyncing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    if (source === "sanity") {
      setSyncing(true);
      const data = await loadTrackedNotifications({
        channel: filter === "all" ? undefined : (filter as any),
        count: 200,
        fromSanity: true,
      });
      setEntries(data);
      setSyncing(false);
    } else {
      const all = getTrackedNotifications({ count: 200 });
      setEntries(all);
    }
  }, [source, filter]);

  useEffect(() => {
    refresh();
    const unsub = onTrackedNotificationsChange(() => {
      if (source === "local") refresh();
    });
    return unsub;
  }, [refresh, source]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(refresh, 2000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, refresh]);

  const filtered =
    filter === "all" ? entries : entries.filter((e) => e.channel === filter);
  const stats = {
    total: entries.length,
    fcm: entries.filter((e) => e.channel === "fcm").length,
    sent: entries.filter((e) => e.ok && !e.skipped).length,
    failed: entries.filter((e) => !e.ok).length,
    skipped: entries.filter((e) => e.skipped).length,
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-white">{stats.total}</div>
          <div className="text-xs text-gray-400">Total</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-blue-400">{stats.fcm}</div>
          <div className="text-xs text-gray-400">FCM</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-green-400">{stats.sent}</div>
          <div className="text-xs text-gray-400">Sent</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-red-400">{stats.failed}</div>
          <div className="text-xs text-gray-400">Failed</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-yellow-400">
            {stats.skipped}
          </div>
          <div className="text-xs text-gray-400">Skipped</div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 bg-gray-900 rounded-lg p-1">
          {(["all", "fcm"] as TrackerFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filter === f ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white"}`}
            >
              {f === "all" ? "All" : "FCM"}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-gray-900 rounded-lg p-1">
          <button
            onClick={() => setSource("local")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${source === "local" ? "bg-blue-700 text-white" : "text-gray-400 hover:text-white"}`}
          >
            Local
          </button>
          <button
            onClick={() => setSource("sanity")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${source === "sanity" ? "bg-purple-700 text-white" : "text-gray-400 hover:text-white"}`}
          >
            Sanity
          </button>
        </div>
        {syncing && (
          <span className="text-xs text-purple-400 animate-pulse">
            Syncing...
          </span>
        )}
        <button
          onClick={() => setAutoRefresh(!autoRefresh)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${autoRefresh ? "bg-green-900 text-green-300 border border-green-700" : "bg-gray-800 text-gray-400 border border-gray-700"}`}
        >
          {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
        </button>
        <button
          onClick={refresh}
          className="px-3 py-1.5 rounded-md text-xs font-medium bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700"
        >
          Refresh
        </button>
        <button
          onClick={() => {
            clearTrackedNotifications();
            refresh();
          }}
          className="px-3 py-1.5 rounded-md text-xs font-medium bg-red-900 text-red-300 border border-red-700 hover:bg-red-800"
        >
          Clear All
        </button>
      </div>

      {/* Log entries */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        <div className="max-h-[600px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              No notifications tracked yet. Send a WA or FCM notification to see
              it here.
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-900 border-b border-gray-800">
                <tr className="text-left text-gray-400">
                  <th className="px-3 py-2 font-medium">Sync</th>
                  <th className="px-3 py-2 font-medium">Timestamp</th>
                  <th className="px-3 py-2 font-medium">Channel</th>
                  <th className="px-3 py-2 font-medium">Event</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Duration</th>
                  <th className="px-3 py-2 font-medium">Target</th>
                  <th className="px-3 py-2 font-medium">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {filtered.map((entry) => (
                  <tr
                    key={entry.id}
                    className="hover:bg-gray-800/30 transition-colors"
                  >
                    <td className="px-3 py-2">
                      {source === "sanity" ? (
                        <span className="text-green-400">&#10003;</span>
                      ) : entry.synced ? (
                        <span
                          className="text-green-400"
                          title="Synced to Sanity"
                        >
                          &#10003;
                        </span>
                      ) : (
                        <span className="text-gray-600" title="Local only">
                          &#8226;
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-gray-300 whitespace-nowrap">
                      {formatTimestamp(entry.ts)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`font-medium uppercase ${CHANNEL_COLORS[entry.channel] || "text-gray-400"}`}
                      >
                        {entry.channel}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-300 max-w-[200px] truncate">
                      {entry.eventType}
                    </td>
                    <td className="px-3 py-2">
                      {entry.skipped ? (
                        <span className="text-yellow-400 font-medium">
                          skipped
                        </span>
                      ) : entry.ok ? (
                        <span className="text-green-400 font-medium">sent</span>
                      ) : (
                        <span className="text-red-400 font-medium">failed</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-400 font-mono">
                      {entry.durationMs != null ? `${entry.durationMs}ms` : "-"}
                    </td>
                    <td className="px-3 py-2 text-gray-500">
                      {entry.target || "-"}
                    </td>
                    <td className="px-3 py-2 text-red-400 max-w-[200px] truncate">
                      {entry.error || ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export function TestingGroundClient() {
  const [tab, setTab] = useState<Tab>("tracker");
  const [config, setConfig] = useState<any>(null);
  const [healthFCM, setHealthFCM] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [trace, setTrace] = useState<TraceStep[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const res = await fetch("/api/super/testing-ground");
      setConfig(await res.json());
    } catch {}
  };

  const checkHealth = async () => {
    try {
      const res = await fetch(`/api/super/testing-ground?service=fcm`);
      const json = await res.json();
      setHealthFCM(json);
    } catch {}
  };

  const fcmOk = config?.fcm?.hasFirebase;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Testing Ground</h1>
        <p className="text-sm text-gray-400 mt-1">
          Track all FCM notifications with exact timestamps
        </p>
      </div>

      {/* Health */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-white">
              Firebase Cloud Messaging
            </span>
            <HealthBadge
              ok={healthFCM?.ok ?? null}
              label={healthFCM?.ok ? "Auth OK" : "Not Authed"}
            />
          </div>
          <div className="text-xs text-gray-400 space-y-1">
            <div>
              Firebase:{" "}
              <span className={fcmOk ? "text-green-400" : "text-red-400"}>
                {config?.fcm?.hasFirebase ? "CONFIGURED" : "MISSING"}
              </span>
            </div>
            <div>
              Project:{" "}
              <span className="text-gray-300">
                {config?.fcm?.projectId || "..."}
              </span>
            </div>
          </div>
          <button
            onClick={checkHealth}
            className="mt-2 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1 rounded"
          >
            Check Auth
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 rounded-lg p-1 w-fit">
        <button
          onClick={() => {
            setTab("simulate");
            setResult(null);
            setTrace(null);
            setError(null);
          }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === "simulate" ? "bg-orange-600 text-white" : "text-gray-400 hover:text-white"}`}
        >
          Simulate
        </button>
        <button
          onClick={() => {
            setTab("tracker");
            setResult(null);
            setTrace(null);
            setError(null);
          }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === "tracker" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"}`}
        >
          Tracker
        </button>
        <button
          onClick={() => {
            setTab("fcm");
            setResult(null);
            setTrace(null);
            setError(null);
          }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === "fcm" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}
        >
          FCM Push
        </button>
      </div>

      {/* Simulate Panel */}
      {tab === "simulate" && <SimulatePanel />}

      {/* Tracker Panel */}
      {tab === "tracker" && <NotificationTrackerPanel />}

      {/* FCM Panel */}
      {tab === "fcm" && (
        <div className="space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
            <button
              onClick={() => setComposerOpen(true)}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-md text-sm transition-colors"
            >
              Compose & Send Notification
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <NotificationDebug />
            <FcmTestSend />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AdminNotificationDebug />
            <div className="space-y-4">
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-white mb-3">
                  This Device Token
                </h3>
                <FcmTokenButton />
              </div>
              <NotificationReset />
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-950 border border-red-800 text-red-300 rounded-lg p-4 text-sm">
          <span className="font-bold">Error:</span> {error}
        </div>
      )}

      {/* Result */}
      {result && !error && (
        <div
          className={`rounded-lg p-4 text-sm ${result.ok ? "bg-green-950 border border-green-800 text-green-300" : "bg-red-950 border border-red-800 text-red-300"}`}
        >
          <span className="font-bold">{result.ok ? "Success" : "Failed"}</span>
          {result.response && (
            <pre className="mt-2 text-xs font-mono whitespace-pre-wrap break-all max-h-40 overflow-auto opacity-80">
              {JSON.stringify(result.response, null, 2)}
            </pre>
          )}
        </div>
      )}

      {trace && <TraceView trace={trace} />}

      {/* Broadcast Modal */}
      <NotificationBroadcastModal
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
      />
    </div>
  );
}
