// sanity-schemas/fieldDefinition.js
export default {
  name: "fieldDefinition",
  title: "Field Definition",
  type: "document",
  fields: [
    {
      name: "fieldKey",
      title: "Field Key",
      type: "string",
      description: "Internal field identifier (camelCase)",
      validation: (Rule) => Rule.required(),
    },
    {
      name: "fieldLabel",
      title: "Field Label",
      type: "string",
      description: "Display label shown to users",
      validation: (Rule) => Rule.required(),
    },
    {
      name: "fieldType",
      title: "Field Type",
      type: "string",
      options: {
        list: [
          { title: "Text", value: "text" },
          { title: "Number", value: "number" },
          { title: "Select", value: "select" },
          { title: "Multi-select", value: "multiselect" },
          { title: "Boolean", value: "boolean" },
          { title: "Date", value: "date" },
        ],
      },
      validation: (Rule) => Rule.required(),
    },
    {
      name: "description",
      title: "Description",
      type: "text",
      description: "Help text for users",
    },
    {
      name: "placeholder",
      title: "Placeholder",
      type: "string",
      description: "Placeholder text for input fields",
    },
    {
      name: "validationRules",
      title: "Validation Rules",
      type: "object",
      fields: [
        {
          name: "required",
          title: "Required",
          type: "boolean",
          initialValue: false,
        },
        {
          name: "minLength",
          title: "Minimum Length",
          type: "number",
          description: "For text fields",
        },
        {
          name: "maxLength",
          title: "Maximum Length",
          type: "number",
          description: "For text fields",
        },
        {
          name: "minValue",
          title: "Minimum Value",
          type: "number",
          description: "For number fields",
        },
        {
          name: "maxValue",
          title: "Maximum Value",
          type: "number",
          description: "For number fields",
        },
        {
          name: "pattern",
          title: "Regex Pattern",
          type: "string",
          description: "Regular expression for validation",
        },
        {
          name: "customErrorMessage",
          title: "Custom Error Message",
          type: "string",
          description: "Custom message to display when validation fails",
        },
      ],
    },
    {
      name: "defaultValue",
      title: "Default Value",
      type: "string",
      description: "Default value for the field",
    },
    {
      name: "sortOrder",
      title: "Sort Order",
      type: "number",
      description: "Controls display order in forms",
      initialValue: 0,
    },
    {
      name: "isActive",
      title: "Is Active",
      type: "boolean",
      description: "Toggle to enable/disable the field",
      initialValue: true,
    },
    {
      name: "applicableCategories",
      title: "Applicable Categories",
      type: "array",
      of: [
        {
          type: "string",
          options: {
            list: [
              { title: "Switch", value: "switch" },
              { title: "Socket", value: "socket" },
              { title: "MCB", value: "mcb" },
              { title: "Fuse", value: "fuse" },
              { title: "Change Over", value: "changeover" },
              { title: "Light", value: "light" },
              { title: "Bulb", value: "bulb" },
              { title: "LED", value: "led" },
              { title: "Motor", value: "motor" },
              { title: "Pump", value: "pump" },
              { title: "Geyser", value: "geyser" },
              { title: "Heater", value: "heater" },
              { title: "Mixer", value: "mixer" },
              { title: "Wire", value: "wire" },
              { title: "Cable", value: "cable" },
              { title: "Tool", value: "tool" },
              { title: "Safety", value: "safety" },
              { title: "Accessory", value: "accessory" },
            ],
          },
        },
      ],
      description: "Categories where this field can be used",
    },
    {
      name: "conditionalLogic",
      title: "Conditional Logic",
      type: "object",
      description: "Rules for showing/hiding the field based on other field values",
      fields: [
        {
          name: "dependsOn",
          title: "Depends On Field",
          type: "string",
          description: "Field key that this field depends on",
        },
        {
          name: "condition",
          title: "Condition",
          type: "string",
          options: {
            list: [
              { title: "Equals", value: "equals" },
              { title: "Not Equals", value: "notEquals" },
              { title: "Greater Than", value: "greaterThan" },
              { title: "Less Than", value: "lessThan" },
              { title: "Contains", value: "contains" },
              { title: "Not Contains", value: "notContains" },
              { title: "Is Empty", value: "isEmpty" },
              { title: "Is Not Empty", value: "isNotEmpty" },
            ],
          },
        },
        {
          name: "value",
          title: "Value",
          type: "string",
          description: "Value to compare against",
        },
      ],
    },
  ],
  preview: {
    select: {
      title: "fieldLabel",
      subtitle: "fieldKey",
      description: "fieldType",
    },
    prepare(selection) {
      const { title, subtitle, description } = selection;
      return {
        title,
        subtitle: `${subtitle} (${description})`
      };
    },
  },
};