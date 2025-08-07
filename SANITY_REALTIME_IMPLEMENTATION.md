# Sanity Real-Time Implementation Guide

This document provides a comprehensive guide to the real-time data synchronization implementation using Sanity's real-time features across both Admin and Customer panels.

## Overview

The real-time implementation enables automatic data synchronization across all connected clients without requiring page refreshes. This ensures that changes made in the admin panel are immediately reflected in customer-facing pages and vice versa.

## Architecture

### Core Components

1. **Real-Time Hooks** (`src/hooks/use-realtime-sync.ts`)

   - Main hook for managing real-time connections
   - Document-specific listeners
   - Customer-specific bill synchronization

2. **Real-Time Provider** (`src/components/providers/realtime-provider.tsx`)

   - Global context for real-time state management
   - Connection status monitoring
   - Manual refresh capabilities

3. **Real-Time Components**

   - `RealtimeBillList` - Live bill updates with animations
   - `RealtimeInventory` - Live inventory tracking
   - `RealtimeStockHistory` - Live stock transaction monitoring

4. **Enhanced API Service** (`src/lib/realtime-api-service.ts`)
   - Transactional operations with real-time notifications
   - Bulk operations with live updates
   - Real-time statistics

## Implementation Details

### 1. Real-Time Connection Setup

```typescript
import { useRealtimeSync } from "@/hooks/use-realtime-sync";

const { isConnected, connect, disconnect, refreshData } = useRealtimeSync({
  enableNotifications: true,
  enableAutoRefresh: true,
  documentTypes: [
    "bill",
    "product",
    "user",
    "stockTransaction",
    "brand",
    "category",
  ],
});
```

### 2. Document Listeners

```typescript
import { useDocumentListener } from "@/hooks/use-realtime-sync";

useDocumentListener("bill", undefined, (update) => {
  const { transition, result } = update;

  switch (transition) {
    case "appear":
      // Handle new document
      break;
    case "update":
      // Handle document update
      break;
    case "disappear":
      // Handle document deletion
      break;
  }
});
```

### 3. Provider Integration

```typescript
import { RealtimeProvider } from "@/components/providers/realtime-provider";

export default function Page() {
  return (
    <RealtimeProvider enableNotifications={true} showConnectionStatus={true}>
      {/* Your page content */}
    </RealtimeProvider>
  );
}
```

## Features Implemented

### Admin Panel Features

1. **Real-Time Dashboard**

   - Live bill statistics
   - Live inventory overview
   - Connection status indicator
   - Manual refresh capability

2. **Inventory Management**

   - Live stock level updates
   - Low stock alerts
   - Real-time transaction history
   - Animated updates for new transactions

3. **Bill Management**
   - Live bill creation/updates
   - Payment status changes
   - Customer notifications

### Customer Panel Features

1. **Bill Tracking**

   - Real-time bill updates
   - Payment status changes
   - New bill notifications
   - Animated bill list updates

2. **Live Statistics**
   - Real-time spending totals
   - Bill count updates
   - Payment status tracking

## Real-Time Events

### Bill Events

- `bill:created` - New bill created
- `bill:updated` - Bill status/payment updated
- `bill:deleted` - Bill removed

### Inventory Events

- `inventory:created` - New product added
- `inventory:updated` - Stock levels changed
- `inventory:low_stock` - Low stock alert
- `inventory:deleted` - Product removed

### Stock Transaction Events

- `stock:purchase` - New purchase transaction
- `stock:sale` - New sale transaction
- `stock:adjustment` - Stock adjustment made

## Usage Examples

### 1. Admin Dashboard with Real-Time Updates

```typescript
import { RealtimeProvider } from "@/components/providers/realtime-provider";
import { RealtimeBillStats } from "@/components/realtime/realtime-bill-list";
import { RealtimeInventoryStats } from "@/components/realtime/realtime-inventory";

export default function AdminDashboard() {
  return (
    <RealtimeProvider enableNotifications={true} showConnectionStatus={true}>
      <div className="space-y-6">
        <h1>Admin Dashboard</h1>

        {/* Real-time Bill Statistics */}
        <RealtimeBillStats />

        {/* Real-time Inventory Statistics */}
        <RealtimeInventoryStats />
      </div>
    </RealtimeProvider>
  );
}
```

### 2. Customer Bills Page with Live Updates

```typescript
import { RealtimeProvider } from "@/components/providers/realtime-provider";
import {
  RealtimeBillList,
  RealtimeBillStats,
} from "@/components/realtime/realtime-bill-list";

export default function CustomerBillsPage() {
  const { user } = useAuthStore();

  return (
    <RealtimeProvider enableNotifications={true}>
      <div className="space-y-6">
        <h1>My Bills</h1>

        {/* Real-time Bill Statistics */}
        <RealtimeBillStats customerId={user?.id} />

        {/* Real-time Bill List */}
        <RealtimeBillList
          initialBills={[]}
          customerId={user?.id}
          showNewBillAnimation={true}
        />
      </div>
    </RealtimeProvider>
  );
}
```

