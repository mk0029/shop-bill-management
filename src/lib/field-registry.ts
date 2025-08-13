/**
 * Dynamic Specification Field Registry Service
 * Central registry for managing specification field configurations
 */

import {
  SpecificationFieldConfig,
  FieldValidationResult,
  FormValidationResult,
  RegistryEvent,
  RegistrySubscriber,
  FieldRegistryConfig,
  CategoryFieldMapping,
  PerformanceMetrics,
  FieldGroup,
} from "@/types/specification-field";

import {
  FieldConfigurationError,
  RegistryError,
  ValidationError,
  ErrorHandler,
} from "@/lib/specification-errors";

import {
  COMMON_FIELD_KEYS,
  PREDEFINED_FIELDS,
  DEFAULT_REGISTRY_CONFIG,
  CACHE_KEYS,
  REGISTRY_EVENTS,
  PERFORMANCE_THRESHOLDS,
} from "@/constants/specification-constants";

// Import existing interfaces for compatibility
import {
  FieldDefinition as LegacyFieldDefinition,
  SanityCategoryFieldMapping,
} from "@/store/specifications-store";

/**
 * Main Field Registry Service
 * Manages all specification field configurations and provides a unified API
 */
export class SpecificationFieldRegistry {
  private fields: Map<string, SpecificationFieldConfig> = new Map();
  private categoryMappings: Map<string, string[]> = new Map();
  private subscribers: Set<RegistrySubscriber> = new Set();
  private cache: Map<string, any> = new Map();
  private config: FieldRegistryConfig;
  private errorHandler: ErrorHandler;
  private performanceMetrics: PerformanceMetrics;
  private isInitialized = false;

  constructor(config: Partial<FieldRegistryConfig> = {}) {
    this.config = { ...DEFAULT_REGISTRY_CONFIG, ...config };
    this.errorHandler = ErrorHandler.getInstance();
    this.performanceMetrics = {
      fieldLoadTime: 0,
      validationTime: 0,
      formRenderTime: 0,
      categoryChangeTime: 0,
      memoryUsage: 0,
      cacheHitRate: 0,
    };

    // Initialize with predefined fields
    this.initializePredefinedFields();
  }

  /**
   * Initialize the registry with predefined common fields
   */
  private initializePredefinedFields(): void {
    Object.entries(PREDEFINED_FIELDS).forEach(([key, config]) => {
      const fullConfig: SpecificationFieldConfig = {
        id: `predefined_${key}`,
        key,
        label: config.label || key,
        type: config.type || "text",
        categories: config.categories || [],
        validation: config.validation,
        formatting: config.formatting,
        placeholder: config.placeholder,
        description: config.description,
        searchable: config.searchable ?? true,
        sortable: config.sortable ?? true,
        exportable: config.exportable ?? true,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        ...config,
      };

      this.fields.set(key, fullConfig);
    });
  }

  /**
   * Load field configurations from external source (Sanity CMS)
   */
  async loadFields(): Promise<void> {
    const startTime = performance.now();

    try {
      // Import the existing specifications store for compatibility
      const { useSpecificationsStore } = await import(
        "@/store/specifications-store"
      );
      const store = useSpecificationsStore.getState();

      // Force sync to get latest data
      await store.forceSyncSpecifications();

      // Convert legacy field definitions to new format
      await this.convertLegacyFields(store.categoryFieldMappings);

      this.isInitialized = true;
      this.performanceMetrics.fieldLoadTime = performance.now() - startTime;

      this.notifySubscribers({
        type: "field_added",
        fieldKey: "all",
        timestamp: new Date().toISOString(),
        data: { loadTime: this.performanceMetrics.fieldLoadTime },
      });
    } catch (error) {
      const registryError = RegistryError.loadFieldsFailed(
        error instanceof Error ? error.message : "Unknown error",
        { error }
      );
      this.errorHandler.handleError(registryError);
      throw registryError;
    }
  }

