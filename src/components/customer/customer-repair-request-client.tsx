"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CalendarClock, CheckCircle2, ChevronDown, ClipboardList, Plus, Send, UserRound, XCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dropdown } from "@/components/ui/dropdown";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { formatDayDateTime } from "@/lib/date-time";
import { safeUserName } from "@/lib/display-text";
import { sanityClient } from "@/lib/sanity";

type TechnicianOption = {
  _id: string;
  name?: string;
  role?: string;
};

type RepairRequest = {
  _id: string;
  requestId: string;
  details?: string;
  notes?: string;
  priority?: "average" | "high";
  source?: "whatsapp" | "in_chat";
  status?: string;
  scheduledAt?: string;
  createdAt?: string;
  cancelledByName?: string;
  cancelledByRole?: string;
  cancelledAt?: string;
  technicianName?: string;
  technician?: { name?: string };
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

function actorRoleLabel(role?: string, fallback = "customer") {
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

const priorityOptions = [
  { value: "average", label: "Average" },
  { value: "high", label: "High" },
];

const initialForm = {
  details: "",
  notes: "",
  priority: "average",
  source: "in_chat",
  technicianId: "",
};

export default function CustomerRepairRequestClient() {
  const [technicians, setTechnicians] = useState<TechnicianOption[]>([]);
  const [requests, setRequests] = useState<RepairRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(initialForm);
  const [expandedMobileRequestId, setExpandedMobileRequestId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const [optionsRes, requestsRes] = await Promise.all([
        fetch("/api/repair-requests/options", { cache: "no-store" }),
        fetch("/api/repair-requests", { cache: "no-store" }),
      ]);
      const [optionsJson, requestsJson] = await Promise.all([optionsRes.json(), requestsRes.json()]);
      if (!optionsRes.ok || !optionsJson?.success) throw new Error(optionsJson?.error || "Failed to load technicians");
      if (!requestsRes.ok || !requestsJson?.success) throw new Error(requestsJson?.error || "Failed to load repair requests");
      setTechnicians(optionsJson.technicians || []);
      setRequests(requestsJson.data || []);
      setForm((prev) => ({
        ...prev,
        technicianId: prev.technicianId || optionsJson.technicians?.[0]?._id || "",
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load repair request data";
      setError(message);
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

  const activeCount = useMemo(
    () => requests.filter((request) => !["rejected", "cancelled", "added_to_work_list"].includes(String(request.status || ""))).length,
    [requests],
  );

  const technicianOptions = useMemo(
    () => technicians.map((technician) => ({
      value: technician._id,
      label: safeUserName(technician.name, "Technician"),
    })),
    [technicians],
  );

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const details = form.details.trim();
    if (details.length < 5) {
      toast.error("Please add repair request details");
      return;
    }
    if (!form.technicianId) {
      toast.error("Please select a mechanic / technician");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/repair-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) throw new Error(json?.error || "Failed to submit repair request");
      toast.success(`Repair request created: ${json.data?.requestId || "Submitted"}`);
      if (json.data?._id) {
        setRequests((prev) => [json.data as RepairRequest, ...prev.filter((item) => item._id !== json.data._id)]);
      }
      setForm({ ...initialForm, technicianId: technicians[0]?._id || "" });
      setIsCreateOpen(false);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit repair request");
    } finally {
      setSubmitting(false);
    }
  };

  const cancelRequest = async (request: RepairRequest) => {
    setCancellingId(request._id);
    try {
      const res = await fetch(`/api/repair-requests/${encodeURIComponent(request._id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) throw new Error(json?.error || "Failed to cancel request");
      toast.success("Repair request cancelled");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel request");
    } finally {
      setCancellingId(null);
    }
  };

  const updatePriority = (value: string) => {
    setForm((prev) => ({
      ...prev,
      priority: value,
      source: value === "high" ? "whatsapp" : "in_chat",
    }));
  };

  return (
    <div data-dashboard-loaded="true" className="space-y-4 sm:space-y-6">
      <div className="max-sm:hidden">
        <h2 className="text-2xl font-bold text-white">Request Repair</h2>
        <p className="text-gray-400">Create a repair request and track its status.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className="border-gray-800 bg-gray-900">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-white">{requests.length}</div>
            <div className="text-sm text-gray-400">Total Requests</div>
          </CardContent>
        </Card>
        <Card className="border-gray-800 bg-gray-900">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-sky-200">{activeCount}</div>
            <div className="text-sm text-gray-400">Active</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2 bg-emerald-600 text-white hover:bg-emerald-500">
          <Plus className="h-4 w-4" />
          Create Repair Request
        </Button>
      </div>

      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="New Repair Request" size="xl">
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-gray-200 md:col-span-2">
                Request info / details
                <Textarea
                  value={form.details}
                  onChange={(event) => setForm((prev) => ({ ...prev, details: event.target.value }))}
                  placeholder="Describe the repair problem, location, item, or symptoms"
                  className="min-h-28 border-gray-700 bg-gray-950 text-white"
                  required
                />
              </label>
              <label className="space-y-2 text-sm font-medium text-gray-200">
                Priority
                <Dropdown
                  options={priorityOptions}
                  value={form.priority}
                  onValueChange={updatePriority}
                  placeholder="Select priority"
                  removeSearchForce
                  classNameButton="bg-gray-950 hover:bg-gray-900"
                />
                <span className="block text-xs text-slate-400">
                  Average requests notify in app. High priority requests notify in app and WhatsApp, and may include extra charges.
                </span>
              </label>
              <label className="space-y-2 text-sm font-medium text-gray-200">
                Mechanic / Technician
                <Dropdown
                  options={technicianOptions}
                  value={form.technicianId}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, technicianId: value }))}
                  placeholder="Select mechanic / technician"
                  disabled={technicianOptions.length === 0}
                  searchable={technicianOptions.length > 5}
                  classNameButton="bg-gray-950 hover:bg-gray-900"
                />
              </label>
              <label className="space-y-2 text-sm font-medium text-gray-200 md:col-span-2">
                Customer notes
                <Input
                  value={form.notes}
                  onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                  placeholder="Optional notes for the admin or technician"
                  className="border-gray-700 bg-gray-950 text-white"
                />
              </label>
            </div>
            <div className="flex justify-end">
              <Button type="submit" loading={submitting} disabled={loading || technicians.length === 0} className="gap-2 bg-emerald-600 text-white hover:bg-emerald-500">
                <Send className="h-4 w-4" />
                Submit Request
              </Button>
            </div>
          </form>
      </Modal>

      <Card className="border-gray-800 bg-gray-900">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-white">
            <ClipboardList className="h-5 w-5" />
            Your Repair Requests
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading repair requests...</div>
          ) : error ? (
            <div className="flex items-center justify-center gap-2 p-8 text-rose-200">
              <AlertCircle className="h-5 w-5" />
              {error}
            </div>
          ) : requests.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No repair requests yet.</div>
          ) : (
            <div className="space-y-3 p-4">
              {requests.map((request) => {
                const isClosed = ["cancelled", "rejected"].includes(String(request.status || ""));
                const cancelText = cancelledByText(request);
                const isExpanded = expandedMobileRequestId === request._id;
                const technicianName = safeUserName(request.technicianName || request.technician?.name, "Technician");
                const updatedTime = request.scheduledAt
                  ? formatDayDateTime(request.scheduledAt)
                  : request.createdAt
                    ? formatDayDateTime(request.createdAt)
                    : "-";
                return (
                <div
                  key={request._id}
                  className={`rounded-lg border border-slate-800 bg-slate-950/25 p-0 transition hover:bg-slate-900/50 sm:p-4 ${
                    isClosed ? "opacity-55 grayscale" : ""
                  }`}
                >
                  <button
                    type="button"
                    className="flex w-full items-start justify-between gap-3 p-4 text-left sm:hidden"
                    onClick={() => setExpandedMobileRequestId((prev) => (prev === request._id ? null : request._id))}
                  >
                    <span className="min-w-0">
                      <span className="block text-base font-semibold leading-5 text-white">{request.requestId}</span>
                      <span className="mt-1 block truncate text-xs leading-5 text-gray-300">
                        {technicianName} | {updatedTime}
                      </span>
                      <span className="mt-2 flex flex-wrap gap-1.5">
                        <Badge className={statusClass(request.status)}>{label(request.status)}</Badge>
                        <Badge className={priorityClass(request.priority)}>{label(request.priority)}</Badge>
                      </span>
                    </span>
                    <ChevronDown className={`mt-1 h-4 w-4 shrink-0 text-gray-300 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </button>
                  <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out sm:block sm:opacity-100 ${
                    isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}>
                  <div className="overflow-hidden p-4 pt-0 sm:overflow-visible sm:p-0">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-white">{request.requestId}</h3>
                        <Badge className={statusClass(request.status)}>{label(request.status)}</Badge>
                        <Badge className={priorityClass(request.priority)}>{label(request.priority)}</Badge>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm text-gray-300">{request.details}</p>
                      {cancelText ? (
                        <p className="mt-2 text-xs font-medium text-slate-400">{cancelText}</p>
                      ) : null}
                    </div>
                    {request.status === "added_to_work_list" && request.workTask?._id ? (
                      <Link
                        href={`/customer/work-tasks?open=${encodeURIComponent(request.workTask._id)}`}
                        className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-xs text-blue-100 transition hover:bg-blue-500/20"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Moved to tasks page
                      </Link>
                    ) : null}
                    {!["cancelled", "rejected", "added_to_work_list"].includes(String(request.status || "")) ? (
                      <Button
                        variant="outline"
                        size="sm"
                        loading={cancellingId === request._id}
                        onClick={() => void cancelRequest(request)}
                        className="gap-1 text-rose-200 hover:text-rose-100"
                      >
                        <XCircle className="h-4 w-4" />
                        Cancel
                      </Button>
                    ) : null}
                  </div>
                  {!isClosed ? (
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-300">
                      <span className="inline-flex items-center gap-1 rounded-full border border-gray-700 px-2.5 py-1">
                        <UserRound className="h-3.5 w-3.5" />
                        {technicianName}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-gray-700 px-2.5 py-1">
                        <CalendarClock className="h-3.5 w-3.5" />
                        {updatedTime}
                      </span>
                      <span className="rounded-full border border-gray-700 px-2.5 py-1">{label(request.source)}</span>
                    </div>
                  ) : null}
                  {!isClosed && request.notes ? <p className="mt-3 rounded-md bg-gray-950 p-3 text-sm text-gray-300">Notes: {request.notes}</p> : null}
                  </div>
                  </div>
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
