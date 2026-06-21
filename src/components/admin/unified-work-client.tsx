"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle, CalendarClock, Check, CheckCircle2, ChevronDown,
  ClipboardList, Clock, Inbox, PauseCircle, Plus, RefreshCw,
  UserRound, Wrench, XCircle, History, Play, Trash2, Edit,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dropdown } from "@/components/ui/dropdown";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { SelectField } from "@/components/ui/select-field";
import CustomerAutocomplete from "@/components/ui/customer-autocomplete";
import { formatDayDateTime } from "@/lib/date-time";
import { safeUserName, safeInitial } from "@/lib/display-text";
import { sanityClient } from "@/lib/sanity";
import { sanityApiService } from "@/lib/sanity-api-service";
import { workTaskService, listenWorkTasks, type WorkTask } from "@/lib/work-task-service";
import EmptyState from "@/components/ui/empty-state";
import { ResponsiveAccordion } from "@/components/ui/responsive-accordion";

/* ─── Types ─── */
type Tab = "incoming" | "active" | "history";

type RepairRequest = {
  _id: string; requestId: string; details?: string; notes?: string;
  priority?: "average" | "high"; source?: "whatsapp" | "in_chat";
  status?: string; scheduledAt?: string; createdAt?: string;
  cancelledByName?: string; cancelledByRole?: string; cancelledAt?: string;
  customerName?: string; customerPhone?: string; technicianName?: string;
  customer?: { _id?: string; name?: string; phone?: string; customerId?: string };
  technician?: { _id?: string; name?: string; role?: string; phone?: string };
  workTask?: { _id?: string; title?: string; status?: string; dueAt?: string };
};

type FormState = {
  title: string; description: string; customerRefId: string;
  assignedTechnicianId: string; priority: string; status: string;
  issueCategory: string; dueAt: string; completionNotes: string;
  cancellationReason: string; holdReason: string;
};

const initialForm: FormState = {
  title: "", description: "", customerRefId: "", assignedTechnicianId: "",
  priority: "medium", status: "pending", issueCategory: "repair",
  dueAt: "", completionNotes: "", cancellationReason: "", holdReason: "",
};

/* ─── Helpers ─── */
const tabs: { key: Tab; label: string; icon: typeof Inbox }[] = [
  { key: "incoming", label: "Incoming", icon: Inbox },
  { key: "active", label: "Active Jobs", icon: ClipboardList },
  { key: "history", label: "History", icon: History },
];

const statusOptions = ["pending", "in-progress", "completed", "hold", "cancelled"] as const;
const priorityOptions = ["low", "medium", "high", "urgent"] as const;
const categoryOptions = ["repair", "fitting", "wiring", "delivery", "payment", "other"] as const;

function toLabel(v?: string) { return String(v || "-").replace(/[-_]/g, " ").replace(/\b\w/g, l => l.toUpperCase()); }

function nowLocal() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; }
function getDate(v?: string) { return v?.split("T")[0] || ""; }
function getTime(v?: string) { return v?.split("T")[1]?.slice(0, 5) || ""; }
function toInput(v?: string) { if (!v) return ""; const d = new Date(v); if (isNaN(d.getTime())) return ""; return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; }

