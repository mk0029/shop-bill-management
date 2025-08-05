# Sanity CMS Integration Requirements

## Overview

This document outlines the comprehensive requirements for integrating Sanity.io as the primary content management system for the Electrician Shop Management System. The integration will manage all data entities including users, products, brands, customers, bills, inventory, and their relational structures with real-time updates and store management.

## Core Principles

1. **Relational Data Structure**: All entities are interconnected through reference fields
2. **Real-time Synchronization**: Sanity's real-time listeners update Zustand stores
3. **Frontend ID Generation**: Use `window.btoa(Date.now().toString())` for temporary IDs
4. **Store-First Architecture**: Load data into stores on app initialization
5. **Optimistic Updates**: Update UI immediately, sync with Sanity in background

## Data Models & Relationships

### 1. User Management

#### User Document Schema

```typescript
{
  _type: 'user',
  _id: string, // Sanity generated
  clerkId: string, // Clerk authentication ID
  customerId: string, // Frontend generated: window.btoa(Date.now().toString())
  secretKey: string, // Frontend generated for customer login
  name: string,
  email?: string,
  phone: string,
  location: string,
  role: 'admin' | 'customer',
  isActive: boolean,
  profileImage?: {
    _type: 'image',
    asset: reference
  },
  createdAt: datetime,
  updatedAt: datetime,
  createdBy: reference('user'), // Admin who created this user

  // Relationships
  bills: array<reference('bill')>, // All bills for this user
  addresses: array<reference('address')> // Multiple addresses
}
```

#### Address Document Schema

```typescript
{
  _type: 'address',
  _id: string,
  userId: reference('user'),
  type: 'home' | 'shop' | 'office' | 'other',
  addressLine1: string,
  addressLine2?: string,
  city: string,
  state: string,
  pincode: string,
  landmark?: string,
  isDefault: boolean,
  coordinates?: {
    lat: number,
    lng: number
  },
  createdAt: datetime,
  updatedAt: datetime
}
```

### 2. Product & Brand Management

#### Brand Document Schema

```typescript
{
  _type: 'brand',
  _id: string,
  name: string,
  slug: slug,
  logo?: {
    _type: 'image',
    asset: reference
  },
  description?: text,
  website?: url,
  contactInfo?: {
    phone?: string,
    email?: string,
    address?: string
  },
  isActive: boolean,
  createdAt: datetime,
  updatedAt: datetime,

  // Relationships
  products: array<reference('product')>
}
```

#### Category Document Schema

```typescript
{
  _type: 'category',
  _id: string,
  name: string,
  slug: slug,
  description?: text,
  icon?: string, // Lucide icon name
  parentCategory?: reference('category'), // For subcategories
  subcategories: array<reference('category')>,
  isActive: boolean,
  sortOrder: number,
  createdAt: datetime,
  updatedAt: datetime,

  // Relationships
  products: array<reference('product')>
}
```

#### Product Document Schema

```typescript
{
  _type: 'product',
  _id: string,
  productId: string, // Frontend generated: window.btoa(Date.now().toString())
  name: string,
  slug: slug,
  description?: text,

  // Product Details
  brand: reference('brand'),
  category: reference('category'),
  subcategory?: reference('category'),

  // Technical Specifications
  specifications: {
    // For Electrical Items
    voltage?: string, // "220V", "110V", "12V"
    wattage?: number,
    amperage?: string, // "6A", "10A", "16A"
    wireGauge?: string, // "1.5mm", "2.5mm", "4mm"

    // For Lights
    lightType?: 'led' | 'bulb' | 'tubelight' | 'panel' | 'concealed',
    color?: 'white' | 'warm-white' | 'cool-white' | 'yellow' | 'multicolor',
    lumens?: number,

    // Physical Properties
    size?: string, // "1ft", "2ft", "small", "medium", "large"
    weight?: number,
    material?: string,
    color?: string,

    // Additional Properties
    warranty?: string,
    certifications?: array<string>
  },

  // Pricing & Inventory
  pricing: {
    purchasePrice: number,
    sellingPrice: number,
    mrp?: number,
    discount?: number,
    unit: string // "piece", "meter", "box", "kg"
  },

  // Stock Management
  inventory: {
    currentStock: number,
    minimumStock: number,
    maximumStock?: number,
    reorderLevel: number,
    location?: string // Storage location
  },

  // Media
  images: array<{
    _type: 'image',
    asset: reference,
    alt?: string,
    caption?: string
  }>,

  // Status
  isActive: boolean,
  isFeatured: boolean,
  tags: array<string>,

  // SEO
  seoTitle?: string,
  seoDescription?: text,

  // Timestamps
  createdAt: datetime,
  updatedAt: datetime,
  createdBy: reference('user'),

  // Relationships
  stockTransactions: array<reference('stockTransaction')>,
  billItems: array<reference('billItem')>
}
```

