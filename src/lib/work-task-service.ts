import { sanityClient } from "@/lib/sanity";

export type WorkTaskStatus = "pending" | "in-progress" | "completed" | "cancelled" | "hold";
export type WorkTaskPriority = "low" | "medium" | "high" | "urgent";
export type WorkTaskCategory = "repair" | "fitting" | "wiring" | "delivery" | "payment" | "other";

export type WorkTask = {
  _id: string;
  title: string;
  description?: string;
  customerRef?: { _id: string; name?: string; phone?: string } | null;
  assignedTechnician?: { _id: string; name?: string; phone?: string } | null;
  assignedTechnicianName?: string;
  priority: WorkTaskPriority;
  status: WorkTaskStatus;
  issueCategory: WorkTaskCategory;
  dueAt: string;
  completionNotes?: string;
  cancellationReason?: string;
  holdReason?: string;
  repairRequestId?: string;
  repairDetails?: string;
  customerNotes?: string;
  requestSource?: string;
  createdBy?: { _id: string; name?: string } | null;
  createdByName?: string;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  estimatedCharge?: number;
  billId?: string;
  billNumber?: string;
  completionMethod?: string;
};

export type WorkTaskInput = {
  title: string;
  description?: string;
  customerRefId?: string;
  assignedTechnicianId: string;
  priority: WorkTaskPriority;
  status: WorkTaskStatus;
  issueCategory: WorkTaskCategory;
  dueAt: string;
  completionNotes?: string;
  cancellationReason?: string;
  holdReason?: string;
  completionMethod?: string;
};

export type WorkTaskRealtimeEvent = {
  documentId?: string;
  result?: WorkTask | null;
  mutation?: {
    transition?: "appear" | "update" | "disappear";
  };
};

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const json = await res.json().catch(() => ({} as any));
  if (!res.ok || json?.success === false) {
    throw new Error(json?.error || `Request failed (${res.status})`);
  }
  return json as T;
}

export const workTaskService = {
  async getWorkTasks(params?: {
    status?: string;
    technicianId?: string;
    priority?: string;
    date?: string;
    q?: string;
  }) {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.technicianId) q.set("technicianId", params.technicianId);
    if (params?.priority) q.set("priority", params.priority);
    if (params?.date) q.set("date", params.date);
    if (params?.q) q.set("q", params.q);
    const query = q.toString();
    const result = await api<{ success: boolean; data: WorkTask[] }>(
      `/api/work-tasks${query ? `?${query}` : ""}`,
    );
    return result.data || [];
  },

  async createWorkTask(input: WorkTaskInput) {
    const result = await api<{ success: boolean; data: WorkTask }>(
      "/api/work-tasks",
      { method: "POST", body: JSON.stringify(input) },
    );
    return result.data;
  },

  async updateWorkTask(taskId: string, input: Partial<WorkTaskInput>) {
    const result = await api<{ success: boolean; data: WorkTask }>(
      `/api/work-tasks/${taskId}`,
      { method: "PATCH", body: JSON.stringify(input) },
    );
    return result.data;
  },

  async deleteWorkTask(taskId: string) {
    await api<{ success: boolean }>(`/api/work-tasks/${taskId}`, {
      method: "DELETE",
    });
  },
};

export function listenWorkTasks(onUpdate: (event?: WorkTaskRealtimeEvent) => void) {
  return sanityClient
    .listen('*[_type == "workTask"]', {}, { includeResult: true, visibility: "query" })
    .subscribe((event) => onUpdate(event as WorkTaskRealtimeEvent));
}
