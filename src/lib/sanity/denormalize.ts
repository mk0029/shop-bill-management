/**
 * Denormalize reference fields for cross-database writes.
 *
 * Sanity references are dataset-local: a `reference` to type X can only point
 * to a document of type X that lives in the SAME project/dataset. When writing
 * to a database that does not contain the referenced document (e.g. a cashbook
 * entry referencing a user/bill that lives in the primary DB), the write fails
 * with "references non-existent document".
 *
 * This module strips reference fields / reference objects from documents so they
 * can be written to a database that does not host the referenced docs. Any
 * reference `_ref` is either dropped (if a companion plain-string field already
 * carries the id) or hoisted into a companion plain-string field.
 */

export type DenormalizeOptions = {
  /**
   * Field names (top-level) that hold Sanity `reference` objects. These are
   * converted: the reference value is dropped from the output, and if
   * `hoistRefs` is true its `_ref` is written to `<field>Id`.
   */
  referenceFields?: string[];
  /**
   * Field names (top-level) whose value is an array of objects that each contain
   * a `reference` sub-field. The reference sub-field is dropped/hoisted,
   * everything else in each array item is preserved (including `_key`).
   */
  arrayReferenceFields?: string[];
  /**
   * When true, a dropped reference's `_ref` is written to a companion field
   * named `<field>Id` (e.g. `user` -> `userId`). When false, the reference is
   * simply removed and any existing companion string field is left untouched.
   */
  hoistRefs?: boolean;
};

const REFERENCE_FIELD = "_ref";

function isReferenceObject(value: unknown): value is { _type?: string; _ref: string; _key?: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    typeof (value as { _ref?: unknown })._ref === "string"
  );
}

/**
 * Produce a new document with reference fields flattened/dropped so it can be
 * written to a database that may not host the referenced documents.
 *
 * The input document is NOT mutated.
 */
export function denormalizeReferences<T extends Record<string, unknown>>(
  document: T,
  options: DenormalizeOptions = {}
): Record<string, unknown> {
  const {
    referenceFields = [],
    arrayReferenceFields = [],
    hoistRefs = true,
  } = options;

  const out: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(document)) {
    // Top-level reference field
    if (referenceFields.includes(key) && isReferenceObject(value)) {
      if (hoistRefs) {
        out[`${key}Id`] = value._ref;
      }
      continue; // drop the reference object itself
    }

    // Array-of-objects field that may contain references
    if (arrayReferenceFields.includes(key) && Array.isArray(value)) {
      const items = value
        .map((item) => {
          if (typeof item !== "object" || item === null || Array.isArray(item)) {
            return item;
          }
          const obj = item as Record<string, unknown>;
          const clean: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(obj)) {
            if (k === REFERENCE_FIELD || (k === "billRef" && isReferenceObject(v))) {
              if (hoistRefs && isReferenceObject(v)) {
                clean[`${k}Id`] = v._ref;
              }
              continue;
            }
            if (k === "billRef" && isReferenceObject(v)) {
              // handled above
            }
            clean[k] = v;
          }
          return clean;
        })
        .filter((item) => item !== undefined);
      out[key] = items;
      continue;
    }

    out[key] = value;
  }

  return out;
}

/**
 * Convenience: denormalize a `cashBookEntry` for writing to the cashbook DB.
 * The reference fields `user`, `bill`, `product` are dropped and the entry's
 * existing plain-string id fields (`customerId`, `createdBy`) are preserved.
 * Multi-bill references in `appliedBills[].billRef` are hoisted to `billRefId`.
 */
export function denormalizeCashbookEntry<T extends Record<string, unknown>>(
  document: T
): Record<string, unknown> {
  const out = denormalizeReferences(document, {
    referenceFields: ["user", "bill", "product"],
    arrayReferenceFields: ["appliedBills"],
    hoistRefs: true,
  });

  // Ensure scalar denormalized ids exist for reads/lookups.
  const ref = document;
  const userObj = ref.user as { _ref?: string } | undefined;
  const billObj = ref.bill as { _ref?: string } | undefined;
  if (userObj?._ref && !out.userId) {
    out.userId = userObj._ref;
  }
  if (billObj?._ref && !out.billId) {
    out.billId = billObj._ref;
  }

  return out;
}

/**
 * Denormalize a `bill` for writing to the billing DB.
 *
 * Sanity references are dataset-local, so a bill written to the billing DB
 * cannot carry references to users (customer/technician) that live in a
 * different DB. Each reference is converted to a plain-string `<field>Id` and
 * an inline `<field>Name`, and `items[].product` references are hoisted to
 * `productId` per line item.
 */
export function denormalizeBill<T extends Record<string, unknown>>(
  document: T
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const refFields = ["customer", "technician", "createdBy", "updatedBy", "cashbookEntry"] as const;

  for (const [key, value] of Object.entries(document)) {
    if ((refFields as readonly string[]).includes(key) && isReferenceObject(value)) {
      // Keep the field name as a plain-string id AND provide a companion
      // `<field>Id` so existing `customer == $id` / `customerId == $id`
      // predicates keep matching.
      out[key] = value._ref;
      out[`${key}Id`] = value._ref;
      continue;
    }

    if (key === "items" && Array.isArray(value)) {
      const items = value
        .map((item) => {
          if (typeof item !== "object" || item === null || Array.isArray(item)) {
            return item;
          }
          const obj = item as Record<string, unknown>;
          const clean: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(obj)) {
            if (k === "product" && isReferenceObject(v)) {
              if (typeof v._ref === "string") {
                clean.productId = v._ref;
              }
              continue;
            }
            clean[k] = v;
          }
          return clean;
        })
        .filter((item) => item !== undefined);
      out.items = items;
      continue;
    }

    out[key] = value;
  }

  return out;
}
