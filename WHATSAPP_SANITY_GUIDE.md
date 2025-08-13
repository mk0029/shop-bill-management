# WhatsApp Multi-Device Management with Sanity CMS

## Overview

This guide explains how to set up and manage WhatsApp configurations using Sanity CMS for multi-device support, authentication, and load balancing.

## Features

- **Multi-Device Support**: Configure multiple WhatsApp devices for load balancing
- **Authentication**: User ID and Pass Key for each device
- **Load Balancing**: Multiple strategies (Priority, Round Robin, Least Used, Random)
- **Failover**: Automatic failover to backup devices
- **Analytics**: Track device usage and performance
- **Message Templates**: Customizable message templates with variables
- **Bill Integration**: Include complete bill details with user authentication

## Sanity Schema Setup

### 1. WhatsApp Configuration Schema

The main schema `whatsappConfig` includes:

- **Business Information**: Company details, logo, contact info
- **Devices Array**: Multiple WhatsApp devices with authentication
- **Message Templates**: Customizable templates with variables
- **Load Balancing**: Strategy and failover settings
- **Analytics**: Tracking and reporting settings

### 2. Device Configuration

Each device includes:

- Device Name (for identification)
- Phone Number (with country code)
- User ID (WhatsApp Business API)
- Pass Key (Authentication key)
- API Endpoint (optional)
- Priority Level (1-10)
- Daily Message Limits
- Active/Inactive status

## Setting Up in Sanity Studio

### Step 1: Add Schema to Sanity

1. Copy the `whatsapp-config.js` schema to your Sanity schemas folder
2. Import it in your schema index file:

```javascript
import whatsappConfig from "./whatsapp-config";

export default createSchema({
  name: "default",
  types: schemaTypes.concat([
    whatsappConfig,
    // ... other schemas
  ]),
});
```

### Step 2: Create WhatsApp Configuration

1. Open Sanity Studio
2. Navigate to "WhatsApp Configuration"
3. Click "Create new WhatsApp Configuration"
4. Fill in the required fields:

#### Business Information

- **Business Name**: Your company name
- **Business Address**: Complete business address
- **Business Email**: Contact email (optional)
- **Business Website**: Company website (optional)
- **Business Logo**: Upload logo for messages (optional)

#### Device Configuration

For each WhatsApp device:

- **Device Name**: Descriptive name (e.g., "Main Office", "Branch 1")
- **Phone Number**: Include country code (+917015493276)
- **User ID**: WhatsApp Business API user identifier
- **Pass Key**: Authentication key from WhatsApp Business
- **API Endpoint**: WhatsApp Business API URL (optional)
- **Priority**: 1 = highest priority, 10 = lowest
- **Max Daily Messages**: Daily message limit per device
- **Is Active**: Enable/disable device

#### Load Balancing Settings

- **Strategy**: Choose from:
  - Priority Based: Use highest priority device first
  - Round Robin: Rotate between devices
  - Least Used: Use device with lowest usage
  - Random: Random device selection
- **Enable Failover**: Auto-switch on device failure
- **Retry Attempts**: Number of retries before failover
- **Retry Delay**: Seconds between retry attempts

#### Message Template

Customize the bill message template using variables:

```
*{{businessName}}*
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
Pass Key: {{passKey}}
```

### Step 3: Configure Multiple Devices

1. In the "Devices" section, click "Add Device"
2. Configure each device with unique:
   - Phone number
   - User ID
   - Pass Key
   - Priority level
3. Set daily message limits based on your WhatsApp Business plan
4. Activate devices as needed

## Frontend Integration

### Enhanced WhatsApp Utils

The enhanced `whatsapp-utils.ts` provides:

- **Device Selection**: Automatic optimal device selection
- **Message Processing**: Template variable replacement
- **Load Balancing**: Multiple strategies implementation
- **Failover Handling**: Automatic device switching
- **Analytics**: Usage tracking and reporting

### Usage Example

```typescript
import { sendWhatsAppMessage, BillDetails } from "@/lib/whatsapp-utils";

const bill: BillDetails = {
  billNumber: "BILL-001",
  customerName: "John Doe",
  customerPhone: "+917015493276",
  billDate: "2025-01-15",
  dueDate: "2025-01-30",
  items: [
    { name: "LED Bulb", quantity: 5, price: 90, total: 450 },
    { name: "Wire", quantity: 10, price: 150, total: 1500 },
  ],
  subtotal: 1950,
  total: 1950,
  userId: "customer_user_id",
  passKey: "customer_pass_key",
};

// Send message with automatic device selection
const result = await sendWhatsAppMessage(bill, config);
console.log("Message sent:", result);
```

## Admin Interface

### Enhanced Settings Page

The new admin interface (`/admin/settings/whatsapp-enhanced`) provides:

1. **Business Tab**: Configure company information
2. **Devices Tab**: Manage multiple WhatsApp devices
3. **Settings Tab**: Load balancing and message templates
4. **Analytics Tab**: View device usage and performance

### Device Management

- Add/remove devices dynamically
- Configure authentication for each device
- Set priority and daily limits
- Monitor usage in real-time

## Best Practices

### Device Configuration

1. **Primary Device**: Set highest priority (1) for main business number
2. **Backup Devices**: Configure with lower priorities for failover
3. **Load Distribution**: Set appropriate daily limits based on WhatsApp plans
4. **Authentication**: Use unique User ID and Pass Key for each device

### Message Templates

1. **Variables**: Use template variables for dynamic content
2. **Authentication**: Always include User ID and Pass Key in messages
3. **Formatting**: Use WhatsApp formatting (_bold_, _italic_)
4. **Length**: Keep messages under WhatsApp limits

### Load Balancing

1. **Priority Strategy**: Best for main/backup device setup
2. **Round Robin**: Good for equal capacity devices
3. **Least Used**: Optimal for varying device capacities
4. **Failover**: Always enable for business continuity

## Monitoring and Analytics

### Device Analytics

Track for each device:

- Daily message count
- Usage percentage
- Last used timestamp
- Success/failure rates

### Performance Monitoring

- Monitor device availability
- Track message delivery rates
- Analyze load distribution
- Review failover events

## Troubleshooting

### Common Issues

1. **Device Not Responding**
   - Check device active status
   - Verify authentication credentials
   - Test API endpoint connectivity

2. **Message Delivery Failures**
   - Verify phone number format
   - Check daily message limits
   - Review WhatsApp Business API status

3. **Load Balancing Issues**
   - Review device priorities
   - Check daily usage limits
   - Verify failover settings

### Error Handling

The system provides comprehensive error handling:

- Automatic failover on device failure
- Retry mechanisms with configurable delays
- Detailed error logging and reporting

## Security Considerations

1. **Authentication**: Secure storage of User IDs and Pass Keys
2. **API Endpoints**: Use HTTPS for all API communications
3. **Access Control**: Limit admin access to WhatsApp configurations
4. **Audit Trail**: Log all configuration changes and message sends

## Maintenance

### Daily Tasks

- Monitor device usage
- Check message delivery rates
- Review error logs

### Weekly Tasks

- Reset daily counters (automated)
- Review device performance
- Update message templates as needed

### Monthly Tasks

- Analyze usage patterns
- Optimize load balancing strategy
- Review and update device configurations

## Support and Updates

For technical support or feature requests:

1. Check device status in analytics
2. Review error logs
3. Test individual device connectivity
4. Contact WhatsApp Business API support if needed

This comprehensive setup ensures reliable, scalable WhatsApp messaging with proper authentication, load balancing, and monitoring capabilities.