  /**
   * Convert legacy field definitions to new format
   */
  private async convertLegacyFields(
    legacyMappings: SanityCategoryFieldMapping[]
  ): Promise<void> {
    for (const mapping of legacyMappings) {
      const categoryId = mapping.category._id;
      const fieldKeys: string[] = [];

      // Process required fields
      for (const field of mapping.requiredFields || []) {
        const convertedField = this.convertLegacyFieldDefinition(
          field,
          categoryId,
          true
        );
        this.fields.set(convertedField.key, convertedField);
        fieldKeys.push(convertedField.key);
      }

      // Process optional fields
      for (const field of mapping.optionalFields || []) {
        const convertedField = this.convertLegacyFieldDefinition(
          field,
          categoryId,
          false
        );
        this.fields.set(convertedField.key, convertedField);
        fieldKeys.push(convertedField.key);
      }

      // Update category mappings
      this.categoryMappings.set(categoryId, fieldKeys);
    }
  }

  /**
   * Convert legacy field definition to new format
   */
  private convertLegacyFieldDefinition(
    legacyField: LegacyFieldDefinition,
    categoryId: string,
    isRequired: boolean
  ): SpecificationFieldConfig {
    return {
      id: legacyField._id,
      key: legacyField.fieldKey,
      label: legacyField.fieldLabel,
      type: legacyField.fieldType as any,
      categories: [categoryId],
      required: isRequired,
      validation: {
        required: isRequired,
        min: legacyField.validationRules?.minValue,
        max: legacyField.validationRules?.maxValue,
        minLength: legacyField.validationRules?.minLength,
        maxLength: legacyField.validationRules?.maxLength,
        pattern: legacyField.validationRules?.pattern,
        errorMessage: legacyField.validationRules?.customErrorMessage,
      },
      placeholder: legacyField.placeholder,
      description: legacyField.description,
      displayOrder: legacyField.sortOrder,
      conditional: legacyField.conditionalLogic
        ? [
            {
              dependsOn: legacyField.conditionalLogic.dependsOn,
              condition: legacyField.conditionalLogic.condition as any,
              value: legacyField.conditionalLogic.value,
              action: "show",
            },
          ]
        : undefined,
      searchable: true,
      sortable: true,
      exportable: true,
      isActive: legacyField.isActive,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    };
  }

  /**
   * Register a new field configuration
   */
  registerField(config: SpecificationFieldConfig): void {
    try {
      // Validate field configuration
      this.validateFieldConfiguration(config);

      // Check for duplicate keys
      const existingField = Array.from(this.fields.values()).find(
        (f) => f.key === config.key && f.id !== config.id
      );

      if (existingField) {
        throw FieldConfigurationError.duplicateKey(
          config.key,
          existingField.id
        );
      }

      // Store the field
      this.fields.set(config.key, config);

      // Update category mappings
      config.categories.forEach((categoryId) => {
        const existingFields = this.categoryMappings.get(categoryId) || [];
        if (!existingFields.includes(config.key)) {
          this.categoryMappings.set(categoryId, [
            ...existingFields,
            config.key,
          ]);
        }
      });

      // Clear related cache
      this.clearCache(`category_*`);
      this.clearCache(`form_schema_*`);

      // Notify subscribers
      this.notifySubscribers({
        type: "field_added",
        fieldKey: config.key,
        timestamp: new Date().toISOString(),
        data: config,
      });
    } catch (error) {
      const registryError = RegistryError.registerFieldFailed(
        config.key,
        error instanceof Error ? error.message : "Unknown error"
      );
      this.errorHandler.handleError(registryError);
      throw registryError;
    }
  }