### 3. Inventory Management

#### Stock Transaction Schema

```typescript
{
  _type: 'stockTransaction',
  _id: string,
  transactionId: string, // Frontend generated: window.btoa(Date.now().toString())

  // Transaction Details
  type: 'purchase' | 'sale' | 'adjustment' | 'return' | 'damage',
  product: reference('product'),
  quantity: number,
  unitPrice: number,
  totalAmount: number,

  // Additional Info
  supplier?: reference('supplier'),
  bill?: reference('bill'), // If related to a sale
  notes?: text,
  batchNumber?: string,
  expiryDate?: date,

  // Timestamps
  transactionDate: datetime,
  createdAt: datetime,
  createdBy: reference('user'),

  // Status
  status: 'pending' | 'completed' | 'cancelled',

  // Relationships
  adjustments: array<reference('stockAdjustment')>
}
```

#### Supplier Schema

```typescript
{
  _type: 'supplier',
  _id: string,
  supplierId: string, // Frontend generated: window.btoa(Date.now().toString())
  name: string,
  contactPerson?: string,
  phone: string,
  email?: string,
  address: {
    addressLine1: string,
    addressLine2?: string,
    city: string,
    state: string,
    pincode: string
  },
  gstNumber?: string,
  panNumber?: string,
  paymentTerms?: string,
  creditLimit?: number,
  isActive: boolean,
  createdAt: datetime,
  updatedAt: datetime,

  // Relationships
  products: array<reference('product')>,
  purchaseOrders: array<reference('purchaseOrder')>
}
```

### 4. Billing System

#### Bill Document Schema

```typescript
{
  _type: 'bill',
  _id: string,
  billId: string, // Frontend generated: window.btoa(Date.now().toString())
  billNumber: string, // Sequential: "BILL-2024-0001"

  // Customer Information
  customer: reference('user'),
  customerAddress: reference('address'),

  // Bill Details
  items: array<reference('billItem')>,
  serviceType: 'repair' | 'sale' | 'installation' | 'maintenance' | 'custom',
  locationType: 'shop' | 'home' | 'office',

  // Service Details
  serviceDate: datetime,
  completionDate?: datetime,
  technician?: reference('user'), // Admin/technician who performed service

  // Service Charges
  homeVisitFee: number, // Added to total if locationType is 'home' or 'office'
  repairCharges: number, // Added to total for repair services
  transportationFee?: number,
  laborCharges?: number,

  // Calculations (NO TAX CHARGES)
  subtotal: number, // Sum of all item prices (quantity * unitPrice)
  discountAmount?: number,
  totalAmount: number, // subtotal + homeVisitFee + repairCharges + laborCharges - discountAmount

  // Payment
  paymentStatus: 'pending' | 'partial' | 'paid' | 'overdue',
  paymentMethod?: 'cash' | 'card' | 'upi' | 'bank_transfer' | 'cheque',
  paidAmount: number,
  balanceAmount: number,
  paymentDate?: datetime,

  // Additional Info
  notes?: text,
  internalNotes?: text, // Admin only
  images?: array<{
    _type: 'image',
    asset: reference,
    caption?: string
  }>,

  // Status & Workflow
  status: 'draft' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled',
  priority: 'low' | 'medium' | 'high' | 'urgent',

  // Timestamps
  createdAt: datetime,
  updatedAt: datetime,
  createdBy: reference('user'),

  // Relationships
  payments: array<reference('payment')>,
  followUps: array<reference('followUp')>
}
```

#### Bill Item Schema

```typescript
{
  _type: 'billItem',
  _id: string,
  bill: reference('bill'),
  product: reference('product'),

  // Item Details
  quantity: number,
  unitPrice: number,
  totalPrice: number, // quantity * unitPrice - discount (NO TAX)
  discount?: number,

  // Service Details
  description?: string,
  warranty?: string,
  installationRequired: boolean,

  // Status
  status: 'pending' | 'delivered' | 'installed' | 'returned',

  createdAt: datetime,
  updatedAt: datetime
}
```

#### Payment Schema

