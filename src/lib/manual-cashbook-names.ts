import { sanityClient } from "./sanity";
import type { ApiResponse } from "./sanity-api-service";

export const manualCashbookNamesService = {
  async getAll(): Promise<ApiResponse<any[]>> {
    try {
      const query = `*[_type == "manualCashbookName"] | order(usageCount desc, lastUsedAt desc) {
        _id,
        name,
        normalizedName,
        usageCount,
        lastUsedAt,
        createdAt
      }`;
      const names = await sanityClient.fetch(query);
      return { success: true, data: names };
    } catch (error) {
      console.error('Error fetching manual cashbook names:', error);
      return { success: false, error: 'Failed to fetch manual names' };
    }
  },

  async upsert(name: string): Promise<ApiResponse<any>> {
    try {
      const normalizedName = name.trim().replace(/\s+/g, ' ').toLowerCase();

      const existing = await sanityClient.fetch(
        `*[_type == "manualCashbookName" && normalizedName == $nn][0]`,
        { nn: normalizedName }
      );

      if (existing) {
        const updated = await sanityClient
          .patch(existing._id)
          .set({
            usageCount: (existing.usageCount || 0) + 1,
            lastUsedAt: new Date().toISOString(),
          })
          .commit();
        return { success: true, data: updated };
      }

      const doc = {
        _type: 'manualCashbookName' as const,
        name: name.trim(),
        normalizedName,
        usageCount: 1,
        lastUsedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      const created = await sanityClient.create(doc);
      return { success: true, data: created };
    } catch (error) {
      console.error('Error upserting manual cashbook name:', error);
      return { success: false, error: 'Failed to save manual name' };
    }
  },
};
