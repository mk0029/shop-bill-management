
## Overview

This implementation provides a comprehensive WhatsApp messaging system with multi-device support, authentication, load balancing, and Sanity CMS integration for managing configurations.

## Key Features

### ✅ Multi-Device Support
- Configure multiple WhatsApp devices for load balancing
- Automatic device selection based on strategy
- Failover support for high availability

### ✅ Authentication Integration
- User ID and Pass Key included in all messages
- Customer authentication details in bill messages
- Secure credential management through Sanity

### ✅ Load Balancing Strategies
- **Priority Based**: Use highest priority device first
- **Round Robin**: Rotate between available devices
- **Least Used**: Select device with lowest usage
- **Random**: Random device selection

### ✅ Sanity CMS Integration
- Complete configuration management through Sanity Studio
- Real-time device status tracking
- Message template customization
- Analytics and reporting

### ✅ Enhanced Message Templates
- Customizable message templates with variables
- Include complete bill details
- User authentication information
- Business contact details

## File Structure

```
src/
├── lib/
│   ├── whatsapp-utils.ts              # Core WhatsApp utilities
│   └── sanity-whatsapp-service.ts     # Sanity integration service
├── hooks/
│   └── use-whatsapp-config.ts         # React hooks for WhatsApp management
├── components/
│   └── whatsapp/
│       └── bill-sender.tsx            # Example bill sender component
├── app/
│   └── admin/
│       └── settings/
│           └── whatsapp-enhanced/
│               └── page.tsx           # Enhanced admin interface
└── sanity-schemas/
    └── whatsapp-config.js             # Sanity schema definition
```

## Implementation Steps

### 1. Sanity Schema Setup

Add the WhatsApp configuration schema to your Sanity project:

```javascript
// sanity.config.js
import whatsappConfig from './sanity-schemas/whatsapp-config'

export default defineConfig({
  // ... other config
  schema: {
    types: [
      whatsappConfig,
      // ... other schemas
    ],
  },
})
```

### 2. Environment Variables

Add these environment variables to your `.env.local`:

```env
# Sanity Configuration
NEXT_PUBLIC_SANITY_PROJECT_ID=your_project_id
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_TOKEN=your_api_token

# WhatsApp Business API (optional)
WHATSAPP_BUSINESS_API_URL=https://graph.facebook.com/v17.0
WHATSAPP_BUSINESS_ACCESS_TOKEN=your_access_token
```

### 3. Sanity Client Setup

Create a Sanity client configuration:

```typescript
// src/lib/sanity-client.ts
import { createClient } from '@sanity/client'

export const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
  apiVersion: '2023-05-03',
})
```

### 4. Update Sanity Service

Uncomment the Sanity client calls in `src/lib/sanity-whatsapp-service.ts`:

```typescript
// Replace mock implementations with actual Sanity calls
const sanityConfigs = await client.fetch<SanityWhatsAppConfig[]>(WHATSAPP_CONFIG_QUERY);
return sanityConfigs.map(transformSanityToWhatsAppConfig);
```

## Usage Examples

### Basic Message Sending

```typescript
import { useWhatsAppMessaging } from '@/hooks/use-whatsapp-config';

function MyComponent() {
  const { sendBillMessage, isConfigured } = useWhatsAppMessaging();

  const handleSendBill = async () => {
    if (!isConfigured) {
      alert('WhatsApp not configured');
      return;
    }

    const bill = {
      billNumber: "BILL-001",
      customerName: "John Doe",
      customerPhone: "+917015493276",
      billDate: "2025-01-15",
      dueDate: "2025-01-30",
      items: [
        { name: "LED Bulb", quantity: 5, price: 90, total: 450 }
      ],
      subtotal: 450,
      total: 450,
      userId: "customer_123",
      passKey: "secure_key_456"
    };

    try {
      const result = await sendBillMessage(bill);
      console.log('Message sent:', result);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  return (
    <button onClick={handleSendBill}>
      Send WhatsApp Bill
    </button>
  );
}
```

### Configuration Management

```typescript
import { useWhatsAppConfig } from '@/hooks/use-whatsapp-config';

function ConfigManager() {
  const {
    config,
    updateConfiguration,
    addDevice,
    deviceAnalytics
  } = useWhatsAppConfig();

  const handleAddDevice = () => {
    const newDevice = {
      deviceName: "New Device",
      phoneNumber: "+917015493277",
      userId: "device_user_id",
      passKey: "device_pass_key",
      isActive: true,
      priority: 2,
      maxDailyMessages: 500,
      currentDailyCount: 0
    };

    addDevice(newDevice);
  };

  return (
    <div>
      <h2>Device Analytics</h2>
      {deviceAnalytics.map(device => (
        <div key={device.deviceName}>
          <h3>{device.deviceName}</h3>
          <p>Usage: {device.dailyUsage}/{device.maxDaily}</p>
          <p>Status: {device.isActive ? 'Active' : 'Inactive'}</p>
        </div>
      ))}
      <button onClick={handleAddDevice}>Add Device</button>
    </div>
  );
}
```

## Sanity Studio Configuration

### 1. Create WhatsApp Configuration

1. Open Sanity Studio
2. Navigate to "WhatsApp Configuration"
3. Click "Create new WhatsApp Configuration"
4. Fill in business information:
   - Business Name
   - Business Address
   - Business Email (optional)
   - Business Website (optional)

