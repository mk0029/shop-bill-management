// sanity-schemas/enhanced-category-field-mapping.js
// Enhanced category field mapping with support for dynamic fields

export default {
  name: "enhancedCategoryFieldMapping",
  title: "Enhanced Category Field Mapping",
  type: "document",
  fields: [
    {
      name: "category",
      title: "Category",
      type: "reference",
      to: [{ type: "category" }],
      description: "The category this field mapping applies to",
      validation: (Rule) => Rule.required(),
    },
    {
      name: "categoryType",
      title: "Category Type",
      type: "string",
      options: {
        list: [
          { title: "Ampere Based", value: "ampere" },
          { title: "Voltage-Watt Based", value: "volt-watt" },
          { title: "Wire/Cable Based", value: "wire" },
          { title: "Light Based", value: "light" },
          { title: "General", value: "general" },
        ],
      },
      validation: (Rule) => Rule.required(),
      initialValue: "general",
    },

    // Dynamic Fields (New System)
    {
      name: "dynamicFields",
      title: "Dynamic Specification Fields",
      type: "array",
      of: [
        {
          type: "reference",
          to: [{ type: "dynamicSpecificationField" }],
        },
      ],
      description: "Dynamic specification fields for this category",
    },
    {
      name: "requiredDynamicFields",
      title: "Required Dynamic Fields",
      type: "array",
      of: [
        {
          type: "reference",
          to: [{ type: "dynamicSpecificationField" }],
        },
      ],
      description: "Dynamic fields that are required for this category",
    },

    // Legacy Fields (Backward Compatibility)
    {
      name: "requiredFields",
      title: "Required Fields (Legacy)",
      type: "array",
      of: [
        {
          type: "reference",
          to: [{ type: "fieldDefinition" }],
        },
      ],
      description:
        "Legacy field definitions that are required (for backward compatibility)",
    },
    {
      name: "optionalFields",
      title: "Optional Fields (Legacy)",
      type: "array",
      of: [
        {
          type: "reference",
          to: [{ type: "fieldDefinition" }],
        },
      ],
      description:
        "Legacy field definitions that are optional (for backward compatibility)",
    },

    // Field Groups
    {
      name: "fieldGroups",
      title: "Field Groups",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            {
              name: "group",
              title: "Field Group",
              type: "reference",
              to: [{ type: "fieldGroup" }],
              validation: (Rule) => Rule.required(),
            },
            {
              name: "fields",
              title: "Fields in Group",
              type: "array",
              of: [
                {
                  type: "reference",
                  to: [{ type: "dynamicSpecificationField" }],
                },
              ],
              description: "Dynamic fields that belong to this group",
            },
            {
              name: "displayOrder",
              title: "Group Display Order",
              type: "number",
              description: "Order of this group within the category",
              initialValue: 100,
            },
          ],
          preview: {
            select: {
              title: "group.label",
              subtitle: "group.name",
            },
          },
        },
      ],
      description: "Organize fields into groups for better UX",
    },

    // Configuration
    {
      name: "allowCustomFields",
      title: "Allow Custom Fields",
      type: "boolean",
      initialValue: false,
      description: "Whether users can add custom fields for this category",
    },
    {
      name: "maxCustomFields",
      title: "Max Custom Fields",
      type: "number",
      description: "Maximum number of custom fields allowed",
      hidden: ({ document }) => !document?.allowCustomFields,
      initialValue: 5,
    },

    // Validation Rules
    {
      name: "validationRules",
      title: "Category Validation Rules",
      type: "object",
      fields: [
        {
          name: "requireAtLeastOneField",
          title: "Require At Least One Field",
          type: "boolean",
          initialValue: true,
          description: "Require at least one specification field to be filled",
        },
        {
          name: "maxFieldsPerProduct",
          title: "Max Fields Per Product",
          type: "number",
          description:
            "Maximum number of fields that can be filled per product",
        },
        {
          name: "customValidationRules",
          title: "Custom Validation Rules",
          type: "array",
          of: [
            {
              type: "object",
              fields: [
                {
                  name: "ruleName",
                  title: "Rule Name",
                  type: "string",
                  validation: (Rule) => Rule.required(),
                },
                {
                  name: "ruleDescription",
                  title: "Rule Description",
                  type: "text",
                },
                {
                  name: "validatorFunction",
                  title: "Validator Function",
                  type: "string",
                  description: "Name of the validator function to call",
                },
                {
                  name: "errorMessage",
                  title: "Error Message",
                  type: "string",
                  description: "Message to show when validation fails",
                },
              ],
            },
          ],
        },
      ],
    },

    // Metadata
    {
      name: "isActive",
      title: "Active",
      type: "boolean",
      initialValue: true,
      description: "Toggle to enable/disable this mapping",
    },
    {
      name: "description",
      title: "Description",
      type: "text",
      description: "Description of this category mapping",
    },
    {
      name: "version",
      title: "Version",
      type: "number",
      initialValue: 1,
      description: "Mapping configuration version",
    },
    {
      name: "migrationStatus",
      title: "Migration Status",
      type: "string",
      options: {
        list: [
          { title: "Not Started", value: "not_started" },
          { title: "In Progress", value: "in_progress" },
          { title: "Completed", value: "completed" },
          { title: "Failed", value: "failed" },
        ],
      },
      initialValue: "not_started",
      description: "Status of migration from legacy to dynamic fields",
    },
  ],

  preview: {
    select: {
      title: "category.name",
      subtitle: "categoryType",
      isActive: "isActive",
      migrationStatus: "migrationStatus",
    },
    prepare({ title, subtitle, isActive, migrationStatus }) {
      const statusEmoji = {
        not_started: "⏳",
        in_progress: "🔄",
        completed: "✅",
        failed: "❌",
      };

      return {
        title: title
          ? title.charAt(0).toUpperCase() + title.slice(1)
          : "Unknown Category",
        subtitle: `${subtitle.charAt(0).toUpperCase() + subtitle.slice(1)} Category${!isActive ? " - Inactive" : ""}`,
        media: statusEmoji[migrationStatus] || "📋",
      };
    },
  },

  orderings: [
    {
      title: "Category Name",
      name: "categoryNameAsc",
      by: [{ field: "category.name", direction: "asc" }],
    },
    {
      title: "Category Type",
      name: "categoryTypeAsc",
      by: [{ field: "categoryType", direction: "asc" }],
    },
    {
      title: "Migration Status",
      name: "migrationStatusAsc",
      by: [{ field: "migrationStatus", direction: "asc" }],
    },
  ],
};
