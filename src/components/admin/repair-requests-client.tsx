"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CalendarClock, Check, ClipboardList, PauseCircle, RefreshCcw, UserRound, Wrench, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dropdown } from "@/components/ui/dropdown";
import { formatDayDateTime } from "@/lib/date-time";
import { safeUserName } from "@/lib/display-text";

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

const statusFilterOptions = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "on_hold", label: "On Hold" },
  { value: "rejected", label: "Rejected" },
  { value: "added_to_work_list", label: "Added to Work List" },
];

export default function AdminRepairRequestsClient() {
  const [requests, setRequests] = useState<RepairRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [scheduleById, setScheduleById] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState("all");

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

  const runAction = async (request: RepairRequest, action: string) => {
    const scheduleInput = scheduleById[request._id] || "";
    const scheduledAt = fromDateTimeLocal(scheduleInput);
    if ((action === "schedule" || action === "add_to_work_list") && !scheduledAt) {
      toast.error("Please select an assigned time first");
      return;
    }

    setUpdatingId(request._id);
    try {
      const res = await fetch(`/api/repair-requests/${encodeURIComponent(request._id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, scheduledAt }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) throw new Error(json?.error || "Failed to update repair request");
      toast.success(action === "add_to_work_list" ? "Added to work list" : "Repair request updated");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update repair request");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div data-dashboard-loaded="true" className="space-y-4 sm:space-y-6">
      <div className="max-sm:hidden">
        <h2 className="text-2xl font-bold text-white">Repair Requests</h2>
        <p className="text-gray-400">Review customer repair requests and convert approved work into tasks.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="border-gray-800 bg-gray-900">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-white">{counts.total}</div>
            <div className="text-sm text-gray-400">Total</div>
          </CardContent>
        </Card>
        <Card className="border-gray-800 bg-gray-900">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-amber-200">{counts.pending}</div>
            <div className="text-sm text-gray-400">Pending</div>
          </CardContent>
        </Card>
        <Card className="border-gray-800 bg-gray-900">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-200">{counts.added}</div>
            <div className="text-sm text-gray-400">Work List</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-gray-800 bg-gray-900">
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
            <Button variant="ghost" size="sm" onClick={() => void load()} className="gap-2 text-gray-300">
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </Button>
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
            <div className="divide-y divide-gray-800">
              {filtered.map((request) => {
                const busy = updatingId === request._id;
                const isConverted = request.status === "added_to_work_list";
                const customerName = safeUserName(request.customerName || request.customer?.name, "Customer");
                const technicianName = safeUserName(request.technicianName || request.technician?.name, "Technician");
                return (
                  <article key={request._id} className="p-4">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-white">{request.requestId}</h3>
                          <Badge className={statusClass(request.status)}>{label(request.status)}</Badge>
                          <Badge className={priorityClass(request.priority)}>{label(request.priority)}</Badge>
                          <Badge className="border-gray-700 bg-gray-950 text-gray-200">{label(request.source)}</Badge>
                        </div>
                        <div className="mt-3 grid gap-2 text-sm text-gray-300 sm:grid-cols-2 xl:grid-cols-4">
                          <span className="inline-flex items-center gap-2">
                            <UserRound className="h-4 w-4 text-gray-500" />
                            {customerName}
                            {request.customerPhone || request.customer?.phone ? <span className="text-gray-500">({request.customerPhone || request.customer?.phone})</span> : null}
                          </span>
                          <span className="inline-flex items-center gap-2">
                            <Wrench className="h-4 w-4 text-gray-500" />
                            {technicianName}
                          </span>
                          <span className="inline-flex items-center gap-2">
                            <CalendarClock className="h-4 w-4 text-gray-500" />
                            {request.createdAt ? formatDayDateTime(request.createdAt) : "-"}
                          </span>
                          <span className="inline-flex items-center gap-2">
                            Assigned: {request.scheduledAt ? formatDayDateTime(request.scheduledAt) : "Not set"}
                          </span>
                        </div>
                        <p className="mt-3 whitespace-pre-wrap rounded-md bg-gray-950 p-3 text-sm text-gray-200">{request.details}</p>
                        {request.notes ? <p className="mt-2 rounded-md border border-gray-800 p-3 text-sm text-gray-300">Notes: {request.notes}</p> : null}
                        {request.workTask?._id ? (
                          <p className="mt-2 text-sm text-blue-200">Work task: {request.workTask.title || request.workTask._id}</p>
                        ) : null}
                      </div>

                      <div className="w-full space-y-2 xl:w-80">
                        <label className="block text-xs font-medium uppercase tracking-wide text-gray-400">
                          Select / assign time
                          <input
                            type="datetime-local"
                            value={scheduleById[request._id] || ""}
                            onChange={(event) => setScheduleById((prev) => ({ ...prev, [request._id]: event.target.value }))}
                            className="mt-1 h-10 w-full rounded-md border border-gray-700 bg-gray-950 px-3 text-sm normal-case text-white outline-none"
                            disabled={isConverted || busy}
                          />
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <Button variant="outline" size="sm" loading={busy} disabled={isConverted} onClick={() => void runAction(request, "schedule")}>
                            Save Time
                          </Button>
                          <Button size="sm" loading={busy} disabled={isConverted} onClick={() => void runAction(request, "accept")} className="gap-1 bg-emerald-600 text-white hover:bg-emerald-500">
                            <Check className="h-4 w-4" />
                            Accept
                          </Button>
                          <Button variant="outline" size="sm" loading={busy} disabled={isConverted} onClick={() => void runAction(request, "hold")} className="gap-1">
                            <PauseCircle className="h-4 w-4" />
                            Hold
                          </Button>
                          <Button variant="destructive" size="sm" loading={busy} disabled={isConverted} onClick={() => void runAction(request, "reject")} className="gap-1">
                            <XCircle className="h-4 w-4" />
                            Reject
                          </Button>
                        </div>
                        <Button
                          size="sm"
                          loading={busy}
                          disabled={isConverted}
                          onClick={() => void runAction(request, "add_to_work_list")}
                          className="w-full gap-2 bg-blue-600 text-white hover:bg-blue-500"
                        >
                          <ClipboardList className="h-4 w-4" />
                          Add to Work List
                        </Button>
                        <p className="text-xs text-gray-500">Adding to work list skips WhatsApp notification for this conversion only.</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
