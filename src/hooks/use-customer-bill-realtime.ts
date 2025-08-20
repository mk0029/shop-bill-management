"use client";

import { useEffect, useRef } from "react";
import type { Subscription } from "rxjs";
import type { SanityDocument } from "@sanity/client";
import { sanityClient } from "@/lib/sanity";
import { useCustomerBillsStore, type CustomerBill } from "@/store/customer-bills-store";

interface RealtimeUpdate<T = any> {
  result: T | null;
  previous?: T | null;
  transition: "appear" | "update" | "disappear";
  documentId: string;
}

/**
 * Realtime listener for customer bills scoped strictly to a single customer _id.
 * - Listens only to bills whose `customer._ref` equals the provided customerId.
 * - Updates the customer-only Zustand store (no admin/global stores).
 */
type CustomerIdentifiers = {
  _id?: string; // Sanity _id
  customerId?: string; // business/customerId field
};

export function useCustomerBillRealtime(ids?: CustomerIdentifiers) {
  const subscriptionRef = useRef<Subscription | null>(null);
  const { addOrUpdateBill, removeBill } = useCustomerBillsStore();

  useEffect(() => {
    const hasAnyId = Boolean(ids?._id || ids?.customerId);
    if (!hasAnyId) return;

    // Build conditions dynamically to avoid invalid GROQ like "(false || ...)"
    const conditions: string[] = [];
    if (ids?._id) {
      conditions.push(
        `defined(customer) && (customer._ref == $sanityId || customer == $sanityId || customer._id == $sanityId || customer->_id == $sanityId)`
      );
    }
    if (ids?.customerId) {
      conditions.push(`defined(customer) && customer->customerId == $customerBizId`);
    }
    const where = conditions.length > 0 ? conditions.join(" || ") : "false";

    // GROQ query scoped to this customer's bills (handle multiple schema variants)
    const query = `*[_type == "bill" && (${where})] {
      ...,
      customer->{
        _id,
        name,
        phone,
        email
      }
    }`;

    // Start listening
    const params: Record<string, string> = {};
    if (ids?._id) params.sanityId = ids._id;
    if (ids?.customerId) params.customerBizId = ids.customerId;

    subscriptionRef.current = sanityClient
      .listen(query, params, { includeResult: true, includePreviousRevision: true })
      .subscribe({
        next: (update) => {
          const { transition, result, documentId } = update as unknown as RealtimeUpdate<SanityDocument & CustomerBill>;
          if (!result && transition !== "disappear") return;

          switch (transition) {
            case "appear":
            case "update":
              // Upsert bill in customer store
              addOrUpdateBill({ ...(result as any) });
              break;
            case "disappear":
              // Remove from store by _id
              removeBill(documentId);
              break;
          }
        },
        error: (err) => {
          console.error("[useCustomerBillRealtime] listener error", err);
        },
        complete: () => {
          // noop
        },
      });

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [ids?._id, ids?.customerId, addOrUpdateBill, removeBill]);
}