```typescript
{
  _type: 'payment',
  _id: string,
  paymentId: string, // Frontend generated: window.btoa(Date.now().toString())
  bill: reference('bill'),
  customer: reference('user'),

  // Payment Details
  amount: number,
  method: 'cash' | 'card' | 'upi' | 'bank_transfer' | 'cheque',
  status: 'pending' | 'completed' | 'failed' | 'refunded',

  // Transaction Details
  transactionId?: string,
  referenceNumber?: string,
  bankDetails?: {
    bankName?: string,
    accountNumber?: string,
    ifscCode?: string
  },

  // Timestamps
  paymentDate: datetime,
  createdAt: datetime,
  createdBy: reference('user'),

  notes?: text
}
```

### 5. Customer Relationship Management

#### Follow Up Schema

```typescript
{
  _type: 'followUp',
  _id: string,
  customer: reference('user'),
  bill?: reference('bill'),

  // Follow Up Details
  type: 'payment_reminder' | 'service_feedback' | 'warranty_check' | 'maintenance_due' | 'general',
  priority: 'low' | 'medium' | 'high',
  status: 'pending' | 'completed' | 'cancelled',

  // Content
  title: string,
  description: text,
  dueDate: datetime,
  completedDate?: datetime,

  // Communication
  contactMethod: 'phone' | 'whatsapp' | 'email' | 'visit',
  contactAttempts: number,
  lastContactDate?: datetime,

  // Assignment
  assignedTo: reference('user'),
  createdBy: reference('user'),

  // Timestamps
  createdAt: datetime,
  updatedAt: datetime,

  // Results
  outcome?: text,
  nextFollowUpDate?: datetime
}
```

## Store Management Architecture

### 1. Data Stores Structure

```typescript
// Main Data Stores
interface DataStores {
  // Core Entities
  users: Map<string, User>;
  products: Map<string, Product>;
  brands: Map<string, Brand>;
  categories: Map<string, Category>;
  bills: Map<string, Bill>;

  // Supporting Entities
  addresses: Map<string, Address>;
  suppliers: Map<string, Supplier>;
  stockTransactions: Map<string, StockTransaction>;
  payments: Map<string, Payment>;
  followUps: Map<string, FollowUp>;

  // Lookup Maps for Performance
  usersByClerkId: Map<string, string>; // clerkId -> userId
  productsByCategory: Map<string, string[]>; // categoryId -> productIds
  billsByCustomer: Map<string, string[]>; // customerId -> billIds
  productsByBrand: Map<string, string[]>; // brandId -> productIds
}
```

### 2. Store Initialization Strategy

```typescript
// Store Loading Priority
const loadingSequence = [
  // 1. Core Reference Data (Load First)
  "brands",
  "categories",
  "suppliers",

  // 2. Product Catalog
  "products",

  // 3. User Data
  "users",
  "addresses",

  // 4. Transactional Data
  "bills",
  "billItems",
  "payments",
  "stockTransactions",

  // 5. CRM Data
  "followUps",
];
```

### 3. Real-time Update Handlers

```typescript
// Sanity Real-time Listeners
const realtimeHandlers = {
  // Product Updates
  product: (update) => {
    productStore.updateProduct(update);
    // Update related bill items if price changed
    if (update.pricing) {
      billStore.updateProductPricing(update._id, update.pricing);
    }
  },

  // Bill Updates
  bill: (update) => {
    billStore.updateBill(update);
    // Notify customer via Socket.IO
    socketService.notifyCustomer(update.customer._ref, update);
  },

  // Stock Updates
  stockTransaction: (update) => {
    stockStore.updateTransaction(update);
    // Update product inventory
    productStore.updateStock(update.product._ref, update.quantity);
  },

  // User Updates
  user: (update) => {
    userStore.updateUser(update);
    // Update auth store if current user
    if (update._id === authStore.user?.id) {
      authStore.setUser(update);
    }
  },
};
```

## Billing Calculation Logic

### Bill Total Calculation (No Tax)

```typescript
// Simple Bill calculation utility (NO TAX)
export const calculateBillTotal = (billData: {
  items: BillItem[];
  serviceType: ServiceType;
  locationType: LocationType;
  homeVisitFee?: number;
  repairCharges?: number;
}) => {
  // 1. Calculate items total (quantity * unitPrice for each item)
  const itemsTotal = billData.items.reduce((sum, item) => {
    return sum + item.quantity * item.unitPrice;
  }, 0);

  // 2. Add home visit fee if location is home/office
  const homeVisitFee =
    billData.locationType !== "shop" ? billData.homeVisitFee || 0 : 0;

  // 3. Add repair charges if service type is repair
  const repairCharges =
    billData.serviceType === "repair" ? billData.repairCharges || 0 : 0;

  // 4. Calculate final total (NO TAX, NO DISCOUNT)
  const totalAmount = itemsTotal + homeVisitFee + repairCharges;

  return {
    itemsTotal,
    homeVisitFee,
    repairCharges,
    totalAmount,
  };
};
```

