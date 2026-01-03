export default {
  title: 'Cash Book Entry',
  name: 'cashBookEntry',
  type: 'document',
  fields: [
    {
      title: 'User',
      name: 'user',
      type: 'reference',
      to: [{ type: 'user' }],
      validation: Rule => Rule.required(),
    },
    {
      title: 'User Name',
      name: 'userName',
      type: 'string',
      validation: Rule => Rule.required(),
    },
    {
      title: 'Amount',
      name: 'amount',
      type: 'number',
      validation: Rule => Rule.required().min(0),
    },
    {
      title: 'Transaction Type',
      name: 'type',
      type: 'string',
      options: {
        list: [
          { title: 'Credit', value: 'credit' },
          { title: 'Debit', value: 'debit' },
        ],
      },
      validation: Rule => Rule.required(),
    },
    {
      title: 'Source',
      name: 'source',
      type: 'string',
      options: {
        list: [
          { title: 'Manual', value: 'Manual' },
          { title: 'Bill Payment', value: 'Bill Payment' },
        ],
      },
      initialValue: 'Manual',
      validation: Rule => Rule.required(),
    },
    {
      title: 'Bill',
      name: 'bill',
      type: 'reference',
      to: [{ type: 'bill' }],
      hidden: ({ document }) => document?.source !== 'Bill Payment',
    },
    {
      title: 'Created At',
      name: 'createdAt',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
      readOnly: true,
    },
    {
      title: 'Updated At',
      name: 'updatedAt',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
      readOnly: true,
    },
  ],
  orderings: [
    {
      title: 'Created At (Newest First)',
      name: 'createdAtDesc',
      by: [{ field: 'createdAt', direction: 'desc' }],
    },
    {
      title: 'Created At (Oldest First)',
      name: 'createdAtAsc',
      by: [{ field: 'createdAt', direction: 'asc' }],
    },
    {
      title: 'Amount (Highest First)',
      name: 'amountDesc',
      by: [{ field: 'amount', direction: 'desc' }],
    },
    {
      title: 'Amount (Lowest First)',
      name: 'amountAsc',
      by: [{ field: 'amount', direction: 'asc' }],
    },
  ],
  preview: {
    select: {
      userName: 'userName',
      amount: 'amount',
      type: 'type',
      source: 'source',
      createdAt: 'createdAt',
    },
    prepare(selection) {
      const { userName, amount, type, source, createdAt } = selection;
      const typeSymbol = type === 'credit' ? '+' : '-';
      const formattedDate = new Date(createdAt).toLocaleDateString();
      
      return {
        title: `${typeSymbol}₹${amount} - ${userName}`,
        subtitle: `${source} • ${formattedDate}`,
      };
    },
  },
};
