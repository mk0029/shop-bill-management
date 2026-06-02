"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import {
  workTaskService,
  listenWorkTasks,
  type WorkTask,
  type WorkTaskRealtimeEvent,
} from "@/lib/work-task-service";
import { sanityApiService } from "@/lib/sanity-api-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { Modal } from "@/components/ui/modal";
import { SelectField } from "@/components/ui/select-field";
import { ResponsiveAccordion } from "@/components/ui/responsive-accordion";
import CustomerAutocomplete from "@/components/ui/customer-autocomplete";
import { formatDayDateTime } from "@/lib/date-time";
import { toast } from "sonner";

const statusOptions = [
  "pending",
  "in-progress",
  "completed",
  "hold",
  "cancelled",
] as const;
const priorityOptions = ["low", "medium", "high", "urgent"] as const;
const categoryOptions = [
  "repair",
  "fitting",
  "wiring",
  "delivery",
  "payment",
  "other",
] as const;

type FormState = {
  title: string;
  description: string;
  customerRefId: string;
  assignedTechnicianId: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "pending" | "in-progress" | "completed" | "hold" | "cancelled";
  issueCategory:
    | "repair"
    | "fitting"
    | "wiring"
    | "delivery"
    | "payment"
    | "other";
  dueAt: string;
  completionNotes: string;
  cancellationReason: string;
  holdReason: string;
};

const initialForm: FormState = {
  title: "",
  description: "",
  customerRefId: "",
  assignedTechnicianId: "",
  priority: "medium",
  status: "pending",
  issueCategory: "repair",
  dueAt: "",
  completionNotes: "",
  cancellationReason: "",
  holdReason: "",
};

