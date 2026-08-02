export default {
  title: "Cashbook Item",
  name: "cashbookItem",
  type: "document",
  fields: [
    {
      title: "Cashbook",
      name: "cashbook",
      type: "reference",
      to: [{ type: "customerCashbook" }],
      validation: (Rule) => Rule.required(),
    },
    {
      title: "Customer (denormalized)",
      name: "customer",
      type: "reference",
      to: [{ type: "user" }],
      description: "Optional denormalized reference for faster queries",
    },
    {
      title: "Product",
      name: "product",
      type: "reference",
      to: [{ type: "product" }],
      description: "Optional reference if item maps to a catalog product",
    },
    {
      title: "Item name",
      name: "itemName",
      type: "string",
      validation: (Rule) => Rule.required(),
    },
    {
      title: "Specifications",
      name: "specifications",
      type: "string",
    },
    {
      title: "Category",
      name: "category",
      type: "string",
    },
    {
      title: "Brand",
      name: "brand",
      type: "string",
    },
    {
      title: "Unit",
      name: "unit",
      type: "string",
    },
    {
      title: "Quantity",
      name: "quantity",
      type: "number",
      validation: (Rule) => Rule.required().min(0.0001),
    },
    {
      title: "Rate",
      name: "unitPrice",
      type: "number",
      validation: (Rule) => Rule.required().min(0),
    },
    {
      title: "Total",
      name: "totalPrice",
      type: "number",
      readOnly: true,
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
      readOnly: false,
    },
    {
      title: "Updated At",
      name: "updatedAt",
      type: "datetime",
      initialValue: () => new Date().toISOString(),
      readOnly: true,
    },
    {
      title: "Bill",
      name: "bill",
      type: "reference",
      to: [{ type: "bill" }],
      description: "If set, this item has been billed and is locked",
    },
    {
      title: "Locked",
      name: "locked",
      type: "boolean",
      description: "Lock item after billing to prevent edits",
      initialValue: false,
    },
  ],
  orderings: [
    {
      title: "Newest First",
      name: "createdAtDesc",
      by: [{ field: "createdAt", direction: "desc" }],
    },
    {
      title: "Oldest First",
      name: "createdAtAsc",
      by: [{ field: "createdAt", direction: "asc" }],
    },
  ],
  preview: {
    select: {
      title: "itemName",
      qty: "quantity",
      rate: "unitPrice",
      total: "totalPrice",
      billed: "bill._ref",
    },
    prepare({ title, qty, rate, total, billed }) {
      const suffix = billed ? " • Billed" : " • Pending";
      return {
        title: `${title} x ${qty} @ ${rate}`,
        subtitle: `Total ₹${total ?? qty * rate}${suffix}`,
      };
    },
  },
};
