"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CalendarClock, CheckCircle2, ClipboardList, RefreshCcw, Send, UserRound, Wrench } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dropdown } from "@/components/ui/dropdown";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatDayDateTime } from "@/lib/date-time";
import { safeUserName } from "@/lib/display-text";

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
  technicianName?: string;
  technician?: { name?: string };
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

const priorityOptions = [
  { value: "average", label: "Average" },
  { value: "high", label: "High" },
];

const sourceOptions = [
  { value: "in_chat", label: "In-chat" },
  { value: "whatsapp", label: "WhatsApp" },
];

export default function CustomerRepairRequestClient() {
  const [technicians, setTechnicians] = useState<TechnicianOption[]>([]);
  const [requests, setRequests] = useState<RepairRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    details: "",
    notes: "",
    priority: "average",
    source: "in_chat",
    technicianId: "",
  });

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
  }, [load]);

  const activeCount = useMemo(
    () => requests.filter((request) => !["rejected", "added_to_work_list"].includes(String(request.status || ""))).length,
    [requests],
  );

  const technicianOptions = useMemo(
    () => technicians.map((technician) => ({
      value: technician._id,
      label: `${safeUserName(technician.name, "Technician")} (${label(technician.role)})`,
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
      setForm((prev) => ({ ...prev, details: "", notes: "" }));
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit repair request");
    } finally {
      setSubmitting(false);
    }
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

      <Card className="border-gray-800 bg-gray-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Wrench className="h-5 w-5" />
            New Repair Request
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                  onValueChange={(value) => setForm((prev) => ({ ...prev, priority: value }))}
                  placeholder="Select priority"
                  removeSearchForce
                  classNameButton="bg-gray-950 hover:bg-gray-900"
                />
                <span className="block text-xs text-amber-200">High priority tasks may include extra charges.</span>
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
              <label className="space-y-2 text-sm font-medium text-gray-200">
                Request source
                <Dropdown
                  options={sourceOptions}
                  value={form.source}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, source: value }))}
                  placeholder="Select source"
                  removeSearchForce
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
        </CardContent>
      </Card>

      <Card className="border-gray-800 bg-gray-900">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-white">
            <ClipboardList className="h-5 w-5" />
            Your Repair Requests
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => void load()} className="gap-2 text-gray-300">
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
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
            <div className="divide-y divide-gray-800">
              {requests.map((request) => (
                <div key={request._id} className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-white">{request.requestId}</h3>
                        <Badge className={statusClass(request.status)}>{label(request.status)}</Badge>
                        <Badge className={priorityClass(request.priority)}>{label(request.priority)}</Badge>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm text-gray-300">{request.details}</p>
                    </div>
                    {request.status === "added_to_work_list" ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/40 px-2.5 py-1 text-xs text-blue-100">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Work list
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-300">
                    <span className="inline-flex items-center gap-1 rounded-full border border-gray-700 px-2.5 py-1">
                      <UserRound className="h-3.5 w-3.5" />
                      {safeUserName(request.technicianName || request.technician?.name, "Technician")}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-gray-700 px-2.5 py-1">
                      <CalendarClock className="h-3.5 w-3.5" />
                      {request.scheduledAt ? formatDayDateTime(request.scheduledAt) : request.createdAt ? formatDayDateTime(request.createdAt) : "-"}
                    </span>
                    <span className="rounded-full border border-gray-700 px-2.5 py-1">{label(request.source)}</span>
                  </div>
                  {request.notes ? <p className="mt-3 rounded-md bg-gray-950 p-3 text-sm text-gray-300">Notes: {request.notes}</p> : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
