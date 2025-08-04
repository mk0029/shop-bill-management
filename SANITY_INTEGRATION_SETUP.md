# Sanity Integration Setup Guide

This guide will help you complete the integration between your Next.js frontend and Sanity backend.

## 🚀 Quick Start

### 1. Environment Variables

Update your `.env.local` file with your actual Sanity credentials:

```bash
# Sanity Configuration
NEXT_PUBLIC_SANITY_PROJECT_ID=idji8ni7
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_TOKEN=your_actual_sanity_api_token_here

# Clerk Configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
```

### 2. Get Your Sanity API Token

1. Go to [sanity.io/manage](https://sanity.io/manage)
2. Select your project (`idji8ni7`)
3. Go to **API** → **Tokens**
4. Create a new token with **Editor** permissions
5. Copy the token and add it to your `.env.local`

### 3. Install Dependencies

Make sure all dependencies are installed:

```bash
cd shop-2
npm install
```

### 4. Start the Development Server

```bash
npm run dev
```

### 5. Test the Connection

Visit `http://localhost:3000/debug` to test your Sanity connection and see what data is available.

## 📁 What's Been Created

### Core Integration Files

- **`src/lib/sanity.ts`** - Sanity client configuration and queries
- **`src/store/data-store.ts`** - Zustand store for data management
- **`src/hooks/use-sanity-data.ts`** - Custom hooks for easy data access
- **`src/components/providers/data-provider.tsx`** - Data loading provider

### Dashboard Components

- **`src/components/dashboard/products-overview.tsx`** - Products dashboard
- **`src/components/dashboard/customers-overview.tsx`** - Customers dashboard
- **`src/app/admin/dashboard/page.tsx`** - Admin dashboard page
- **`src/app/customer/home/page.tsx`** - Customer dashboard page

### UI Components

- **`src/components/ui/badge.tsx`** - Badge component
- **`src/components/ui/button.tsx`** - Button component
- **`src/components/ui/card.tsx`** - Card component

## 🔄 How the Integration Works

### 1. Data Flow

```
Sanity CMS → Sanity Client → Data Store → React Components
     ↑                                           ↓
Real-time Updates ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←
```

### 2. Real-time Synchronization

- **Initial Load**: Data is fetched from Sanity on app startup
- **Real-time Updates**: Changes in Sanity are pushed to the frontend instantly
- **Optimistic Updates**: UI updates immediately, syncs with Sanity in background

### 3. Data Store Architecture

```typescript
// Main data maps for fast lookups
brands: Map<string, Brand>
categories: Map<string, Category>
products: Map<string, Product>
users: Map<string, User>
bills: Map<string, Bill>

// Lookup maps for performance
usersByClerkId: Map<string, string>
productsByCategory: Map<string, string[]>
billsByCustomer: Map<string, string[]>
```

## 🎯 Key Features

### ✅ Real-time Data Sync
- All changes in Sanity are reflected instantly in the UI
- No need to refresh pages or manually sync data

### ✅ Performance Optimized
- Data is stored in Maps for O(1) lookups
- Lookup tables for common queries
- Lazy loading for non-essential data

### ✅ Type Safety
- Full TypeScript support
- Strongly typed data models
- IntelliSense support for all data operations

### ✅ Error Handling
- Graceful error handling for network issues
- Loading states for better UX
- Retry mechanisms for failed operations

## 🔧 Usage Examples

### Accessing Products

```typescript
import { useProducts } from '@/hooks/use-sanity-data'

function ProductList() {
  const { products, activeProducts, isLoading } = useProducts()
  
  if (isLoading) return <div>Loading...</div>
  
  return (
    <div>
      {activeProducts.map(product => (
        <div key={product._id}>
          <h3>{product.name}</h3>
          <p>₹{product.pricing.sellingPrice}</p>
          <p>Stock: {product.inventory.currentStock}</p>
        </div>
      ))}
    </div>
  )
}
```

### Creating a New Bill

```typescript
import { useBills } from '@/hooks/use-sanity-data'

function CreateBill() {
  const { createBill } = useBills()
  
  const handleCreateBill = async () => {
    const newBill = await createBill({
      customerId: 'customer-id',
      items: [
        { productId: 'product-id', quantity: 2, unitPrice: 100 }
      ],
      serviceType: 'sale',
      locationType: 'shop',
      totalAmount: 200
    })
    
    console.log('Bill created:', newBill)
  }
  
  return (
    <button onClick={handleCreateBill}>
      Create Bill
    </button>
  )
}
```

### Search Functionality

```typescript
import { useSearch } from '@/hooks/use-sanity-data'

function SearchProducts() {
  const { searchProducts } = useSearch()
  const [query, setQuery] = useState('')
  
  const results = searchProducts(query)
  
  return (
    <div>
      <input 
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search products..."
      />
      {results.map(product => (
        <div key={product._id}>{product.name}</div>
      ))}
    </div>
  )
}
```

## 🚨 Troubleshooting

### Common Issues

1. **"Failed to load data" error**
   - Check your Sanity API token
   - Verify project ID and dataset name
   - Ensure Sanity schemas are published

2. **Real-time updates not working**
   - Make sure `useCdn: false` in Sanity client config
   - Check if API token has proper permissions
   - Verify network connectivity

3. **TypeScript errors**
   - Run `npm run build` to check for type issues
   - Ensure all imports are correct
   - Check if UI components are properly exported

### Debug Mode

Add this to your `.env.local` for debugging:

```bash
NEXT_PUBLIC_DEBUG_SANITY=true
```

## 🔄 Next Steps

### 1. Add More CRUD Operations
- Implement product creation/editing forms
- Add customer management interface
- Create billing workflow

### 2. Enhance Real-time Features
- Add Socket.IO for customer notifications
- Implement collaborative editing
- Add real-time inventory updates

### 3. Add Advanced Features
- Implement search and filtering
- Add data export functionality
- Create reporting dashboard

### 4. Optimize Performance
- Add data caching strategies
- Implement pagination for large datasets
- Add background sync for offline support

## 📚 Resources

- [Sanity Documentation](https://www.sanity.io/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Clerk Authentication](https://clerk.com/docs)

## 🤝 Support

If you encounter any issues:

1. Check the browser console for errors
2. Verify your environment variables
3. Test the Sanity connection directly
4. Check network requests in DevTools

The integration is now ready to use! Start by visiting the admin dashboard to see your Sanity data in action.