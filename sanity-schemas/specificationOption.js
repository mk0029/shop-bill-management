// sanity-schemas/specificationOption.js
export default {
  name: "specificationOption",
  title: "Specification Option",
  type: "document",
  fields: [
    {
      name: "type",
      title: "Specification Type",
      type: "string",
      options: {
        list: [
          { title: "Amperage", value: "amperage" },
          { title: "Voltage", value: "voltage" },
          { title: "Wire Gauge", value: "wireGauge" },
          { title: "Light Type", value: "lightType" },
          { title: "Color", value: "color" },
          { title: "Size", value: "size" },
          { title: "Material", value: "material" },
          { title: "Core", value: "core" },
          { title: "Certification", value: "certification" },
        ],
      },
      validation: (Rule) => Rule.required(),
    },
    {
      name: "value",
      title: "Value",
      type: "string",
      description:
        'The internal value used in the system (e.g., "6A", "220V", "1.5mm")',
      validation: (Rule) => Rule.required(),
    },
    {
      name: "label",
      title: "Display Label",
      type: "string",
      description: 'The label shown to users (e.g., "6A", "220V", "1.5 sq mm")',
      validation: (Rule) => Rule.required(),
    },
    {
      name: "categories",
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
      description:
        "Select which product categories can use this specification option",
    },
    {
      name: "sortOrder",
      title: "Sort Order",
      type: "number",
      description: "Lower numbers appear first in dropdowns",
      initialValue: 0,
    },
    {
      name: "isActive",
      title: "Is Active",
      type: "boolean",
      description: "Only active options will be shown in the frontend",
      initialValue: true,
    },
    {
      name: "description",
      title: "Description",
      type: "text",
      description: "Optional description for this specification option",
    },
  ],
  preview: {
    select: {
      title: "label",
      subtitle: "type",
      description: "value",
    },
    prepare(selection) {
      const { title, subtitle, description } = selection;
      return {
        title: `${title} (${description})`,
        subtitle: `${
          subtitle.charAt(0).toUpperCase() + subtitle.slice(1)
        } Specification`,
      };
    },
  },
  orderings: [
    {
      title: "Type, then Sort Order",
      name: "typeAndOrder",
      by: [
        { field: "type", direction: "asc" },
        { field: "sortOrder", direction: "asc" },
        { field: "label", direction: "asc" },
      ],
    },
  ],
};
