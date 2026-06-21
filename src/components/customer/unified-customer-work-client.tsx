"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle, CalendarClock, ChevronDown, ClipboardList, Plus,
  Send, UserRound, Wrench, XCircle, CheckCircle2, Clock, X, Wrench as ToolIcon,
} from "lucide-react";
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
import { safeUserName, safeInitial } from "@/lib/display-text";
import { sanityClient } from "@/lib/sanity";
import { workTaskService, type WorkTask } from "@/lib/work-task-service";
import EmptyState from "@/components/ui/empty-state";

/* ─── Types ─── */
type Tab = "all" | "active" | "completed";

type TechnicianOption = { _id: string; name?: string; role?: string };

type RepairRequest = {
  _id: string; requestId: string; details?: string; notes?: string;
  priority?: "average" | "high"; source?: "whatsapp" | "in_chat";
  status?: string; scheduledAt?: string; createdAt?: string;
  cancelledByName?: string; cancelledByRole?: string; cancelledAt?: string;
  technicianName?: string; technician?: { name?: string };
  workTask?: { _id?: string; title?: string; status?: string; dueAt?: string };
};

/* ─── Helpers ─── */
const tabs: { key: Tab; label: string; icon: typeof ClipboardList }[] = [
  { key: "all", label: "All", icon: ClipboardList },
  { key: "active", label: "Active", icon: Clock },
  { key: "completed", label: "Completed", icon: CheckCircle2 },
];

function toLabel(v?: string) { return String(v || "-").replace(/[-_]/g, " ").replace(/\b\w/g, l => l.toUpperCase()); }

function statusBadge(s?: string) {
  const m: Record<string, string> = {
    completed: "border-emerald-500/40 bg-emerald-500/15 text-emerald-200",
    cancelled: "border-gray-500/40 bg-gray-700/40 text-gray-200",
    hold: "border-amber-500/40 bg-amber-500/15 text-amber-200",
    "in-progress": "border-sky-500/40 bg-sky-500/15 text-sky-200",
    pending: "border-slate-500/40 bg-slate-700/40 text-slate-200",
    accepted: "border-emerald-500/40 bg-emerald-500/15 text-emerald-200",
    rejected: "border-rose-500/40 bg-rose-500/15 text-rose-200",
    on_hold: "border-amber-500/40 bg-amber-500/15 text-amber-200",
    added_to_work_list: "border-blue-500/40 bg-blue-500/15 text-blue-200",
  };
  return m[s || ""] || "border-slate-500/40 bg-slate-700/40 text-slate-200";
}

function priorityBadge(p?: string) {
  const m: Record<string, string> = {
    urgent: "border-rose-400/50 bg-rose-500/10 text-rose-100",
    high: "border-orange-400/50 bg-orange-500/10 text-orange-100",
    average: "border-orange-400/50 bg-orange-500/10 text-orange-100",
    medium: "border-blue-400/50 bg-blue-500/10 text-blue-100",
    low: "border-emerald-400/50 bg-emerald-500/10 text-emerald-100",
  };
  return m[p || ""] || "border-slate-500/40 bg-slate-700/40 text-slate-200";
}

const priorityOptions = [
  { value: "average", label: "Average" },
  { value: "high", label: "High" },
];

const initialForm = { details: "", notes: "", priority: "average", source: "in_chat", technicianId: "" };

/* ─── Status indicator animation ─── */
const statusDot = (s?: string) => {
  const colors: Record<string, string> = {
    pending: "bg-gray-400", "in-progress": "bg-sky-400", completed: "bg-emerald-400",
    hold: "bg-amber-400", cancelled: "bg-gray-500", accepted: "bg-emerald-400",
    added_to_work_list: "bg-blue-400",
  };
  return colors[s || ""] || "bg-gray-400";
};

