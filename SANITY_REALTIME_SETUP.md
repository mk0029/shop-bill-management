# Sanity Real-time Updates Setup Guide

This guide shows you how to implement real-time updates using Sanity's built-in real-time capabilities - a much better approach than Socket.io!

## 🚀 Quick Start

### 1. Your Sanity Client is Already Configured

Your `src/lib/sanity.ts` already has the real-time setup:

```typescript
export const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  useCdn: false, // Important: CDN must be false for real-time
  apiVersion: "2024-01-01",
  token: process.env.NEXT_PUBLIC_SANITY_API_TOKEN,
})
```

### 2. Test Sanity Real-time Updates

```bash
npm run dev
```

Then visit: `http://localhost:3000/sanity-realtime-demo`

### 3. See It In Action

1. Open the demo page in multiple browser tabs
2. Click "Create Test Bill" in one tab
3. Watch it appear instantly in all other tabs!

## 📁 New File Structure

```
src/
├── store/
│   ├── sanity-realtime-store.ts    # Sanity real-time connection
│   ├── sanity-bill-store.ts        # Bills with Sanity integration
│   └── inventory-store.ts           # Updated for Sanity events
├── hooks/
│   └── useSanityRealtime.ts         # Sanity real-time hooks
├── components/
│   ├── providers/
│   │   └── SanityRealtimeProvider.tsx   # Sanity real-time provider
│   └── bills/
│       └── SanityRealtimeBillList.tsx   # Live bills with Sanity
└── app/
    └── sanity-realtime-demo/
        └── page.tsx                 # Demo page
```

## 🎯 How Sanity Real-time Works

### 1. Document Change Detection

```typescript
// Sanity automatically detects when documents change
sanityClient
  .listen('*[_type in ["bill", "product", "stockTransaction"]]')
  .subscribe((update) => {
    // Handle real-time updates
    console.log('Document changed:', update)
  })
```

### 2. Automatic Event Mapping

```typescript
// The store automatically maps Sanity events to your app events
if (documentType === 'bill') {
  switch (update.transition) {
    case 'appear':    // Document created
      listeners.get('bill:created')?.forEach(callback => callback(update.result))
      break
    case 'update':    // Document updated
      listeners.get('bill:updated')?.forEach(callback => callback(update.result))
      break
    case 'disappear': // Document deleted
      listeners.get('bill:deleted')?.forEach(callback => callback(update.documentId))
      break
  }
}
```

### 3. Real-time Bill Creation

```typescript
// Create a bill - it automatically appears on all clients
const { createBill } = useSanityBillStore()

await createBill({
  billNumber: 'BILL-2024-0001',
  customer: 'customer-id',
  items: [...],
  totalAmount: 1000,
  // ... other fields
})
```

## 🔧 Integration with Your App

### Add Sanity Real-time Provider

```tsx
// In your layout.tsx or _app.tsx
import { SanityRealtimeProvider } from '@/components/providers/SanityRealtimeProvider'

export default function Layout({ children }) {
  return (
    <SanityRealtimeProvider>
      {children}
    </SanityRealtimeProvider>
  )
}
```

### Use Sanity Real-time Hooks

```tsx
import { useSanityRealtime, useSanityRealtimeEvent } from '@/hooks/useSanityRealtime'

function MyComponent() {
  const { isConnected } = useSanityRealtime()
  
  useSanityRealtimeEvent('bill:created', (bill) => {
    console.log('New bill from Sanity:', bill.billNumber)
    // Handle the new bill
  })
  
  return (
    <div>
      Status: {isConnected ? 'Connected to Sanity' : 'Connecting...'}
    </div>
  )
}
```

### Access Sanity Stores

```tsx
import { useSanityBillStore } from '@/store/sanity-bill-store'

function BillComponent() {
  const { bills, createBill, updateBill, deleteBill } = useSanityBillStore()
  
  // All operations automatically sync across clients
  const handleCreateBill = async () => {
    await createBill({
      billNumber: 'BILL-2024-0002',
      // ... bill data
    })
    // Bill appears on all connected clients instantly!
  }
  
  return <div>...</div>
}
```

