/**
 * Sanity Data Access Layer for Dynamic Specification Fields
 * Handles CRUD operations for dynamic field configurations
 */

import { sanityClient } from "@/lib/sanity";
import {
  SpecificationFieldConfig,
  CategoryFieldMapping,
  FieldGroup,
} from "@/types/specification-field";
import {
  FieldConfigurationError,
  RegistryError,
} from "@/lib/specification-errors";

// Sanity document types for dynamic fields
interface SanityDynamicField {
  _id: string;
  _type: "dynamicSpecificationField";
  _createdAt: string;
  _updatedAt: string;
  key: string;
  label: string;
  type: string;
  categories?: Array<{ _ref: string; _type: "reference" }>;
  categoryType?: string;
  required?: boolean;
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    customValidator?: string;
    errorMessage?: string;
  };
  placeholder?: string;
  description?: string;
  helpText?: string;
  displayOrder?: number;
  groupId?: { _ref: string; _type: "reference" };
  options?: Array<{
    value: string;
    label: string;
    disabled?: boolean;
    description?: string;
    group?: string;
  }>;
  optionsSource?: "static" | "dynamic" | "api";
  optionsEndpoint?: string;
  conditional?: Array<{
    dependsOn: string;
    condition: string;
    value: string;
    action: string;
    message?: string;
  }>;
  formatting?: {
    prefix?: string;
    suffix?: string;
    transform?: string;
    displayFormat?: string;
    decimalPlaces?: number;
  };
  searchable?: boolean;
  sortable?: boolean;
  exportable?: boolean;
  isActive: boolean;
  version?: number;
  createdBy?: string;
  updatedBy?: string;
}

interface SanityFieldGroup {
  _id: string;
  _type: "fieldGroup";
  _createdAt: string;
  _updatedAt: string;
  name: string;
  label: string;
  description?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  displayOrder?: number;
  icon?: string;
  color?: string;
  isActive: boolean;
}

interface SanityEnhancedCategoryMapping {
  _id: string;
  _type: "enhancedCategoryFieldMapping";
  _createdAt: string;
  _updatedAt: string;
  category: {
    _id: string;
    name: string;
    slug: { current: string };
  };
  categoryType: string;
  dynamicFields?: Array<{ _ref: string; _type: "reference" }>;
  requiredDynamicFields?: Array<{ _ref: string; _type: "reference" }>;
  fieldGroups?: Array<{
    group: { _ref: string; _type: "reference" };
    fields: Array<{ _ref: string; _type: "reference" }>;
    displayOrder?: number;
  }>;
  allowCustomFields?: boolean;
  maxCustomFields?: number;
  validationRules?: {
    requireAtLeastOneField?: boolean;
    maxFieldsPerProduct?: number;
    customValidationRules?: Array<{
      ruleName: string;
      ruleDescription?: string;
      validatorFunction?: string;
      errorMessage?: string;
    }>;
  };
  isActive: boolean;
  description?: string;
  version?: number;
  migrationStatus?: string;
}

/**
 * Fetch all dynamic specification fields
 */
export const fetchDynamicSpecificationFields = async (): Promise<
  SpecificationFieldConfig[]
> => {
  try {
    const query = `
      *[_type == "dynamicSpecificationField" && isActive == true] | order(displayOrder asc, key asc) {
        _id,
        _createdAt,
        _updatedAt,
        key,
        label,
        type,
        categories[]-> {
          _id,
          name,
          slug
        },
        categoryType,
        required,
        validation,
        placeholder,
        description,
        helpText,
        displayOrder,
        groupId-> {
          _id,
          name,
          label
        },
        options,
        optionsSource,
        optionsEndpoint,
        conditional,
        formatting,
        searchable,
        sortable,
        exportable,
        isActive,
        version,
        createdBy,
        updatedBy
      }
    `;

    const sanityFields: SanityDynamicField[] = await sanityClient.fetch(query);

    return sanityFields.map(convertSanityFieldToConfig);
  } catch (error) {
    throw new RegistryError(
      "LOAD_FIELDS",
      `Failed to fetch dynamic specification fields: ${error instanceof Error ? error.message : "Unknown error"}`,
      { error }
    );
  }
};

/**
 * Fetch dynamic fields for a specific category
 */
