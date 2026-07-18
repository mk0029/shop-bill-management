"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import ResponsiveAccordion from "@/components/ui/responsive-accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { AppDateTimePicker } from "@/components/ui/app-date-time-picker";
import CustomerAutocomplete from "@/components/ui/customer-autocomplete";
import { Modal } from "@/components/ui/modal";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { toast } from "sonner";
import {
  workTaskService,
  listenWorkTasks,
  type WorkTask,
  type WorkTaskRealtimeEvent,
} from "@/lib/work-task-service";
import { formatDayDateTime } from "@/lib/date-time";

type UserLite = {
  _id: string;
  name: string;
  role?: string;
  phone?: string;
  location?: string;
};

type CreateState = {
  title: string;
  description: string;
  customerRefId: string;
  assignedTechnicianId: string;
  priority: "low" | "medium" | "high" | "urgent";
  issueCategory:
    | "repair"
    | "fitting"
    | "wiring"
    | "delivery"
    | "payment"
    | "other";
  dueAt: string;
};

const initialCreate: CreateState = {
  title: "",
  description: "",
  customerRefId: "",
  assignedTechnicianId: "",
  priority: "medium",
  issueCategory: "other",
  dueAt: "",
};

const priorityOptions = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
  { label: "Urgent", value: "urgent" },
];
const categoryOptions = [
  { label: "Repair", value: "repair" },
  { label: "Fitting", value: "fitting" },
  { label: "Wiring", value: "wiring" },
  { label: "Delivery", value: "delivery" },
  { label: "Payment", value: "payment" },
  { label: "Other", value: "other" },
];

