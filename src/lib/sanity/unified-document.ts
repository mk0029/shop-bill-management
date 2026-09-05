/**
 * Unified Document — Normalized application-level document representation.
 *
 * Every document returned by the multi-project layer includes database
 * metadata so the application knows exactly where it came from.
 */

import type { SanityClient } from "@sanity/client";
import type { UnifiedDocument } from "./types";

/**
 * Title field names to try when extracting a display title from a document.
 * Ordered by commonality across the existing schemas.
 */
const TITLE_FIELDS = [
  "title",
  "name",
  "label",
  "configName",
  "billNumber",
  "productName",
  "businessName",
  "fieldName",
];

/**
 * Slug field names to try when extracting a slug.
 */
const SLUG_FIELDS = ["slug", "key", "billId"];

/**
 * Extract a human-readable title from a Sanity document.
 */
function extractTitle(data: Record<string, unknown>): string | undefined {
  for (const field of TITLE_FIELDS) {
    const val = data[field];
    if (typeof val === "string" && val.trim()) return val.trim();
    // Handle Sanity slug objects: { current: "..." }
    if (typeof val === "object" && val !== null && "current" in val) {
      const slug = (val as { current?: string }).current;
      if (slug && typeof slug === "string") return slug;
    }
  }
  return undefined;
}

/**
 * Extract a slug from a Sanity document.
 */
function extractSlug(data: Record<string, unknown>): string | undefined {
  for (const field of SLUG_FIELDS) {
    const val = data[field];
    if (typeof val === "string" && val.trim()) return val.trim();
    if (typeof val === "object" && val !== null && "current" in val) {
      const slug = (val as { current?: string }).current;
      if (slug && typeof slug === "string") return slug;
    }
  }
  return undefined;
}

/**
 * Wrap a raw Sanity document into a UnifiedDocument with database metadata.
 *
 * @param sanityDoc - Raw document from Sanity (must have _id, _type)
 * @param databaseKey - Application-level database key (e.g. "primary", "inventory")
 * @param projectId - Sanity projectId
 * @param dataset - Sanity dataset
 */
export function toUnifiedDocument(
  sanityDoc: Record<string, unknown>,
  databaseKey: string,
  projectId: string,
  dataset: string
): UnifiedDocument {
  const { _id, _type, _createdAt, _updatedAt, _rev, ...rest } = sanityDoc;

  return {
    id: String(_id || ""),
    databaseKey,
    projectId,
    dataset,
    type: String(_type || ""),
    title: extractTitle(rest as Record<string, unknown>),
    slug: extractSlug(rest as Record<string, unknown>),
    createdAt: (_createdAt as string) || undefined,
    updatedAt: (_updatedAt as string) || undefined,
    data: rest as Record<string, unknown>,
    revision: (_rev as string) || undefined,
  };
}

/**
 * Convert multiple Sanity documents to unified documents in batch.
 */
export function toUnifiedDocuments(
  sanityDocs: Record<string, unknown>[],
  databaseKey: string,
  projectId: string,
  dataset: string
): UnifiedDocument[] {
  return sanityDocs.map((doc) =>
    toUnifiedDocument(doc, databaseKey, projectId, dataset)
  );
}

/**
 * Extract just the database metadata from a UnifiedDocument
 * without the full data payload. Useful for lightweight listings.
 */
export type UnifiedDocumentMeta = Omit<UnifiedDocument, "data">;

export function toUnifiedDocumentMeta(
  doc: UnifiedDocument
): UnifiedDocumentMeta {
  const { data: _data, ...meta } = doc;
  return meta;
}
