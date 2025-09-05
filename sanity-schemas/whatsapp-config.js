// sanity-schemas/whatsapp-config.js
export default {
  name: "whatsappConfig",
  title: "WhatsApp Configuration",
  type: "document",
  fields: [
    {
      name: "configName",
      title: "Configuration Name",
      type: "string",
      description: "Name to identify this WhatsApp configuration",
      validation: (Rule) => Rule.required(),
    },
    {
      name: "isActive",
      title: "Is Active",
      type: "boolean",
      description: "Enable/disable this configuration",
      initialValue: true,
    },
    {
      name: "businessInfo",
      title: "Business Information",
      type: "object",
      fields: [
        {
          name: "businessName",
          title: "Business Name",
          type: "string",
          validation: (Rule) => Rule.required(),
        },
        {
          name: "businessAddress",
          title: "Business Address",
          type: "text",
          validation: (Rule) => Rule.required(),
        },
        {
          name: "businessEmail",
          title: "Business Email",
          type: "string",
          validation: (Rule) => Rule.email(),
        },
        {
          name: "businessWebsite",
          title: "Business Website",
          type: "url",
        },
        {
          name: "businessLogo",
          title: "Business Logo",
          type: "image",
          description: "Logo for WhatsApp messages (optional)",
        },
      ],
    },
    {
      name: "devices",
      title: "WhatsApp Devices",
      type: "array",
      of: [
        {
          type: "object",
          name: "whatsappDevice",
          title: "WhatsApp Device",
          fields: [
            {
              name: "deviceName",
              title: "Device Name",
              type: "string",
              description:
                "Name to identify this device (e.g., 'Main Office', 'Branch 1')",
              validation: (Rule) => Rule.required(),
            },
            {
              name: "phoneNumber",
              title: "WhatsApp Phone Number",
              type: "string",
              description:
                "Phone number with country code (e.g., +917015493276)",
              validation: (Rule) => Rule.required(),
            },
            {
              name: "userId",
              title: "User ID",
              type: "string",
              description: "Unique identifier for WhatsApp Business API",
              validation: (Rule) => Rule.required(),
            },
            {
              name: "passKey",
              title: "Pass Key",
              type: "string",
              description: "Authentication key for WhatsApp Business API",
              validation: (Rule) => Rule.required(),
            },
            {
              name: "apiEndpoint",
              title: "API Endpoint",
              type: "url",
              description: "WhatsApp Business API endpoint URL",
            },
            {
              name: "isActive",
              title: "Is Active",
              type: "boolean",
              description: "Enable/disable this device",
              initialValue: true,
            },
            {
              name: "priority",
              title: "Priority",
              type: "number",
              description: "Priority order (1 = highest priority)",
              initialValue: 1,
              validation: (Rule) => Rule.min(1).max(10),
            },
            {
              name: "maxDailyMessages",
              title: "Max Daily Messages",
              type: "number",
              description: "Maximum messages per day for this device",
              initialValue: 1000,
            },
            {
              name: "currentDailyCount",
              title: "Current Daily Count",
              type: "number",
              description: "Current message count for today",
              initialValue: 0,
              readOnly: true,
            },
            {
              name: "lastUsed",
              title: "Last Used",
              type: "datetime",
              description: "Last time this device was used",
              readOnly: true,
            },
          ],
          preview: {
            select: {
              title: "deviceName",
              subtitle: "phoneNumber",
              isActive: "isActive",
            },
            prepare(selection) {
              const { title, subtitle, isActive } = selection;
              return {
                title: title || "Unnamed Device",
                subtitle: `${subtitle} ${isActive ? "✅" : "❌"}`,
              };
            },
          },
        },
      ],
      description: "Configure multiple WhatsApp devices for load balancing",
    },
    {
      name: "messageTemplate",
      title: "Message Template",
      type: "object",
      fields: [
        {
          name: "billTemplate",
          title: "Bill Message Template",
          type: "text",
          description:
            "Template for bill messages. Use {{variable}} for dynamic content",
          initialValue: `*{{businessName}}*
*Bill #{{billNumber}}*

*Customer Details:*
Name: {{customerName}}
Phone: {{customerPhone}}
User ID: {{userId}}

*Bill Details:*
Date: {{billDate}}
Due Date: {{dueDate}}

*Items:*
{{itemsList}}

*Summary:*
Subtotal: ₹{{subtotal}}
{{taxLine}}*Total: ₹{{total}}*

{{notes}}
*Contact:*
{{businessName}}
{{businessAddress}}
{{businessEmail}}
{{businessWebsite}}

*Authentication:*
User ID: {{userId}}
Pass Key: {{passKey}}`,
        },
        {
          name: "customFields",
          title: "Custom Fields",
          type: "array",
          of: [
            {
              type: "object",
              fields: [
                {
                  name: "fieldName",
                  title: "Field Name",
                  type: "string",
                  description: "Name of the custom field",
                },
                {
                  name: "fieldValue",
                  title: "Field Value",
                  type: "string",
                  description: "Value or template for the field",
                },
                {
                  name: "includeInBill",
                  title: "Include in Bill",
                  type: "boolean",
                  description: "Include this field in bill messages",
                  initialValue: true,
                },
              ],
            },
          ],
          description: "Additional custom fields to include in messages",
        },
      ],
    },
    {
      name: "loadBalancing",
      title: "Load Balancing Settings",
      type: "object",
      fields: [
        {
          name: "strategy",
          title: "Load Balancing Strategy",
          type: "string",
          options: {
            list: [
              { title: "Round Robin", value: "roundRobin" },
              { title: "Priority Based", value: "priority" },
              { title: "Least Used", value: "leastUsed" },
              { title: "Random", value: "random" },
            ],
          },
          initialValue: "priority",
        },
        {
          name: "failoverEnabled",
          title: "Enable Failover",
          type: "boolean",
          description: "Automatically switch to next device if one fails",
          initialValue: true,
        },
        {
          name: "retryAttempts",
          title: "Retry Attempts",
          type: "number",
          description: "Number of retry attempts before failover",
          initialValue: 3,
          validation: (Rule) => Rule.min(1).max(10),
        },
        {
          name: "retryDelay",
          title: "Retry Delay (seconds)",
          type: "number",
          description: "Delay between retry attempts",
          initialValue: 5,
          validation: (Rule) => Rule.min(1).max(60),
        },
      ],
    },
    {
      name: "analytics",
      title: "Analytics Settings",
      type: "object",
      fields: [
        {
          name: "trackDelivery",
          title: "Track Message Delivery",
          type: "boolean",
          description: "Track message delivery status",
          initialValue: true,
        },
        {
          name: "trackReads",
          title: "Track Message Reads",
          type: "boolean",
          description: "Track when messages are read",
          initialValue: false,
        },
        {
          name: "generateReports",
          title: "Generate Reports",
          type: "boolean",
          description: "Generate usage and analytics reports",
          initialValue: true,
        },
      ],
    },
    {
      name: "createdAt",
      title: "Created At",
      type: "datetime",
      initialValue: () => new Date().toISOString(),
      readOnly: true,
    },
    {
      name: "updatedAt",
      title: "Updated At",
      type: "datetime",
      initialValue: () => new Date().toISOString(),
    },
  ],
  preview: {
    select: {
      title: "configName",
      businessName: "businessInfo.businessName",
      isActive: "isActive",
      deviceCount: "devices",
    },
    prepare(selection) {
      const { title, businessName, isActive, deviceCount } = selection;
      const deviceCountText = deviceCount
        ? `${deviceCount.length} devices`
        : "No devices";
      return {
        title: title || "Unnamed Configuration",
        subtitle: `${businessName} | ${deviceCountText} ${isActive ? "✅" : "❌"}`,
      };
    },
  },
};