export default function WorkListDashboardSection({
  users,
}: {
  users: UserLite[];
}) {
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createState, setCreateState] = useState<CreateState>(initialCreate);
  const [saving, setSaving] = useState(false);
  const [activeTask, setActiveTask] = useState<WorkTask | null>(null);
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const technicians = useMemo(
    () =>
      users.filter((u) =>
        ["admin", "super_admin", "technician"].includes(
          String(u.role || "").toLowerCase(),
        ),
      ),
    [users],
  );
  const customers = useMemo(
    () =>
      users.filter((u) => String(u.role || "").toLowerCase() === "customer"),
    [users],
  );

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setLoading(true);
      const data = await workTaskService.getWorkTasks();
      const deduped = Array.from(
        new Map((data || []).map((t) => [t._id, t])).values(),
      );
      setTasks(deduped);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load work list");
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  const applyRealtimeEvent = useCallback((event?: WorkTaskRealtimeEvent) => {
    const id = String(event?.documentId || event?.result?._id || "");
    if (!id) return;
    if (event?.mutation?.transition === "disappear") {
      setTasks((prev) => prev.filter((t) => t._id !== id));
      return;
    }
    if (!event?.result) return;
    setTasks((prev) => {
      const without = prev.filter((t) => t._id !== id);
      return [event.result as WorkTask, ...without];
    });
  }, []);

  useEffect(() => {
    load();
    const sub = listenWorkTasks((event) => {
      applyRealtimeEvent(event);
      load({ silent: true });
    });
    return () => sub.unsubscribe();
  }, [load, applyRealtimeEvent]);

  const pendingTasks = useMemo(
    () =>
      tasks
        .filter(
          (t) =>
            t.status !== "completed" &&
            t.status !== "cancelled",
        )
        .filter((t) => {
          const hay =
            `${t.title || ""} ${t.assignedTechnicianName || t.assignedTechnician?.name || ""} ${t.customerRef?.name || ""}`.toLowerCase();
          return !q.trim() || hay.includes(q.toLowerCase());
        }),
    [tasks, q],
  );
  const completedCount = useMemo(
    () => tasks.filter((t) => t.status === "completed").length,
    [tasks],
  );

  const createTask = async () => {
    if (!createState.title.trim()) return toast.error("Title is required");
    if (!createState.assignedTechnicianId)
      return toast.error("Assignee is required");
    if (!createState.dueAt) return toast.error("Due date/time is required");
    try {
      setSaving(true);
      const payload = {
        title: createState.title.trim(),
        description: createState.description.trim() || undefined,
        customerRefId: createState.customerRefId || undefined,
        assignedTechnicianId: createState.assignedTechnicianId,
        priority: createState.priority,
        status: "pending",
        issueCategory: createState.issueCategory,
        dueAt: new Date(createState.dueAt).toISOString(),
      };
      const tempId = `temp-${Date.now()}`;
      const optimisticTask = {
        _id: tempId,
        title: payload.title,
        description: payload.description || "",
        customerRef:
          customers.find((c) => c._id === payload.customerRefId) || null,
        assignedTechnician:
          technicians.find((t) => t._id === payload.assignedTechnicianId) ||
          null,
        assignedTechnicianName:
          technicians.find((t) => t._id === payload.assignedTechnicianId)
            ?.name || "",
        priority: payload.priority,
        status: "pending" as const,
        issueCategory: payload.issueCategory,
        dueAt: payload.dueAt,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as WorkTask;
      setTasks((prev) => [optimisticTask, ...prev]);
      setCreateState(initialCreate);
      setShowCreate(false);
      const created = await workTaskService.createWorkTask(payload as any);
      setTasks((prev) => {
        const next = prev.filter((t) => t._id !== tempId);
        return Array.from(
          new Map([created, ...next].map((t) => [t._id, t])).values(),
        );
      });
      toast.success("Work created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create work");
    } finally {
      setSaving(false);
    }
  };

  const markComplete = async () => {
    if (!activeTask?._id) return;
    const snapshot = tasks;
    try {
      const nowIso = new Date().toISOString();
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
      setConfirmComplete(false);
      setActiveTask(null);
      toast.success("Work marked completed");
    } catch (e) {
      setTasks(snapshot);
      toast.error(e instanceof Error ? e.message : "Failed to complete work");
    }
  };

  const removeTask = async () => {
    if (!activeTask?._id) return;
    const deletingId = activeTask._id;
    const snapshot = tasks;
    try {
      setTasks((prev) => prev.filter((t) => t._id !== deletingId));
      await workTaskService.deleteWorkTask(deletingId);
      setConfirmDelete(false);
      setActiveTask(null);
      toast.success("Work deleted");
    } catch (e) {
      setTasks(snapshot);
      toast.error(e instanceof Error ? e.message : "Failed to delete work");
    }
  };

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardContent className="p-3 sm:p-4">
        <ResponsiveAccordion
          title="Work List"
          defaultExpandedOnDesktop
          defaultExpandedOnMobile={false}
        >
          <div className="space-y-3 mt-2">
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search pending work"
                className="bg-gray-800 border-gray-700 text-white sm:max-w-xs"
              />
              <Button onClick={() => setShowCreate(true)}>Create Work</Button>
            </div>
            <p className="text-xs text-gray-400">
              Pending:{" "}
              <span className="text-orange-400 font-semibold">
                {pendingTasks.length}
              </span>{" "}
              • Completed:{" "}
              <span className="text-green-400 font-semibold">
                {completedCount}
              </span>
            </p>
            {loading ? (
              <p className="text-sm text-gray-400">Loading work list...</p>
            ) : pendingTasks.length === 0 ? (
              <p className="text-sm text-gray-400">No pending work.</p>
            ) : (
              <div className="space-y-2">
                {pendingTasks.slice(0, 8).map((task) => (
                  <button
                    key={task._id}
                    type="button"
                    onClick={() => setActiveTask(task)}
                    className={`w-full text-left border rounded p-2.5 transition-colors ${
                      task.status === "hold"
                        ? "border-amber-500/35 bg-amber-500/10 hover:border-amber-500/50"
                        : "border-gray-800 bg-gray-950/60 hover:border-gray-700"
                    }`}
                  >
                    <p className="text-white text-sm font-medium">
                      {task.title}
                    </p>
                    <p className="text-xs text-gray-400">
                      {task.assignedTechnicianName ||
                        task.assignedTechnician?.name ||
                        "-"}{" "}
                      • {task.priority} • {String(task.status).replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </p>
                    {task.status === "hold" && task.holdReason ? (
                      <p className="text-xs text-amber-300 mt-1">
                        Hold: {task.holdReason}
                      </p>
                    ) : null}
                    <p className="text-xs text-gray-500">
                      Due: {formatDayDateTime(task.dueAt)}
                    </p>
                    {task.description ? (
                      <p className="text-xs text-gray-300 mt-1 line-clamp-2">
                        {task.description}
                      </p>
                    ) : null}
                  </button>
                ))}
              </div>
            )}
          </div>
        </ResponsiveAccordion>
      </CardContent>

      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Work"
        size="md"
      >
        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-300 mb-1">Work Title</p>
            <Input
              value={createState.title}
              onChange={(e) =>
                setCreateState((p) => ({ ...p, title: e.target.value }))
              }
              placeholder="Example: Fan fitting at customer site"
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>
          <div>
            <p className="text-xs text-gray-300 mb-1">
              Description / Issue Notes
            </p>
            <Input
              value={createState.description}
              onChange={(e) =>
                setCreateState((p) => ({ ...p, description: e.target.value }))
              }
              placeholder="Short issue details"
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>
          <div>
            <p className="text-xs text-gray-300 mb-1">
              Customer Reference (Optional)
            </p>
            <CustomerAutocomplete
              customers={customers}
              value={createState.customerRefId}
              onChange={(id) =>
                setCreateState((p) => ({ ...p, customerRefId: id }))
              }
              placeholder="Search customer name/phone"
            />
          </div>
          <SelectField
            label="Assign To (Admin / Super Admin / Technician)"
            value={createState.assignedTechnicianId}
            onChange={(v) =>
              setCreateState((p) => ({ ...p, assignedTechnicianId: v }))
            }
            options={technicians.map((t) => ({
              value: t._id,
              label: `${t.name} (${t.role})`,
            }))}
            placeholder="Choose assignee"
            required
          />
          <div className="grid grid-cols-2 gap-2">
            <SelectField
              label="Priority"
              value={createState.priority}
              onChange={(v) =>
                setCreateState((p) => ({ ...p, priority: v as any }))
              }
              options={priorityOptions}
              placeholder="Select priority"
            />
            <SelectField
              label="Issue Category"
              value={createState.issueCategory}
              onChange={(v) =>
                setCreateState((p) => ({ ...p, issueCategory: v as any }))
              }
              options={categoryOptions}
              placeholder="Select category"
            />
          </div>
          <div>
            <p className="text-xs text-gray-300 mb-1">Due Date & Time</p>
            <AppDateTimePicker
              mode="datetime"
              value={createState.dueAt}
              onChange={(v) => setCreateState((p) => ({ ...p, dueAt: v }))}
              placeholder="Select due date & time"
              disablePastDates
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button onClick={createTask} disabled={saving}>
              {saving ? "Saving..." : "Save Work"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!activeTask}
        onClose={() => setActiveTask(null)}
        title="Work Details"
        size="sm"
      >
        {activeTask ? (
          <div className="space-y-3">
            <p className="text-white font-medium">{activeTask.title}</p>
            <p className="text-xs text-gray-400">
              Assigned:{" "}
              {activeTask.assignedTechnicianName ||
                activeTask.assignedTechnician?.name ||
                "-"}
            </p>
            <p className="text-xs text-gray-400">
              Status: {activeTask.status} • Priority: {activeTask.priority}
            </p>
            <p className="text-xs text-gray-500">
              Due: {formatDayDateTime(activeTask.dueAt)}
            </p>
            {activeTask.description ? (
              <p className="text-xs text-gray-300">{activeTask.description}</p>
            ) : null}
            <div className="flex gap-2">
              <Button
                onClick={() => setConfirmComplete(true)}
                disabled={
                  activeTask.status === "completed" ||
                  activeTask.status === "cancelled"
                }
                className="flex-1"
              >
                Mark Complete
              </Button>
              <Button
                variant="destructive"
                onClick={() => setConfirmDelete(true)}
                className="flex-1"
              >
                Delete Work
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmationModal
        isOpen={confirmComplete}
        onClose={() => setConfirmComplete(false)}
        onConfirm={markComplete}
        type="confirm"
        title="Complete Work"
        message={activeTask ? `Mark "${activeTask.title}" as completed?` : ""}
        confirmText="Complete"
      />
      <ConfirmationModal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={removeTask}
        type="confirm"
        title="Delete Work"
        message={activeTask ? `Delete "${activeTask.title}"?` : ""}
        confirmText="Delete"
      />
    </Card>
  );
}
