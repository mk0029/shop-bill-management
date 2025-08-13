// sanity-schemas/field-group.js
// Field groups for organizing specification fields

export default {
  name: "fieldGroup",
  title: "Field Group",
  type: "document",
  fields: [
    {
      name: "name",
      title: "Group Name",
      type: "string",
      description: "Internal group identifier (camelCase)",
      validation: (Rule) =>
        Rule.required()
          .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, {
            name: "camelCase",
            invert: false,
          })
          .error("Group name must be camelCase and start with a letter"),
    },
    {
      name: "label",
      title: "Display Label",
      type: "string",
      description: "Human-readable label shown to users",
      validation: (Rule) => Rule.required(),
    },
    {
      name: "description",
      title: "Description",
      type: "text",
      description: "Description of what fields in this group represent",
    },
    {
      name: "collapsible",
      title: "Collapsible",
      type: "boolean",
      initialValue: false,
      description: "Whether this group can be collapsed in forms",
    },
    {
      name: "defaultExpanded",
      title: "Default Expanded",
      type: "boolean",
      initialValue: true,
      description: "Whether this group is expanded by default",
      hidden: ({ document }) => !document?.collapsible,
    },
    {
      name: "displayOrder",
      title: "Display Order",
      type: "number",
      description: "Controls the order groups appear in forms",
      initialValue: 100,
    },
    {
      name: "icon",
      title: "Icon",
      type: "string",
      description: "Icon name for the group (optional)",
    },
    {
      name: "color",
      title: "Color",
      type: "string",
      options: {
        list: [
          { title: "Blue", value: "blue" },
          { title: "Green", value: "green" },
          { title: "Red", value: "red" },
          { title: "Yellow", value: "yellow" },
          { title: "Purple", value: "purple" },
          { title: "Gray", value: "gray" },
        ],
      },
      description: "Color theme for the group",
    },
    {
      name: "isActive",
      title: "Active",
      type: "boolean",
      initialValue: true,
      description: "Toggle to enable/disable this group",
    },
  ],

  preview: {
    select: {
      title: "label",
      subtitle: "name",
      isActive: "isActive",
    },
    prepare({ title, subtitle, isActive }) {
      return {
        title: title || subtitle,
        subtitle: `${subtitle}${!isActive ? " - Inactive" : ""}`,
        media: isActive ? "📁" : "🗂️",
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
      title: "Group Name",
      name: "nameAsc",
      by: [{ field: "name", direction: "asc" }],
    },
  ],
};