  /**
   * Update an existing field configuration
   */
  updateField(
    fieldKey: string,
    updates: Partial<SpecificationFieldConfig>
  ): void {
    try {
      const existingField = this.fields.get(fieldKey);
      if (!existingField) {
        throw new FieldConfigurationError(
          fieldKey,
          "VALIDATION_ERROR",
          `Field '${fieldKey}' not found`
        );
      }

      const updatedField: SpecificationFieldConfig = {
        ...existingField,
        ...updates,
        updatedAt: new Date().toISOString(),
        version: existingField.version + 1,
      };

      // Validate updated configuration
      this.validateFieldConfiguration(updatedField);

      // Update the field
      this.fields.set(fieldKey, updatedField);

      // Update category mappings if categories changed
      if (updates.categories) {
        // Remove from old categories
        existingField.categories.forEach((categoryId) => {
          const fields = this.categoryMappings.get(categoryId) || [];
          this.categoryMappings.set(
            categoryId,
            fields.filter((key) => key !== fieldKey)
          );
        });

        // Add to new categories
        updates.categories.forEach((categoryId) => {
          const existingFields = this.categoryMappings.get(categoryId) || [];
          if (!existingFields.includes(fieldKey)) {
            this.categoryMappings.set(categoryId, [
              ...existingFields,
              fieldKey,
            ]);
          }
        });
      }

      // Clear related cache
      this.clearCache(`category_*`);
      this.clearCache(`form_schema_*`);

      // Notify subscribers
      this.notifySubscribers({
        type: "field_updated",
        fieldKey,
        timestamp: new Date().toISOString(),
        data: { updates, previousVersion: existingField.version },
      });
    } catch (error) {
      const registryError = RegistryError.updateFieldFailed(
        fieldKey,
        error instanceof Error ? error.message : "Unknown error"
      );
      this.errorHandler.handleError(registryError);
      throw registryError;
    }
  }

  /**
   * Remove a field configuration
   */
  removeField(fieldKey: string): void {
    try {
      const field = this.fields.get(fieldKey);
      if (!field) {
        throw new FieldConfigurationError(
          fieldKey,
          "VALIDATION_ERROR",
          `Field '${fieldKey}' not found`
        );
      }

      // Remove from fields
      this.fields.delete(fieldKey);

      // Remove from category mappings
      field.categories.forEach((categoryId) => {
        const fields = this.categoryMappings.get(categoryId) || [];
        this.categoryMappings.set(
          categoryId,
          fields.filter((key) => key !== fieldKey)
        );
      });

      // Clear related cache
      this.clearCache(`category_*`);
      this.clearCache(`form_schema_*`);

      // Notify subscribers
      this.notifySubscribers({
        type: "field_removed",
        fieldKey,
        timestamp: new Date().toISOString(),
        data: field,
      });
    } catch (error) {
      const registryError = RegistryError.removeFieldFailed(
        fieldKey,
        error instanceof Error ? error.message : "Unknown error"
      );
      this.errorHandler.handleError(registryError);
      throw registryError;
    }
  }

  /**
   * Get a specific field configuration
   */
  getField(key: string): SpecificationFieldConfig | undefined {
    return this.fields.get(key);
  }

  /**
   * Get all fields for a specific category
   */
  getFieldsForCategory(categoryId: string): SpecificationFieldConfig[] {
    const cacheKey = `category_${categoryId}`;

    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const fieldKeys = this.categoryMappings.get(categoryId) || [];
    const fields = fieldKeys
      .map((key) => this.fields.get(key))
      .filter(
        (field): field is SpecificationFieldConfig =>
          field !== undefined && field.isActive
      )
      .sort((a, b) => (a.displayOrder || 999) - (b.displayOrder || 999));

    // Cache the result
    this.cache.set(cacheKey, fields);

    return fields;
  }

  /**
   * Get required fields for a category
   */
  getRequiredFields(categoryId: string): SpecificationFieldConfig[] {
    return this.getFieldsForCategory(categoryId).filter(
      (field) => field.required
    );
  }

  /**
   * Get all fields
   */
  getAllFields(): SpecificationFieldConfig[] {
    return Array.from(this.fields.values())
      .filter((field) => field.isActive)
      .sort((a, b) => (a.displayOrder || 999) - (b.displayOrder || 999));
  }

  /**
   * Get category field mappings
   */
  getCategoryFields(categoryId: string): string[] {
    return this.categoryMappings.get(categoryId) || [];
  }

  /**
   * Set category field mappings
   */
  setCategoryFields(categoryId: string, fieldKeys: string[]): void {
    this.categoryMappings.set(categoryId, fieldKeys);
    this.clearCache(`category_${categoryId}`);

    this.notifySubscribers({
      type: "category_mapping_changed",
      fieldKey: categoryId,
      timestamp: new Date().toISOString(),
      data: { fieldKeys },
    });
  }

