/* Local Draft Service for Billing
 * Stores drafts in localStorage so they remain private per browser/admin.
 */

export type LocalBillDraftItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
  category: string;
  brand: string;
  specifications: string;
  unit: string;
  itemType: "standard" | "rewinding" | "custom";
};

export type LocalBillFormData = {
  customerId: string;
  serviceType: string;
  location: string;
  billDate: string;
  dueDate: string;
  notes: string;
  repairFee: number;
  homeVisitFee: number;
  laborCharges: number;
  isMarkAsPaid: boolean;
  enablePartialPayment: boolean;
  partialPaymentAmount: number;
};

export type LocalBillDraft = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  formData: Partial<LocalBillFormData>;
  selectedItems: LocalBillDraftItem[];
  meta?: Record<string, any>;
};

export type LocalDraftSummary = {
  id: string;
  title: string;
  updatedAt: number;
};

const PREFIX = "billing:drafts:v1";
const INDEX_KEY = `${PREFIX}:index`;
const ITEM_KEY = (id: string) => `${PREFIX}:draft:${id}`;

function safeGet<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function safeSet<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function safeRemove(key: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {}
}

function genId() {
  return `ld_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const localDraftService = {
  list(): LocalDraftSummary[] {
    return safeGet<LocalDraftSummary[]>(INDEX_KEY) || [];
  },

  get(id: string): LocalBillDraft | null {
    return safeGet<LocalBillDraft>(ITEM_KEY(id));
  },

  save(input: Omit<LocalBillDraft, "id" | "createdAt" | "updatedAt"> & { id?: string }): LocalBillDraft {
    const now = Date.now();
    const id = input.id || genId();
    const existing = this.get(id);
    const draft: LocalBillDraft = {
      id,
      title: input.title || existing?.title || "Untitled Draft",
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      formData: input.formData || existing?.formData || {},
      selectedItems: input.selectedItems || existing?.selectedItems || [],
      meta: input.meta || existing?.meta || {},
    };

    // write item
    safeSet(ITEM_KEY(id), draft);

    // update index
    const index = this.list().filter((d) => d.id !== id);
    index.unshift({ id, title: draft.title, updatedAt: draft.updatedAt });
    safeSet(INDEX_KEY, index.slice(0, 100)); // cap

    return draft;
  },

  rename(id: string, title: string) {
    const d = this.get(id);
    if (!d) return;
    d.title = title;
    d.updatedAt = Date.now();
    safeSet(ITEM_KEY(id), d);
    const idx = this.list().map((s) => (s.id === id ? { ...s, title, updatedAt: d.updatedAt } : s));
    safeSet(INDEX_KEY, idx);
  },

  remove(id: string) {
    safeRemove(ITEM_KEY(id));
    const idx = this.list().filter((s) => s.id !== id);
    safeSet(INDEX_KEY, idx);
  },

  clearAll() {
    const all = this.list();
    all.forEach((s) => safeRemove(ITEM_KEY(s.id)));
    safeSet(INDEX_KEY, []);
  },
};
