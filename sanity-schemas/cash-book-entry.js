export default {
  title: "Cash Book Entry",
  name: "cashBookEntry",
  type: "document",
  fields: [
    {
      title: "User",
      name: "user",
      type: "reference",
      to: [{ type: "user" }],
    },
    {
      title: "User Name",
      name: "userName",
      type: "string",
      validation: (Rule) => Rule.required(),
    },
    {
      title: "Amount",
      name: "amount",
      type: "number",
      validation: (Rule) => Rule.required().min(0),
    },
    {
      title: "Transaction Type",
      name: "type",
      type: "string",
      options: {
        list: [
          { title: "Credit", value: "credit" },
          { title: "Debit", value: "debit" },
        ],
      },
      validation: (Rule) => Rule.required(),
    },
    {
      title: "Source",
      name: "source",
      type: "string",
      options: {
        list: [
          { title: "Manual", value: "Manual" },
          { title: "Bill Payment", value: "Bill Payment" },
        ],
      },
      initialValue: "Manual",
      validation: (Rule) => Rule.required(),
    },
    {
      title: "Bill",
      name: "bill",
      type: "reference",
      to: [{ type: "bill" }],
      hidden: ({ document }) => document?.source !== "Bill Payment",
      description: "Legacy single bill reference. For multi-bill payments, use Applied Bills instead.",
    },
    {
      title: "Applied Bills",
      name: "appliedBills",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            { name: "billRef", type: "reference", to: [{ type: "bill" }] },
            { name: "billNumber", type: "string", title: "Bill Number" },
            { name: "appliedAmount", type: "number", title: "Applied Amount" },
            { name: "status", type: "string", options: { list: [{ title: "Paid", value: "paid" }, { title: "Partial", value: "partial" }] }, title: "Status" },
          ],
          preview: {
            select: { billNumber: "billNumber", appliedAmount: "appliedAmount", status: "status" },
            prepare(sel) {
              return { title: `${sel.billNumber || "Bill"} - ${sel.status}`, subtitle: `₹${sel.appliedAmount || 0}` }
            }
          }
        }
      ],
      hidden: ({ document }) => document?.source !== "Bill Payment",
    },
    {
      title: "Bill Count",
      name: "billCount",
      type: "number",
      hidden: ({ document }) => document?.source !== "Bill Payment",
    },
    {
      title: "Fully Paid Count",
      name: "fullyPaidCount",
      type: "number",
      hidden: ({ document }) => document?.source !== "Bill Payment",
    },
    {
      title: "Partially Paid Count",
      name: "partialCount",
      type: "number",
      hidden: ({ document }) => document?.source !== "Bill Payment",
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
    {
      title: "Category",
      name: "category",
      type: "string",
      options: {
        list: [
          { title: "General", value: "general" },
          { title: "Inventory", value: "inventory" },
          { title: "Bill Payment", value: "bill_payment" },
          { title: "Advance", value: "advance" },
          { title: "Expense", value: "expense" },
          { title: "Income", value: "income" },
        ],
      },
      initialValue: "general",
    },
    {
      title: "Notes",
      name: "notes",
      type: "text",
      rows: 3,
    },
  ],
  orderings: [
    {
      title: "Created At (Newest First)",
      name: "createdAtDesc",
      by: [{ field: "createdAt", direction: "desc" }],
    },
    {
      title: "Created At (Oldest First)",
      name: "createdAtAsc",
      by: [{ field: "createdAt", direction: "asc" }],
    },
    {
      title: "Amount (Highest First)",
      name: "amountDesc",
      by: [{ field: "amount", direction: "desc" }],
    },
    {
      title: "Amount (Lowest First)",
      name: "amountAsc",
      by: [{ field: "amount", direction: "asc" }],
    },
  ],
  preview: {
    select: {
      userName: "userName",
      amount: "amount",
      type: "type",
      source: "source",
      category: "category",
      notes: "notes",
      createdAt: "createdAt",
    },
    prepare(selection) {
      const { userName, amount, type, source, category, notes, createdAt } =
        selection;
      const typeSymbol = type === "credit" ? "+" : "-";
      const formattedDate = new Date(createdAt).toLocaleDateString();
      const categoryLabel = category
        ? category.charAt(0).toUpperCase() + category.slice(1)
        : "General";

      return {
        title: `${typeSymbol}₹${amount} - ${userName}`,
        subtitle: `${source} • ${categoryLabel}${notes ? ` • ${notes.substring(0, 50)}${notes.length > 50 ? "..." : ""}` : ""} • ${formattedDate}`,
      };
    },
  },
};