### 3. Inventory Management with Live Updates

```typescript
import { RealtimeProvider } from "@/components/providers/realtime-provider";
import { RealtimeInventory } from "@/components/realtime/realtime-inventory";

export default function InventoryPage() {
  return (
    <RealtimeProvider enableNotifications={true}>
      <div className="space-y-6">
        <h1>Inventory Management</h1>

        {/* Real-time Inventory List */}
        <RealtimeInventory
          initialProducts={[]}
          showLowStockOnly={false}
          maxItems={50}
        />
      </div>
    </RealtimeProvider>
  );
}
```

### 4. Stock History with Live Transactions

```typescript
import { RealtimeProvider } from "@/components/providers/realtime-provider";
import {
  RealtimeStockHistory,
  RealtimeStockSummary,
} from "@/components/realtime/realtime-stock-history";

export default function StockHistoryPage() {
  return (
    <RealtimeProvider enableNotifications={true}>
      <div className="space-y-6">
        <h1>Stock History</h1>

        {/* Real-time Stock Summary */}
        <RealtimeStockSummary />

        {/* Real-time Transaction History */}
        <RealtimeStockHistory
          initialTransactions={[]}
          showNewTransactionAnimation={true}
        />
      </div>
    </RealtimeProvider>
  );
}
```

## API Integration

### Creating Documents with Real-Time Updates

```typescript
import { realtimeApiService } from "@/lib/realtime-api-service";

// Create a bill with inventory updates
const createBill = async (billData) => {
  const result = await realtimeApiService.createBillWithInventoryUpdate(
    billData,
    true // Show notification
  );

  if (result.success) {
    // Bill created and inventory updated
    // Real-time listeners will automatically update UI
  }
};

// Update product inventory
const updateInventory = async (productId, inventoryUpdate, transactionData) => {
  const result = await realtimeApiService.updateProductInventory(
    productId,
    inventoryUpdate,
    transactionData,
    true // Show notification
  );

  if (result.success) {
    // Inventory updated with stock transaction
    // Real-time listeners will automatically update UI
  }
};
```

### Bulk Operations

```typescript
// Bulk inventory update
const bulkUpdateInventory = async (updates) => {
  const result = await realtimeApiService.bulkUpdateInventory(
    updates,
    true // Show notification
  );

  if (result.success) {
    // Multiple products updated
    // Real-time listeners will automatically update UI
  }
};
```

## Notifications

The system includes toast notifications for real-time events:

- **Success notifications**: Document created/updated successfully
- **Info notifications**: Status changes, stock updates
- **Warning notifications**: Low stock alerts
- **Error notifications**: Connection issues, operation failures

## Connection Management

### Connection Status

The system provides visual indicators for connection status:

- Green badge: Connected and syncing
- Red badge: Connection lost
- Refresh button: Manual data refresh
- Reconnect button: Attempt to reconnect

### Auto-Reconnection

The system automatically attempts to reconnect when connection is lost:

- 5-second delay before reconnection attempt
- Visual feedback during reconnection
- Toast notification on successful reconnection

## Performance Considerations

1. **Selective Listening**: Only listen to relevant document types
2. **Debounced Updates**: Prevent excessive UI updates
3. **Efficient Queries**: Use specific queries to reduce data transfer
4. **Memory Management**: Properly cleanup subscriptions on unmount

## Troubleshooting

### Common Issues

1. **Connection Not Established**

   - Check Sanity token configuration
   - Verify project ID and dataset
   - Ensure `useCdn: false` in Sanity client config

2. **Updates Not Received**

   - Check document type filters
   - Verify subscription is active
   - Check browser console for errors

3. **Performance Issues**
   - Limit the number of concurrent subscriptions
   - Use specific queries instead of broad listeners
   - Implement proper cleanup in useEffect

### Debug Mode

Enable debug logging by setting:

```typescript
const { isConnected } = useRealtimeSync({
  enableNotifications: true,
  enableAutoRefresh: true,
  debug: true, // Enable debug logging
});
```

## Security Considerations

1. **Token Management**: Use appropriate Sanity tokens with minimal required permissions
2. **Data Filtering**: Filter sensitive data before sending to client
3. **Rate Limiting**: Implement rate limiting for API operations
4. **User Authentication**: Ensure proper user authentication before establishing connections

## Future Enhancements

1. **Offline Support**: Queue operations when offline
2. **Conflict Resolution**: Handle concurrent edits
3. **Advanced Filtering**: More granular event filtering
4. **Performance Metrics**: Monitor connection quality and performance
5. **Custom Events**: Support for custom business events

## Conclusion

This real-time implementation provides a seamless, responsive user experience across both admin and customer interfaces. The system automatically synchronizes data changes, provides visual feedback, and maintains connection reliability while ensuring optimal performance.
