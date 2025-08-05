import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'bill',
  title: 'Bill',
  type: 'document',
  fields: [
    defineField({
      name: 'billId',
      title: 'Bill ID',
      type: 'string',
      initialValue: () => {
        if (typeof window !== 'undefined' && window.btoa) {
          return window.btoa(Date.now().toString())
        }
        return Date.now().toString(36)
      },
      readOnly: true,
      description: 'Auto-generated unique bill identifier',
    }),
    defineField({
      name: 'billNumber',
      title: 'Bill Number',
      type: 'string',
      validation: (Rule) => Rule.required(),
      description: 'Sequential bill number (e.g., BILL-2024-0001)',
    }),

    // Customer Information
    defineField({
      name: 'customer',
      title: 'Customer',
      type: 'reference',
      to: [{type: 'user'}],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'customerAddress',
      title: 'Customer Address',
      type: 'reference',
      to: [{type: 'address'}],
      validation: (Rule) => Rule.required(),
    }),

    // Service Details
    defineField({
      name: 'serviceType',
      title: 'Service Type',
      type: 'string',
      options: {
        list: [
          {title: 'Repair', value: 'repair'},
          {title: 'Sale', value: 'sale'},
          {title: 'Installation', value: 'installation'},
          {title: 'Maintenance', value: 'maintenance'},
          {title: 'Custom', value: 'custom'},
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'locationType',
      title: 'Location Type',
      type: 'string',
      options: {
        list: [
          {title: 'Shop', value: 'shop'},
          {title: 'Home', value: 'home'},
          {title: 'Office', value: 'office'},
        ],
      },
      validation: (Rule) => Rule.required(),
    }),

    // Bill Items - NEW FIELD
    defineField({
      name: 'items',
      title: 'Bill Items',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'product',
              title: 'Product',
              type: 'reference',
              to: [{type: 'product'}],
              validation: (Rule) => Rule.required(),
            },
            {
              name: 'productName',
              title: 'Product Name',
              type: 'string',
              validation: (Rule) => Rule.required(),
              description: 'Display name of the product',
            },
            {
              name: 'category',
              title: 'Category',
              type: 'string',
              description: 'Product category',
            },
            {
              name: 'brand',
              title: 'Brand',
              type: 'string',
              description: 'Product brand',
            },
            {
              name: 'specifications',
              title: 'Specifications',
              type: 'text',
              description: 'Product specifications (e.g., color, size, watts)',
            },
            {
              name: 'quantity',
              title: 'Quantity',
              type: 'number',
              validation: (Rule) => Rule.required().min(1),
              initialValue: 1,
            },
            {
              name: 'unitPrice',
              title: 'Unit Price',
              type: 'number',
              validation: (Rule) => Rule.required().min(0),
            },
            {
              name: 'totalPrice',
              title: 'Total Price',
              type: 'number',
              validation: (Rule) => Rule.required().min(0),
              readOnly: true,
              description: 'Calculated as quantity × unitPrice',
            },
            {
              name: 'unit',
              title: 'Unit',
              type: 'string',
              description: 'Unit of measurement (e.g., pcs, kg, m)',
              initialValue: 'pcs',
            },
          ],
          preview: {
            select: {
              productName: 'productName',
              quantity: 'quantity',
              unitPrice: 'unitPrice',
              totalPrice: 'totalPrice',
            },
            prepare({productName, quantity, unitPrice, totalPrice}) {
              return {
                title: `${productName || 'Product'}`,
                subtitle: `${quantity} × ₹${unitPrice} = ₹${totalPrice}`,
              }
            },
          },
        },
      ],
      validation: (Rule) => Rule.required().min(1),
      description: 'Items included in this bill',
    }),

    // Service Dates
    defineField({
      name: 'serviceDate',
      title: 'Service Date',
      type: 'datetime',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'completionDate',
      title: 'Completion Date',
      type: 'datetime',
    }),
    defineField({
      name: 'technician',
      title: 'Technician',
      type: 'reference',
      to: [{type: 'user'}],
      description: 'Admin/technician who performed the service',
    }),

    // Charges
    defineField({
      name: 'homeVisitFee',
      title: 'Home Visit Fee',
      type: 'number',
      initialValue: 0,
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: 'repairCharges',
      title: 'Repair Fee',
      type: 'number',
      initialValue: 0,
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: 'transportationFee',
      title: 'Transportation Fee',
      type: 'number',
      initialValue: 0,
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: 'laborCharges',
      title: 'Labor Charges',
      type: 'number',
      initialValue: 0,
      validation: (Rule) => Rule.min(0),
    }),

    // Calculations
    defineField({
      name: 'subtotal',
      title: 'Subtotal',
      type: 'number',
      validation: (Rule) => Rule.required().min(0),
      readOnly: true,
      description: 'Sum of all item totals',
    }),
    defineField({
      name: 'taxAmount',
      title: 'Tax Amount',
      type: 'number',
      validation: (Rule) => Rule.required().min(0),
      readOnly: true,
    }),
    defineField({
      name: 'discountAmount',
      title: 'Discount Amount',
      type: 'number',
      initialValue: 0,
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: 'totalAmount',
      title: 'Total Amount',
      type: 'number',
      validation: (Rule) => Rule.required().min(0),
      readOnly: true,
    }),

    // Payment Information
    defineField({
      name: 'paymentStatus',
      title: 'Payment Status',
      type: 'string',
      options: {
        list: [
          {title: 'Pending', value: 'pending'},
          {title: 'Partial', value: 'partial'},
          {title: 'Paid', value: 'paid'},
          {title: 'Overdue', value: 'overdue'},
        ],
      },
      initialValue: 'pending',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'paymentMethod',
      title: 'Payment Method',
      type: 'string',
      options: {
        list: [
          {title: 'Cash', value: 'cash'},
          {title: 'Card', value: 'card'},
          {title: 'UPI', value: 'upi'},
          {title: 'Bank Transfer', value: 'bank_transfer'},
          {title: 'Cheque', value: 'cheque'},
        ],
      },
    }),
    defineField({
      name: 'paidAmount',
      title: 'Paid Amount',
      type: 'number',
      initialValue: 0,
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: 'balanceAmount',
      title: 'Balance Amount',
      type: 'number',
      initialValue: 0,
      validation: (Rule) => Rule.min(0),
      readOnly: true,
    }),
    defineField({
      name: 'paymentDate',
      title: 'Payment Date',
      type: 'datetime',
    }),

    // Additional Information
    defineField({
      name: 'notes',
      title: 'Notes',
      type: 'text',
      initialValue: '0',
      description: 'Customer-visible notes',
    }),
    defineField({
      name: 'internalNotes',
      title: 'Internal Notes',
      type: 'text',
      initialValue: '0',
      description: 'Admin-only internal notes',
    }),
    defineField({
      name: 'images',
      title: 'Service Images',
      type: 'array',
      of: [
        {
          type: 'image',
          options: {
            hotspot: true,
          },
          fields: [
            {
              name: 'caption',
              title: 'Caption',
              type: 'string',
            },
          ],
        },
      ],
    }),

    // Status and Workflow
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          {title: 'Draft', value: 'draft'},
          {title: 'Confirmed', value: 'confirmed'},
          {title: 'In Progress', value: 'in_progress'},
          {title: 'Completed', value: 'completed'},
          {title: 'Cancelled', value: 'cancelled'},
        ],
      },
      initialValue: 'draft',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'priority',
      title: 'Priority',
      type: 'string',
      options: {
        list: [
          {title: 'Low', value: 'low'},
          {title: 'Medium', value: 'medium'},
          {title: 'High', value: 'high'},
          {title: 'Urgent', value: 'urgent'},
        ],
      },
      initialValue: 'medium',
    }),

    // Timestamps
    defineField({
      name: 'createdAt',
      title: 'Created At',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
      readOnly: true,
    }),
    defineField({
      name: 'updatedAt',
      title: 'Updated At',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
    }),
    defineField({
      name: 'createdBy',
      title: 'Created By',
      type: 'reference',
      to: [{type: 'user'}],
      readOnly: true,
    }),
  ],

  preview: {
    select: {
      billNumber: 'billNumber',
      customerName: 'customer.name',
      serviceType: 'serviceType',
      totalAmount: 'totalAmount',
      paymentStatus: 'paymentStatus',
      status: 'status',
      priority: 'priority',
    },
    prepare({billNumber, customerName, serviceType, totalAmount, paymentStatus, status, priority}) {
      const priorityIcon =
        {
          low: '🟢',
          medium: '🟡',
          high: '🟠',
          urgent: '🔴',
        }[priority] || '🟡'

      const statusIcon =
        {
          draft: '📝',
          confirmed: '✅',
          in_progress: '⚡',
          completed: '✅',
          cancelled: '❌',
        }[status] || '📝'

      const paymentIcon =
        {
          pending: '⏳',
          partial: '🟡',
          paid: '✅',
          overdue: '🔴',
        }[paymentStatus] || '⏳'

      return {
        title: `${priorityIcon} ${billNumber || 'No Bill Number'}`,
        subtitle: `${statusIcon} ${customerName || 'Unknown Customer'} | ${serviceType?.toUpperCase() || 'NO SERVICE'} | ₹${totalAmount || 0} ${paymentIcon}`,
      }
    },
  },
}) 