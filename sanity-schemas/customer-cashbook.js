export default {
  title: "Customer Cashbook",
  name: "customerCashbook",
  type: "document",
  fields: [
    {
      title: "Customer",
      name: "customer",
      type: "reference",
      to: [{ type: "user" }],
      validation: (Rule) => Rule.required(),
    },
    {
      title: "Name",
      name: "name",
      type: "string",
      description: "Label for this cashbook (e.g., Site/Project)",
      validation: (Rule) => Rule.required().min(2),
    },
    {
      title: "Status",
      name: "status",
      type: "string",
      options: {
        list: [
          { title: "Open", value: "open" },
          { title: "Closed", value: "closed" },
        ],
        layout: "radio",
      },
      initialValue: "open",
    },
    {
      title: "Notes",
      name: "notes",
      type: "text",
      rows: 3,
    },
    {
      title: "Created At",
      name: "createdAt",
      type: "datetime",
      initialValue: () => new Date().toISOString(),
      readOnly: true,
    },
    {
      title: "Updated At",
      name: "updatedAt",
      type: "datetime",
      initialValue: () => new Date().toISOString(),
      readOnly: true,
    },
  ],
  preview: {
    select: {
      title: "name",
      customerName: "customer.name",
      status: "status",
    },
    prepare({ title, customerName, status }) {
      return {
        title: title || customerName || "Cashbook",
        subtitle: `${customerName || "Unknown"} • ${status || "open"}`,
      };
    },
  },
};