### 2. Configure Devices

For each WhatsApp device:

1. Click "Add Device" in the devices section
2. Fill in device details:
   - **Device Name**: Descriptive name (e.g., "Main Office")
   - **Phone Number**: Include country code (+917015493276)
   - **User ID**: WhatsApp Business API user identifier
   - **Pass Key**: Authentication key
   - **API Endpoint**: WhatsApp Business API URL (optional)
   - **Priority**: 1 = highest priority
   - **Max Daily Messages**: Daily limit for this device
   - **Is Active**: Enable/disable device

### 3. Load Balancing Settings

Configure load balancing strategy:
- **Priority Based**: Use highest priority device first
- **Round Robin**: Rotate between devices
- **Least Used**: Use device with lowest usage
- **Random**: Random selection

Enable failover for automatic device switching on failure.

### 4. Message Template

Customize the message template using variables:

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

## Available Template Variables

- `{{businessName}}` - Business name
- `{{billNumber}}` - Bill number
- `{{customerName}}` - Customer name
- `{{customerPhone}}` - Customer phone
- `{{userId}}` - User ID for authentication
- `{{passKey}}` - Pass key for authentication
- `{{billDate}}` - Bill date
- `{{dueDate}}` - Due date
- `{{itemsList}}` - Formatted list of items
- `{{subtotal}}` - Subtotal amount
- `{{taxLine}}` - Tax line (if applicable)
- `{{total}}` - Total amount
- `{{notes}}` - Additional notes
- `{{businessAddress}}` - Business address
- `{{businessEmail}}` - Business email
- `{{businessWebsite}}` - Business website

## Admin Interface

Access the enhanced WhatsApp settings at:
`/admin/settings/whatsapp-enhanced`

The interface provides:

### Business Tab
- Configure company information
- Set business contact details
- Upload business logo

### Devices Tab
- Add/remove WhatsApp devices
- Configure authentication for each device
- Set priorities and daily limits
- Test device connections
- Reset daily counters

### Settings Tab
- Configure load balancing strategy
- Set failover options
- Customize message templates
- Add custom fields

### Analytics Tab
- View device usage statistics
- Monitor message delivery rates
- Track device performance
- Generate usage reports

## API Integration

### WhatsApp Business API

For production use with WhatsApp Business API:

1. Set up WhatsApp Business API account
2. Get access token and phone number ID
3. Configure API endpoint in device settings
4. Set authentication credentials

Example API configuration:
```
API Endpoint: https://graph.facebook.com/v17.0/PHONE_NUMBER_ID/messages
User ID: PHONE_NUMBER_ID
Pass Key: ACCESS_TOKEN
```

### Web WhatsApp Fallback

For devices without API endpoint, the system falls back to web WhatsApp:
- Opens WhatsApp Web with pre-filled message
- User manually sends the message
- Suitable for small-scale operations

## Monitoring and Analytics

### Device Analytics
- Daily message counts
- Usage percentages
- Last used timestamps
- Success/failure rates

### Message Tracking
- Delivery status tracking
- Read receipt monitoring (optional)
- Error logging and reporting
- Performance metrics

### Daily Maintenance
- Automatic daily counter reset
- Device health checks
- Usage report generation
- Error alert notifications

## Security Considerations

### Authentication
- Secure storage of User IDs and Pass Keys
- Encrypted communication with WhatsApp API
- Access control for admin interface
- Audit trail for configuration changes

### Data Protection
- Customer data encryption
- Secure message transmission
- GDPR compliance considerations
- Data retention policies

## Troubleshooting

### Common Issues

1. **Device Not Responding**
   - Check device active status
   - Verify authentication credentials
   - Test API endpoint connectivity
   - Review error logs

2. **Message Delivery Failures**
   - Verify phone number format
   - Check daily message limits
   - Review WhatsApp Business API status
   - Test device connection

3. **Load Balancing Issues**
   - Review device priorities
   - Check daily usage limits
   - Verify failover settings
   - Monitor device availability

### Error Codes

- `NO_ACTIVE_DEVICE`: No active devices available
- `DAILY_LIMIT_EXCEEDED`: Device daily limit reached
- `API_ERROR`: WhatsApp API error
- `INVALID_PHONE`: Invalid phone number format
- `AUTH_FAILED`: Authentication failure

## Best Practices

### Device Configuration
1. Set primary device with highest priority (1)
2. Configure backup devices with lower priorities
3. Set appropriate daily limits based on WhatsApp plans
4. Use unique authentication credentials for each device

### Message Templates
1. Keep messages under WhatsApp character limits
2. Use clear, professional formatting
3. Include all necessary authentication details
4. Test templates before deployment

### Load Balancing
1. Use priority-based strategy for main/backup setup
2. Enable failover for business continuity
3. Monitor device usage regularly
4. Adjust strategies based on usage patterns

### Security
1. Regularly rotate authentication keys
2. Monitor access logs
3. Use HTTPS for all API communications
4. Implement proper access controls

## Support and Maintenance

### Regular Tasks
- Monitor device performance
- Review message delivery rates
- Update authentication credentials
- Backup configuration data

### Updates and Upgrades
- Keep WhatsApp Business API updated
- Monitor for new features
- Update message templates as needed
- Review and optimize load balancing

This implementation provides a robust, scalable WhatsApp messaging system with comprehensive management capabilities through Sanity CMS.