### Service Charge Rules

1. **Items Total**: Sum of (quantity × unitPrice) for all items
2. **Home Visit Fee**: Added when `locationType` is 'home' or 'office'
3. **Repair Charges**: Added when `serviceType` is 'repair'
4. **Final Total**: Items Total + Home Visit Fee + Repair Charges

**Example Calculation:**

- Items: 1 Light × ₹90 = ₹90
- Home Visit Fee: ₹50 (if location is home)
- Repair Charges: ₹120 (if service is repair)
- **Total: ₹90 + ₹50 + ₹120 = ₹260**

## Integration Requirements

### 1. Sanity Studio Configuration

#### Schema Files Structure

```
sanity-studio/
├── schemas/
│   ├── documents/
│   │   ├── user.ts
│   │   ├── product.ts
│   │   ├── brand.ts
│   │   ├── category.ts
│   │   ├── bill.ts
│   │   ├── supplier.ts
│   │   └── address.ts
│   ├── objects/
│   │   ├── pricing.ts
│   │   ├── specifications.ts
│   │   ├── inventory.ts
│   │   └── address.ts
│   └── index.ts
├── structure/
│   └── deskStructure.ts
└── sanity.config.ts
```

#### Custom Input Components

```typescript
// Custom ID Generator Component
const CustomIdInput = (props) => {
  const generateId = () => window.btoa(Date.now().toString());

  return (
    <div>
      <input {...props} value={props.value || generateId()} readOnly />
      <button onClick={() => props.onChange(generateId())}>
        Regenerate ID
      </button>
    </div>
  );
};
```

### 2. Frontend Integration

#### Sanity Client Configuration

```typescript
// lib/sanity.ts
import { createClient } from "@sanity/client";

export const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  useCdn: false, // Real-time updates require CDN to be false
  apiVersion: "2024-01-01",
  token: process.env.NEXT_PUBLIC_SANITY_API_TOKEN, // For write operations
});

// Real-time listener setup
export const setupRealtimeListeners = () => {
  const subscription = sanityClient
    .listen('*[_type in ["user", "product", "bill", "stockTransaction"]]')
    .subscribe((update) => {
      handleRealtimeUpdate(update);
    });

  return subscription;
};
```

#### Store Integration

```typescript
// stores/data-store.ts
interface DataStore {
  // Loading States
  isLoading: boolean;
  loadingProgress: number;
  lastSyncTime: Date | null;

  // Data Maps
  products: Map<string, Product>;
  users: Map<string, User>;
  bills: Map<string, Bill>;

  // Actions
  loadInitialData: () => Promise<void>;
  syncWithSanity: () => Promise<void>;
  handleRealtimeUpdate: (update: any) => void;

  // Getters
  getProductsByCategory: (categoryId: string) => Product[];
  getBillsByCustomer: (customerId: string) => Bill[];
  getActiveProducts: () => Product[];
}
```

### 3. Authentication Integration

#### Clerk + Sanity User Sync

```typescript
// lib/auth-sync.ts
export const syncUserWithSanity = async (clerkUser: ClerkUser) => {
  const customerId = window.btoa(Date.now().toString());
  const secretKey = generateSecretKey();

  const sanityUser = {
    _type: "user",
    clerkId: clerkUser.id,
    customerId,
    secretKey,
    name: clerkUser.fullName || clerkUser.emailAddresses[0]?.emailAddress,
    email: clerkUser.emailAddresses[0]?.emailAddress,
    phone: clerkUser.phoneNumbers[0]?.phoneNumber,
    role: "customer",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return await sanityClient.create(sanityUser);
};
```

## Performance Optimization

### 1. Data Loading Strategy

#### Lazy Loading Implementation

```typescript
// Only load essential data on app start
const essentialData = ["brands", "categories", "activeProducts"];
const lazyData = ["allProducts", "historicalBills", "stockTransactions"];

// Load additional data based on user navigation
const routeDataMap = {
  "/admin/products": ["allProducts", "suppliers"],
  "/admin/billing": ["customers", "activeProducts"],
  "/admin/reports": ["historicalBills", "stockTransactions"],
  "/customer/book": ["customerBills"],
};
```

#### Caching Strategy