## ✅ Advantages of Sanity Real-time

### 1. **No External Infrastructure**
- No Socket.io server to maintain
- No additional ports or services
- Built into your existing Sanity setup

### 2. **Automatic Synchronization**
- Document changes sync automatically
- No manual event emission needed
- Handles connection management

### 3. **Reliable & Scalable**
- Sanity handles all the complexity
- Automatic reconnection
- Scales with your Sanity plan

### 4. **Type Safety**
- Full TypeScript support
- Document schema validation
- Compile-time error checking

## 🔄 Migration from Socket.io

If you were using the Socket.io approach, here's how to migrate:

### 1. Replace Imports

```typescript
// Old
import { useRealtimeStore } from './realtime-store'
import { useBillStore } from './bill-store'

// New
import { useSanityRealtimeStore } from './sanity-realtime-store'
import { useSanityBillStore } from './sanity-bill-store'
```

### 2. Update Components

```tsx
// Old
import { RealtimeProvider } from '@/components/providers/RealtimeProvider'

// New
import { SanityRealtimeProvider } from '@/components/providers/SanityRealtimeProvider'
```

### 3. Remove Socket.io Dependencies

You can remove these from `package.json`:
- `socket.io`
- `socket.io-client`
- `express`
- `cors`
- `concurrently`

And delete:
- `server.js`
- Socket.io related scripts

## 🛠️ Customization

### Listen to Specific Document Types

```typescript
// Listen only to bills
sanityClient
  .listen('*[_type == "bill"]')
  .subscribe(handleBillUpdates)

// Listen to specific fields
sanityClient
  .listen('*[_type == "product"].inventory')
  .subscribe(handleInventoryUpdates)
```

### Add Custom Event Handlers

```typescript
// In your store
useSanityRealtimeEvent('bill:created', (bill) => {
  // Custom logic when bill is created
  if (bill.totalAmount > 10000) {
    showHighValueAlert(bill)
  }
})
```

## 🚨 Troubleshooting

### Real-time Not Working?

1. **Check CDN Setting**: Ensure `useCdn: false` in your Sanity client
2. **Verify Token**: Make sure your Sanity token has read permissions
3. **Check Network**: Sanity real-time uses WebSockets
4. **Browser Console**: Look for Sanity connection errors

### Performance Optimization

1. **Specific Queries**: Listen only to documents you need
2. **Field-specific**: Listen to specific fields instead of entire documents
3. **Debouncing**: Use debouncing for rapid updates

## 📊 Monitoring

### Connection Status

```tsx
const { isConnected } = useSanityRealtime()

return (
  <div className={`status ${isConnected ? 'connected' : 'connecting'}`}>
    {isConnected ? '🟢 Sanity Live' : '🟡 Connecting...'}
  </div>
)
```

### Debug Mode

```typescript
// Enable debug logging
sanityClient
  .listen('*[_type == "bill"]')
  .subscribe({
    next: (update) => console.log('Update:', update),
    error: (error) => console.error('Error:', error)
  })
```

## 🎉 Next Steps

1. **Replace Socket.io components** with Sanity real-time versions
2. **Add real-time to existing forms** - they'll sync automatically
3. **Implement optimistic updates** for better UX
4. **Add real-time notifications** for important events
5. **Create dashboard widgets** with live data

## 🔐 Security

Sanity real-time respects your document-level permissions:
- Users only see documents they have access to
- Real-time updates follow your Sanity security rules
- No additional security configuration needed

## 📞 Support

The Sanity real-time system is now ready! 🚀

- Demo page: `/sanity-realtime-demo`
- Check browser console for real-time events
- Test with multiple browser tabs
- All your existing Sanity data works automatically

**Why Sanity Real-time is Better:**
✅ No external servers  
✅ Built-in to your CMS  
✅ Automatic scaling  
✅ Type-safe  
✅ Reliable connections  
✅ Works with existing data  

Your shop management system now has enterprise-grade real-time updates! 🎯