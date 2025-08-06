# Sanity Real-time Implementation Guide

Your shop management system now has **comprehensive real-time synchronization** across all data operations using Sanity's built-in real-time capabilities.

## 🎯 **What's Implemented**

### **✅ Real-time Enabled Stores:**
- **Data Store** (`src/store/data-store.ts`) - Main data hub with real-time listeners
- **Brand Store** (`src/store/brand-store.ts`) - Real-time brand management
- **Category Store** (`src/store/category-store.ts`) - Real-time category updates
- **Inventory Store** (`src/store/inventory-store.ts`) - Real-time inventory tracking

### **✅ Real-time Operations:**
- **CREATE** - New items appear instantly on all devices
- **UPDATE** - Changes sync immediately across all clients
- **DELETE** - Removals reflect instantly everywhere
- **INVENTORY** - Stock levels update in real-time when bills are created

### **✅ Document Types Covered:**
- `bill` - Bills and invoices
- `product` - Inventory items
- `user` - Customers and admins
- `brand` - Product brands
- `category` - Product categories
- `stockTransaction` - Inventory movements

## 🚀 **How to Use**

### **1. Wrap Your App with Real-time Provider**

```tsx
// In your layout.tsx or main app component
import { SanityRealtimeProvider } from '@/components/providers/SanityRealtimeProvider'

export default function Layout({ children }) {
  return (
    <SanityRealtimeProvider>
      {children}
    </SanityRealtimeProvider>
  )
}
```

### **2. Use Real-time Hooks in Components**

```tsx
import { useSanityRealtime, useSanityOperations, useSanityAlerts } from '@/hooks/useSanityRealtime'

function MyComponent() {
  const { isConnected, data } = useSanityRealtime()
  const operations = useSanityOperations()
  const alerts = useSanityAlerts()
  
  // All data is automatically real-time!
  const { products, bills, users } = data
  
  // Operations automatically sync across devices
  const createBrand = async () => {
    await operations.brands.create({
      name: 'New Brand',
      description: 'Brand description',
      isActive: true
    })
    // Appears instantly on all connected devices!
  }
  
  return (
    <div>
      Status: {isConnected ? '🟢 Live' : '🔴 Offline'}
      Products: {products.length}
      Low Stock Alerts: {alerts.inventory.lowStockCount}
    </div>
  )
}
```

### **3. Access Individual Stores**

```tsx
import { useDataStore } from '@/store/data-store'
import { useBrandStore } from '@/store/brand-store'
import { useCategoryStore } from '@/store/category-store'

function ProductForm() {
  const { createProduct } = useDataStore()
  const { brands } = useBrandStore()
  const { categories } = useCategoryStore()
  
  // All data is real-time synchronized
  const handleSubmit = async (productData) => {
    await createProduct(productData)
    // Product appears on all devices instantly!
  }
}
```

## 🔧 **Key Features**

### **1. Automatic Conflict Resolution**
- Multiple users can work simultaneously
- Sanity handles document versioning and conflicts
- Last write wins for simple conflicts
- Complex conflicts are handled gracefully

### **2. Optimistic Updates**
- UI updates immediately for better UX
- Real-time sync confirms changes
- Automatic rollback on errors

### **3. Connection Management**
- Automatic reconnection on network issues
- Connection status indicators
- Graceful degradation when offline

### **4. Performance Optimized**
- Efficient data structures using Maps
- Lookup tables for fast queries
- Minimal re-renders with targeted updates

## 📊 **Real-time Dashboard**

Visit `/dashboard/realtime` to see the real-time system in action:

- Live statistics that update automatically
- Real-time alerts for low stock, overdue payments
- Connection status monitoring
- Test operations to see instant synchronization

## 🔄 **How Real-time Works**

### **1. Document Changes**
```
User creates/updates document → Sanity detects change → All clients receive update → UI updates automatically
```

### **2. Multi-device Synchronization**
```
Device A: Create Bill → Sanity → Device B: Bill appears instantly
Device B: Update Product → Sanity → Device A: Product updates immediately
Device C: Delete Brand → Sanity → All devices: Brand removed
```

### **3. Inventory Integration**
```
Create Bill with Items → Sanity → Inventory automatically decreases → Stock alerts trigger → All devices see new levels
```

## 🛠️ **Store Architecture**

### **Data Store (Main Hub)**
- Manages all core data (products, bills, users, brands, categories)
- Uses Maps for O(1) lookups
- Maintains lookup tables for relationships
- Single source of truth for all data

### **Specialized Stores**
- **Brand Store**: Focused brand operations
- **Category Store**: Category management
- **Inventory Store**: Stock tracking and transactions

### **Real-time Integration**
- Each store has its own Sanity listener
- Automatic state synchronization
- Event-driven updates

## 🚨 **Error Handling**

### **Connection Issues**
- Automatic retry logic
- Fallback to cached data
- User notifications for connection status

### **Data Conflicts**
- Sanity's built-in conflict resolution
- Optimistic updates with rollback
- Error boundaries for graceful failures

## 📈 **Performance Considerations**

### **Efficient Updates**
- Only affected components re-render
- Targeted state updates
- Debounced rapid changes

### **Memory Management**
- Automatic cleanup of listeners
- Efficient data structures
- Garbage collection friendly

## 🔐 **Security**

### **Sanity Permissions**
- Document-level security rules
- User role-based access
- API token permissions

### **Real-time Security**
- Users only see data they have access to
- Real-time updates respect permissions
- Secure WebSocket connections

## 🎯 **Benefits**

### **✅ For Users**
- Instant updates across all devices
- No page refreshes needed
- Real-time collaboration
- Immediate feedback on actions

### **✅ For Developers**
- No external infrastructure needed
- Built-in conflict resolution
- Type-safe operations
- Easy to extend and maintain

### **✅ For Business**
- Prevents data conflicts
- Improves team collaboration
- Real-time inventory tracking
- Better customer experience

## 🚀 **Next Steps**

1. **Integrate with existing forms** - All your current forms will now sync in real-time
2. **Add real-time notifications** - Show toast messages for important updates
3. **Implement optimistic UI** - Update UI immediately, sync in background
4. **Add real-time analytics** - Live dashboards and reports
5. **Mobile synchronization** - Real-time updates on mobile apps

## 📞 **Testing Real-time**

1. **Open multiple browser tabs** to `/dashboard/realtime`
2. **Create a test brand** in one tab
3. **Watch it appear instantly** in other tabs
4. **Update inventory** and see live stock changes
5. **Create bills** and watch inventory decrease automatically

Your shop management system now has **enterprise-grade real-time capabilities** powered by Sanity! 🎉

**No Socket.io servers, no external infrastructure, no complex setup - just pure Sanity real-time magic!** ✨