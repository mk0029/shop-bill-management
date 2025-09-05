/**
 * Field Configuration Data Access Layer
 * Provides caching, real-time updates, and error handling for field configurations
 */

import {
  fetchDynamicSpecificationFields,
  fetchDynamicFieldsForCategory,
  fetchEnhancedCategoryMappings,
  fetchFieldGroups,
  createDynamicSpecificationField,
  updateDynamicSpecificationField,
  deleteDynamicSpecificationField,
} from "@/lib/sanity-dynamic-fields";

import {
  SpecificationFieldConfig,
  CategoryFieldMapping,
  FieldGroup,
  PerformanceMetrics,
} from "@/types/specification-field";

import { RegistryError } from "@/lib/specification-errors";
import {
  PERFORMANCE_THRESHOLDS,
  CACHE_KEYS,
} from "@/constants/specification-constants";

/**
 * Cache implementation with TTL
 */
class FieldCache {
  private cache = new Map<
    string,
    { data: any; timestamp: number; ttl: number }
  >();
  private hitCount = 0;
  private missCount = 0;

  set(
    key: string,
    data: any,
    ttl: number = PERFORMANCE_THRESHOLDS.CACHE_TTL
  ): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.missCount++;
      return null;
    }

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.missCount++;
      return null;
    }

    this.hitCount++;
    return entry.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  getStats() {
    const total = this.hitCount + this.missCount;
    return {
      hitRate: total > 0 ? this.hitCount / total : 0,
      hitCount: this.hitCount,
      missCount: this.missCount,
      cacheSize: this.cache.size,
    };
  }
}

/**
 * Field Configuration Data Access Layer
 */
export class FieldDataAccess {
  private cache = new FieldCache();
  private subscribers = new Set<(event: string, data: any) => void>();
  private performanceMetrics: PerformanceMetrics = {
    fieldLoadTime: 0,
    validationTime: 0,
    formRenderTime: 0,
    categoryChangeTime: 0,
    memoryUsage: 0,
    cacheHitRate: 0,
  };

  /**
   * Fetch all field configurations with caching
   */
  async fetchAllFields(): Promise<SpecificationFieldConfig[]> {
    const startTime = performance.now();
    const cacheKey = CACHE_KEYS.FIELD_CONFIGS;

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.performanceMetrics.fieldLoadTime = performance.now() - startTime;
      return cached;
    }