function toInputDateTimeLocal(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toLabel(value?: string) {
  const s = String(value || "").trim();
  if (!s) return "-";
  return s
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getDatePart(value?: string) {
  if (!value) return "";
  const [date] = value.split("T");
  return date || "";
}

function getTimePart(value?: string) {
  if (!value) return "";
  const parts = value.split("T");
  if (parts.length < 2) return "";
  return (parts[1] || "").slice(0, 5);
}

function getNowInputDateTimeLocal() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function getCurrentLocalTimeHHMM() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function isAllowedWorkTime(dateTimeLocal?: string) {
  if (!dateTimeLocal) return false;
  const d = new Date(dateTimeLocal);
  if (Number.isNaN(d.getTime())) return false;
  return d.getHours() >= 7;
}

function getTaskNotes(task: WorkTask) {
  return (
    task.completionNotes ||
    (task as any).holdReason ||
    task.cancellationReason ||
    task.description ||
    (task as any).notes ||
    ""
  );
}

function getStatusCardClass(status?: string) {
  switch (String(status || "").toLowerCase()) {
    case "pending":
      return "border-red-500/35 bg-red-500/10";
    case "in-progress":
      return "border-yellow-500/40 bg-yellow-400/12 backdrop-blur-sm";
    case "completed":
      return "border-green-500/35 bg-green-500/10";
    case "hold":
      return "border-amber-500/35 bg-amber-500/10";
    case "cancelled":
      return "border-slate-500/30 bg-slate-500/10";
    default:
      return "border-gray-800 bg-gray-950/60";
  }
}

function getStatusBadgeClass(status?: string) {
  switch (String(status || "").toLowerCase()) {
    case "pending":
      return "border-red-400/45 bg-red-500/10 text-red-100";
    case "in-progress":
      return "border-yellow-400/45 bg-yellow-500/10 text-yellow-100";
    case "completed":
      return "border-green-400/45 bg-green-500/10 text-green-100";
    case "hold":
      return "border-amber-400/45 bg-amber-500/10 text-amber-100";
    case "cancelled":
      return "border-slate-400/45 bg-slate-500/10 text-slate-200";
    default:
      return "border-gray-700 text-gray-200";
  }
}

function getPriorityBadgeClass(priority?: string) {
  switch (String(priority || "").toLowerCase()) {
    case "urgent":
      return "border-rose-400/50 bg-rose-500/10 text-rose-100";
    case "high":
      return "border-orange-400/50 bg-orange-500/10 text-orange-100";
    case "medium":
      return "border-blue-400/50 bg-blue-500/10 text-blue-100";
    case "low":
      return "border-emerald-400/50 bg-emerald-500/10 text-emerald-100";
    default:
      return "border-gray-700 text-gray-200";
  }
}

type WorkListClientProps = {
  embedded?: boolean;
  mode?: "active" | "history";
};

export default function WorkListClient({
  embedded = false,
  mode = "active",
}: WorkListClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [technicianFilter, setTechnicianFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingTask, setEditingTask] = useState<WorkTask | null>(null);
  const [deleteTask, setDeleteTask] = useState<WorkTask | null>(null);
  const [activeTask, setActiveTask] = useState<WorkTask | null>(null);
  const [holdTarget, setHoldTarget] = useState<WorkTask | null>(null);
  const [holdReason, setHoldReason] = useState("");
  const [completingTask, setCompletingTask] = useState(false);
  const [form, setForm] = useState<FormState>(initialForm);
  const [isInitialized, setIsInitialized] = useState(false);
  const [actionTask, setActionTask] = useState<WorkTask | null>(null);
  const [actionLoading, setActionLoading] = useState<
    null | "in-progress" | "done" | "hold" | "cancel" | "edit" | "delete"
  >(null);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [expandedMobileTaskId, setExpandedMobileTaskId] = useState<
    string | null
  >(null);

  const closeActiveTask = useCallback(() => {
    setActiveTask(null);
    if (!searchParams.has("open")) return;
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("open");
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const technicians = useMemo(
    () =>
      users.filter((u: any) =>
        ["technician", "admin", "super_admin"].includes(
          String(u?.role || "").toLowerCase(),
        ),
      ),
    [users],
  );
  const customerUsers = useMemo(
    () =>
      users.filter(
        (u: any) => String(u?.role || "").toLowerCase() === "customer",
      ),
    [users],
  );

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      try {
        if (!opts?.silent) setLoading(true);
        const data = await workTaskService.getWorkTasks({
          status: statusFilter || undefined,
          priority: priorityFilter || undefined,
          technicianId: technicianFilter || undefined,
          date: dateFilter || undefined,
          q: search || undefined,
        });
        const deduped = Array.from(
          new Map((data || []).map((t) => [t._id, t])).values(),
        ).filter((t) => !deletedIds.has(t._id));
        setTasks(deduped);
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Failed to load work list",
        );
      } finally {
        if (!opts?.silent) setLoading(false);
        if (!isInitialized) setIsInitialized(true);
      }
    },
    [
      statusFilter,
      priorityFilter,
      technicianFilter,
      dateFilter,
      search,
      deletedIds,
      isInitialized,
    ],
  );

  const applyRealtimeEvent = useCallback((event?: WorkTaskRealtimeEvent) => {
    const id = String(event?.documentId || event?.result?._id || "");
    if (!id) return;
    const transition = event?.mutation?.transition;
    if (transition === "disappear") {
      setTasks((prev) => prev.filter((t) => t._id !== id));
      return;
    }
    const nextTask = event?.result;
    if (!nextTask) return;
    setTasks((prev) => {
      const without = prev.filter((t) => t._id !== id);
      return [nextTask, ...without];
    });
  }, []);

  useEffect(() => {
    sanityApiService.users
      .getAllUsers()
      .then((res) => setUsers(res.data || []))
      .catch(() => setUsers([]));
    load({ silent: isInitialized });
    const sub = listenWorkTasks((event) => {
      applyRealtimeEvent(event);
      load({ silent: true });
    });
    return () => sub.unsubscribe();
  }, [isInitialized, load, applyRealtimeEvent]);

  useEffect(() => {
    const openTaskId = searchParams.get("open");
    if (!openTaskId || loading) return;
    const task = tasks.find((item) => String(item._id) === openTaskId);
    if (task && activeTask?._id !== task._id) setActiveTask(task);
  }, [activeTask?._id, loading, searchParams, tasks]);

  const pendingCount = useMemo(
    () =>
      tasks.filter(
        (t) =>
          t.status !== "completed" &&
          t.status !== "cancelled" &&
          t.status !== "hold",
      ),
    [tasks],
  );
  const completedCount = useMemo(
    () => tasks.filter((t) => t.status === "completed"),
    [tasks],
  );

  const openCreate = () => {
    setEditingTask(null);
    setForm({ ...initialForm, dueAt: getNowInputDateTimeLocal() });
    setShowForm(true);
  };

  const openEdit = (task: WorkTask) => {
    setEditingTask(task);
    setForm({
      title: task.title || "",
      description: task.description || "",
      customerRefId: task.customerRef?._id || "",
      assignedTechnicianId: task.assignedTechnician?._id || "",
      priority: (task.priority || "medium") as FormState["priority"],
      status: (task.status || "pending") as FormState["status"],
      issueCategory: (task.issueCategory ||
        "other") as FormState["issueCategory"],
      dueAt: toInputDateTimeLocal(task.dueAt),
      completionNotes: task.completionNotes || "",
      cancellationReason: task.cancellationReason || "",
      holdReason: (task as any).holdReason || "",
    });
    setShowForm(true);
  };

  const validate = () => {
    if (!form.title.trim()) return "Title is required";
    if (!form.assignedTechnicianId) return "Technician must be selected";
    if (!form.dueAt) return "Due date/time is required";
    if (!isAllowedWorkTime(form.dueAt))
      return "Due time must be between 7:00 AM and 11:59 PM";
    if (form.status === "cancelled" && !form.cancellationReason.trim())
      return "Cancellation reason is required";
    if (form.status === "hold" && !form.holdReason.trim())
      return "Hold reason is required";
    return "";
  };

  const saveTask = async () => {
    const error = validate();
    if (error) return toast.error(error);
    try {
      setSaving(true);
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        customerRefId: form.customerRefId || undefined,
        assignedTechnicianId: form.assignedTechnicianId,
        priority: form.priority,
        status: form.status,
        issueCategory: form.issueCategory,
        dueAt: new Date(form.dueAt).toISOString(),
        completionNotes: form.completionNotes.trim() || undefined,
        cancellationReason: form.cancellationReason.trim() || undefined,
        holdReason: form.holdReason.trim() || undefined,
      };
      if (editingTask?._id) {
        const updated = await workTaskService.updateWorkTask(
          editingTask._id,
          payload,
        );
        setTasks((prev) =>
          prev.map((t) => (t._id === updated._id ? updated : t)),
        );
        toast.success("Work task updated");
      } else {
        const tempId = `temp-${Date.now()}`;
        const optimisticTask = {
          _id: tempId,
          title: payload.title,
          description: payload.description,
          priority: payload.priority,
          status: payload.status,
          issueCategory: payload.issueCategory,
          dueAt: payload.dueAt,
          assignedTechnician:
            technicians.find(
              (t: any) => t._id === payload.assignedTechnicianId,
            ) || null,
          assignedTechnicianName:
            technicians.find((t: any) => t._id === payload.assignedTechnicianId)
              ?.name || "",
          customerRef:
            customerUsers.find((c: any) => c._id === payload.customerRefId) ||
            null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as unknown as WorkTask;
        setTasks((prev) => [optimisticTask, ...prev]);
        setShowForm(false);
        setEditingTask(null);
        setForm(initialForm);

        try {
          const created = await workTaskService.createWorkTask(payload as any);
          setTasks((prev) => {
            const next = prev.filter((t) => t._id !== tempId);
            return Array.from(
              new Map([created, ...next].map((t) => [t._id, t])).values(),
            );
          });
          toast.success("Work task created");
          return;
        } catch (e) {
          setTasks((prev) => prev.filter((t) => t._id !== tempId));
          throw e;
        }
      }
      setShowForm(false);
      setEditingTask(null);
      setForm(initialForm);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save work task");
    } finally {
      setSaving(false);
    }
  };

  const removeTask = async () => {
    if (!deleteTask?._id) return;
    const deletingId = deleteTask._id;
    const snapshot = tasks;
    try {
      setDeleteTask(null);
      setActionTask(null);
      setActiveTask(null);
      setHoldTarget(null);
      setDeletedIds((prev) => new Set(prev).add(deletingId));
      setTasks((prev) => prev.filter((t) => t._id !== deletingId));
      await workTaskService.deleteWorkTask(deleteTask._id);
      toast.success("Work task deleted");
    } catch (e) {
      setDeletedIds((prev) => {
        const next = new Set(prev);
        next.delete(deletingId);
        return next;
      });
      setTasks(snapshot);
      toast.error(e instanceof Error ? e.message : "Failed to delete task");
    }
  };

  const markTaskCompleted = async () => {
    if (!activeTask?._id || completingTask) return;
    const snapshot = tasks;
    const nowIso = new Date().toISOString();
    try {
      setCompletingTask(true);
      setTasks((prev) =>
        prev.map((t) =>
          t._id === activeTask._id
            ? {
                ...t,
                status: "completed",
                completedAt: nowIso,
                updatedAt: nowIso,
              }
            : t,
        ),
      );
      await workTaskService.updateWorkTask(activeTask._id, {
        status: "completed",
      });
      toast.success("Work marked as completed");
      closeActiveTask();
    } catch (e) {
      setTasks(snapshot);
      toast.error(e instanceof Error ? e.message : "Failed to complete task");
    } finally {
      setCompletingTask(false);
    }
  };

  const markTaskDone = async (task: WorkTask) => {
    if (!task?._id || task.status === "completed") return;
    const snapshot = tasks;
    try {
      setTasks((prev) =>
        prev.map((t) =>
          t._id === task._id
            ? {
                ...t,
                status: "completed",
                completedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
            : t,
        ),
      );
      await workTaskService.updateWorkTask(task._id, { status: "completed" });
      toast.success("Task marked as done");
    } catch (e) {
      setTasks(snapshot);
      toast.error(e instanceof Error ? e.message : "Failed to mark task done");
    }
  };

  const updateTaskStatus = async (
    task: WorkTask,
    nextStatus: "pending" | "in-progress" | "completed" | "cancelled" | "hold",
    reason?: string,
  ) => {
    if (!task?._id || task.status === nextStatus) return;
    const snapshot = tasks;
    const nowIso = new Date().toISOString();
    try {
      setTasks((prev) =>
        prev.map((t) =>
          t._id === task._id
            ? {
                ...t,
                status: nextStatus,
                updatedAt: nowIso,
                completedAt:
                  nextStatus === "completed" ? nowIso : t.completedAt,
                cancellationReason:
                  nextStatus === "cancelled"
                    ? reason || "Cancelled by admin"
                    : t.cancellationReason,
                holdReason:
                  nextStatus === "hold"
                    ? reason || "Temporarily paused"
                    : (t as any).holdReason,
              }
            : t,
        ),
      );

      await workTaskService.updateWorkTask(task._id, {
        status: nextStatus,
        ...(nextStatus === "cancelled"
          ? { cancellationReason: reason || "Cancelled by admin" }
          : nextStatus === "hold"
            ? { holdReason: reason || "Temporarily paused" }
            : {}),
      });
      toast.success(`Task marked ${toLabel(nextStatus).toLowerCase()}`);
    } catch (e) {
      setTasks(snapshot);
      toast.error(e instanceof Error ? e.message : "Failed to update status");
    }
  };

  const priorityRank: Record<string, number> = {
    urgent: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  const filteredTasks = useMemo(() => {
    const sorted = [...tasks].sort((a, b) => {
      const pa = priorityRank[String(a.priority)] ?? 99;
      const pb = priorityRank[String(b.priority)] ?? 99;
      if (pa !== pb) return pa - pb;
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    });
    if (!embedded) return sorted;
    return sorted
      .filter(
        (task) =>
          !["completed", "cancelled", "hold"].includes(String(task.status)),
      )
      .slice(0, 8);
  }, [tasks, embedded]);
  const pendingTasksForView = useMemo(
    () =>
      filteredTasks.filter(
        (task) =>
          !["completed", "cancelled", "hold"].includes(String(task.status)),
      ),
    [filteredTasks],
  );
  const historyTasks = useMemo(
    () =>
      [...tasks]
        .filter((t) =>
          ["completed", "cancelled", "hold"].includes(String(t.status)),
        )
        .sort(
          (a, b) =>
            new Date(
              b.updatedAt || b.completedAt || b.createdAt || 0,
            ).getTime() -
            new Date(
              a.updatedAt || a.completedAt || a.createdAt || 0,
            ).getTime(),
        ),
    [tasks],
  );

  const statusDropdown = [
    { value: "", label: "All Status" },
    ...statusOptions.map((s) => ({ value: s, label: toLabel(s) })),
  ];
  const priorityDropdown = [
    { value: "", label: "All Priority" },
    ...priorityOptions.map((p) => ({ value: p, label: toLabel(p) })),
  ];
  const technicianDropdown = [
    { value: "", label: "All Assignees" },
    ...technicians.map((t: any) => ({ value: t._id, label: t.name })),
  ];
  const formTechnicianDropdown = technicians.map((t: any) => ({
    value: t._id,
    label: `${t.name} (${t.role})`,
  }));
  const categoryDropdown = categoryOptions.map((c) => ({
    value: c,
    label: toLabel(c),
  }));

  const wrapperClass = embedded
    ? "space-y-3"
    : "min-h-screen bg-gray-900 sm:p-4 md:p-6 space-y-4";

  const runAction = async (
    action: "in-progress" | "done" | "hold" | "cancel" | "edit" | "delete",
  ) => {
    if (!actionTask || actionLoading) return;
    setActionLoading(action);
    try {
      if (action === "in-progress")
        await updateTaskStatus(actionTask, "in-progress");
      if (action === "done") await updateTaskStatus(actionTask, "completed");
      if (action === "hold") {
        setHoldTarget(actionTask);
        setHoldReason((actionTask as any).holdReason || "");
        setActionTask(null);
        return;
      }
      if (action === "cancel")
        await updateTaskStatus(actionTask, "cancelled", "Cancelled by admin");
      if (action === "edit") openEdit(actionTask);
      if (action === "delete") setDeleteTask(actionTask);
      setActionTask(null);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className={wrapperClass}>
      <div className={`${embedded ? "" : "max-w-7xl mx-auto"} space-y-4`}>
        {mode !== "history" ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between ">
              <div className="flex items-center gap-3 max-sm:pt-2">
                <CardTitle className="text-white">Work List Manager</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                {/* <Button
                variant="outline"
                onClick={() => router.push("/dashboard/work-list")}
              >
                Active Tasks
              </Button> */}

                <Button onClick={openCreate}>Create Work</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <ResponsiveAccordion
                title="Filters"
                defaultOpenMobile={false}
                className="border-gray-800 bg-gray-950/50"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-3">
                  {/* <div className="xl:col-span-2">
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by title, customer, technician"
                    className="bg-gray-800 border-gray-700 text-white xl:col-span-4"
                  />
                </div> */}
                  <div className="xl:col-span-2">
                    <SelectField
                      label="Status"
                      value={statusFilter}
                      onChange={setStatusFilter}
                      options={statusDropdown}
                    />
                  </div>
                  <div className="xl:col-span-2">
                    <SelectField
                      label="Priority"
                      value={priorityFilter}
                      onChange={setPriorityFilter}
                      options={priorityDropdown}
                    />
                  </div>
                  <div className="space-y-2 xl:col-span-2">
                    <p className="text-sm text-gray-200">Due Date</p>
                    <Input
                      type="date"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  <div className="xl:col-span-2">
                    <SelectField
                      label="Assigned To"
                      value={technicianFilter}
                      onChange={setTechnicianFilter}
                      options={technicianDropdown}
                    />
                  </div>
                </div>
              </ResponsiveAccordion>
              <div className="flex flex-wrap items-center gap-2 text-sm pt-1">
                <div className="px-3 py-1.5 rounded-md border border-orange-500/30 bg-orange-500/10 text-orange-200">
                  Pending:{" "}
                  <span className="font-semibold text-orange-300">
                    {pendingCount.length}
                  </span>
                </div>
                <div className="px-3 py-1.5 rounded-md border border-green-500/30 bg-green-500/10 text-green-200">
                  Completed:{" "}
                  <span className="font-semibold text-green-300">
                    {completedCount.length}
                  </span>
                </div>
                <Button
                  variant="outline"
                  onClick={() => router.push("/dashboard/work-list/history")}
                >
                  History
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="max-h-[85vh] overflow-auto max-sm:pr-1">
          {" "}
          {mode === "active" ? (
            <Card className="h-full">
              <CardHeader className="p-4">
                <CardTitle className="text-white">Pending Jobs</CardTitle>
              </CardHeader>

              <CardContent className="pt-0 ">
                {loading ? (
                  <p className="text-gray-400">Loading work tasks...</p>
                ) : pendingTasksForView.length === 0 ? (
                  <p className="text-gray-400">No work pending today.</p>
                ) : (
                  <div>
                    <div className="hidden md:block overflow-x-auto px-2">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-400 border-b border-gray-800">
                            <th className="py-2 pr-2">Title</th>
                            <th className="py-2 pr-2">Technician</th>
                            <th className="py-2 pr-2">Priority</th>
                            <th className="py-2 pr-2">Status</th>
                            <th className="py-2 pr-2">Due</th>
                            <th className="py-2">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pendingTasksForView.map((task) => (
                            <tr
                              key={task._id}
                              className={`border-b border-gray-900 ${getStatusCardClass(task.status)}`}
                            >
                              <td className="py-2 pr-2 text-white pl-2">
                                <button
                                  className="text-left hover:text-blue-300"
                                  onClick={() => setActiveTask(task)}
                                >
                                  {task.title}
                                </button>
                                {task.customerRef?.name ? (
                                  <p className="text-xs text-blue-300 mt-1">
                                    Customer: {task.customerRef.name}
                                    {task.customerRef?.phone
                                      ? ` (${task.customerRef.phone})`
                                      : ""}
                                  </p>
                                ) : null}
                                {task.description ? (
                                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                                    {task.description}
                                  </p>
                                ) : null}
                              </td>
                              <td className="py-2 pr-2 text-gray-300">
                                {task.assignedTechnicianName ||
                                  task.assignedTechnician?.name ||
                                  "-"}
                              </td>
                              <td className="py-2 pr-2 text-gray-300">
                                {toLabel(task.priority)}
                              </td>
                              <td className="py-2 pr-2 text-gray-300">
                                {toLabel(task.status)}
                              </td>
                              <td className="py-2 pr-2 text-gray-400">
                                {formatDayDateTime(task.dueAt)}
                              </td>
                              <td className="py-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setActionTask(task)}
                                >
                                  Actions
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="md:hidden space-y-3">
                      {pendingTasksForView.map((task) => (
                        <div
                          key={task._id}
                          className={`border rounded-lg p-3.5 ${getStatusCardClass(task.status)}`}
                        >
                          <div className="flex flex-col gap-2.5">
                            <div>
                              <button
                                className="w-full flex items-center justify-between gap-2"
                                onClick={() =>
                                  embedded
                                    ? setExpandedMobileTaskId((prev) =>
                                        prev === task._id ? null : task._id,
                                      )
                                    : setActiveTask(task)
                                }
                              >
                                <span className="text-white font-semibold text-[17px] leading-5 text-left hover:text-blue-300">
                                  {task.title}
                                </span>
                                {embedded ? (
                                  <ChevronDown
                                    className={`h-4 w-4 text-gray-300 transition-transform ${expandedMobileTaskId === task._id ? "rotate-180" : ""}`}
                                  />
                                ) : null}
                              </button>
                              <p className="mt-1 text-xs text-gray-400 leading-5">
                                {task.assignedTechnicianName ||
                                  task.assignedTechnician?.name ||
                                  "-"}{" "}
                                • {toLabel(task.issueCategory)}
                              </p>
                              {task.customerRef?.name ? (
                                <p className="text-xs text-blue-300 leading-5">
                                  Customer: {task.customerRef.name}
                                  {task.customerRef?.phone
                                    ? ` (${task.customerRef.phone})`
                                    : ""}
                                </p>
                              ) : null}
                              <p className="text-xs text-gray-400 leading-5">
                                Due: {formatDayDateTime(task.dueAt)}
                              </p>
                              {task.description ? (
                                <p className="text-sm text-gray-300 mt-2 leading-5">
                                  {task.description}
                                </p>
                              ) : null}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-1 text-xs rounded-md border border-gray-700 text-gray-200">
                                {toLabel(task.status)}
                              </span>
                              <span className="px-2.5 py-1 text-xs rounded-md border border-gray-700 text-gray-200">
                                {toLabel(task.priority)}
                              </span>
                            </div>
                            <div className="pt-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setActionTask(task)}
                                className="w-full justify-center font-medium"
                              >
                                Actions
                              </Button>
                            </div>
                          </div>
                          {task.status === "completed" &&
                          task.completionNotes ? (
                            <p className="text-xs text-green-300 mt-2">
                              Completion: {task.completionNotes}
                            </p>
                          ) : null}
                          {task.status === "cancelled" &&
                          task.cancellationReason ? (
                            <p className="text-xs text-red-300 mt-2">
                              Cancelled: {task.cancellationReason}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}
          {mode === "history" ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-white">Work History</CardTitle>
              </CardHeader>
              <CardContent>
                {historyTasks.length === 0 ? (
                  <p className="text-gray-400">No history items found.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {historyTasks.map((task) => (
                      <div
                        key={task._id}
                        className={`rounded-lg p-3 border ${
                          task.status === "completed"
                            ? "border-green-700/30 bg-green-950/10"
                            : task.status === "hold"
                              ? "border-yellow-700/30 bg-yellow-950/10"
                              : "border-red-700/30 bg-red-950/10"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-white font-semibold">
                            {task.title}
                          </p>
                          <span className="text-xs px-2 py-1 rounded-full border border-gray-600/40 bg-gray-700/30 text-gray-200">
                            {toLabel(task.status)}
                          </span>
                        </div>
                        <div className="mt-2 space-y-1 text-xs text-gray-300">
                          {task.customerRef?.name ? (
                            <p>
                              Customer:{" "}
                              <span className="text-gray-100">
                                {task.customerRef.name}
                                {task.customerRef?.phone
                                  ? ` (${task.customerRef.phone})`
                                  : ""}
                              </span>
                            </p>
                          ) : null}
                          <p>
                            Technician:{" "}
                            <span className="text-gray-100">
                              {task.assignedTechnicianName ||
                                task.assignedTechnician?.name ||
                                "-"}
                            </span>
                          </p>
                          <p>
                            Updated At:{" "}
                            <span className="text-gray-100">
                              {formatDayDateTime(
                                task.updatedAt ||
                                  task.completedAt ||
                                  task.createdAt ||
                                  "",
                              )}
                            </span>
                          </p>
                          <p>
                            Priority:{" "}
                            <span className="text-gray-100 capitalize">
                              {task.priority}
                            </span>
                          </p>
                        </div>
                        {getTaskNotes(task) ? (
                          <div className="mt-2 text-sm text-gray-200 border-t border-green-800/40 pt-2">
                            {task.completionNotes ? (
                              <p>Completion Notes: {task.completionNotes}</p>
                            ) : null}
                            {(task as any).holdReason ? (
                              <p>Hold Reason: {(task as any).holdReason}</p>
                            ) : null}
                            {task.cancellationReason ? (
                              <p>
                                Cancellation Reason: {task.cancellationReason}
                              </p>
                            ) : null}
                            {task.description ? (
                              <p>Task Notes: {task.description}</p>
                            ) : null}
                            {(task as any).notes &&
                            (task as any).notes !== task.description ? (
                              <p>Notes: {(task as any).notes}</p>
                            ) : null}
                          </div>
                        ) : null}
                        <div className="mt-3 flex gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              updateTaskStatus(task, "in-progress")
                            }
                          >
                            Back To In Progress
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateTaskStatus(task, "pending")}
                          >
                            Mark Pending
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editingTask ? "Edit Work Task" : "Create Work Task"}
        size="md"
      >
        <div className="space-y-3">
          <div className="space-y-2">
            <p className="text-sm text-gray-200">Work Title *</p>
            <Input
              value={form.title}
              onChange={(e) =>
                setForm((p) => ({ ...p, title: e.target.value }))
              }
              placeholder="Ex: Fan fitting at customer site"
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-gray-200">Work Description</p>
            <Input
              value={form.description}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
              placeholder="Issue details or task notes"
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-gray-200">
              Customer Reference (Optional)
            </p>
            <CustomerAutocomplete
              customers={customerUsers}
              value={form.customerRefId}
              onChange={(id) => setForm((p) => ({ ...p, customerRefId: id }))}
              placeholder="Search customer name or phone"
            />
          </div>
          <SelectField
            label="Assign To (Admin/Super Admin/Technician) *"
            value={form.assignedTechnicianId}
            onChange={(value) =>
              setForm((p) => ({ ...p, assignedTechnicianId: value }))
            }
            options={formTechnicianDropdown}
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <SelectField
              label="Priority"
              value={form.priority}
              onChange={(value) =>
                setForm((p) => ({ ...p, priority: value as any }))
              }
              options={priorityOptions.map((p) => ({
                value: p,
                label: toLabel(p),
              }))}
            />
            <SelectField
              label="Status"
              value={form.status}
              onChange={(value) =>
                setForm((p) => ({ ...p, status: value as any }))
              }
              options={statusOptions.map((s) => ({
                value: s,
                label: toLabel(s),
              }))}
            />
            <SelectField
              label="Issue Category"
              value={form.issueCategory}
              onChange={(value) =>
                setForm((p) => ({ ...p, issueCategory: value as any }))
              }
              options={categoryDropdown}
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-gray-200">Due Date & Time *</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input
                type="date"
                value={getDatePart(form.dueAt)}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    dueAt: `${e.target.value}T${getTimePart(p.dueAt) || getCurrentLocalTimeHHMM()}`,
                  }))
                }
                className="w-full bg-gray-800 border-gray-700 text-white [color-scheme:dark]"
              />
              <Input
                type="time"
                value={getTimePart(form.dueAt)}
                min="07:00"
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    dueAt: `${getDatePart(p.dueAt) || new Date().toISOString().slice(0, 10)}T${e.target.value}`,
                  }))
                }
                className="w-full bg-gray-800 border-gray-700 text-white [color-scheme:dark]"
              />
            </div>
          </div>
          {form.status === "completed" ||
          form.status === "cancelled" ||
          form.status === "hold" ? (
            <Input
              value={
                form.status === "completed"
                  ? form.completionNotes
                  : form.status === "hold"
                    ? form.holdReason
                    : form.cancellationReason
              }
              onChange={(e) =>
                setForm((p) =>
                  form.status === "completed"
                    ? { ...p, completionNotes: e.target.value }
                    : form.status === "hold"
                      ? { ...p, holdReason: e.target.value }
                      : { ...p, cancellationReason: e.target.value },
                )
              }
              placeholder={
                form.status === "completed"
                  ? "Completion notes (optional)"
                  : form.status === "hold"
                    ? "Hold reason*"
                    : "Cancellation reason*"
              }
              className="bg-gray-800 border-gray-700 text-white"
            />
          ) : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button onClick={saveTask} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmationModal
        isOpen={!!deleteTask}
        onClose={() => setDeleteTask(null)}
        onConfirm={removeTask}
        title="Delete Work Task"
        message={deleteTask ? `Delete "${deleteTask.title}"?` : ""}
        type="confirm"
        confirmText="Delete"
      />

      <Modal
        isOpen={!!activeTask}
        onClose={closeActiveTask}
        title={activeTask?.title || "Work Task"}
        size="sm"
      >
        {activeTask ? (
          <div className="space-y-3">
            {activeTask.customerRef?.name ? (
              <p className="text-sm text-gray-300">
                Customer:{" "}
                <span className="text-gray-100">
                  {activeTask.customerRef.name}
                  {activeTask.customerRef?.phone
                    ? ` (${activeTask.customerRef.phone})`
                    : ""}
                </span>
              </p>
            ) : null}
            <p className="text-sm text-gray-300">
              Assigned:{" "}
              {activeTask.assignedTechnicianName ||
                activeTask.assignedTechnician?.name ||
                "-"}
            </p>
            <p className="text-sm text-gray-300">
              Status: {toLabel(activeTask.status)}
            </p>
            <p className="text-sm text-gray-300">
              Priority: {toLabel(activeTask.priority)}
            </p>
            <p className="text-sm text-gray-300">
              Due: {formatDayDateTime(activeTask.dueAt)}
            </p>
            {activeTask.description ? (
              <p className="text-sm text-gray-200">{activeTask.description}</p>
            ) : null}
            <div className="flex gap-2 pt-2">
              <Button
                variant="secondary"
                onClick={() => updateTaskStatus(activeTask, "in-progress")}
                disabled={activeTask.status === "in-progress"}
                className="flex-1"
              >
                In Progress
              </Button>
              <Button
                onClick={markTaskCompleted}
                disabled={completingTask || activeTask.status === "completed"}
                className="flex-1"
              >
                {activeTask.status === "completed"
                  ? "Already Completed"
                  : completingTask
                    ? "Completing..."
                    : "Done"}
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  updateTaskStatus(
                    activeTask,
                    "cancelled",
                    "Cancelled by admin",
                  )
                }
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setDeleteTask(activeTask);
                  setActiveTask(null);
                }}
                className="flex-1"
              >
                Delete
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={!!actionTask}
        onClose={() => setActionTask(null)}
        title="Task Actions"
        size="sm"
      >
        {actionTask ? (
          <div className="space-y-2">
            <p className="text-sm text-gray-300">{actionTask.title}</p>
            <div className="grid grid-cols-1 gap-2">
              <Button
                variant="secondary"
                onClick={() => runAction("in-progress")}
                disabled={!!actionLoading}
                className="border border-yellow-500/35 bg-yellow-500/10 text-yellow-100 hover:bg-yellow-500/20"
              >
                {actionLoading === "in-progress" ? "Processing..." : "In Progress"}
              </Button>
              <Button
                variant="outline"
                onClick={() => runAction("done")}
                disabled={!!actionLoading}
                className="border border-green-500/35 bg-green-500/10 text-green-100 hover:bg-green-500/20"
              >
                {actionLoading === "done" ? "Processing..." : "Done"}
              </Button>
              <Button
                variant="outline"
                onClick={() => runAction("hold")}
                disabled={!!actionLoading}
                className="border border-amber-500/35 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20"
              >
                {actionLoading === "hold" ? "Processing..." : "Hold"}
              </Button>
              <Button
                variant="outline"
                onClick={() => runAction("cancel")}
                disabled={!!actionLoading}
                className="border border-slate-500/35 bg-slate-500/10 text-slate-100 hover:bg-slate-500/20"
              >
                {actionLoading === "cancel" ? "Processing..." : "Cancel"}
              </Button>
              <Button
                variant="outline"
                onClick={() => runAction("edit")}
                disabled={!!actionLoading}
                className="border border-blue-500/35 bg-blue-500/10 text-blue-100 hover:bg-blue-500/20"
              >
                {actionLoading === "edit" ? "Processing..." : "Edit"}
              </Button>
              <Button
                variant="destructive"
                onClick={() => runAction("delete")}
                disabled={!!actionLoading}
              >
                {actionLoading === "delete" ? "Processing..." : "Delete"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmationModal
        isOpen={!!holdTarget}
        onClose={() => {
          setHoldTarget(null);
          setHoldReason("");
        }}
        onConfirm={async () => {
          if (!holdTarget) return;
          if (!holdReason.trim()) {
            toast.error("Hold reason is required");
            return;
          }
          const target = holdTarget;
          setHoldTarget(null);
          await updateTaskStatus(target, "hold", holdReason.trim());
          setHoldReason("");
        }}
        type="confirm"
        title="Put Task On Hold"
        confirmText="Set Hold"
        content={
          <div className="space-y-2">
            <p className="text-sm text-gray-300">Reason for hold</p>
            <Input
              value={holdReason}
              onChange={(e) => setHoldReason(e.target.value)}
              placeholder="Enter hold reason"
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>
        }
      />
    </div>
  );
}
