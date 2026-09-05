import type {
  ToolItem,
  ToolRental,
  DurationType,
} from "@/lib/tool-rental-service";

async function handle<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => ({} as any));
  if (!res.ok || json?.success === false) {
    throw new Error(json?.error || `Request failed (${res.status})`);
  }
  return (json?.data ?? null) as T;
}

function manageUrl(query: Record<string, string>) {
  const q = new URLSearchParams(query).toString();
  return `/api/tools${q ? `?${q}` : ""}`;
}

export async function getTools(): Promise<ToolItem[]> {
  const res = await fetch(manageUrl({}), { cache: "no-store" });
  const data = await handle<ToolItem[]>(res);
  return Array.isArray(data) ? data : [];
}

export async function getToolById(toolId: string): Promise<ToolItem | null> {
  const res = await fetch(manageUrl({ id: toolId }), { cache: "no-store" });
  return handle<ToolItem | null>(res);
}

export async function createTool(payload: Partial<ToolItem>): Promise<{ _id: string }> {
  const res = await fetch("/api/tools", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handle<{ _id: string }>(res);
}

export async function updateTool(toolId: string, payload: Partial<ToolItem>): Promise<boolean> {
  const res = await fetch("/api/tools", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: toolId, ...payload }),
  });
  const data = await handle<{ updated: boolean }>(res);
  return Boolean(data?.updated);
}

export async function deleteTool(toolId: string): Promise<boolean> {
  const res = await fetch(manageUrl({ id: toolId }), { method: "DELETE" });
  const data = await handle<{ deleted: boolean }>(res);
  return Boolean(data?.deleted);
}

export async function getToolRentals(): Promise<ToolRental[]> {
  const res = await fetch("/api/tool-rentals", { cache: "no-store" });
  const data = await handle<ToolRental[]>(res);
  return Array.isArray(data) ? data : [];
}

export async function createToolRental(input: {
  customer: { _id: string; customerId?: string; name: string; phone: string };
  tool: ToolItem;
  durationType: DurationType;
  durationValue: number;
  paidAmount?: number;
  notes?: string;
  createdBy?: string;
  depositAmount?: number;
}): Promise<ToolRental | null> {
  const res = await fetch("/api/tool-rentals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handle<ToolRental | null>(res);
}

export async function markToolReturned(
  rentalId: string,
  paidAmount?: number,
): Promise<{ overdueUnits: number; extraChargeAmount: number; finalTotal: number; paymentStatus: string }> {
  const res = await fetch(`/api/tool-rentals/${encodeURIComponent(rentalId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "return", ...(paidAmount != null ? { paidAmount } : {}) }),
  });
  return handle(res);
}

export async function markRentalPaid(
  rentalId: string,
  currentTotalAmount: number,
  paidAmount: number,
): Promise<boolean> {
  const res = await fetch(`/api/tool-rentals/${encodeURIComponent(rentalId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "payment", currentTotalAmount, paidAmount }),
  });
  const data = await handle<{ updated: boolean }>(res);
  return Boolean(data?.updated);
}

export async function updateRentalDuration(
  rentalId: string,
  input: { durationType: DurationType; durationValue: number },
): Promise<boolean> {
  const res = await fetch(`/api/tool-rentals/${encodeURIComponent(rentalId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "duration", ...input }),
  });
  const data = await handle<{ updated: boolean }>(res);
  return Boolean(data?.updated);
}

export async function updateToolRental(
  rentalId: string,
  patch: Partial<ToolRental>,
): Promise<boolean> {
  const res = await fetch(`/api/tool-rentals/${encodeURIComponent(rentalId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "update", patch }),
  });
  const data = await handle<{ updated: boolean }>(res);
  return Boolean(data?.updated);
}

export async function deleteToolRental(rentalId: string): Promise<{ success: boolean }> {
  const res = await fetch(`/api/tool-rentals/${encodeURIComponent(rentalId)}`, {
    method: "DELETE",
  });
  return handle(res);
}