export const fetchDynamicFieldsForCategory = async (
  categoryId: string
): Promise<SpecificationFieldConfig[]> => {
  try {
    const query = `
      *[_type == "dynamicSpecificationField" && isActive == true && references($categoryId)] | order(displayOrder asc, key asc) {
        _id,
        _createdAt,
        _updatedAt,
        key,
        label,
        type,
        categories[]-> {
          _id,
          name,
          slug
        },
        categoryType,
        required,
        validation,
        placeholder,
        description,
        helpText,
        displayOrder,
        groupId-> {
          _id,
          name,
          label
        },
        options,
        optionsSource,
        optionsEndpoint,
        conditional,
        formatting,
        searchable,
        sortable,
        exportable,
        isActive,
        version,
        createdBy,
        updatedBy
      }
    `;

    const sanityFields: SanityDynamicField[] = await sanityClient.fetch(query, {
      categoryId,
    });

    return sanityFields.map(convertSanityFieldToConfig);
  } catch (error) {
    throw new RegistryError(
      "LOAD_FIELDS",
      `Failed to fetch dynamic fields for category ${categoryId}: ${error instanceof Error ? error.message : "Unknown error"}`,
      { error, categoryId }
    );
  }
};

/**
 * Fetch enhanced category field mappings
 */
export const fetchEnhancedCategoryMappings = async (): Promise<
  CategoryFieldMapping[]
> => {
  try {
    const query = `
      *[_type == "enhancedCategoryFieldMapping" && isActive == true] | order(category.name asc) {
        _id,
        _createdAt,
        _updatedAt,
        category-> {
          _id,
          name,
          slug
        },
        categoryType,
        dynamicFields[]-> {
          _id,
          key,
          label,
          type,
          required,
          displayOrder
        },
        requiredDynamicFields[]-> {
          _id,
          key,
          label,
          type,
          required,
          displayOrder
        },
        fieldGroups[] {
          group-> {
            _id,
            name,
            label,
            displayOrder
          },
          fields[]-> {
            _id,
            key,
            label,
            type
          },
          displayOrder
        },
        allowCustomFields,
        maxCustomFields,
        validationRules,
        isActive,
        description,
        version,
        migrationStatus
      }
    `;

    const sanityMappings: SanityEnhancedCategoryMapping[] =
      await sanityClient.fetch(query);

    return sanityMappings.map(convertSanityCategoryMapping);
  } catch (error) {
    throw new RegistryError(
      "LOAD_FIELDS",
      `Failed to fetch enhanced category mappings: ${error instanceof Error ? error.message : "Unknown error"}`,
      { error }
    );
  }
};

/**
 * Fetch field groups
 */
export const fetchFieldGroups = async (): Promise<FieldGroup[]> => {
  try {
    const query = `
      *[_type == "fieldGroup" && isActive == true] | order(displayOrder asc, name asc) {
        _id,
        _createdAt,
        _updatedAt,
        name,
        label,
        description,
        collapsible,
        defaultExpanded,
        displayOrder,
        icon,
        color,
        isActive
      }
    `;

    const sanityGroups: SanityFieldGroup[] = await sanityClient.fetch(query);

    return sanityGroups.map(convertSanityFieldGroup);
  } catch (error) {
    throw new RegistryError(
      "LOAD_FIELDS",
      `Failed to fetch field groups: ${error instanceof Error ? error.message : "Unknown error"}`,
      { error }
    );
  }
};

/**
 * Create a new dynamic specification field
 */
export const createDynamicSpecificationField = async (
  fieldConfig: Omit<
    SpecificationFieldConfig,
    "id" | "createdAt" | "updatedAt" | "version"
  >
): Promise<SpecificationFieldConfig> => {
  try {
    const sanityDoc = convertConfigToSanityField(fieldConfig);
    const created = await sanityClient.create(sanityDoc);

    return convertSanityFieldToConfig(created);
  } catch (error) {
    throw new RegistryError(
      "REGISTER_FIELD",
      `Failed to create dynamic specification field: ${error instanceof Error ? error.message : "Unknown error"}`,
      { error, fieldConfig }
    );
  }
};

/**
 * Update a dynamic specification field
 */
export const updateDynamicSpecificationField = async (
  fieldId: string,
  updates: Partial<SpecificationFieldConfig>
): Promise<SpecificationFieldConfig> => {
  try {
    const sanityUpdates = convertConfigToSanityField(updates as any);
    const updated = await sanityClient
      .patch(fieldId)
      .set({
        ...sanityUpdates,
        _updatedAt: new Date().toISOString(),
        version: (updates.version || 1) + 1,
      })
      .commit();

    return convertSanityFieldToConfig(updated);
  } catch (error) {
    throw new RegistryError(
      "UPDATE_FIELD",
      `Failed to update dynamic specification field: ${error instanceof Error ? error.message : "Unknown error"}`,
      { error, fieldId, updates }
    );
  }
};