  /**
   * Subscribe to registry changes
   */
  subscribe(subscriber: RegistrySubscriber): void {
    this.subscribers.add(subscriber);
  }

  /**
   * Unsubscribe from registry changes
   */
  unsubscribe(subscriber: RegistrySubscriber): void {
    this.subscribers.delete(subscriber);
  }

  /**
   * Validate field configuration
   */
  private validateFieldConfiguration(config: SpecificationFieldConfig): void {
    // Required properties
    if (!config.key) {
      throw FieldConfigurationError.missingRequiredProperty(
        config.key || "unknown",
        "key"
      );
    }
    if (!config.label) {
      throw FieldConfigurationError.missingRequiredProperty(
        config.key,
        "label"
      );
    }
    if (!config.type) {
      throw FieldConfigurationError.missingRequiredProperty(config.key, "type");
    }

    // Validate field type
    const validTypes = [
      "text",
      "number",
      "select",
      "multiselect",
      "boolean",
      "textarea",
      "email",
      "url",
      "date",
      "range",
    ];
    if (!validTypes.includes(config.type)) {
      throw FieldConfigurationError.invalidType(
        config.key,
        config.type,
        validTypes as any
      );
    }

    // Validate select/multiselect fields have options
    if (
      ["select", "multiselect"].includes(config.type) &&
      (!config.options || config.options.length === 0)
    ) {
      throw FieldConfigurationError.missingOptions(config.key, config.type);
    }

    // Validate conditional rules
    if (config.conditional) {
      for (const rule of config.conditional) {
        if (!rule.dependsOn || !rule.condition || rule.value === undefined) {
          throw FieldConfigurationError.invalidConditionalRule(
            config.key,
            rule,
            "Missing required properties: dependsOn, condition, or value"
          );
        }
      }
    }
  }

  /**
   * Notify all subscribers of changes
   */
  private notifySubscribers(event: RegistryEvent): void {
    this.subscribers.forEach((subscriber) => {
      try {
        subscriber.onFieldChange(event);
      } catch (error) {
        console.error("Error notifying subscriber:", error);
      }
    });
  }

  /**
   * Clear cache entries matching pattern
   */
  private clearCache(pattern: string): void {
    const keys = Array.from(this.cache.keys());
    const regex = new RegExp(pattern.replace("*", ".*"));

    keys.forEach((key) => {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    });
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Check if registry is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get registry configuration
   */
  getConfig(): FieldRegistryConfig {
    return { ...this.config };
  }
}

// Singleton instance
let registryInstance: SpecificationFieldRegistry | null = null;

/**
 * Get the singleton registry instance
 */
export const getFieldRegistry = (): SpecificationFieldRegistry => {
  if (!registryInstance) {
    registryInstance = new SpecificationFieldRegistry();
  }
  return registryInstance;
};

/**
 * Initialize the field registry
 */
export const initializeFieldRegistry = async (
  config?: Partial<FieldRegistryConfig>
): Promise<SpecificationFieldRegistry> => {
  const registry = getFieldRegistry();

  if (config) {
    // Update configuration
    Object.assign(registry["config"], config);
  }

  if (!registry.isReady()) {
    await registry.loadFields();
  }

  return registry;
};

/**
 * React hook for using the field registry
 */
export const useFieldRegistry = () => {
  const registry = getFieldRegistry();

  return {
    registry,
    isReady: registry.isReady(),
    getField: (key: string) => registry.getField(key),
    getFieldsForCategory: (categoryId: string) =>
      registry.getFieldsForCategory(categoryId),
    getRequiredFields: (categoryId: string) =>
      registry.getRequiredFields(categoryId),
    getAllFields: () => registry.getAllFields(),
    subscribe: (subscriber: RegistrySubscriber) =>
      registry.subscribe(subscriber),
    unsubscribe: (subscriber: RegistrySubscriber) =>
      registry.unsubscribe(subscriber),
  };
};
