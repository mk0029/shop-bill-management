"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CalendarClock, Check, ChevronDown, ClipboardList, PauseCircle, UserRound, Wrench, XCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dropdown } from "@/components/ui/dropdown";
import { Modal } from "@/components/ui/modal";
import { formatDayDateTime } from "@/lib/date-time";
import { safeUserName } from "@/lib/display-text";
import { sanityClient } from "@/lib/sanity";

type RepairRequest = {
  _id: string;
  requestId: string;
  details?: string;
  notes?: string;
  priority?: "average" | "high";
  source?: "whatsapp" | "in_chat";
  status?: string;
  scheduledAt?: string;
  cancelledByName?: string;
  cancelledByRole?: string;
  cancelledAt?: string;
  createdAt?: string;
  customerName?: string;
  customerPhone?: string;
  technicianName?: string;
  customer?: { _id?: string; name?: string; phone?: string; customerId?: string };
  technician?: { _id?: string; name?: string; role?: string; phone?: string };
  workTask?: { _id?: string; title?: string; status?: string; dueAt?: string };
};

function statusClass(status?: string) {
  if (status === "accepted") return "border-emerald-500/40 bg-emerald-500/15 text-emerald-200";
  if (status === "rejected") return "border-rose-500/40 bg-rose-500/15 text-rose-200";
  if (status === "cancelled") return "border-gray-500/40 bg-gray-700/40 text-gray-200";
  if (status === "on_hold") return "border-amber-500/40 bg-amber-500/15 text-amber-200";
  if (status === "added_to_work_list") return "border-blue-500/40 bg-blue-500/15 text-blue-200";
  return "border-slate-500/40 bg-slate-700/40 text-slate-200";
}

function priorityClass(priority?: string) {
  return priority === "high"
    ? "border-orange-500/40 bg-orange-500/15 text-orange-200"
    : "border-slate-500/40 bg-slate-700/40 text-slate-200";
}

function label(value?: string) {
  return String(value || "-").replace(/_/g, " ");
}

function actorRoleLabel(role?: string, fallback = "admin") {
  if (role === "customer") return "customer";
  if (role === "technician") return "technician";
  if (role === "super_admin") return "admin";
  if (role === "admin") return "admin";
  return fallback;
}

function cancelledByText(request: RepairRequest) {
  if (!["cancelled", "rejected"].includes(String(request.status || ""))) return "";
  const fallback = request.status === "cancelled" ? "customer" : "admin";
  const role = actorRoleLabel(request.cancelledByRole, fallback);
  const name = safeUserName(request.cancelledByName, "");
  return name ? `Cancelled by ${role}: ${name}` : `Cancelled by ${role}`;
}

