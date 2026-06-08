"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarClock, ClipboardList, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { workTaskService, type WorkTask } from "@/lib/work-task-service";
import { formatDayDateTime } from "@/lib/date-time";
import { safeUserName } from "@/lib/display-text";

function toLabel(value?: string) {
  return String(value || "-").replace(/-/g, " ");
}

function statusClass(status?: string) {
  if (status === "completed") return "border-emerald-500/40 bg-emerald-500/15 text-emerald-200";
  if (status === "cancelled") return "border-rose-500/40 bg-rose-500/15 text-rose-200";
  if (status === "hold") return "border-amber-500/40 bg-amber-500/15 text-amber-200";
  if (status === "in-progress") return "border-sky-500/40 bg-sky-500/15 text-sky-200";
  return "border-slate-500/40 bg-slate-700/40 text-slate-200";
}

function priorityClass(priority?: string) {
  if (priority === "urgent") return "border-rose-500/40 bg-rose-500/15 text-rose-200";
  if (priority === "high") return "border-orange-500/40 bg-orange-500/15 text-orange-200";
  if (priority === "low") return "border-slate-500/40 bg-slate-700/40 text-slate-200";
  return "border-blue-500/40 bg-blue-500/15 text-blue-200";
}

export default function CustomerWorkTasksClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<WorkTask | null>(null);

  const loadTasks = useCallback(async () => {
    try {
      const nextTasks = await workTaskService.getWorkTasks();
      setTasks(nextTasks);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTasks();
    const timer = window.setInterval(() => void loadTasks(), 30000);
    const onFocus = () => void loadTasks();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [loadTasks]);

  useEffect(() => {
    const openTaskId = searchParams.get("open");
    if (!openTaskId || loading) return;
    const task = tasks.find((item) => String(item._id) === openTaskId);
    if (task) setSelectedTask(task);
  }, [loading, searchParams, tasks]);

  const closeTask = useCallback(() => {
    setSelectedTask(null);
    if (!searchParams.has("open")) return;
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("open");
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const activeTasks = useMemo(
    () => tasks.filter((task) => !["completed", "cancelled"].includes(String(task.status || ""))),
    [tasks],
  );

  return (
    <div data-dashboard-loaded="true" className="space-y-4 sm:space-y-6">
      <div className="max-sm:hidden">
        <h2 className="text-2xl font-bold text-white">Service Tasks</h2>
        <p className="text-gray-400">Track your service requests and technician updates.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="border-gray-800 bg-gray-900">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-white">{tasks.length}</div>
            <div className="text-sm text-gray-400">Total</div>
          </CardContent>
        </Card>
        <Card className="border-gray-800 bg-gray-900">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-sky-200">{activeTasks.length}</div>
            <div className="text-sm text-gray-400">Active</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-gray-800 bg-gray-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <ClipboardList className="h-5 w-5" />
            Your Work Updates
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading service tasks...</div>
          ) : tasks.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No service tasks found.</div>
          ) : (
            <div className="divide-y divide-gray-800">
              {tasks.map((task) => (
                <button
                  key={task._id}
                  type="button"
                  onClick={() => setSelectedTask(task)}
                  className="block w-full p-4 text-left transition hover:bg-gray-800/60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-base font-semibold text-white">{task.title}</div>
                      {task.description ? (
                        <div className="mt-1 line-clamp-2 text-sm text-gray-400">{task.description}</div>
                      ) : null}
                    </div>
                    <Badge className={statusClass(task.status)}>{toLabel(task.status)}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <Badge className={priorityClass(task.priority)}>{toLabel(task.priority)}</Badge>
                    <span className="inline-flex items-center gap-1 rounded-full border border-gray-700 px-2.5 py-0.5 text-gray-300">
                      <CalendarClock className="h-3.5 w-3.5" />
                      {task.dueAt ? formatDayDateTime(task.dueAt) : "-"}
                    </span>
                    {(task.assignedTechnicianName || task.assignedTechnician?.name) && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-gray-700 px-2.5 py-0.5 text-gray-300">
                        <UserRound className="h-3.5 w-3.5" />
                        {safeUserName(task.assignedTechnicianName || task.assignedTechnician?.name, "Technician")}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60 p-0 sm:items-center sm:justify-center sm:p-4">
          <div className="max-h-[85vh] w-full overflow-y-auto rounded-t-lg border border-gray-800 bg-gray-950 p-4 shadow-xl sm:max-w-lg sm:rounded-lg sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-white">{selectedTask.title}</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge className={statusClass(selectedTask.status)}>{toLabel(selectedTask.status)}</Badge>
                  <Badge className={priorityClass(selectedTask.priority)}>{toLabel(selectedTask.priority)}</Badge>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={closeTask} className="h-9 w-9 shrink-0">
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-3 text-sm text-gray-300">
              <div>
                <div className="text-gray-500">Due</div>
                <div className="text-gray-100">{selectedTask.dueAt ? formatDayDateTime(selectedTask.dueAt) : "-"}</div>
              </div>
              <div>
                <div className="text-gray-500">Technician</div>
                <div className="text-gray-100">
                  {selectedTask.assignedTechnicianName || selectedTask.assignedTechnician?.name
                    ? safeUserName(selectedTask.assignedTechnicianName || selectedTask.assignedTechnician?.name, "Technician")
                    : "-"}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Category</div>
                <div className="capitalize text-gray-100">{toLabel(selectedTask.issueCategory)}</div>
              </div>
              {selectedTask.description ? <p className="rounded-md bg-gray-900 p-3 text-gray-100">{selectedTask.description}</p> : null}
              {selectedTask.holdReason ? <p className="rounded-md bg-amber-500/10 p-3 text-amber-100">Hold reason: {selectedTask.holdReason}</p> : null}
              {selectedTask.cancellationReason ? <p className="rounded-md bg-rose-500/10 p-3 text-rose-100">Cancellation reason: {selectedTask.cancellationReason}</p> : null}
              {selectedTask.completionNotes ? <p className="rounded-md bg-emerald-500/10 p-3 text-emerald-100">Completion notes: {selectedTask.completionNotes}</p> : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