    try {
      const fields = await fetchDynamicSpecificationFields();
      this.cache.set(cacheKey, fields);

      this.performanceMetrics.fieldLoadTime = performance.now() - startTime;
      this.notifySubscribers("fields_loaded", { count: fields.length });

      return fields;
    } catch (error) {
      throw new RegistryError(
        "LOAD_FIELDS",
        `Failed to fetch field configurations: ${error instanceof Error ? error.message : "Unknown error"}`,
        { error }
      );
    }
  }

  /**
   * Fetch fields for specific category with caching
   */
  async fetchFieldsForCategory(
    categoryId: string
  ): Promise<SpecificationFieldConfig[]> {
    const startTime = performance.now();
    const cacheKey = `${CACHE_KEYS.FIELD_CONFIGS}_category_${categoryId}`;

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.performanceMetrics.categoryChangeTime =
        performance.now() - startTime;
      return cached;
    }

    try {
      const fields = await fetchDynamicFieldsForCategory(categoryId);
      this.cache.set(cacheKey, fields);

      this.performanceMetrics.categoryChangeTime =
        performance.now() - startTime;
      this.notifySubscribers("category_fields_loaded", {
        categoryId,
        count: fields.length,
      });

      return fields;
    } catch (error) {
      throw new RegistryError(
        "LOAD_FIELDS",
        `Failed to fetch fields for category ${categoryId}: ${error instanceof Error ? error.message : "Unknown error"}`,
        { error, categoryId }
      );
    }
  }

  /**
   * Fetch category mappings with caching
   */
  async fetchCategoryMappings(): Promise<CategoryFieldMapping[]> {
    const startTime = performance.now();
    const cacheKey = CACHE_KEYS.CATEGORY_MAPPINGS;

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const mappings = await fetchEnhancedCategoryMappings();
      this.cache.set(cacheKey, mappings);

      this.notifySubscribers("category_mappings_loaded", {
        count: mappings.length,
      });

      return mappings;
    } catch (error) {
      throw new RegistryError(
        "LOAD_FIELDS",
        `Failed to fetch category mappings: ${error instanceof Error ? error.message : "Unknown error"}`,
        { error }
      );
    }
  }

  /**
   * Fetch field groups with caching
   */
  async fetchFieldGroups(): Promise<FieldGroup[]> {
    const cacheKey = CACHE_KEYS.FIELD_OPTIONS + "_groups";

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const groups = await fetchFieldGroups();
      this.cache.set(cacheKey, groups);

      this.notifySubscribers("field_groups_loaded", { count: groups.length });

      return groups;
    } catch (error) {
      throw new RegistryError(
        "LOAD_FIELDS",
        `Failed to fetch field groups: ${error instanceof Error ? error.message : "Unknown error"}`,
        { error }
      );
    }
  }

  /**
   * Create new field configuration
   */
  async createField(
    fieldConfig: Omit<
      SpecificationFieldConfig,
      "id" | "createdAt" | "updatedAt" | "version"
    >
  ): Promise<SpecificationFieldConfig> {
    try {
      const created = await createDynamicSpecificationField(fieldConfig);

      // Invalidate relevant caches
      this.invalidateFieldCaches();

      this.notifySubscribers("field_created", created);

      return created;
    } catch (error) {
      throw new RegistryError(
        "REGISTER_FIELD",
        `Failed to create field: ${error instanceof Error ? error.message : "Unknown error"}`,
        { error, fieldConfig }
      );
    }
  }

  /**
   * Update field configuration
   */
  async updateField(
    fieldId: string,
    updates: Partial<SpecificationFieldConfig>
  ): Promise<SpecificationFieldConfig> {
    try {
      const updated = await updateDynamicSpecificationField(fieldId, updates);

      // Invalidate relevant caches
      this.invalidateFieldCaches();

      this.notifySubscribers("field_updated", {
        fieldId,
        updates,
        result: updated,
      });

      return updated;
    } catch (error) {
      throw new RegistryError(
        "UPDATE_FIELD",
        `Failed to update field: ${error instanceof Error ? error.message : "Unknown error"}`,
        { error, fieldId, updates }
      );
    }
  }

  /**
   * Delete field configuration
   */
  async deleteField(fieldId: string): Promise<void> {
    try {
      await deleteDynamicSpecificationField(fieldId);

      // Invalidate relevant caches
      this.invalidateFieldCaches();

      this.notifySubscribers("field_deleted", { fieldId });
    } catch (error) {
      throw new RegistryError(
        "REMOVE_FIELD",
        `Failed to delete field: ${error instanceof Error ? error.message : "Unknown error"}`,
        { error, fieldId }
      );
    }
  }

  /**
   * Subscribe to data changes
   */
  subscribe(callback: (event: string, data: any) => void): () => void {
    this.subscribers.add(callback);

    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const cacheStats = this.cache.getStats();

    return {
      ...this.performanceMetrics,
      cacheHitRate: cacheStats.hitRate,
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.cache.clear();
    this.notifySubscribers("cache_cleared", {});
  }

  /**
   * Invalidate field-related caches
   */
  private invalidateFieldCaches(): void {
    this.cache.delete(CACHE_KEYS.FIELD_CONFIGS);
    this.cache.delete(CACHE_KEYS.CATEGORY_MAPPINGS);

    // Clear category-specific caches
    const keys = Array.from((this.cache as any).cache.keys());
    keys.forEach((key) => {
      if (key.includes("category_")) {
        this.cache.delete(key);
      }
    });
  }

  /**
   * Notify subscribers of changes
   */
  private notifySubscribers(event: string, data: any): void {
    this.subscribers.forEach((callback) => {
      try {
        callback(event, data);
      } catch (error) {
        console.error("Error in data access subscriber:", error);
      }
    });
  }

  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(): number {
    // Rough estimation in MB
    const cacheSize = (this.cache as any).cache.size;
    return Math.round(cacheSize * 0.001); // Very rough estimate
  }
}

// Singleton instance
let dataAccessInstance: FieldDataAccess | null = null;

/**
 * Get the singleton data access instance
 */
export const getFieldDataAccess = (): FieldDataAccess => {
  if (!dataAccessInstance) {
    dataAccessInstance = new FieldDataAccess();
  }
  return dataAccessInstance;
};

/**
 * React hook for field data access
 */
export const useFieldDataAccess = () => {
  const dataAccess = getFieldDataAccess();

  return {
    fetchAllFields: () => dataAccess.fetchAllFields(),
    fetchFieldsForCategory: (categoryId: string) =>
      dataAccess.fetchFieldsForCategory(categoryId),
    fetchCategoryMappings: () => dataAccess.fetchCategoryMappings(),
    fetchFieldGroups: () => dataAccess.fetchFieldGroups(),
    createField: (
      config: Omit<
        SpecificationFieldConfig,
        "id" | "createdAt" | "updatedAt" | "version"
      >
    ) => dataAccess.createField(config),
    updateField: (
      fieldId: string,
      updates: Partial<SpecificationFieldConfig>
    ) => dataAccess.updateField(fieldId, updates),
    deleteField: (fieldId: string) => dataAccess.deleteField(fieldId),
    subscribe: (callback: (event: string, data: any) => void) =>
      dataAccess.subscribe(callback),
    getPerformanceMetrics: () => dataAccess.getPerformanceMetrics(),
    clearCache: () => dataAccess.clearCache(),
  };
};