/**
 * Delete a dynamic specification field
 */
export const deleteDynamicSpecificationField = async (
  fieldId: string
): Promise<void> => {
  try {
    await sanityClient.delete(fieldId);
  } catch (error) {
    throw new RegistryError(
      "REMOVE_FIELD",
      `Failed to delete dynamic specification field: ${error instanceof Error ? error.message : "Unknown error"}`,
      { error, fieldId }
    );
  }
};

/**
 * Convert Sanity field document to SpecificationFieldConfig
 */
const convertSanityFieldToConfig = (
  sanityField: SanityDynamicField
): SpecificationFieldConfig => {
  return {
    id: sanityField._id,
    key: sanityField.key,
    label: sanityField.label,
    type: sanityField.type as any,
    categories: sanityField.categories?.map((cat) => cat._ref) || [],
    categoryType: sanityField.categoryType as any,
    required: sanityField.required || false,
    validation: sanityField.validation,
    placeholder: sanityField.placeholder,
    description: sanityField.description,
    helpText: sanityField.helpText,
    displayOrder: sanityField.displayOrder,
    groupId: sanityField.groupId?._ref,
    options: sanityField.options,
    optionsSource: sanityField.optionsSource,
    optionsEndpoint: sanityField.optionsEndpoint,
    conditional: sanityField.conditional?.map((rule) => ({
      dependsOn: rule.dependsOn,
      condition: rule.condition as any,
      value: rule.value,
      action: rule.action as any,
      message: rule.message,
    })),
    formatting: sanityField.formatting,
    searchable: sanityField.searchable ?? true,
    sortable: sanityField.sortable ?? true,
    exportable: sanityField.exportable ?? true,
    isActive: sanityField.isActive,
    createdAt: sanityField._createdAt,
    updatedAt: sanityField._updatedAt,
    version: sanityField.version || 1,
    createdBy: sanityField.createdBy,
    updatedBy: sanityField.updatedBy,
  };
};

/**
 * Convert SpecificationFieldConfig to Sanity document
 */
const convertConfigToSanityField = (
  config: Partial<SpecificationFieldConfig>
): Partial<SanityDynamicField> => {
  return {
    _type: "dynamicSpecificationField",
    key: config.key,
    label: config.label,
    type: config.type,
    categories: config.categories?.map((id) => ({
      _ref: id,
      _type: "reference" as const,
    })),
    categoryType: config.categoryType,
    required: config.required,
    validation: config.validation,
    placeholder: config.placeholder,
    description: config.description,
    helpText: config.helpText,
    displayOrder: config.displayOrder,
    groupId: config.groupId
      ? { _ref: config.groupId, _type: "reference" as const }
      : undefined,
    options: config.options,
    optionsSource: config.optionsSource,
    optionsEndpoint: config.optionsEndpoint,
    conditional: config.conditional,
    formatting: config.formatting,
    searchable: config.searchable,
    sortable: config.sortable,
    exportable: config.exportable,
    isActive: config.isActive ?? true,
    version: config.version,
    createdBy: config.createdBy,
    updatedBy: config.updatedBy,
  };
};

/**
 * Convert Sanity category mapping to CategoryFieldMapping
 */
const convertSanityCategoryMapping = (
  sanityMapping: SanityEnhancedCategoryMapping
): CategoryFieldMapping => {
  return {
    categoryId: sanityMapping.category._id,
    categoryName: sanityMapping.category.name,
    categoryType: sanityMapping.categoryType as any,
    fields: sanityMapping.dynamicFields?.map((field) => field._ref) || [],
    requiredFields:
      sanityMapping.requiredDynamicFields?.map((field) => field._ref) || [],
    fieldGroups:
      sanityMapping.fieldGroups?.map((group) => ({
        id: group.group._ref,
        name: group.group._ref, // Will be resolved separately
        label: group.group._ref, // Will be resolved separately
        displayOrder: group.displayOrder,
      })) || [],
    displayOrder: 0, // Not stored in Sanity mapping
    isActive: sanityMapping.isActive,
  };
};

/**
 * Convert Sanity field group to FieldGroup
 */
const convertSanityFieldGroup = (sanityGroup: SanityFieldGroup): FieldGroup => {
  return {
    id: sanityGroup._id,
    name: sanityGroup.name,
    label: sanityGroup.label,
    description: sanityGroup.description,
    collapsible: sanityGroup.collapsible || false,
    defaultExpanded: sanityGroup.defaultExpanded ?? true,
    displayOrder: sanityGroup.displayOrder || 100,
  };
};