function statusBadge(s?: string) {
  const m: Record<string, string> = {
    pending: "border-red-400/45 bg-red-500/10 text-red-100",
    "in-progress": "border-yellow-400/45 bg-yellow-500/10 text-yellow-100",
    completed: "border-green-400/45 bg-green-500/10 text-green-100",
    hold: "border-amber-400/45 bg-amber-500/10 text-amber-100",
    cancelled: "border-slate-400/45 bg-slate-500/10 text-slate-200",
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

function taskCardBorder(s?: string) {
  const m: Record<string, string> = {
    pending: "border-red-500/35 bg-red-500/10",
    "in-progress": "border-yellow-500/40 bg-yellow-400/12",
    completed: "border-green-500/35 bg-green-500/10",
    hold: "border-amber-500/35 bg-amber-500/10",
    cancelled: "border-slate-500/30 bg-slate-500/10",
  };
  return m[s || ""] || "border-gray-800 bg-gray-950/60";
}

/* ─── Component ─── */
export default function UnifiedWorkClient() {
  const router = useRouter(); const pathname = usePathname(); const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>("incoming");
  const [users, setUsers] = useState<any[]>([]);
  const [requests, setRequests] = useState<RepairRequest[]>([]);
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [taskFilters, setTaskFilters] = useState({ status: "", priority: "", date: "" });
  const [showForm, setShowForm] = useState(false); const [saving, setSaving] = useState(false);
  const [editingTask, setEditingTask] = useState<WorkTask | null>(null);
  const [activeTask, setActiveTask] = useState<WorkTask | null>(null);
  const [actionTask, setActionTask] = useState<WorkTask | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteTask, setDeleteTask] = useState<WorkTask | null>(null);
  const [holdTarget, setHoldTarget] = useState<WorkTask | null>(null);
  const [holdReason, setHoldReason] = useState("");
  const [form, setForm] = useState<FormState>(initialForm);
  const [updatingAction, setUpdatingAction] = useState<string | null>(null);
  const [scheduleById, setScheduleById] = useState<Record<string, string>>({});
  const [timePickerRequestId, setTimePickerRequestId] = useState<string | null>(null);
  const [pendingTimeAction, setPendingTimeAction] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  const technicians = useMemo(() => users.filter((u: any) => ["technician", "admin", "super_admin"].includes(String(u?.role || "").toLowerCase())), [users]);
  const customerUsers = useMemo(() => users.filter((u: any) => String(u?.role || "").toLowerCase() === "customer"), [users]);

  /* ─── Data loading ─── */
  const loadRequests = useCallback(async () => {
    try {
      const res = await fetch("/api/repair-requests", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.success) {
        const data = (json.data || []) as RepairRequest[];
        setRequests(data);
        setScheduleById(prev => {
          const next = { ...prev };
          for (const r of data) if (!next[r._id]) next[r._id] = toInput(r.scheduledAt);
          return next;
        });
      }
    } catch { /* ignore */ }
  }, []);

  const loadTasks = useCallback(async () => {
    try {
      const data = await workTaskService.getWorkTasks();
      const deduped = Array.from(new Map((data || []).map((t: WorkTask) => [t._id, t])).values()).filter(t => !deletedIds.has(t._id));
      setTasks(deduped);
    } catch { /* ignore */ }
  }, [deletedIds]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadRequests(), loadTasks()]);
    setLoading(false);
  }, [loadRequests, loadTasks]);

  useEffect(() => {
    sanityApiService.users.getAllUsers().then(r => setUsers(r.data || [])).catch(() => {});
    loadAll();
    const sub1 = sanityClient.listen('*[_type == "repairRequest"]', {}, { includeResult: false }).subscribe(() => loadRequests());
    const sub2 = listenWorkTasks(() => loadTasks());
    const onFocus = () => loadAll();
    window.addEventListener("focus", onFocus);
    return () => { sub1.unsubscribe(); sub2.unsubscribe(); window.removeEventListener("focus", onFocus); };
  }, [loadAll, loadRequests, loadTasks]);

  useEffect(() => {
    const openId = searchParams.get("open");
    if (!openId || loading) return;
    const task = tasks.find(t => String(t._id) === openId);
    if (task) { setActiveTask(task); setTab("active"); }
  }, [loading, searchParams, tasks]);

  /* ─── Counts ─── */
  const counts = useMemo(() => ({
    incoming: requests.filter(r => r.status === "pending").length,
    active: tasks.filter(t => !["completed", "cancelled", "hold"].includes(String(t.status))).length,
    history: tasks.filter(t => ["completed", "cancelled", "hold"].includes(String(t.status))).length,
  }), [requests, tasks]);

  /* ─── Filtered data ─── */
  const filteredRequests = useMemo(() => {
    let base = statusFilter === "all" ? requests : requests.filter(r => r.status === statusFilter);
    return [...base].sort((a, b) => {
      const aC = ["cancelled", "rejected"].includes(String(a.status));
      const bC = ["cancelled", "rejected"].includes(String(b.status));
      if (aC !== bC) return aC ? 1 : -1;
      return new Date(b.scheduledAt || b.createdAt || 0).getTime() - new Date(a.scheduledAt || a.createdAt || 0).getTime();
    });
  }, [requests, statusFilter]);

  const priorityRank: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
  const activeTasks = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    return tasks.filter(t => {
      if (["completed", "cancelled", "hold"].includes(String(t.status))) return false;
      if (taskFilters.status && t.status !== taskFilters.status) return false;
      if (taskFilters.priority && t.priority !== taskFilters.priority) return false;
      if (taskFilters.date) {
        const taskDate = (t.dueAt || "").slice(0, 10);
        if (taskFilters.date === "today" && taskDate !== todayStr) return false;
        if (taskFilters.date === "tomorrow" && taskDate !== tomorrowStr) return false;
      }
      return true;
    }).sort((a, b) => (priorityRank[a.priority] ?? 99) - (priorityRank[b.priority] ?? 99) || new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  }, [tasks, taskFilters]);
  const historyTasks = useMemo(() => tasks.filter(t => ["completed", "cancelled", "hold"].includes(String(t.status))).sort((a, b) => new Date(b.updatedAt || b.completedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.completedAt || a.createdAt || 0).getTime()), [tasks]);

  /* ─── Repair request actions ─── */
  const openTimePicker = (r: RepairRequest, action: string | null = null) => {
    setScheduleById(prev => prev[r._id] ? prev : { ...prev, [r._id]: `${new Date().toISOString().slice(0, 10)}T10:00` });
    setPendingTimeAction(action); setTimePickerRequestId(r._id);
  };

  const runRepairAction = async (r: RepairRequest, action: string, scheduleOverride?: string, loadAction?: string) => {
    const input = scheduleOverride || scheduleById[r._id] || "";
    const scheduledAt = input ? new Date(input).toISOString() : "";
    if (["schedule", "accept", "hold"].includes(action) && !scheduledAt) { openTimePicker(r, action); return; }
    const key = `${r._id}:${loadAction || action}`;
    setUpdatingAction(key);
    try {
      const res = await fetch(`/api/repair-requests/${encodeURIComponent(r._id)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, scheduledAt }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) throw new Error(json?.error || "Failed");
      toast.success(action === "schedule" ? "Time saved" : "Request moved to work list");
      await loadRequests(); await loadTasks();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setUpdatingAction(null); }
  };

  const quickSchedule = (r: RepairRequest, kind: "today_1h" | "tomorrow_10" | "next_morning") => {
    const d = new Date();
    if (kind === "today_1h") d.setMinutes(d.getMinutes() + 60);
    else if (kind === "tomorrow_10") { d.setDate(d.getDate() + 1); d.setHours(10, 0, 0, 0); }
    else { d.setDate(d.getDate() + 1); d.setHours(8, 0, 0, 0); }
    const val = toInput(d.toISOString());
    setScheduleById(prev => ({ ...prev, [r._id]: val }));
    runRepairAction(r, "schedule", val, `schedule-${kind}`);
  };

  /* ─── Work task actions ─── */
  const updateTaskStatus = async (task: WorkTask, nextStatus: string, reason?: string) => {
    if (!task._id || task.status === nextStatus) return;
    const snapshot = tasks;
    setTasks(prev => prev.map(t => t._id === task._id ? {
      ...t, status: nextStatus as any, updatedAt: new Date().toISOString(),
      completedAt: nextStatus === "completed" ? new Date().toISOString() : t.completedAt,
      cancellationReason: nextStatus === "cancelled" ? reason || "Cancelled by admin" : t.cancellationReason,
      holdReason: nextStatus === "hold" ? reason || "Paused" : (t as any).holdReason,
    } : t));
    try {
      await workTaskService.updateWorkTask(task._id, { status: nextStatus as any, ...(nextStatus === "cancelled" ? { cancellationReason: reason || "Cancelled by admin" } : nextStatus === "hold" ? { holdReason: reason || "Paused" } : {}) });
      toast.success(`Task ${toLabel(nextStatus).toLowerCase()}`);
    } catch { setTasks(snapshot); toast.error("Failed to update"); }
  };

  const removeTask = async () => {
    if (!deleteTask?._id) return;
    const id = deleteTask._id; const snapshot = tasks;
    setTasks(prev => prev.filter(t => t._id !== id));
    setDeletedIds(prev => new Set(prev).add(id));
    setDeleteTask(null); setActiveTask(null);
    try { await workTaskService.deleteWorkTask(id); toast.success("Deleted"); }
    catch { setTasks(snapshot); setDeletedIds(prev => { const n = new Set(prev); n.delete(id); return n; }); toast.error("Failed to delete"); }
  };

  /* ─── Form actions ─── */
  const openCreate = () => { setEditingTask(null); setForm({ ...initialForm, dueAt: nowLocal() }); setShowForm(true); };
  const openEdit = (task: WorkTask) => {
    setEditingTask(task);
    setForm({
      title: task.title || "", description: task.description || "",
      customerRefId: task.customerRef?._id || "", assignedTechnicianId: task.assignedTechnician?._id || "",
      priority: task.priority || "medium", status: task.status || "pending", issueCategory: task.issueCategory || "other",
      dueAt: toInput(task.dueAt), completionNotes: task.completionNotes || "",
      cancellationReason: task.cancellationReason || "", holdReason: (task as any).holdReason || "",
    });
    setShowForm(true);
  };

  const saveTask = async () => {
    if (!form.title.trim()) return toast.error("Title required");
    if (!form.assignedTechnicianId) return toast.error("Technician required");
    if (!form.dueAt) return toast.error("Due time required");
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(), description: form.description.trim(),
        customerRefId: form.customerRefId || undefined, assignedTechnicianId: form.assignedTechnicianId,
        priority: form.priority, status: form.status, issueCategory: form.issueCategory,
        dueAt: new Date(form.dueAt).toISOString(),
        completionNotes: form.completionNotes.trim() || undefined,
        cancellationReason: form.cancellationReason.trim() || undefined,
        holdReason: form.holdReason.trim() || undefined,
      };
      if (editingTask?._id) {
        const u = await workTaskService.updateWorkTask(editingTask._id, payload);
        setTasks(prev => prev.map(t => t._id === u._id ? u : t));
        toast.success("Task updated");
      } else {
        const created = await workTaskService.createWorkTask(payload as any);
        setTasks(prev => [created, ...prev]);
        toast.success("Task created");
      }
      setShowForm(false); setEditingTask(null); setForm(initialForm);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  };

  /* ─── Shared modals ─── */
  const runAction = async (action: string) => {
    if (!actionTask) return;
    setActionLoading(action);
    if (action === "in-progress") await updateTaskStatus(actionTask, "in-progress");
    else if (action === "done") await updateTaskStatus(actionTask, "completed");
    else if (action === "hold") { setHoldTarget(actionTask); setHoldReason((actionTask as any).holdReason || ""); setActionTask(null); setActionLoading(null); return; }
    else if (action === "cancel") await updateTaskStatus(actionTask, "cancelled", "Cancelled by admin");
    else if (action === "edit") { openEdit(actionTask); setActionTask(null); setActionLoading(null); return; }
    else if (action === "delete") { setDeleteTask(actionTask); setActionTask(null); setActionLoading(null); return; }
    setActionTask(null); setActionLoading(null);
  };

  const rStatusFilterOptions = [
    { value: "all", label: "All" }, { value: "pending", label: "Pending" },
    { value: "accepted", label: "Accepted" }, { value: "on_hold", label: "On Hold" },
    { value: "rejected", label: "Rejected" }, { value: "cancelled", label: "Cancelled" },
    { value: "added_to_work_list", label: "Added" },
  ];

  /* ─── Render ─── */
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Service Center</h1>
          <p className="text-sm text-gray-400">Manage repair requests and work tasks</p>
        </div>
        <Button onClick={openCreate} className="gap-2 shadow-lg shadow-blue-600/20">
          <Plus className="w-4 h-4" /> Create Task
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900/60 border border-gray-800 rounded-xl p-1">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === key ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
            <span className="text-xs ml-1 opacity-80">({counts[key]})</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
          {tab === "incoming" && (
            <Card className="bg-gray-900/80 border-gray-800 backdrop-blur-sm">
              <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Inbox className="w-4 h-4 text-blue-400" /> Incoming Requests
                </h2>
                <Dropdown options={rStatusFilterOptions} value={statusFilter} onValueChange={setStatusFilter}
                  removeSearchForce className="w-36" classNameButton="bg-gray-800 border-gray-700 h-9 text-sm" />
              </div>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-8 text-center text-gray-400">Loading...</div>
                ) : filteredRequests.length === 0 ? (
                  <div className="p-6"><EmptyState icon={Inbox} compact title={requests.length === 0 ? "No requests" : "No matching requests"} description={requests.length === 0 ? "Pending repair requests will appear here" : "Try adjusting the status filter"} /></div>
                ) : (
                  <div className="divide-y divide-gray-800/50">
                    {filteredRequests.map(r => {
                      const busy = Boolean(updatingAction?.startsWith(`${r._id}:`));
                      const hasTask = Boolean(r.workTask?._id);
                      const isClosed = hasTask || ["added_to_work_list", "cancelled", "rejected"].includes(String(r.status));
                      const custName = safeUserName(r.customerName || r.customer?.name, "Customer");
                      const techName = safeUserName(r.technicianName || r.technician?.name, "Technician");
                      const cancelText = (() => {
                        if (!["cancelled", "rejected"].includes(String(r.status))) return "";
                        const role = r.cancelledByRole === "customer" ? "customer" : r.cancelledByRole === "technician" ? "technician" : "admin";
                        const name = safeUserName(r.cancelledByName, "");
                        return name ? `Cancelled by ${role}: ${name}` : `Cancelled by ${role}`;
                      })();
                      const isExpanded = expandedId === r._id;
                      return (
                        <div key={r._id} className={`p-4 ${isClosed ? "opacity-60" : ""} hover:bg-white/[0.02] transition-colors`}>
                          {/* Mobile header */}
                          <button onClick={() => setExpandedId(isExpanded ? null : r._id)} className="sm:hidden flex w-full items-start justify-between gap-3 text-left">
                            <div className="min-w-0">
                              <p className="text-white font-semibold truncate">{r.requestId}</p>
                              <p className="text-xs text-gray-400 mt-0.5">{custName} • {techName}</p>
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                <Badge className={statusBadge(r.status)}>{toLabel(r.status)}</Badge>
                                <Badge className={priorityBadge(r.priority)}>{toLabel(r.priority)}</Badge>
                              </div>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-gray-500 mt-1 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                          </button>
                          {/* Desktop content + mobile expand */}
                          <div className={`grid transition-[grid-template-rows,opacity] sm:grid-rows-[1fr] sm:opacity-100 ${isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                            <div className="overflow-hidden">
                              <div className="sm:flex sm:items-start sm:justify-between gap-4 pt-3 sm:pt-0">
                                <div className="min-w-0 flex-1">
                                  <div className="hidden sm:flex items-center gap-2 mb-2">
                                    <h3 className="font-semibold text-white">{r.requestId}</h3>
                                    <Badge className={statusBadge(r.status)}>{toLabel(r.status)}</Badge>
                                    <Badge className={priorityBadge(r.priority)}>{toLabel(r.priority)}</Badge>
                                    <Badge className="border-gray-700 bg-gray-800 text-gray-300 text-[10px]">{toLabel(r.source)}</Badge>
                                  </div>
                                  <div className="grid sm:grid-cols-3 gap-2 text-sm text-gray-300 mb-2">
                                    <span className="flex items-center gap-1.5"><UserRound className="w-3.5 h-3.5 text-gray-500" />{custName}</span>
                                    <span className="flex items-center gap-1.5"><Wrench className="w-3.5 h-3.5 text-gray-500" />{techName}</span>
                                    <span className="flex items-center gap-1.5"><CalendarClock className="w-3.5 h-3.5 text-gray-500" />{r.createdAt ? formatDayDateTime(r.createdAt) : "-"}</span>
                                  </div>
                                  {r.details ? <p className="text-sm text-gray-400 bg-gray-800/50 rounded-lg p-3 mb-2 whitespace-pre-wrap">{r.details}</p> : null}
                                  {cancelText && <p className="text-xs text-gray-400">{cancelText}</p>}
                                  {hasTask ? <p className="text-xs text-blue-300 mt-1">✓ Moved to active jobs</p> : null}
                                </div>
                                {!isClosed && !hasTask && (
                                  <div className="sm:w-64 shrink-0 mt-3 sm:mt-0">
                                    <div className="bg-gray-800/40 rounded-lg p-3 space-y-2">
                                      <p className="text-[11px] font-medium uppercase tracking-wider text-gray-500">Schedule</p>
                                      <div className="grid grid-cols-[1fr_auto] gap-2">
                                        <input type="date" value={getDate(scheduleById[r._id])}
                                          onChange={e => setScheduleById(prev => ({ ...prev, [r._id]: `${e.target.value}T${getTime(prev[r._id]) || "10:00"}` }))}
                                          className="h-9 rounded-md border border-gray-700 bg-gray-900 px-2 text-sm text-white [color-scheme:dark]" disabled={busy} />
                                        <Button variant="outline" size="sm" onClick={() => openTimePicker(r)}
                                          disabled={busy} className="h-9 border-gray-700 bg-gray-900 text-gray-200 text-xs">{getTime(scheduleById[r._id]) ? getTime(scheduleById[r._id]).slice(0, 5) : "Time"}</Button>
                                      </div>
                                      <div className="grid grid-cols-3 gap-1">
                                        <Button variant="outline" size="xs" onClick={() => quickSchedule(r, "today_1h")} disabled={busy} className="border-gray-700 bg-gray-900 text-gray-300 text-[10px] h-7">+1h</Button>
                                        <Button variant="outline" size="xs" onClick={() => quickSchedule(r, "next_morning")} disabled={busy} className="border-gray-700 bg-gray-900 text-gray-300 text-[10px] h-7">8AM</Button>
                                        <Button variant="outline" size="xs" onClick={() => quickSchedule(r, "tomorrow_10")} disabled={busy} className="border-gray-700 bg-gray-900 text-gray-300 text-[10px] h-7">10AM</Button>
                                      </div>
                                      <div className="grid grid-cols-3 gap-1.5 pt-1">
                                        <Button size="xs" onClick={() => runRepairAction(r, "accept")} disabled={busy}
                                          className="bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 text-[11px] h-8">
                                          <Check className="w-3 h-3 mr-1" />Accept
                                        </Button>
                                        <Button variant="outline" size="xs" onClick={() => runRepairAction(r, "hold")} disabled={busy}
                                          className="border-amber-500/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20 text-[11px] h-8">
                                          <PauseCircle className="w-3 h-3 mr-1" />Hold
                                        </Button>
                                        <Button variant="outline" size="xs" onClick={() => runRepairAction(r, "reject")} disabled={busy}
                                          className="border-rose-500/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20 text-[11px] h-8">
                                          <XCircle className="w-3 h-3 mr-1" />Reject
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {tab === "active" && (
            <Card className="bg-gray-900/80 border-gray-800 backdrop-blur-sm">
              <div className="p-4 border-b border-gray-800">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-blue-400" /> Active Jobs
                  </h2>
                  <span className="text-xs text-gray-500 bg-gray-800 px-2.5 py-1 rounded-full">{activeTasks.length} jobs</span>
                </div>
                <ResponsiveAccordion title="Filters" defaultOpenMobile={false} className="border-gray-800 bg-gray-950/50">
                  <div className="flex flex-wrap items-center gap-2 max-sm:gap-1.5">
                    <div className="flex items-center gap-1 bg-gray-800/60 rounded-lg p-0.5 max-sm:p-0.5">
                      {["", "pending", "in-progress"].map(s => (
                        <button key={s} onClick={() => setTaskFilters(p => ({ ...p, status: s }))}
                          className={`px-2.5 py-1 max-sm:px-2 max-sm:py-0.5 text-xs max-sm:text-[10px] font-medium rounded-md transition-all whitespace-nowrap ${taskFilters.status === s ? "bg-blue-600 text-white shadow-sm" : "text-gray-400 hover:text-white"}`}>
                          {s ? toLabel(s) : "All"}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 bg-gray-800/60 rounded-lg p-0.5 max-sm:p-0.5">
                      {["", "high", "urgent"].map(pr => (
                        <button key={pr} onClick={() => setTaskFilters(prev => ({ ...prev, priority: pr }))}
                          className={`px-2.5 py-1 max-sm:px-2 max-sm:py-0.5 text-xs max-sm:text-[10px] font-medium rounded-md transition-all whitespace-nowrap ${taskFilters.priority === pr ? "bg-blue-600 text-white shadow-sm" : "text-gray-400 hover:text-white"}`}>
                          {pr ? toLabel(pr) : "All"}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 bg-gray-800/60 rounded-lg p-0.5 max-sm:p-0.5">
                      {["", "today", "tomorrow"].map(d => (
                        <button key={d} onClick={() => setTaskFilters(p => ({ ...p, date: d }))}
                          className={`px-2.5 py-1 max-sm:px-2 max-sm:py-0.5 text-xs max-sm:text-[10px] font-medium rounded-md transition-all whitespace-nowrap ${taskFilters.date === d ? "bg-blue-600 text-white shadow-sm" : "text-gray-400 hover:text-white"}`}>
                          {d ? (d === "today" ? "Today" : "Tomorrow") : "All"}
                        </button>
                      ))}
                    </div>
                  </div>
                </ResponsiveAccordion>
              </div>
              <CardContent className="p-0">
                {activeTasks.length === 0 ? (
                  <div className="p-6"><EmptyState icon={ClipboardList} compact title="No active jobs" description="Jobs from incoming requests will appear here once accepted" /></div>
                ) : (
                  <div className="divide-y divide-gray-800/50">
                    {activeTasks.map(task => {
                      const custName = task.customerRef?.name || "";
                      return (
                        <div key={task._id} className={`p-4 ${taskCardBorder(task.status)}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <button onClick={() => setActiveTask(task)} className="text-left">
                                <p className="text-white font-semibold hover:text-blue-300 transition-colors">{task.title}</p>
                              </button>
                              {custName && <p className="text-xs text-blue-300 mt-0.5">Customer: {custName}{task.customerRef?.phone ? ` (${task.customerRef.phone})` : ""}</p>}
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                <Badge className={statusBadge(task.status)}>{toLabel(task.status)}</Badge>
                                <Badge className={priorityBadge(task.priority)}>{toLabel(task.priority)}</Badge>
                                <span className="text-xs text-gray-500 px-2 py-0.5 rounded-full border border-gray-700">
                                  {task.assignedTechnicianName || task.assignedTechnician?.name || "-"}
                                </span>
                                <span className="text-xs text-gray-500 px-2 py-0.5 rounded-full border border-gray-700">
                                  {task.dueAt ? formatDayDateTime(task.dueAt) : "-"}
                                </span>
                              </div>
                              {task.description && <p className="text-xs text-gray-400 mt-2 line-clamp-2">{task.description}</p>}
                            </div>
                            <Button variant="outline" size="sm" onClick={() => { setActionTask(task); }}
                              className="shrink-0 border-gray-700 text-gray-300 text-xs">Actions</Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {tab === "history" && (
            <Card className="bg-gray-900/80 border-gray-800 backdrop-blur-sm">
              <div className="p-4 border-b border-gray-800">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-400" /> History
                </h2>
              </div>
              <CardContent className="p-0 max-h-[65vh] overflow-auto">
                {historyTasks.length === 0 ? (
                  <div className="p-6"><EmptyState icon={History} compact title="No history" description="Completed, cancelled, or held work will appear here" /></div>
                ) : (
                  <div className="divide-y divide-gray-800/50">
                    {historyTasks.map(task => {
                      const status = String(task.status);
                      const borderColor = status === "completed" ? "border-l-green-500/50"
                        : status === "hold" ? "border-l-amber-500/50" : "border-l-red-500/50";
                      const isExpanded = expandedId === task._id;
                      return (
                        <div key={task._id} className={`border-l-2 ${borderColor} pl-4 p-3 hover:bg-white/[0.02] transition-colors`}>
                          <button onClick={() => setExpandedId(isExpanded ? null : task._id)}
                            className="flex w-full items-start justify-between gap-3 text-left">
                            <div className="min-w-0">
                              <p className="text-white font-semibold text-sm">{task.title}</p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {task.customerRef?.name || "Customer"} • {task.assignedTechnicianName || task.assignedTechnician?.name || "-"}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge className={statusBadge(task.status)}>{toLabel(task.status)}</Badge>
                              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                            </div>
                          </button>
                          <div className={`grid transition-[grid-template-rows,opacity] ${isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                            <div className="overflow-hidden">
                              <div className="mt-3 space-y-1 text-xs text-gray-400">
                                <p>Updated: {formatDayDateTime(task.updatedAt || task.completedAt || task.createdAt || "")}</p>
                                {task.completionNotes && <p className="text-green-300">Completion: {task.completionNotes}</p>}
                                {(task as any).holdReason && <p className="text-amber-300">Hold: {(task as any).holdReason}</p>}
                                {task.cancellationReason && <p className="text-red-300">Cancelled: {task.cancellationReason}</p>}
                              </div>
                              <div className="flex gap-2 mt-3">
                                <Button size="xs" variant="secondary" onClick={() => updateTaskStatus(task, "in-progress")}
                                  className="text-[11px] h-7"><Play className="w-3 h-3 mr-1" />Re-activate</Button>
                                <Button size="xs" variant="outline" onClick={() => updateTaskStatus(task, "pending")}
                                  className="text-[11px] h-7 border-gray-700">Mark Pending</Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ─── Task Actions Modal ─── */}
      <Modal isOpen={!!actionTask} onClose={() => setActionTask(null)} title="Task Actions" size="sm">
        {actionTask && <div className="space-y-3">
          <p className="text-sm text-gray-200 font-medium bg-gray-800/40 rounded-lg p-3 border border-gray-700/50">{actionTask.title}</p>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => runAction("in-progress")} disabled={!!actionLoading}
              className="bg-yellow-500/15 text-yellow-100 border border-yellow-500/30 hover:bg-yellow-500/25">
              <Play className="w-4 h-4 mr-2" />{actionLoading === "in-progress" ? "..." : "In Progress"}
            </Button>
            <Button onClick={() => runAction("done")} disabled={!!actionLoading}
              className="bg-green-500/15 text-green-100 border border-green-500/30 hover:bg-green-500/25">
              <CheckCircle2 className="w-4 h-4 mr-2" />{actionLoading === "done" ? "..." : "Done"}
            </Button>
            <Button onClick={() => runAction("hold")} disabled={!!actionLoading}
              className="bg-amber-500/15 text-amber-100 border border-amber-500/30 hover:bg-amber-500/25">
              <PauseCircle className="w-4 h-4 mr-2" />{actionLoading === "hold" ? "..." : "Hold"}
            </Button>
            <Button onClick={() => runAction("cancel")} disabled={!!actionLoading}
              className="bg-slate-500/15 text-slate-100 border border-slate-500/30 hover:bg-slate-500/25">
              <XCircle className="w-4 h-4 mr-2" />{actionLoading === "cancel" ? "..." : "Cancel"}
            </Button>
            <Button onClick={() => runAction("edit")} disabled={!!actionLoading}
              className="bg-blue-500/15 text-blue-100 border border-blue-500/30 hover:bg-blue-500/25">
              <Edit className="w-4 h-4 mr-2" />{actionLoading === "edit" ? "..." : "Edit"}
            </Button>
            <Button onClick={() => runAction("delete")} disabled={!!actionLoading}
              className="bg-rose-500/15 text-rose-100 border border-rose-500/30 hover:bg-rose-500/25">
              <Trash2 className="w-4 h-4 mr-2" />{actionLoading === "delete" ? "..." : "Delete"}
            </Button>
          </div>
        </div>}
      </Modal>

      {/* ─── Create/Edit Work Modal ─── */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editingTask ? "Edit Task" : "Create Task"} size="md">
        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          <div className="space-y-2"><p className="text-sm text-gray-300">Title *</p>
            <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="Task title" className="bg-gray-800 border-gray-700 text-white" /></div>
          <div className="space-y-2"><p className="text-sm text-gray-300">Description</p>
            <Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Task details" className="bg-gray-800 border-gray-700 text-white" /></div>
          <div className="space-y-2"><p className="text-sm text-gray-300">Customer</p>
            <CustomerAutocomplete customers={customerUsers} value={form.customerRefId}
              onChange={id => setForm(p => ({ ...p, customerRefId: id }))} placeholder="Search customer" /></div>
          <SelectField label="Technician *" value={form.assignedTechnicianId}
            onChange={v => setForm(p => ({ ...p, assignedTechnicianId: v }))}
            options={technicians.map((t: any) => ({ value: t._id, label: `${t.name} (${t.role})` }))} />
          <div className="grid grid-cols-3 gap-2">
            <SelectField label="Priority" value={form.priority} onChange={v => setForm(p => ({ ...p, priority: v }))}
              options={priorityOptions.map(p => ({ value: p, label: toLabel(p) }))} />
            <SelectField label="Status" value={form.status} onChange={v => setForm(p => ({ ...p, status: v }))}
              options={statusOptions.map(s => ({ value: s, label: toLabel(s) }))} />
            <SelectField label="Category" value={form.issueCategory} onChange={v => setForm(p => ({ ...p, issueCategory: v }))}
              options={categoryOptions.map(c => ({ value: c, label: toLabel(c) }))} />
          </div>
          <div className="space-y-2"><p className="text-sm text-gray-300">Due *</p>
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={getDate(form.dueAt)} onChange={e => setForm(p => ({ ...p, dueAt: `${e.target.value}T${getTime(p.dueAt) || "10:00"}` }))}
                className="bg-gray-800 border-gray-700 text-white [color-scheme:dark]" />
              <Input type="time" value={getTime(form.dueAt)} onChange={e => setForm(p => ({ ...p, dueAt: `${getDate(p.dueAt) || new Date().toISOString().slice(0, 10)}T${e.target.value}` }))}
                className="bg-gray-800 border-gray-700 text-white [color-scheme:dark]" />
            </div>
          </div>
          {(form.status === "completed" || form.status === "cancelled" || form.status === "hold") && (
            <Input value={form.status === "completed" ? form.completionNotes : form.status === "hold" ? form.holdReason : form.cancellationReason}
              onChange={e => setForm(p => form.status === "completed" ? { ...p, completionNotes: e.target.value } : form.status === "hold" ? { ...p, holdReason: e.target.value } : { ...p, cancellationReason: e.target.value })}
              placeholder={form.status === "completed" ? "Completion notes" : form.status === "hold" ? "Hold reason *" : "Cancellation reason *"}
              className="bg-gray-800 border-gray-700 text-white" />
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={saveTask} loading={saving}>Save</Button>
          </div>
        </div>
      </Modal>

      {/* ─── Task Detail Modal ─── */}
      <Modal isOpen={!!activeTask} onClose={() => setActiveTask(null)} title={activeTask?.title || ""} size="sm">
        {activeTask && <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-gray-800/40 p-3">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Status</p>
              <Badge className={statusBadge(activeTask.status)}>{toLabel(activeTask.status)}</Badge>
            </div>
            <div className="rounded-lg bg-gray-800/40 p-3">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Priority</p>
              <Badge className={priorityBadge(activeTask.priority)}>{toLabel(activeTask.priority)}</Badge>
            </div>
            <div className="rounded-lg bg-gray-800/40 p-3">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Customer</p>
              <p className="text-sm text-white truncate">{activeTask.customerRef?.name || "-"}</p>
            </div>
            <div className="rounded-lg bg-gray-800/40 p-3">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Technician</p>
              <p className="text-sm text-white truncate">{activeTask.assignedTechnicianName || activeTask.assignedTechnician?.name || "-"}</p>
            </div>
            <div className="rounded-lg bg-gray-800/40 p-3">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Due</p>
              <p className="text-sm text-white">{formatDayDateTime(activeTask.dueAt)}</p>
            </div>
            <div className="rounded-lg bg-gray-800/40 p-3">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Category</p>
              <p className="text-sm text-white capitalize">{toLabel(activeTask.issueCategory)}</p>
            </div>
          </div>
          {activeTask.description && <div className="rounded-lg bg-gray-800/50 p-3 text-sm text-gray-300 border border-gray-700/50">{activeTask.description}</div>}
          {activeTask.holdReason && <div className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-200 border border-amber-500/20"><span className="font-medium">Hold:</span> {activeTask.holdReason}</div>}
          {activeTask.cancellationReason && <div className="rounded-lg bg-rose-500/10 p-3 text-sm text-rose-200 border border-rose-500/20"><span className="font-medium">Cancelled:</span> {activeTask.cancellationReason}</div>}
          {activeTask.completionNotes && <div className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-200 border border-emerald-500/20"><span className="font-medium">Completed:</span> {activeTask.completionNotes}</div>}
          <div className="flex gap-2 pt-1">
            {activeTask.status !== "completed" && activeTask.status !== "cancelled" && (
              <Button variant="secondary" size="sm" onClick={() => updateTaskStatus(activeTask, "in-progress")} disabled={activeTask.status === "in-progress"} className="flex-1 border-yellow-500/30 bg-yellow-500/10 text-yellow-100 hover:bg-yellow-500/20">
                <Play className="w-3.5 h-3.5 mr-1" />In Progress
              </Button>
            )}
            {activeTask.status !== "completed" && activeTask.status !== "cancelled" && (
              <Button size="sm" onClick={() => updateTaskStatus(activeTask, "completed")} disabled={activeTask.status === "completed"} className="flex-1 border-green-500/30 bg-green-500/10 text-green-100 hover:bg-green-500/20">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />Done
              </Button>
            )}
            {activeTask.status !== "cancelled" && (
              <Button variant="outline" size="sm" onClick={() => updateTaskStatus(activeTask, "cancelled", "Cancelled by admin")} disabled={activeTask.status === "cancelled"} className="flex-1 border-slate-500/30 bg-slate-500/10 text-slate-100 hover:bg-slate-500/20">
                <XCircle className="w-3.5 h-3.5 mr-1" />Cancel
              </Button>
            )}
          </div>
        </div>}
      </Modal>

      {/* ─── Confirmation Modals ─── */}
      <ConfirmationModal isOpen={!!deleteTask} onClose={() => setDeleteTask(null)} onConfirm={removeTask}
        title="Delete Task" message={deleteTask ? `Delete "${deleteTask.title}"?` : ""} type="confirm" confirmText="Delete" />

      <ConfirmationModal isOpen={!!holdTarget} onClose={() => { setHoldTarget(null); setHoldReason(""); }}
        onConfirm={async () => { if (!holdTarget) return; if (!holdReason.trim()) return toast.error("Reason required"); const t = holdTarget; setHoldTarget(null); await updateTaskStatus(t, "hold", holdReason.trim()); setHoldReason(""); }}
        type="confirm" title="Hold Task" confirmText="Set Hold"
        content={<div className="space-y-2"><p className="text-sm text-gray-300">Reason</p>
          <Input value={holdReason} onChange={e => setHoldReason(e.target.value)} placeholder="Enter hold reason" className="bg-gray-800 border-gray-700 text-white" /></div>} />

      {/* ─── Time Picker Modal ─── */}
      <Modal isOpen={!!timePickerRequestId} onClose={() => { setTimePickerRequestId(null); setPendingTimeAction(null); }}
        title="Select Time" size="sm">
        {(() => {
          const req = requests.find(r => r._id === timePickerRequestId);
          if (!req) return null;
          const raw = scheduleById[req._id] || "";
          const t = getTime(raw) || "10:00";
          const [h, m] = t.split(":").map(Number);
          const ampm = h >= 12 ? "PM" : "AM";
          const h12 = h % 12 || 12;
          return <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-gray-800/50 p-1">
              {["AM", "PM"].map(p => <Button key={p} variant="outline" size="sm"
                className={`border-transparent ${ampm === p ? "bg-blue-600 text-white" : "text-gray-300"}`}
                onClick={() => { const nh = p === "AM" ? (h12 === 12 ? 0 : h12) : (h12 === 12 ? 12 : h12 + 12); setScheduleById(prev => ({ ...prev, [req._id]: `${getDate(prev[req._id]) || new Date().toISOString().slice(0, 10)}T${String(nh).padStart(2, "0")}:${String(m).padStart(2, "0")}` })); }}>{p}</Button>)}
            </div>
            <div><p className="text-xs text-gray-400 mb-2">Hour</p>
              <div className="grid grid-cols-6 gap-1.5">
                {Array.from({ length: 12 }, (_, i) => i + 1).map(h => <Button key={h} variant="outline" size="xs"
                  className={`${h12 === h ? "bg-blue-600 text-white border-blue-500" : "border-gray-700 text-gray-300"}`}
                  onClick={() => { const nh = ampm === "AM" ? (h === 12 ? 0 : h) : (h === 12 ? 12 : h + 12); setScheduleById(prev => ({ ...prev, [req._id]: `${getDate(prev[req._id]) || new Date().toISOString().slice(0, 10)}T${String(nh).padStart(2, "0")}:${String(m).padStart(2, "0")}` })); }}>{h}</Button>)}
              </div>
            </div>
            <div><p className="text-xs text-gray-400 mb-2">Minute</p>
              <div className="grid grid-cols-6 gap-1.5">
                {["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"].map(mn => <Button key={mn} variant="outline" size="xs"
                  className={`${String(m).padStart(2, "0") === mn ? "bg-blue-600 text-white border-blue-500" : "border-gray-700 text-gray-300"}`}
                  onClick={() => setScheduleById(prev => ({ ...prev, [req._id]: `${getDate(prev[req._id]) || new Date().toISOString().slice(0, 10)}T${String(h).padStart(2, "0")}:${mn}` }))}>{mn}</Button>)}
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gray-800/50 px-3 py-2 text-sm">
              <span className="text-gray-400">Time</span>
              <span className="font-semibold text-white">{`${h12}:${String(m).padStart(2, "0")} ${ampm}`}</span>
            </div>
            <Button className="w-full" onClick={async () => { const action = pendingTimeAction || "schedule"; await runRepairAction(req, action); setTimePickerRequestId(null); setPendingTimeAction(null); }}
              loading={updatingAction === `${req._id}:${pendingTimeAction || "schedule"}`}>Save</Button>
          </div>;
        })()}
      </Modal>
    </div>
  );
}