/* ─── Component ─── */
export default function UnifiedCustomerWorkClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>("active");

  const [technicians, setTechnicians] = useState<TechnicianOption[]>([]);
  const [requests, setRequests] = useState<RepairRequest[]>([]);
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(initialForm);
  const [selectedTask, setSelectedTask] = useState<WorkTask | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  /* ─── Data loading ─── */
  const loadData = useCallback(async () => {
    setError("");
    try {
      const [optionsRes, requestsRes] = await Promise.all([
        fetch("/api/repair-requests/options", { cache: "no-store" }),
        fetch("/api/repair-requests", { cache: "no-store" }),
      ]);
      const [optionsJson, requestsJson] = await Promise.all([optionsRes.json(), requestsRes.json()]);
      if (optionsRes.ok && optionsJson?.success) setTechnicians(optionsJson.technicians || []);
      if (requestsRes.ok && requestsJson?.success) setRequests(requestsJson.data || []);

      const nextTasks = await workTaskService.getWorkTasks();
      setTasks(nextTasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const sub = sanityClient.listen('*[_type == "repairRequest"]', {}, { includeResult: false }).subscribe(() => loadData());
    const interval = window.setInterval(() => loadData(), 30000);
    const onFocus = () => loadData();
    window.addEventListener("focus", onFocus);
    return () => { sub.unsubscribe(); window.clearInterval(interval); window.removeEventListener("focus", onFocus); };
  }, [loadData]);

  useEffect(() => {
    const openId = searchParams.get("open");
    if (!openId || loading) return;
    const task = tasks.find(t => String(t._id) === openId);
    if (task) setSelectedTask(task);
  }, [loading, searchParams, tasks]);

  const closeTask = useCallback(() => {
    setSelectedTask(null);
    if (!searchParams.has("open")) return;
    const p = new URLSearchParams(searchParams.toString()); p.delete("open");
    const q = p.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  /* ─── Combine & filter items ─── */
  type UnifiedItem = {
    _id: string; type: "request" | "task"; title: string; subtitle: string;
    status: string; priority?: string; date: string; source?: string;
    details?: string; technician?: string; notes?: string;
    requestId?: string; workTaskId?: string;
    extra: any;
  };

  const allItems = useMemo((): UnifiedItem[] => {
    const items: UnifiedItem[] = [];

    for (const r of requests) {
      items.push({
        _id: r._id, type: "request", title: r.requestId,
        subtitle: safeUserName(r.technicianName || r.technician?.name, "Technician"),
        status: r.status || "pending", priority: r.priority,
        date: r.scheduledAt || r.createdAt || "",
        source: r.source, details: r.details, notes: r.notes,
        technician: r.technicianName || r.technician?.name,
        requestId: r.requestId, extra: r,
      });
    }

    for (const t of tasks) {
      items.push({
        _id: t._id, type: "task", title: t.title,
        subtitle: (t.assignedTechnicianName || t.assignedTechnician?.name || "Technician"),
        status: t.status || "pending", priority: t.priority,
        date: t.dueAt || t.createdAt || "",
        details: t.description, notes: t.completionNotes || t.cancellationReason || (t as any).holdReason,
        technician: t.assignedTechnicianName || t.assignedTechnician?.name,
        workTaskId: t._id, extra: t,
      });
    }

    items.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    return items;
  }, [requests, tasks]);

  const filteredItems = useMemo(() => {
    if (tab === "active") return allItems.filter(i => !["completed", "cancelled", "rejected"].includes(String(i.status)));
    if (tab === "completed") return allItems.filter(i => ["completed", "cancelled"].includes(String(i.status)));
    return allItems;
  }, [allItems, tab]);

  const counts = useMemo(() => ({
    all: allItems.length,
    active: allItems.filter(i => !["completed", "cancelled", "rejected"].includes(String(i.status))).length,
    completed: allItems.filter(i => ["completed"].includes(String(i.status))).length,
  }), [allItems]);

  /* ─── Actions ─── */
  const submitRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (form.details.trim().length < 5) return toast.error("Please add details");
    if (!form.technicianId) return toast.error("Please select a technician");
    setSubmitting(true);
    try {
      const res = await fetch("/api/repair-requests", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) throw new Error(json?.error || "Failed");
      toast.success(`Request created: ${json.data?.requestId || ""}`);
      setForm({ ...initialForm, technicianId: technicians[0]?._id || "" });
      setIsCreateOpen(false);
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally { setSubmitting(false); }
  };

  const cancelRequest = async (r: RepairRequest) => {
    setCancellingId(r._id);
    try {
      const res = await fetch(`/api/repair-requests/${encodeURIComponent(r._id)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) throw new Error(json?.error || "Failed");
      toast.success("Request cancelled");
      loadData();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setCancellingId(null); }
  };

  const updatePriority = (v: string) => setForm(prev => ({ ...prev, priority: v, source: v === "high" ? "whatsapp" : "in_chat" }));

  /* ─── Render ─── */
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Service Requests</h1>
          <p className="text-sm text-gray-400">Request repairs and track your service tasks</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2 shadow-lg shadow-emerald-600/20 bg-emerald-600 hover:bg-emerald-500">
          <Plus className="w-4 h-4" /> New Request
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {([
          { label: "Total", value: counts.all, color: "text-white", border: "border-gray-700" },
          { label: "Active", value: counts.active, color: "text-sky-300", border: "border-sky-500/30" },
          { label: "Completed", value: counts.completed, color: "text-emerald-300", border: "border-emerald-500/30" },
        ] as const).map((stat, i) => (
          <Card key={i} className={`bg-gray-900/60 border ${stat.border} backdrop-blur-sm`}>
            <CardContent className="p-3 sm:p-4">
              <p className={`text-xl sm:text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-400">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900/60 border border-gray-800 rounded-xl p-1">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === key ? "bg-blue-600 text-white shadow-lg" : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
            <span className="text-xs opacity-80">({counts[key]})</span>
          </button>
        ))}
      </div>

      {/* Items list */}
      <Card className="bg-gray-900/80 border-gray-800 backdrop-blur-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading...</div>
          ) : error ? (
            <div className="flex items-center justify-center gap-2 p-8 text-rose-200">
              <AlertCircle className="w-5 h-5" />{error}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={ClipboardList} compact
                title={tab === "active" ? "No active items" : "Nothing here yet"}
                description={tab === "active" ? "Create a repair request to get started" : "Completed items will appear here"}
              />
            </div>
          ) : (
            <div className="divide-y divide-gray-800/50">
              <AnimatePresence>
                {filteredItems.map((item, idx) => {
                  const isExpanded = expandedId === item._id;
                  const isRequest = item.type === "request";
                  const isClosed = ["cancelled", "rejected"].includes(String(item.status));
                  const origRequest = isRequest ? (item.extra as RepairRequest) : null;
                  const hasWorkTask = origRequest?.workTask?._id;
                  const canCancel = isRequest && !["cancelled", "rejected", "added_to_work_list"].includes(String(item.status));

                  return (
                    <motion.div
                      key={item._id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                      className={`p-4 ${isClosed ? "opacity-50" : ""} hover:bg-white/[0.02] transition-colors`}
                    >
                      {/* Mobile trigger */}
                      <button onClick={() => setExpandedId(isExpanded ? null : item._id)}
                        className="sm:hidden flex w-full items-start justify-between gap-3 text-left">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${statusDot(item.status)} shrink-0`} />
                            <p className="text-sm font-semibold text-white truncate">{item.title}</p>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">{item.technician || item.subtitle}</p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <Badge className={statusBadge(item.status)}>{toLabel(item.status)}</Badge>
                            {item.priority && <Badge className={priorityBadge(item.priority)}>{toLabel(item.priority)}</Badge>}
                          </div>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-gray-500 mt-1 transition-transform shrink-0 ${isExpanded ? "rotate-180" : ""}`} />
                      </button>

                      {/* Desktop + mobile expanded */}
                      <div className={`grid transition-[grid-template-rows,opacity] sm:grid-rows-[1fr] sm:opacity-100 ${isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                        <div className="overflow-hidden">
                          <div className="sm:flex sm:items-start sm:justify-between gap-4 pt-2 sm:pt-0">
                            <div className="min-w-0 flex-1">
                              {/* Desktop header */}
                              <div className="hidden sm:flex items-center gap-2 mb-2">
                                <span className={`w-2.5 h-2.5 rounded-full ${statusDot(item.status)}`} />
                                <h3 className="font-semibold text-white">{item.title}</h3>
                                <Badge className={statusBadge(item.status)}>{toLabel(item.status)}</Badge>
                                {item.priority && <Badge className={priorityBadge(item.priority)}>{toLabel(item.priority)}</Badge>}
                                {item.source && <Badge className="border-gray-700 bg-gray-800 text-gray-300 text-[10px]">{toLabel(item.source)}</Badge>}
                              </div>

                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-gray-400 mb-2">
                                <span className="flex items-center gap-1">
                                  {isRequest ? <ToolIcon className="w-3.5 h-3.5 text-gray-500" /> : <Wrench className="w-3.5 h-3.5 text-gray-500" />}
                                  {item.technician || item.subtitle}
                                </span>
                                <span className="flex items-center gap-1">
                                  <CalendarClock className="w-3.5 h-3.5 text-gray-500" />
                                  {item.date ? formatDayDateTime(item.date) : "-"}
                                </span>
                                {isRequest && <span className="inline-flex items-center gap-1 rounded-full border border-gray-700 px-2 py-0.5 text-[10px] text-gray-500">Request</span>}
                                {!isRequest && <span className="inline-flex items-center gap-1 rounded-full border border-blue-700/50 px-2 py-0.5 text-[10px] text-blue-400">Task</span>}
                              </div>

                              {item.details && (
                                <p className="text-sm text-gray-300 bg-gray-800/40 rounded-lg p-3 whitespace-pre-wrap mb-2">{item.details}</p>
                              )}

                              {item.notes && !item.details && (
                                <p className="text-xs text-gray-400 mb-1">{item.notes}</p>
                              )}

                              {/* Status-specific notes */}
                              {(item.extra as any)?.holdReason && (
                                <p className="text-xs text-amber-300 bg-amber-500/10 rounded px-2 py-1 inline-block mb-2">
                                  Hold: {(item.extra as any).holdReason}
                                </p>
                              )}
                              {(item.extra as any)?.cancellationReason && (
                                <p className="text-xs text-rose-300 bg-rose-500/10 rounded px-2 py-1 inline-block mb-2">
                                  Cancelled: {(item.extra as any).cancellationReason}
                                </p>
                              )}
                              {(item.extra as any)?.completionNotes && (
                                <p className="text-xs text-emerald-300 bg-emerald-500/10 rounded px-2 py-1 inline-block mb-2">
                                  Done: {(item.extra as any).completionNotes}
                                </p>
                              )}

                              {/* Linked work task */}
                              {hasWorkTask && origRequest?.workTask?._id && (
                                <button onClick={() => {
                                  const found = tasks.find(t => t._id === origRequest.workTask!._id);
                                  if (found) setSelectedTask(found);
                                }}
                                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mb-2"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  View work task: {origRequest.workTask.title || origRequest.workTask._id}
                                </button>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex sm:flex-col gap-2 mt-3 sm:mt-0 shrink-0">
                              {!isRequest && (
                                <Button variant="outline" size="sm" onClick={() => {
                                  const t = tasks.find(tk => tk._id === item._id);
                                  if (t) setSelectedTask(t);
                                }}
                                  className="border-blue-500/30 bg-blue-500/10 text-blue-200 hover:bg-blue-500/20 text-xs"
                                >
                                  Details
                                </Button>
                              )}
                              {canCancel && (
                                <Button variant="outline" size="sm"
                                  loading={cancellingId === item._id}
                                  onClick={() => origRequest && cancelRequest(origRequest)}
                                  className="border-rose-500/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20 text-xs"
                                >
                                  <XCircle className="w-3 h-3 mr-1" />Cancel
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Create Request Modal ─── */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="New Repair Request" size="xl">
        <form onSubmit={submitRequest} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-gray-200 md:col-span-2">
              Problem Details *
              <Textarea value={form.details}
                onChange={e => setForm(p => ({ ...p, details: e.target.value }))}
                placeholder="Describe the issue, item, location, or symptoms"
                className="min-h-28 border-gray-700 bg-gray-950 text-white" required />
            </label>
            <label className="space-y-2 text-sm font-medium text-gray-200">
              Priority
              <Dropdown options={priorityOptions} value={form.priority}
                onValueChange={updatePriority} placeholder="Select priority" removeSearchForce
                classNameButton="bg-gray-950 hover:bg-gray-900" />
              <span className="block text-xs text-gray-500">
                High priority sends WhatsApp for faster response
              </span>
            </label>
            <label className="space-y-2 text-sm font-medium text-gray-200">
              Technician
              <Dropdown options={technicians.map(t => ({ value: t._id, label: safeUserName(t.name, "Technician") }))}
                value={form.technicianId}
                onValueChange={v => setForm(p => ({ ...p, technicianId: v }))}
                placeholder="Select technician" disabled={technicians.length === 0}
                searchable={technicians.length > 5}
                classNameButton="bg-gray-950 hover:bg-gray-900" />
            </label>
            <label className="space-y-2 text-sm font-medium text-gray-200 md:col-span-2">
              Notes (optional)
              <Input value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Additional notes for the shop"
                className="border-gray-700 bg-gray-950 text-white" />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button type="submit" loading={submitting} disabled={technicians.length === 0}
              className="gap-2 bg-emerald-600 text-white hover:bg-emerald-500">
              <Send className="w-4 h-4" />Submit
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─── Task Detail Modal ─── */}
      <Modal isOpen={!!selectedTask} onClose={closeTask} title={selectedTask?.title || ""} size="sm">
        {selectedTask && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge className={statusBadge(selectedTask.status)}>{toLabel(selectedTask.status)}</Badge>
              <Badge className={priorityBadge(selectedTask.priority)}>{toLabel(selectedTask.priority)}</Badge>
            </div>
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-gray-500 text-xs">Technician</p>
                <p className="text-white">{selectedTask.assignedTechnicianName || selectedTask.assignedTechnician?.name || "-"}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Due</p>
                <p className="text-white">{selectedTask.dueAt ? formatDayDateTime(selectedTask.dueAt) : "-"}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Category</p>
                <p className="text-white capitalize">{toLabel(selectedTask.issueCategory)}</p>
              </div>
              {selectedTask.description && (
                <div className="rounded-lg bg-gray-800/50 p-3 text-gray-200 text-sm">{selectedTask.description}</div>
              )}
              {(selectedTask as any).holdReason && (
                <div className="rounded-lg bg-amber-500/10 p-3 text-amber-200 text-sm">Hold: {(selectedTask as any).holdReason}</div>
              )}
              {selectedTask.cancellationReason && (
                <div className="rounded-lg bg-rose-500/10 p-3 text-rose-200 text-sm">Cancelled: {selectedTask.cancellationReason}</div>
              )}
              {selectedTask.completionNotes && (
                <div className="rounded-lg bg-emerald-500/10 p-3 text-emerald-200 text-sm">Done: {selectedTask.completionNotes}</div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
