import { createDocument, updateDocument } from "./sanity/write-router";
import { queryDocuments, querySingleDocument } from "./sanity/read-router";
import type { ApiResponse } from "./sanity-api-service";

export const manualCashbookNamesService = {
  async getAll(): Promise<ApiResponse<any[]>> {
    try {
      const namesRes = await queryDocuments(
        `*[_type == "manualCashbookName"] | order(usageCount desc, lastUsedAt desc) {
          _id,
          name,
          normalizedName,
          usageCount,
          lastUsedAt,
          createdAt
        }`,
        {},
        'cashbook'
      );
      return { success: true, data: namesRes.data };
    } catch (error) {
      console.error('Error fetching manual cashbook names:', error);
      return { success: false, error: 'Failed to fetch manual names' };
    }
  },

  async upsert(name: string): Promise<ApiResponse<any>> {
    try {
      const normalizedName = name.trim().replace(/\s+/g, ' ').toLowerCase();

      const existingRes = await querySingleDocument<{ _id: string; usageCount?: number; name?: string; normalizedName?: string; lastUsedAt?: string; createdAt?: string }>(
        `*[_type == "manualCashbookName" && normalizedName == $nn][0]`,
        { nn: normalizedName },
        'cashbook'
      );
      const existing = existingRes.data;

      if (existing) {
        const updated = await updateDocument(existing._id, {
          usageCount: (existing.usageCount || 0) + 1,
          lastUsedAt: new Date().toISOString(),
        }, 'cashbook');
        return { success: true, data: { ...existing, _id: existing._id, usageCount: (existing.usageCount || 0) + 1 } };
      }

      const doc = {
        _type: 'manualCashbookName' as const,
        name: name.trim(),
        normalizedName,
        usageCount: 1,
        lastUsedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      const created = await createDocument(doc, 'cashbook');
      return { success: true, data: { _id: created.documentId, ...doc } };
    } catch (error) {
      console.error('Error upserting manual cashbook name:', error);
      return { success: false, error: 'Failed to save manual name' };
    }
  },
};