function toDateTimeLocal(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function fromDateTimeLocal(value: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function datePart(value?: string) {
  return String(value || "").slice(0, 10);
}

function timePart(value?: string) {
  return String(value || "").slice(11, 16);
}

function combineLocalDateTime(date: string, time: string) {
  if (!date || !time) return "";
  return `${date}T${time}`;
}

const statusFilterOptions = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "on_hold", label: "On Hold" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
  { value: "added_to_work_list", label: "Added to Work List" },
];

const hourOptions = Array.from({ length: 12 }, (_, index) => String(index + 1));
const minuteOptions = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

function toDisplayTime(value?: string) {
  const raw = timePart(value);
  if (!raw) return "";
  const [hourRaw, minute = "00"] = raw.split(":");
  const hour = Number(hourRaw);
  if (!Number.isFinite(hour)) return "";
  const displayHour = hour % 12 || 12;
  const suffix = hour >= 12 ? "PM" : "AM";
  return `${displayHour}:${minute} ${suffix}`;
}

function toTimeParts(value?: string) {
  const raw = timePart(value) || "10:00";
  const [hourRaw, minuteRaw = "00"] = raw.split(":");
  const hour24 = Number(hourRaw);
  const minute = minuteOptions.includes(minuteRaw) ? minuteRaw : "00";
  const meridiem = hour24 >= 12 ? "PM" : "AM";
  const hour12 = String(hour24 % 12 || 12);
  return { hour12, minute, meridiem };
}

function timeFromParts(hour12: string, minute: string, meridiem: string) {
  let hour = Number(hour12);
  if (!Number.isFinite(hour) || hour < 1 || hour > 12) hour = 10;
  if (meridiem === "AM") {
    if (hour === 12) hour = 0;
  } else if (hour !== 12) {
    hour += 12;
  }
  const clamped = Math.min(21 * 60, Math.max(8 * 60, hour * 60 + Number(minute || 0)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export default function AdminRepairRequestsClient() {
  const [requests, setRequests] = useState<RepairRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingAction, setUpdatingAction] = useState<string | null>(null);
  const [scheduleById, setScheduleById] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState("all");
  const [timePickerRequestId, setTimePickerRequestId] = useState<string | null>(null);
  const [pendingTimeAction, setPendingTimeAction] = useState<string | null>(null);
  const [expandedMobileRequestId, setExpandedMobileRequestId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/repair-requests", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) throw new Error(json?.error || "Failed to load repair requests");
      const nextRequests = (json.data || []) as RepairRequest[];
      setRequests(nextRequests);
      setScheduleById((prev) => {
        const next = { ...prev };
        for (const request of nextRequests) {
          if (!next[request._id]) next[request._id] = toDateTimeLocal(request.scheduledAt);
        }
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load repair requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const sub = sanityClient
      .listen('*[_type == "repairRequest"]', {}, { includeResult: false })
      .subscribe(() => void load());
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => {
      sub.unsubscribe();
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return requests;
    return requests.filter((request) => request.status === statusFilter);
  }, [requests, statusFilter]);

  const counts = useMemo(() => ({
    total: requests.length,
    pending: requests.filter((request) => request.status === "pending").length,
    added: requests.filter((request) => request.status === "added_to_work_list").length,
  }), [requests]);

  const runAction = async (request: RepairRequest, action: string, scheduleOverride?: string, loadingAction?: string) => {
    const scheduleInput = scheduleOverride || scheduleById[request._id] || "";
    const scheduledAt = fromDateTimeLocal(scheduleInput);
    if (["schedule", "accept", "hold"].includes(action) && !scheduledAt) {
      openTimePicker(request, action);
      return;
    }

    const actionKey = `${request._id}:${loadingAction || action}`;
    setUpdatingAction(actionKey);
    try {
      const res = await fetch(`/api/repair-requests/${encodeURIComponent(request._id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, scheduledAt }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) throw new Error(json?.error || "Failed to update repair request");
      toast.success(action === "schedule" ? "Repair time saved" : "Repair request moved to work list");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update repair request");
    } finally {
      setUpdatingAction(null);
    }
  };

  const setQuickSchedule = (request: RepairRequest, kind: "today_1h" | "tomorrow_10" | "next_morning") => {
    const date = new Date();
    if (kind === "today_1h") {
      date.setMinutes(date.getMinutes() + 60);
    } else if (kind === "tomorrow_10") {
      date.setDate(date.getDate() + 1);
      date.setHours(10, 0, 0, 0);
    } else {
      date.setDate(date.getDate() + 1);
      date.setHours(8, 0, 0, 0);
    }
    const nextValue = toDateTimeLocal(date.toISOString());
    setScheduleById((prev) => ({ ...prev, [request._id]: nextValue }));
    void runAction(request, "schedule", nextValue, `schedule-${kind}`);
  };

  const setScheduleDate = (requestId: string, date: string) => {
    setScheduleById((prev) => {
      const current = prev[requestId] || "";
      const time = timePart(current) || "10:00";
      return { ...prev, [requestId]: combineLocalDateTime(date, time) };
    });
  };

  const setScheduleTime = (requestId: string, time: string) => {
    setScheduleById((prev) => {
      const current = prev[requestId] || "";
      const date = datePart(current) || new Date().toISOString().slice(0, 10);
      return { ...prev, [requestId]: combineLocalDateTime(date, time) };
    });
  };

  const openTimePicker = (request: RepairRequest, action: string | null = null) => {
    setScheduleById((prev) => {
      if (prev[request._id]) return prev;
      const date = new Date().toISOString().slice(0, 10);
      return { ...prev, [request._id]: combineLocalDateTime(date, "10:00") };
    });
    setPendingTimeAction(action);
    setTimePickerRequestId(request._id);
  };

  const selectedTimeLabel = (requestId: string) => {
    return toDisplayTime(scheduleById[requestId]);
  };

  const selectedTimeRequest = requests.find((request) => request._id === timePickerRequestId) || null;

  return (
    <div data-dashboard-loaded="true" className="space-y-4 sm:space-y-6">
      <div className="max-sm:hidden">
        <h2 className="text-2xl font-bold text-white">Repair Requests</h2>
        <p className="text-gray-400">Review customer repair requests and convert approved work into tasks.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="border-slate-800 bg-slate-900/70">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-white">{counts.total}</div>
            <div className="text-sm text-gray-400">Total</div>
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900/70">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-slate-100">{counts.pending}</div>
            <div className="text-sm text-gray-400">Pending</div>
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900/70">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-slate-100">{counts.added}</div>
            <div className="text-sm text-gray-400">Work List</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-800 bg-slate-900/70">
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-white">
            <ClipboardList className="h-5 w-5" />
            Requests
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <Dropdown
              options={statusFilterOptions}
              value={statusFilter}
              onValueChange={setStatusFilter}
              removeSearchForce
              className="w-48"
              classNameButton="bg-gray-950 hover:bg-gray-900"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading repair requests...</div>
          ) : error ? (
            <div className="flex items-center justify-center gap-2 p-8 text-rose-200">
              <AlertCircle className="h-5 w-5" />
              {error}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No repair requests found.</div>
          ) : (
            <div className="space-y-3 p-4">
              {filtered.map((request) => {
                const busy = Boolean(updatingAction?.startsWith(`${request._id}:`));
                const hasWorkTask = Boolean(request.workTask?._id);
                const isCancelled = request.status === "cancelled";
                const isClosed = hasWorkTask || ["added_to_work_list", "cancelled", "rejected"].includes(String(request.status || ""));
                const isActionLoading = (action: string) => updatingAction === `${request._id}:${action}`;
                const customerName = safeUserName(request.customerName || request.customer?.name, "Customer");
                const technicianName = safeUserName(request.technicianName || request.technician?.name, "Technician");
                const cancelText = cancelledByText(request);
                const isMobileExpanded = expandedMobileRequestId === request._id;
                const timeHeadline = request.scheduledAt
                  ? formatDayDateTime(request.scheduledAt)
                  : request.createdAt
                    ? formatDayDateTime(request.createdAt)
                    : "Time not set";
                if (isClosed) {
                  return (
                    <article
                      key={request._id}
                      className={`rounded-lg border border-slate-800 bg-slate-950/30 p-0 transition hover:bg-slate-900/50 sm:p-4 ${
                        isCancelled || request.status === "rejected" ? "opacity-60 grayscale" : ""
                      }`}
                    >
                      <button
                        type="button"
                        className="flex w-full items-start justify-between gap-3 p-4 text-left sm:hidden"
                        onClick={() => setExpandedMobileRequestId((prev) => (prev === request._id ? null : request._id))}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-base font-semibold text-white">{request.requestId}</span>
                          <span className="mt-1 block truncate text-xs text-slate-400">
                            {customerName} | {technicianName} | {timeHeadline}
                          </span>
                          <span className="mt-2 flex flex-wrap gap-1.5">
                            <Badge className={statusClass(request.status)}>{label(request.status)}</Badge>
                            <Badge className={priorityClass(request.priority)}>{label(request.priority)}</Badge>
                          </span>
                        </span>
                        <ChevronDown className={`mt-1 h-4 w-4 shrink-0 text-slate-300 transition-transform ${isMobileExpanded ? "rotate-180" : ""}`} />
                      </button>
                      <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out sm:block sm:opacity-100 ${
                        isMobileExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                      }`}>
                      <div className="overflow-hidden p-4 pt-0 sm:overflow-visible sm:p-0">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold text-white">{request.requestId}</h3>
                            <Badge className={statusClass(request.status)}>{label(request.status)}</Badge>
                            <Badge className={priorityClass(request.priority)}>{label(request.priority)}</Badge>
                            <Badge className="border-gray-700 bg-gray-950 text-gray-200">{label(request.source)}</Badge>
                          </div>
                          <div className="mt-3 grid gap-2 text-sm text-slate-300 sm:grid-cols-3">
                            <span className="truncate">Customer: {customerName}</span>
                            <span className="truncate">Technician: {technicianName}</span>
                            <span className="truncate">
                              {request.scheduledAt
                                ? `Assigned: ${formatDayDateTime(request.scheduledAt)}`
                                : request.createdAt
                                  ? `Created: ${formatDayDateTime(request.createdAt)}`
                                  : "Time not set"}
                            </span>
                          </div>
                          {cancelText ? (
                            <p className="mt-2 text-sm font-medium text-slate-400">{cancelText}</p>
                          ) : hasWorkTask ? (
                            <p className="mt-2 text-sm text-blue-200">
                              Moved to Work List. Please check task details in Work List.
                            </p>
                          ) : null}
                        </div>
                        {hasWorkTask ? (
                          <Link
                            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-100 transition hover:bg-blue-500/15"
                            href={`/dashboard/work-list?open=${encodeURIComponent(request.workTask!._id!)}`}
                          >
                            <ClipboardList className="h-4 w-4" />
                            View Task
                          </Link>
                        ) : null}
                      </div>
                      </div>
                      </div>
                    </article>
                  );
                }
                return (
                  <article
                    key={request._id}
                    className={`rounded-lg border border-slate-800 bg-slate-950/25 p-0 transition hover:bg-slate-900/60 sm:p-4 ${
                      isCancelled ? "opacity-55 grayscale" : ""
                    }`}
                  >
                    <button
                      type="button"
                      className="flex w-full items-start justify-between gap-3 p-4 text-left sm:hidden"
                      onClick={() => setExpandedMobileRequestId((prev) => (prev === request._id ? null : request._id))}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-base font-semibold text-white">{request.requestId}</span>
                        <span className="mt-1 block truncate text-xs text-slate-400">
                          {customerName} | {technicianName} | {timeHeadline}
                        </span>
                        <span className="mt-2 flex flex-wrap gap-1.5">
                          <Badge className={statusClass(request.status)}>{label(request.status)}</Badge>
                          <Badge className={priorityClass(request.priority)}>{label(request.priority)}</Badge>
                          <Badge className="border-gray-700 bg-gray-950 text-gray-200">{label(request.source)}</Badge>
                        </span>
                      </span>
                      <ChevronDown className={`mt-1 h-4 w-4 shrink-0 text-slate-300 transition-transform ${isMobileExpanded ? "rotate-180" : ""}`} />
                    </button>
                    <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out sm:block sm:opacity-100 ${
                      isMobileExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                    }`}>
                    <div className="overflow-hidden p-4 pt-0 sm:overflow-visible sm:p-0">
                    <div className="grid gap-4 xl:grid-cols-[17rem_minmax(0,1fr)_20rem] xl:items-start">
                      <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-white">{request.requestId}</h3>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge className={statusClass(request.status)}>{label(request.status)}</Badge>
                          <Badge className={priorityClass(request.priority)}>{label(request.priority)}</Badge>
                          <Badge className="border-gray-700 bg-gray-950 text-gray-200">{label(request.source)}</Badge>
                        </div>
                        {cancelText ? (
                          <div className="mt-3 rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs font-medium text-slate-300">
                            {cancelText}
                          </div>
                        ) : null}
                        <div className="mt-4 space-y-2 text-sm text-gray-300">
                          <div className="flex items-start gap-2">
                            <UserRound className="h-4 w-4 text-gray-500" />
                            <div className="min-w-0">
                              <div className="truncate text-slate-100">{customerName}</div>
                              {request.customerPhone || request.customer?.phone ? <div className="text-xs text-gray-500">{request.customerPhone || request.customer?.phone}</div> : null}
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <Wrench className="h-4 w-4 text-gray-500" />
                            <div className="min-w-0">
                              <div className="truncate text-slate-100">{technicianName}</div>
                              <div className="text-xs text-gray-500">Selected assignee</div>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <CalendarClock className="h-4 w-4 text-gray-500" />
                            <div>
                              <div className="text-slate-100">{request.createdAt ? formatDayDateTime(request.createdAt) : "-"}</div>
                              <div className="text-xs text-gray-500">Created</div>
                            </div>
                          </div>
                          <div className="rounded-md border border-slate-800 bg-slate-950/50 px-3 py-2">
                            <div className="text-xs uppercase tracking-wide text-gray-500">Assigned time</div>
                            <div className="mt-1 text-slate-100">{request.scheduledAt ? formatDayDateTime(request.scheduledAt) : "Not set"}</div>
                          </div>
                        </div>
                      </div>

                      <div className="min-w-0 rounded-lg border border-slate-800 bg-slate-950/30 p-3">
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Request details</div>
                        <p className="mt-3 whitespace-pre-wrap rounded-md border border-slate-800 bg-slate-950/70 p-3 text-sm text-gray-200">{request.details}</p>
                        {request.notes ? <p className="mt-2 rounded-md border border-slate-800 bg-slate-950/40 p-3 text-sm text-gray-300">Notes: {request.notes}</p> : null}
                        {request.workTask?._id ? (
                          <Link
                            href={`/dashboard/work-list?open=${encodeURIComponent(request.workTask._id)}`}
                            className="mt-2 inline-flex text-sm text-blue-200 underline-offset-4 hover:underline"
                          >
                            View work task: {request.workTask.title || request.workTask._id}
                          </Link>
                        ) : null}
                      </div>

                      <div className="w-full rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                        {hasWorkTask ? (
                          <div className="space-y-3">
                            <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Work task</div>
                            <p className="text-sm text-slate-300">Please check task details in Work List.</p>
                            <Link
                              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-sm font-medium text-blue-100 transition hover:bg-blue-500/15"
                              href={`/dashboard/work-list?open=${encodeURIComponent(request.workTask!._id!)}`}
                            >
                              <ClipboardList className="h-4 w-4" />
                              View Task
                            </Link>
                          </div>
                        ) : (
                          <>
                            <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Assign time</div>
                            <div className="mt-2 grid grid-cols-[1fr_9rem] gap-2">
                              <input
                                type="date"
                                value={datePart(scheduleById[request._id])}
                                onChange={(event) => setScheduleDate(request._id, event.target.value)}
                                className="h-[42px] rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none"
                                disabled={busy}
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                type="button"
                                onClick={() => openTimePicker(request)}
                                disabled={busy}
                                className="h-[42px] justify-between border-slate-700 bg-slate-950 px-3 text-slate-200 hover:bg-slate-900"
                              >
                                {selectedTimeLabel(request._id) ? "Update time" : "Select time"}
                              </Button>
                            </div>
                            {selectedTimeLabel(request._id) ? (
                              <div className="mt-1 text-xs text-slate-400">Selected: {selectedTimeLabel(request._id)}</div>
                            ) : null}
                            <div className="mt-2 grid grid-cols-3 gap-1.5">
                              <Button variant="outline" size="xs" loading={isActionLoading("schedule-today_1h")} disabled={busy} onClick={() => setQuickSchedule(request, "today_1h")} className="border-slate-700 bg-slate-950/60 text-slate-200 hover:bg-slate-900">
                                +1h
                              </Button>
                              <Button variant="outline" size="xs" loading={isActionLoading("schedule-next_morning")} disabled={busy} onClick={() => setQuickSchedule(request, "next_morning")} className="border-slate-700 bg-slate-950/60 text-slate-200 hover:bg-slate-900">
                                8 AM
                              </Button>
                              <Button variant="outline" size="xs" loading={isActionLoading("schedule-tomorrow_10")} disabled={busy} onClick={() => setQuickSchedule(request, "tomorrow_10")} className="border-slate-700 bg-slate-950/60 text-slate-200 hover:bg-slate-900">
                                10 AM
                              </Button>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <Button variant="outline" size="sm" loading={isActionLoading("accept")} disabled={busy} onClick={() => void runAction(request, "accept")} className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15">
                                <Check className="h-4 w-4" />
                                Accept
                              </Button>
                              <Button variant="outline" size="sm" loading={isActionLoading("hold")} disabled={busy} onClick={() => void runAction(request, "hold")} className="gap-1 border-slate-700 bg-slate-950/60 text-slate-200 hover:bg-slate-900">
                                <PauseCircle className="h-4 w-4" />
                                Hold
                              </Button>
                              <Button variant="outline" size="sm" loading={isActionLoading("reject")} disabled={busy} onClick={() => void runAction(request, "reject")} className="gap-1 border-rose-500/30 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15">
                                <XCircle className="h-4 w-4" />
                                Reject
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={Boolean(selectedTimeRequest)}
        onClose={() => {
          setTimePickerRequestId(null);
          setPendingTimeAction(null);
        }}
        title={selectedTimeRequest && selectedTimeLabel(selectedTimeRequest._id) ? "Update time" : "Select time"}
        size="sm"
      >
        {selectedTimeRequest ? (
          <div className="space-y-4">
            {(() => {
              const parts = toTimeParts(scheduleById[selectedTimeRequest._id]);
              const updatePart = (next: Partial<typeof parts>) => {
                const merged = { ...parts, ...next };
                setScheduleTime(
                  selectedTimeRequest._id,
                  timeFromParts(merged.hour12, merged.minute, merged.meridiem),
                );
              };
              return (
                <>
                  <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-800 bg-slate-950/40 p-1">
                    {["AM", "PM"].map((item) => (
                      <Button
                        key={item}
                        variant="outline"
                        className={`border-transparent bg-transparent text-slate-200 hover:bg-slate-900 ${
                          parts.meridiem === item ? "border-blue-500/40 bg-blue-500/10 text-blue-100" : ""
                        }`}
                        onClick={() => updatePart({ meridiem: item })}
                      >
                        {item}
                      </Button>
                    ))}
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Hour</div>
                      <div className="grid grid-cols-4 gap-2">
                        {hourOptions.map((hour) => (
                          <Button
                            key={hour}
                            variant="outline"
                            className={`border-slate-700 bg-slate-950 text-slate-100 hover:bg-slate-900 ${
                              parts.hour12 === hour ? "border-blue-500/60 bg-blue-500/10" : ""
                            }`}
                            onClick={() => updatePart({ hour12: hour })}
                          >
                            {hour}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Minutes</div>
                      <div className="grid grid-cols-4 gap-2">
                        {minuteOptions.map((minute) => (
                          <Button
                            key={minute}
                            variant="outline"
                            className={`border-slate-700 bg-slate-950 text-slate-100 hover:bg-slate-900 ${
                              parts.minute === minute ? "border-blue-500/60 bg-blue-500/10" : ""
                            }`}
                            onClick={() => updatePart({ minute })}
                          >
                            {minute}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm">
                    <span className="text-slate-400">Selected</span>
                    <span className="font-semibold text-white">{toDisplayTime(scheduleById[selectedTimeRequest._id])}</span>
                  </div>
                  <Button
                    loading={updatingAction === `${selectedTimeRequest._id}:${pendingTimeAction || "schedule"}`}
                    className="w-full bg-blue-600 text-white hover:bg-blue-500"
                    onClick={async () => {
                      const action = pendingTimeAction || "schedule";
                      await runAction(selectedTimeRequest, action);
                      setTimePickerRequestId(null);
                      setPendingTimeAction(null);
                    }}
                  >
                    Save Time
                  </Button>
                </>
              );
            })()}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
