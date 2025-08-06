// sanity-schemas/categoryFieldMapping.js
export default {
  name: "categoryFieldMapping",
  title: "Category Field Mapping",
  type: "document",
  fields: [
    {
      name: "categoryName",
      title: "Category Name",
      type: "string",
      description: 'The category name (e.g., "switch", "socket", "light")',
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
    {
      name: "requiredFields",
      title: "Required Fields",
      type: "array",
      of: [
        {
          type: "reference",
          to: [{ type: "fieldDefinition" }],
        },
      ],
      description:
        "Field definitions that are required when adding products of this category",
    },
    {
      name: "optionalFields",
      title: "Optional Fields",
      type: "array",
      of: [
        {
          type: "reference",
          to: [{ type: "fieldDefinition" }],
        },
      ],
      description:
        "Field definitions that are optional when adding products of this category",
    },
    {
      name: "isActive",
      title: "Is Active",
      type: "boolean",
      initialValue: true,
    },
    {
      name: "description",
      title: "Description",
      type: "text",
      description: "Description of this category mapping",
    },
  ],
  preview: {
    select: {
      title: "categoryName",
      subtitle: "categoryType",
    },
    prepare(selection) {
      const { title, subtitle } = selection;
      return {
        title: title.charAt(0).toUpperCase() + title.slice(1),
        subtitle: `${
          subtitle.charAt(0).toUpperCase() + subtitle.slice(1)
        } Category`,
      };
    },
  },
};
