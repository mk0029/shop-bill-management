/**
 * Federated bill reads — aggregates bills from the primary DB (legacy/ref bills)
 * and the billing DB (denormalized bills) into a single display-ready list.
 *
 * New bills created in the billing DB store `customer`/`technician` as plain
 * string ids (plus inline `customerName`/`customerPhone`/`customerId`), so the
 * reports/UI that relied on `customer->` joins stop resolving. This module
 * rebuilds the object-shaped `customer`/`technician`/`items[].product` fields
 * at read time so existing consumers keep working unchanged.
 */

import { sanityClient, getSanityClient } from "@/lib/sanity";
import type { SanityClient } from "@sanity/client";

const BILL_PROJECTION = `{
  _id,
  _type,
  _createdAt,
  _updatedAt,
  ...,
  "customerRaw": customer,
  "customerJoined": customer->_id,
  "customer": customer->{ _id, customerId, name, nickname, phone, email, location, role },
  "technician": technician->{ _id, name, nickname, phone, email },
  "items": items[]{
    _key,
    ...,
    "productJoined": product->_id,
    "product": product->{ _id, _type, name, productName, description, specifications, "brand": brand->{name, _id}, "category": category->{name, _id} },
    "category": category->{ _id, name }
  }
}`;

export const FEDERATED_BILLS_QUERY = (customerIds: string[] = []) => {
  const filter = customerIds.length
    ? `customer._ref in $customerIds || customer in $customerIds || customer._id in $customerIds || customerId in $customerIds || customer->customerId in $customerIds`
    : `_type == "bill"`;
  return `*[_type == "bill" && (${filter})]${BILL_PROJECTION} | order(coalesce(createdAt, _createdAt) desc)`;
};

/** Rebuild object-shaped refs for a denormalized bill. Never mutates input. */
export function normalizeBillForRead(bill: Record<string, any>): Record<string, any> {
  if (!bill || typeof bill !== "object") return bill;

  const out: Record<string, any> = { ...bill };

  // customer: keep joined object when resolved, else rebuild from a plain id
  const rawCustomer = out.customerRaw;
  const joinedCustomer = out.customer;
  if (joinedCustomer && typeof joinedCustomer === "object" && joinedCustomer._id) {
    out.customer = joinedCustomer;
  } else if (typeof rawCustomer === "object" && rawCustomer && rawCustomer._ref) {
    out.customer = rawCustomer;
  } else if (typeof rawCustomer === "string") {
    out.customer = {
      _id: rawCustomer,
      customerId: out.customerId || rawCustomer,
      name: out.customerName || out.customerId || rawCustomer,
      phone: out.customerPhone || "",
    };
  }

  // technician: object OR plain-string id
  if (typeof out.technician === "string") {
    out.technician = {
      _id: out.technician,
      name: out.technicianName || out.technician,
    };
  }

  // items: rebuild product object when only a productId string exists
  if (Array.isArray(out.items)) {
    out.items = out.items.map((item: Record<string, any>) => {
      if (!item || typeof item !== "object") return item;
      const clean = { ...item };
      if (!clean.product && typeof clean.productId === "string") {
        clean.product = {
          _id: clean.productId,
          name: clean.productName || clean.itemName || clean.productId,
        };
      }
      return clean;
    });
  }

  delete out.customerRaw;
  delete out.customerJoined;
  delete out.productJoined;

  return out;
}

function mergeBills(primary: any[], billing: any[]): any[] {
  const map = new Map<string, any>();
  for (const bill of [...billing, ...primary]) {
    if (!bill?._id) continue;
    const existing = map.get(bill._id);
    if (!existing) {
      map.set(bill._id, bill);
      continue;
    }
    const a = bill.updatedAt || bill._updatedAt || "";
    const b = existing.updatedAt || existing._updatedAt || "";
    if (a > b) map.set(bill._id, bill);
  }
  return Array.from(map.values());
}

/**
 * Fetch bills from primary + billing DBs and merge into a single list.
 * Runs the two queries in parallel; a failure in one DB is non-fatal.
 */
export async function fetchBills(
  opts: { customerId?: string; customerIds?: string[] } = {}
): Promise<Record<string, any>[]> {
  const customerIds = Array.from(
    new Set(
      [opts.customerId, ...(opts.customerIds ?? [])]
        .filter(Boolean)
        .map((v) => String(v)),
    ),
  );
  const query = FEDERATED_BILLS_QUERY(customerIds);
  const params = customerIds.length ? { customerIds } : {};

  const [primaryRes, billingRes] = await Promise.allSettled([
    sanityClient.fetch(query, params),
    getSanityClient("billing").fetch(query, params),
  ]);

  const primary = (primaryRes.status === "fulfilled" ? primaryRes.value : []) as Record<string, any>[];
  const billing = (billingRes.status === "fulfilled" ? billingRes.value : []) as Record<string, any>[];

  return mergeBills(primary, billing).map(normalizeBillForRead);
}

/** Fetch a single bill (by _id or billId) across both DBs. */
export async function fetchBillById(billId: string): Promise<Record<string, any> | null> {
  const query = `*[_type == "bill" && (_id == $id || billId == $id)][0]${BILL_PROJECTION}`;
  const params = { id: billId };

  const [primaryRes, billingRes] = await Promise.allSettled([
    sanityClient.fetch(query, params),
    getSanityClient("billing").fetch(query, params),
  ]);

  const primary = primaryRes.status === "fulfilled" ? primaryRes.value : null;
  const billing = billingRes.status === "fulfilled" ? billingRes.value : null;

  if (!primary && !billing) return null;
  if (primary && billing) {
    const a = primary.updatedAt || primary._updatedAt || "";
    const b = billing.updatedAt || billing._updatedAt || "";
    return normalizeBillForRead(a > b ? primary : billing);
  }
  return normalizeBillForRead(primary || billing);
}

export type { SanityClient };