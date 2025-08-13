// sanity-schemas/dynamic-specification-field.js
// Enhanced specification field schema for the dynamic field system

export default {
  name: "dynamicSpecificationField",
  title: "Dynamic Specification Field",
  type: "document",
  fields: [
    // Core Properties
    {
      name: "key",
      title: "Field Key",
      type: "string",
      description:
        "Unique field identifier (e.g., 'watts', 'voltage', 'amperage')",
      validation: (Rule) =>
        Rule.required()
          .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, {
            name: "camelCase",
            invert: false,
          })
          .error("Field key must be camelCase and start with a letter"),
    },
    {
      name: "label",
      title: "Display Label",
      type: "string",
      description: "Human-readable label shown to users",
      validation: (Rule) => Rule.required(),
    },
    {
      name: "type",
      title: "Field Type",
      type: "string",
      options: {
        list: [
          { title: "Text", value: "text" },
          { title: "Number", value: "number" },
          { title: "Select", value: "select" },
          { title: "Multi-Select", value: "multiselect" },
          { title: "Boolean", value: "boolean" },
          { title: "Textarea", value: "textarea" },
          { title: "Email", value: "email" },
          { title: "URL", value: "url" },
          { title: "Date", value: "date" },
          { title: "Range", value: "range" },
        ],
      },
      validation: (Rule) => Rule.required(),
    },

    // Category Assignment
    {
      name: "categories",
      title: "Applicable Categories",
      type: "array",
      of: [
        {
          type: "reference",
          to: [{ type: "category" }],
        },
      ],
      description: "Categories where this field can be used",
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
      description: "Optional category type grouping",
    },

    // Validation Rules
    {
      name: "required",
      title: "Required Field",
      type: "boolean",
      initialValue: false,
      description: "Whether this field is required",
    },
    {
      name: "validation",
      title: "Validation Rules",
      type: "object",
      fields: [
        {
          name: "min",
          title: "Minimum Value",
          type: "number",
          description: "For number and range fields",
        },
        {
          name: "max",
          title: "Maximum Value",
          type: "number",
          description: "For number and range fields",
        },
        {
          name: "minLength",
          title: "Minimum Length",
          type: "number",
          description: "For text and textarea fields",
        },
        {
          name: "maxLength",
          title: "Maximum Length",
          type: "number",
          description: "For text and textarea fields",
        },
        {
          name: "pattern",
          title: "Regex Pattern",
          type: "string",
          description: "Regular expression for validation",
        },
        {
          name: "customValidator",
          title: "Custom Validator",
          type: "string",
          description: "Name of custom validator function",
        },
        {
          name: "errorMessage",
          title: "Custom Error Message",
          type: "string",
          description: "Custom message to display when validation fails",
        },
      ],
    },

    // UI Configuration
    {
      name: "placeholder",
      title: "Placeholder Text",
      type: "string",
      description: "Placeholder text for input fields",
    },
    {
      name: "description",
      title: "Description",
      type: "text",
      description: "Help text shown to users",
    },
    {
      name: "helpText",
      title: "Help Text",
      type: "text",
      description: "Additional help information",
    },
    {
      name: "displayOrder",
      title: "Display Order",
      type: "number",
      description: "Controls the order fields appear in forms",
      initialValue: 100,
    },
    {
      name: "groupId",
      title: "Field Group",
      type: "reference",
      to: [{ type: "fieldGroup" }],
      description: "Optional group this field belongs to",
    },

    // Field Options (for select/multiselect)
    {
      name: "options",
      title: "Field Options",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            {
              name: "value",
              title: "Value",
              type: "string",
              validation: (Rule) => Rule.required(),
            },
            {
              name: "label",
              title: "Label",
              type: "string",
              validation: (Rule) => Rule.required(),
            },
            {
              name: "disabled",
              title: "Disabled",
              type: "boolean",
              initialValue: false,
            },
            {
              name: "description",
              title: "Description",
              type: "string",
            },
            {
              name: "group",
              title: "Option Group",
              type: "string",
              description: "Group name for organizing options",
            },
          ],
          preview: {
            select: {
              title: "label",
              subtitle: "value",
            },
          },
        },
      ],
      description: "Available options for select and multiselect fields",
      hidden: ({ document }) =>
        !["select", "multiselect"].includes(document?.type),
    },
    {
      name: "optionsSource",
      title: "Options Source",
      type: "string",
      options: {
        list: [
          { title: "Static", value: "static" },
          { title: "Dynamic", value: "dynamic" },
          { title: "API", value: "api" },
        ],
      },
      initialValue: "static",
      description: "How options are loaded",
      hidden: ({ document }) =>
        !["select", "multiselect"].includes(document?.type),
    },
    {
      name: "optionsEndpoint",
      title: "Options API Endpoint",
      type: "string",
      description: "API endpoint for dynamic options",
      hidden: ({ document }) => document?.optionsSource !== "api",
    },

    // Conditional Logic
    {
      name: "conditional",
      title: "Conditional Rules",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            {
              name: "dependsOn",
              title: "Depends On Field",
              type: "string",
              description: "Field key that this field depends on",
              validation: (Rule) => Rule.required(),
            },
            {
              name: "condition",
              title: "Condition",
              type: "string",
              options: {
                list: [
                  { title: "Equals", value: "equals" },
                  { title: "Not Equals", value: "not_equals" },
                  { title: "Contains", value: "contains" },
                  { title: "Greater Than", value: "greater_than" },
                  { title: "Less Than", value: "less_than" },
                  { title: "In", value: "in" },
                  { title: "Not In", value: "not_in" },
                ],
              },
              validation: (Rule) => Rule.required(),
            },
            {
              name: "value",
              title: "Value",
              type: "string",
              description: "Value to compare against",
              validation: (Rule) => Rule.required(),
            },
            {
              name: "action",
              title: "Action",
              type: "string",
              options: {
                list: [
                  { title: "Show", value: "show" },
                  { title: "Hide", value: "hide" },
                  { title: "Require", value: "require" },
                  { title: "Disable", value: "disable" },
                  { title: "Enable", value: "enable" },
                ],
              },
              validation: (Rule) => Rule.required(),
            },
            {
              name: "message",
              title: "Message",
              type: "string",
              description: "Optional message to show when condition is met",
            },
          ],
          preview: {
            select: {
              dependsOn: "dependsOn",
              condition: "condition",
              value: "value",
              action: "action",
            },
            prepare({ dependsOn, condition, value, action }) {
              return {
                title: `${dependsOn} ${condition} "${value}"`,
                subtitle: `Action: ${action}`,
              };
            },
          },
        },
      ],
      description: "Rules for showing/hiding or enabling/disabling this field",
    },

    // Formatting and Display
    {
      name: "formatting",
      title: "Formatting Rules",
      type: "object",
      fields: [
        {
          name: "prefix",
          title: "Prefix",
          type: "string",
          description: "Text to show before the value (e.g., '$')",
        },
        {
          name: "suffix",
          title: "Suffix",
          type: "string",
          description: "Text to show after the value (e.g., 'W', 'V')",
        },
        {
          name: "transform",
          title: "Text Transform",
          type: "string",
          options: {
            list: [
              { title: "None", value: "none" },
              { title: "Uppercase", value: "uppercase" },
              { title: "Lowercase", value: "lowercase" },
              { title: "Capitalize", value: "capitalize" },
            ],
          },
          initialValue: "none",
        },
        {
          name: "displayFormat",
          title: "Display Format",
          type: "string",
          description: "Format string for numbers, dates, etc.",
        },
        {
          name: "decimalPlaces",
          title: "Decimal Places",
          type: "number",
          description: "Number of decimal places for number fields",
          hidden: ({ document }) => document?.type !== "number",
        },
      ],
    },

    // Advanced Properties
    {
      name: "searchable",
      title: "Searchable",
      type: "boolean",
      initialValue: true,
      description: "Can this field be used in search/filters",
    },
    {
      name: "sortable",
      title: "Sortable",
      type: "boolean",
      initialValue: true,
      description: "Can this field be used for sorting",
    },
    {
      name: "exportable",
      title: "Exportable",
      type: "boolean",
      initialValue: true,
      description: "Should this field be included in exports",
    },

    // Metadata
    {
      name: "isActive",
      title: "Active",
      type: "boolean",
      initialValue: true,
      description: "Toggle to enable/disable this field",
    },
    {
      name: "version",
      title: "Version",
      type: "number",
      initialValue: 1,
      description: "Field configuration version",
    },
    {
      name: "createdBy",
      title: "Created By",
      type: "string",
      description: "User who created this field",
    },
    {
      name: "updatedBy",
      title: "Updated By",
      type: "string",
      description: "User who last updated this field",
    },
  ],

  preview: {
    select: {
      title: "label",
      subtitle: "key",
      type: "type",
      isActive: "isActive",
    },
    prepare({ title, subtitle, type, isActive }) {
      return {
        title: title || subtitle,
        subtitle: `${subtitle} (${type})${!isActive ? " - Inactive" : ""}`,
        media: isActive ? "✅" : "❌",
      };
    },
  },

  orderings: [
    {
      title: "Display Order",
      name: "displayOrderAsc",
      by: [{ field: "displayOrder", direction: "asc" }],
    },
    {
      title: "Field Key",
      name: "keyAsc",
      by: [{ field: "key", direction: "asc" }],
    },
    {
      title: "Created Date",
      name: "createdAtDesc",
      by: [{ field: "_createdAt", direction: "desc" }],
    },
  ],
};
