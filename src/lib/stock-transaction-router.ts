/**
 * Stock Transaction Router — writes stockTransaction documents to the
 * inventory database from ANY context (server route handler or browser).
 *
 * - Server: delegates to the write-router (`createDocument`/`updateDocument`/
 *   `deleteDocument`) with purpose "stock", which resolves to the inventory DB.
 * - Client: posts to the auth-guarded `/api/mutations/inventory/stock-transactions`
 *   API route, which performs the same purpose-routed write server-side.
 *
 * This guarantees `stockTransaction` docs never land in the primary dataset.
 */

export type RoutedStockTxResult<T = unknown> = {
  success: boolean;
  id?: string;
  data?: T;
  error?: string;
};

const STOCK_TX_ROUTE = "/api/mutations/inventory/stock-transactions";

function errorMessage(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}

async function createOnServer(transaction: Record<string, unknown>): Promise<RoutedStockTxResult> {
  try {
    const { createDocument } = await import("@/lib/sanity/write-router");
    const res = await createDocument(transaction, "stock");
    if (!res.success) {
      return { success: false, error: res.error || "Failed to create stock transaction" };
    }
    return { success: true, id: res.documentId };
  } catch (e) {
    return { success: false, error: errorMessage(e, "Failed to create stock transaction") };
  }
}

async function updateOnServer(id: string, patch: Record<string, unknown>): Promise<RoutedStockTxResult> {
  try {
    const { updateDocument } = await import("@/lib/sanity/write-router");
    const res = await updateDocument(id, patch, "stock");
    if (!res.success) {
      return { success: false, error: res.error || "Failed to update stock transaction" };
    }
    return { success: true, id };
  } catch (e) {
    return { success: false, error: errorMessage(e, "Failed to update stock transaction") };
  }
}

async function deleteOnServer(id: string): Promise<RoutedStockTxResult<void>> {
  try {
    const { deleteDocument } = await import("@/lib/sanity/write-router");
    const res = await deleteDocument(id, "stock");
    if (!res.success) {
      return { success: false, error: res.error || "Failed to delete stock transaction" };
    }
    return { success: true, id };
  } catch (e) {
    return { success: false, error: errorMessage(e, "Failed to delete stock transaction") };
  }
}

export async function createStockTransactionRecord(
  transaction: Record<string, unknown>
): Promise<RoutedStockTxResult> {
  if (typeof window === "undefined") {
    return createOnServer(transaction);
  }
  try {
    const res = await fetch(STOCK_TX_ROUTE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transaction }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.success) {
      return {
        success: false,
        error: json?.error || `Failed to create stock transaction (${res.status})`,
      };
    }
    return { success: true, data: json?.data, id: String(json?.data?._id || "") };
  } catch (e) {
    return { success: false, error: errorMessage(e, "Failed to create stock transaction") };
  }
}

export async function updateStockTransactionRecord(
  id: string,
  patch: Record<string, unknown>
): Promise<RoutedStockTxResult> {
  if (typeof window === "undefined") {
    return updateOnServer(id, patch);
  }
  try {
    const res = await fetch(STOCK_TX_ROUTE, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, patch }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.success) {
      return {
        success: false,
        error: json?.error || `Failed to update stock transaction (${res.status})`,
      };
    }
    return { success: true, id };
  } catch (e) {
    return { success: false, error: errorMessage(e, "Failed to update stock transaction") };
  }
}

export async function deleteStockTransactionRecord(id: string): Promise<RoutedStockTxResult<void>> {
  if (typeof window === "undefined") {
    return deleteOnServer(id);
  }
  try {
    const res = await fetch(STOCK_TX_ROUTE, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.success) {
      return {
        success: false,
        error: json?.error || `Failed to delete stock transaction (${res.status})`,
      };
    }
    return { success: true, id };
  } catch (e) {
    return { success: false, error: errorMessage(e, "Failed to delete stock transaction") };
  }
}