```typescript
// Cache frequently accessed data
const cacheConfig = {
  products: { ttl: 5 * 60 * 1000 }, // 5 minutes
  users: { ttl: 10 * 60 * 1000 }, // 10 minutes
  bills: { ttl: 2 * 60 * 1000 }, // 2 minutes
  stockTransactions: { ttl: 1 * 60 * 1000 }, // 1 minute
};
```

### 2. Real-time Update Optimization

#### Selective Updates

```typescript
// Only update relevant UI components
const updateHandlers = {
  "product.pricing": (productId, pricing) => {
    // Update product store
    productStore.updatePricing(productId, pricing);

    // Update any open billing forms
    if (billingFormStore.isOpen && billingFormStore.hasProduct(productId)) {
      billingFormStore.updateProductPricing(productId, pricing);
    }
  },

  "bill.status": (billId, status) => {
    billStore.updateStatus(billId, status);

    // Notify customer if status changed to completed
    if (status === "completed") {
      notificationStore.addNotification({
        type: "success",
        message: "Your service has been completed!",
      });
    }
  },
};
```

## Security & Validation

### 1. Data Validation Rules

#### Sanity Validation

```typescript
// Product validation
export const productValidation = {
  name: (Rule) => Rule.required().min(2).max(100),
  pricing: {
    sellingPrice: (Rule) => Rule.required().min(0),
    purchasePrice: (Rule) =>
      Rule.required()
        .min(0)
        .custom((purchase, context) => {
          const selling = context.parent?.sellingPrice;
          return purchase <= selling
            ? true
            : "Purchase price cannot exceed selling price";
        }),
  },
  inventory: {
    currentStock: (Rule) => Rule.required().min(0),
    minimumStock: (Rule) => Rule.required().min(0),
  },
};
```

#### Frontend Validation

```typescript
// Bill validation
export const billValidation = z.object({
  customerId: z.string().min(1, "Customer is required"),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().min(1, "Quantity must be at least 1"),
      })
    )
    .min(1, "At least one item is required"),
  serviceType: z.enum(["repair", "sale", "installation", "maintenance"]),
  locationType: z.enum(["shop", "home", "office"]),
});
```

### 2. Access Control

#### Role-based Permissions

```typescript
const permissions = {
  admin: {
    read: ["*"],
    write: ["*"],
    delete: ["user", "product", "bill", "supplier"],
  },
  customer: {
    read: ["own_bills", "products", "own_profile"],
    write: ["own_profile"],
    delete: [],
  },
};
```

## Migration Strategy

### 1. Data Migration Plan

#### Phase 1: Schema Setup

1. Create Sanity project and configure schemas
2. Set up development environment
3. Create sample data for testing

#### Phase 2: Core Data Migration

1. Migrate existing user data to Sanity
2. Import product catalog with brands and categories
3. Set up inventory tracking

#### Phase 3: Transactional Data

1. Migrate historical bills and payments
2. Set up real-time synchronization
3. Test billing workflow end-to-end

#### Phase 4: Advanced Features

1. Implement follow-up system
2. Add reporting and analytics
3. Optimize performance and caching

### 2. Rollback Strategy

#### Data Backup

```typescript
// Automated backup before migration
const backupData = async () => {
  const backup = {
    users: await sanityClient.fetch('*[_type == "user"]'),
    products: await sanityClient.fetch('*[_type == "product"]'),
    bills: await sanityClient.fetch('*[_type == "bill"]'),
    timestamp: new Date().toISOString(),
  };

  // Store backup in secure location
  await storeBackup(backup);
};
```

## Testing Requirements

### 1. Data Integrity Tests

- Verify all relationships are maintained
- Test cascade operations (delete user -> update bills)
- Validate data consistency across stores

### 2. Performance Tests

- Load testing with large datasets
- Real-time update performance
- Store synchronization speed

### 3. Integration Tests

- Clerk authentication flow
- Sanity real-time listeners
- Socket.IO notifications
- Store state management

## Monitoring & Analytics

### 1. Performance Monitoring

- Track store loading times
- Monitor real-time update latency
- Measure memory usage of data stores

### 2. Business Analytics

- Track most accessed products
- Monitor billing patterns
- Analyze customer behavior
- Stock movement analytics

## Conclusion

This comprehensive Sanity integration will provide a robust, scalable, and real-time data management system for the electrician shop. The relational structure ensures data integrity while the store-first architecture provides optimal performance for the user interface.

The implementation should be done in phases, starting with core entities and gradually adding advanced features. Regular testing and monitoring will ensure the system performs well under real-world conditions.
