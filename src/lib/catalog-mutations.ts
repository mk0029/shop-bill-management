/**
 * Client helper for routed catalog mutations (brands, categories,
 * specifications, dynamic fields, suppliers, products, stock transactions).
 * Writes go through the admin-gated `/api/mutations/catalog` route which routes
 * by purpose to the correct writable DB (catalog DB, inventory DB).
 */

export async function catalogCreate(type: string, doc: Record<string, unknown>) {
  const res = await fetch("/api/mutations/catalog", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "create", type, doc }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.success === false) {
    throw new Error(json?.error || `Catalog create failed (${res.status})`);
  }
  return (json?.data ?? {}) as Record<string, any>;
}

export async function catalogUpdate(type: string, id: string, patch: Record<string, unknown>) {
  const res = await fetch("/api/mutations/catalog", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "update", type, id, patch }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.success === false) {
    throw new Error(json?.error || `Catalog update failed (${res.status})`);
  }
  return json?.data;
}

export async function catalogDelete(type: string, id: string) {
  const res = await fetch("/api/mutations/catalog", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "delete", type, id }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.success === false) {
    throw new Error(json?.error || `Catalog delete failed (${res.status})`);
  }
  return json?.data;
}