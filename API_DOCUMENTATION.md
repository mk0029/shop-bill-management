# Complete API Documentation

This document provides comprehensive documentation for all API endpoints, services, and data handling mechanisms in the Electrician Shop Management System.

## Table of Contents

1. [Next.js API Routes](#nextjs-api-routes)
2. [Sanity CMS API Services](#sanity-cms-api-services)
3. [Strapi API Services](#strapi-api-services)
4. [Authentication Services](#authentication-services)
5. [Inventory Management APIs](#inventory-management-apis)
6. [Stock History APIs](#stock-history-apis)
7. [React Hooks for API Operations](#react-hooks-for-api-operations)
8. [Data Types and Interfaces](#data-types-and-interfaces)
9. [Error Handling](#error-handling)
10. [API Response Formats](#api-response-formats)

---

## Next.js API Routes

### 1. Sales Report Export API

**Endpoint:** `GET /api/sales-report/export`

**Query Parameters:**

- `dateRange`: `"week" | "month" | "quarter" | "year"` (default: "month")
- `format`: `"json" | "csv"` (default: "json")

**Response:**

- **JSON Format:** Returns detailed sales analytics
- **CSV Format:** Returns downloadable CSV file

**Example Request:**

```javascript
fetch("/api/sales-report/export?dateRange=month&format=json");
```

**Response Structure:**

```typescript
{
  generatedAt: string;
  dateRange: string;
  summary: {
    totalRevenue: number;
    totalProfit: number;
    totalBills: number;
    averageBillValue: number;
    profitMargin: number;
  }
  serviceTypeBreakdown: Array<{
    type: string;
    count: number;
    revenue: number;
  }>;
  topCustomers: Array<{
    customerId: string;
    name: string;
    totalSpent: number;
    billCount: number;
  }>;
  bills: Array<{
    billNumber: string;
    customerName: string;
    serviceType: string;
    totalAmount: number;
    paymentStatus: string;
    createdAt: string;
  }>;
}
```

### 2. Specifications API

**Endpoint:** `GET /api/specifications`

**Query Parameters:**

- `type`: Filter by specification type
- `category`: Filter by category

**Methods:**

- `GET`: Fetch specifications with filters
- `POST`: Create new specification

**Example Request:**

```javascript
// Get specifications
fetch("/api/specifications?type=amperage&category=switches");

// Create specification
fetch("/api/specifications", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    type: "voltage",
    value: "220V",
    label: "220 Volts",
    categories: ["motors", "pumps"],
  }),
});
```

### 3. Image Upload API

**Endpoint:** `POST /api/upload-image`

**Request:** FormData with file
**Response:**

```typescript
{
  success: boolean;
  url?: string;
  assetId?: string;
  error?: string;
}
```

**Example Request:**

```javascript
const formData = new FormData();
formData.append("file", imageFile);

fetch("/api/upload-image", {
  method: "POST",
  body: formData,
});
```

---

## Sanity CMS API Services

### User API Service (`userApiService`)

#### Get All Users

```typescript
userApiService.getAllUsers(): Promise<ApiResponse<User[]>>
```

#### Get Customers Only

```typescript
userApiService.getCustomers(): Promise<ApiResponse<User[]>>
```

#### Get User by ID

```typescript
userApiService.getUserById(userId: string): Promise<ApiResponse<User>>
```

#### Get User by Customer ID

```typescript
userApiService.getUserByCustomerId(customerId: string): Promise<ApiResponse<User>>
```

#### Create User

```typescript
userApiService.createUser(userData: {
  name: string;
  email?: string;
  phone: string;
  location: string;
  role: 'admin' | 'customer';
}): Promise<ApiResponse<User>>
```

#### Update User

```typescript
userApiService.updateUser(
  userId: string,
  userData: Partial<{
    name: string;
    email: string;
    phone: string;
    location: string;
    isActive: boolean;
  }>
): Promise<ApiResponse<User>>
```

#### Delete User

```typescript
userApiService.deleteUser(userId: string): Promise<ApiResponse<void>>
```

### Product API Service (`productApiService`)

#### Get All Products

```typescript
productApiService.getAllProducts(): Promise<ApiResponse<Product[]>>
```

#### Get Active Products

```typescript
productApiService.getActiveProducts(): Promise<ApiResponse<Product[]>>
```

#### Get Product by ID

```typescript
productApiService.getProductById(productId: string): Promise<ApiResponse<Product>>
```

#### Create Product

```typescript
productApiService.createProduct(productData: ProductData): Promise<ApiResponse<Product>>
```

#### Update Product

```typescript
productApiService.updateProduct(
  productId: string,
  productData: Partial<ProductData>
): Promise<ApiResponse<Product>>
```

#### Delete Product

```typescript
productApiService.deleteProduct(productId: string): Promise<ApiResponse<void>>
```

### Brand API Service (`brandApiService`)

#### Get All Brands

```typescript
brandApiService.getAllBrands(): Promise<ApiResponse<Brand[]>>
```

#### Get Brand by ID

```typescript
brandApiService.getBrandById(brandId: string): Promise<ApiResponse<Brand>>
```

#### Create Brand

```typescript
brandApiService.createBrand(brandData: BrandData): Promise<ApiResponse<Brand>>
```

#### Update Brand

```typescript
brandApiService.updateBrand(
  brandId: string,
  brandData: Partial<BrandData>
): Promise<ApiResponse<Brand>>
```

#### Delete Brand

```typescript
brandApiService.deleteBrand(brandId: string): Promise<ApiResponse<void>>
```

### Category API Service (`categoryApiService`)

#### Get All Categories

```typescript
categoryApiService.getAllCategories(): Promise<ApiResponse<Category[]>>
```

#### Get Category by ID

```typescript
categoryApiService.getCategoryById(categoryId: string): Promise<ApiResponse<Category>>
```

#### Create Category

```typescript
categoryApiService.createCategory(categoryData: CategoryData): Promise<ApiResponse<Category>>
```

#### Update Category

```typescript
categoryApiService.updateCategory(
  categoryId: string,
  categoryData: Partial<CategoryData>
): Promise<ApiResponse<Category>>
```

#### Delete Category

```typescript
categoryApiService.deleteCategory(categoryId: string): Promise<ApiResponse<void>>
```

### Bill API Service (`billApiService`)

#### Get All Bills

```typescript
billApiService.getAllBills(): Promise<ApiResponse<Bill[]>>
```

#### Get Bill by ID

```typescript
billApiService.getBillById(billId: string): Promise<ApiResponse<Bill>>
```

#### Get Customer Bills

```typescript
billApiService.getCustomerBills(customerId: string): Promise<ApiResponse<Bill[]>>
```

#### Create Bill

```typescript
billApiService.createBill(billData: BillData): Promise<ApiResponse<Bill>>
```

#### Update Bill

```typescript
billApiService.updateBill(
  billId: string,
  billData: Partial<BillData>
): Promise<ApiResponse<Bill>>
```

#### Delete Bill

```typescript
billApiService.deleteBill(billId: string): Promise<ApiResponse<void>>
```

### Stock Transaction API Service (`stockTransactionApiService`)

#### Get All Stock Transactions

```typescript
stockTransactionApiService.getAllStockTransactions(): Promise<ApiResponse<StockTransaction[]>>
```

#### Get Stock Transaction by ID

```typescript
stockTransactionApiService.getStockTransactionById(transactionId: string): Promise<ApiResponse<StockTransaction>>
```

#### Create Stock Transaction

```typescript
stockTransactionApiService.createStockTransaction(transactionData: StockTransactionData): Promise<ApiResponse<StockTransaction>>
```

#### Update Stock Transaction

```typescript
stockTransactionApiService.updateStockTransaction(
  transactionId: string,
  transactionData: Partial<StockTransactionData>
): Promise<ApiResponse<StockTransaction>>
```

#### Delete Stock Transaction

```typescript
stockTransactionApiService.deleteStockTransaction(transactionId: string): Promise<ApiResponse<void>>
```

### Payment API Service (`paymentApiService`)

#### Get All Payments

```typescript
paymentApiService.getAllPayments(): Promise<ApiResponse<Payment[]>>
```

#### Get Payment by ID

```typescript
paymentApiService.getPaymentById(paymentId: string): Promise<ApiResponse<Payment>>
```

#### Create Payment

```typescript
paymentApiService.createPayment(paymentData: PaymentData): Promise<ApiResponse<Payment>>
```

#### Update Payment

```typescript
paymentApiService.updatePayment(
  paymentId: string,
  paymentData: Partial<PaymentData>
): Promise<ApiResponse<Payment>>
```

#### Delete Payment

```typescript
paymentApiService.deletePayment(paymentId: string): Promise<ApiResponse<void>>
```

---

## Strapi API Services

### User Service (`strapiUserService`)

#### Create User

```typescript
strapiUserService.createUser(userData: {
  clerkId: string;
  customerId: string;
  secretKey: string;
  name: string;
  email?: string;
  phone: string;
  location: string;
  role: 'admin' | 'customer';
}): Promise<StrapiUser>
```

#### Update User

```typescript
strapiUserService.updateUser(
  userId: number,
  userData: Partial<UserUpdateData>
): Promise<StrapiUser>
```

#### Get User by Customer ID

```typescript
strapiUserService.getUserByCustomerId(customerId: string): Promise<StrapiUser | null>
```

#### Get All Users

```typescript
strapiUserService.getAllUsers(): Promise<StrapiUser[]>
```

#### Get Customers

```typescript
strapiUserService.getCustomers(): Promise<StrapiUser[]>
```

### Product Service (`strapiProductService`)

#### Create Product

```typescript
strapiProductService.createProduct(productData: any): Promise<any>
```

#### Get All Products

```typescript
strapiProductService.getAllProducts(): Promise<any[]>
```

#### Update Product

```typescript
strapiProductService.updateProduct(productId: number, productData: any): Promise<any>
```

### Bill Service (`strapiBillService`)

#### Create Bill

```typescript
strapiBillService.createBill(billData: any): Promise<any>
```

#### Get All Bills

```typescript
strapiBillService.getAllBills(): Promise<any[]>
```

#### Get Customer Bills

```typescript
strapiBillService.getCustomerBills(customerId: string): Promise<any[]>
```

### Synchronization Service (`strapiSyncService`)

#### Sync User to Strapi

```typescript
strapiSyncService.syncUserToStrapi(sanityUser: any): Promise<StrapiUser | null>
```

#### Sync All Users to Strapi

```typescript
strapiSyncService.syncAllUsersToStrapi(): Promise<void>
```

---

## Authentication Services

### Authenticate User

```typescript
authenticateUser(credentials: {
  customerId: string;
  secretKey: string;
}): Promise<AuthResult>
```

**Response:**

```typescript
interface AuthResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
  errorType?:
    | "USER_NOT_FOUND"
    | "INVALID_CREDENTIALS"
    | "ACCOUNT_DISABLED"
    | "SERVER_ERROR";
}
```

### Get User by Customer ID

```typescript
getUserByCustomerId(customerId: string): Promise<AuthUser | null>
```

### Create Customer Account

```typescript
createCustomerAccount(data: {
  name: string;
  phone: string;
  email?: string;
  location: string;
}): Promise<AuthResult>
```

### Get Support Contact

```typescript
getSupportContact(): {
  email: string;
  phone: string;
  whatsapp: string;
}
```

---

## Inventory Management APIs

### Basic Inventory API (`inventoryApi`)

#### Get Products

```typescript
inventoryApi.getProducts(filters?: {
  category?: string;
  brand?: string;
  isActive?: boolean;
  search?: string;
  includeDeleted?: boolean;
}): Promise<InventoryApiResponse>
```

#### Get Product by ID

```typescript
inventoryApi.getProductById(productId: string): Promise<InventoryApiResponse>
```

#### Get Low Stock Products

```typescript
inventoryApi.getLowStockProducts(): Promise<InventoryApiResponse>
```

#### Get Featured Products

```typescript
inventoryApi.getFeaturedProducts(): Promise<InventoryApiResponse>
```

#### Update Product Inventory

```typescript
inventoryApi.updateProductInventory(
  productId: string,
  inventoryUpdate: {
    currentStock?: number;
    minimumStock?: number;
    maximumStock?: number;
    reorderLevel?: number;
    location?: string;
  }
): Promise<InventoryApiResponse>
```

#### Get Inventory Summary

```typescript
inventoryApi.getInventorySummary(): Promise<InventoryApiResponse>
```

#### Search Products

```typescript
inventoryApi.searchProducts(
  searchTerm: string,
  limit?: number
): Promise<InventoryApiResponse>
```

#### Create Product

```typescript
inventoryApi.createProduct(productData: {
  name: string;
  description?: string;
  brandId: string;
  categoryId: string;
  specifications: any;
  pricing: {
    purchasePrice: number;
    sellingPrice: number;
    unit: string;
  };
  inventory: {
    currentStock: number;
    minimumStock: number;
    reorderLevel: number;
  };
  tags: string[];
}): Promise<InventoryApiResponse>
```

#### Update Product

```typescript
inventoryApi.updateProduct(
  productId: string,
  updateData: any
): Promise<InventoryApiResponse>
```

### Enhanced Inventory API (`enhancedInventoryApi`)

#### Validate Bill Stock

```typescript
enhancedInventoryApi.validateBillStock(items: BillItem[]): Promise<
  InventoryApiResponse<{
    isValid: boolean;
    validationResults: StockValidationResult[];
    errors: string[];
  }>
>
```

#### Get Latest Prices

```typescript
enhancedInventoryApi.getLatestPrices(
  productIds: string[]
): Promise<InventoryApiResponse<Map<string, PriceInfo>>>
```

#### Process Bill Stock Update

```typescript
enhancedInventoryApi.processBillStockUpdate(
  items: BillItem[],
  billId: string,
  operation?: "reduce" | "restore"
): Promise<InventoryApiResponse>
```

#### Get Product Stock History

```typescript
enhancedInventoryApi.getProductStockHistory(
  productId: string,
  limit?: number
): Promise<InventoryApiResponse>
```

#### Get Low Stock Alerts

```typescript
enhancedInventoryApi.getLowStockAlerts(): Promise<InventoryApiResponse<StockAlert[]>>
```

#### Get Inventory Value

```typescript
enhancedInventoryApi.getInventoryValue(): Promise<
  InventoryApiResponse<{
    totalValue: number;
    totalItems: number;
    breakdown: any[];
  }>
>
```

#### Get Products with Stock

```typescript
enhancedInventoryApi.getProductsWithStock(filters?: {
  category?: string;
  brand?: string;
  lowStock?: boolean;
  outOfStock?: boolean;
}): Promise<InventoryApiResponse<ProductWithStock[]>>
```

#### Get Stock Movement Summary

```typescript
enhancedInventoryApi.getStockMovementSummary(
  startDate: string,
  endDate: string
): Promise<
  InventoryApiResponse<{
    totalTransactions: number;
    totalSales: number;
    totalPurchases: number;
    totalValue: number;
    topMovingProducts: any[];
  }>
>
```

#### Delete Product

```typescript
enhancedInventoryApi.deleteProduct(
  productId: string,
  deleteConsolidated?: boolean,
  consolidatedIds?: string[]
): Promise<InventoryApiResponse>
```

#### Soft Delete Product

```typescript
enhancedInventoryApi.softDeleteProduct(
  productId: string,
  deleteConsolidated?: boolean,
  consolidatedIds?: string[]
): Promise<InventoryApiResponse>
```

#### Restore Product

```typescript
enhancedInventoryApi.restoreProduct(productId: string): Promise<InventoryApiResponse>
```

#### Check Product References

```typescript
enhancedInventoryApi.checkProductReferences(productId: string): Promise<
  InventoryApiResponse<{
    canDelete: boolean;
    references: {
      activeTransactions: number;
      pendingBills: number;
      completedTransactions: number;
      allBills: number;
    };
    blockingReasons: string[];
  }>
>
```

#### Force Delete Product

```typescript
enhancedInventoryApi.forceDeleteProduct(productId: string): Promise<InventoryApiResponse>
```

#### Bulk Update Stock

```typescript
enhancedInventoryApi.bulkUpdateStock(
  updates: Array<{
    productId: string;
    newStock: number;
    reason?: string;
  }>
): Promise<InventoryApiResponse>
```

### Stock API (`stockApi`)

#### Get Stock Transactions

```typescript
stockApi.getStockTransactions(filters?: {
  productId?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<InventoryApiResponse>
```

#### Create Stock Transaction

```typescript
stockApi.createStockTransaction(transactionData: {
  productId: string;
  type: "purchase" | "sale" | "adjustment" | "return" | "damage";
  quantity: number;
  unitPrice: number;
  supplierId?: string;
  billId?: string;
  notes?: string;
}): Promise<InventoryApiResponse>
```

---

## Stock History APIs

### Stock History API (`stockHistoryApi`)

#### Get Stock Transactions

```typescript
stockHistoryApi.getStockTransactions(
  filters?: StockHistoryFilters
): Promise<StockHistoryApiResponse<StockTransaction[]>>
```

**Filters:**

```typescript
interface StockHistoryFilters {
  productId?: string;
  type?: "purchase" | "sale" | "adjustment" | "return" | "damage";
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}
```

#### Get Stock History Summary

```typescript
stockHistoryApi.getStockHistorySummary(
  filters?: StockHistoryFilters
): Promise<StockHistoryApiResponse<StockHistorySummary>>
```

#### Get Stock Transaction by ID

```typescript
stockHistoryApi.getStockTransactionById(
  transactionId: string
): Promise<StockHistoryApiResponse<StockTransaction>>
```

#### Get Recent Transactions

```typescript
stockHistoryApi.getRecentTransactions(): Promise<
  StockHistoryApiResponse<StockTransaction[]>
>
```

#### Get Product Transactions

```typescript
stockHistoryApi.getProductTransactions(
  productId: string,
  limit?: number
): Promise<StockHistoryApiResponse<StockTransaction[]>>
```

#### Debug Stock History

```typescript
debugStockHistory(): Promise<{
  allTransactions: any[];
  allProducts: any[];
} | null>
```

---

## React Hooks for API Operations

### Generic API Hook

```typescript
useApiOperation<T>(
  operation: (...args: any[]) => Promise<ApiResponse<T>>
): {
  data: T | null;
  loading: boolean;
  error: string | null;
  execute: (...args: any[]) => Promise<void>;
  reset: () => void;
}
```

### Specific Hooks

#### User Hooks

```typescript
const {
  getAllUsers,
  getCustomers,
  getUserById,
  getUserByCustomerId,
  createUser,
  updateUser,
  deleteUser,
} = useUsers();
```

#### Product Hooks

```typescript
const {
  getAllProducts,
  getActiveProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = useProducts();
```

#### Brand Hooks

```typescript
const { getAllBrands, getBrandById, createBrand, updateBrand, deleteBrand } =
  useBrands();
```

#### Category Hooks

```typescript
const {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} = useCategories();
```

#### Bill Hooks

```typescript
const {
  getAllBills,
  getBillById,
  getCustomerBills,
  createBill,
  updateBill,
  deleteBill,
} = useBills();
```

#### Stock Transaction Hooks

```typescript
const {
  getAllStockTransactions,
  getStockTransactionById,
  createStockTransaction,
  updateStockTransaction,
  deleteStockTransaction,
} = useStockTransactions();
```

#### Payment Hooks

```typescript
const {
  getAllPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
} = usePayments();
```

#### Combined Hook

```typescript
const api = useSanityApi();
// Access all services: api.users, api.products, api.brands, etc.
```

#### Data Fetch Hook

```typescript
const { data, loading, error, refetch } = useDataFetch(
  () => productApiService.getAllProducts(),
  [
    /* dependencies */
  ]
);
```

### Store-based Hooks

#### Products Hook

```typescript
const {
  products,
  activeProducts,
  getProductsByCategory,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  isLoading,
} = useProducts();
```

#### Brands Hook

```typescript
const { brands, getBrandById, isLoading } = useBrands();
```

#### Categories Hook

```typescript
const { categories, getCategoryById, isLoading } = useCategories();
```

#### Customers Hook

```typescript
const { customers, getUserById, createUser, updateUser, isLoading } =
  useCustomers();
```

#### Bills Hook

```typescript
const {
  bills,
  getBillsByCustomer,
  getBillById,
  createBill,
  updateBill,
  isLoading,
} = useBills();
```

#### Inventory Hook

```typescript
const { lowStockProducts, outOfStockProducts, totalProducts, activeProducts } =
  useInventory();
```

#### Dashboard Stats Hook

```typescript
const {
  totalProducts,
  activeProducts,
  totalCustomers,
  totalBills,
  pendingBills,
  completedBills,
  totalRevenue,
  pendingAmount,
} = useDashboardStats();
```

#### Search Hook

```typescript
const { searchProducts, searchCustomers, searchBills } = useSearch();
```

#### Stock History Hook

```typescript
const {
  transactions,
  summary,
  loading,
  error,
  fetchTransactions,
  fetchSummary,
  clearData,
} = useStockHistory();
```

---

## Data Types and Interfaces

### Core Types

#### User

```typescript
interface User {
  id: string;
  clerkId: string;
  customerId: string;
  secretKey: string;
  name: string;
  email?: string;
  phone: string;
  location: string;
  profileImage?: string;
  role: "admin" | "customer";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Product

```typescript
interface Product {
  _id: string;
  productId: string;
  name: string;
  slug: { current: string };
  description?: string;
  brand: Brand;
  category: Category;
  specifications: any;
  pricing: {
    purchasePrice: number;
    sellingPrice: number;
    unit: string;
    taxRate: number;
  };
  inventory: {
    currentStock: number;
    minimumStock: number;
    maximumStock: number;
    reorderLevel: number;
    location?: string;
  };
  images: any[];
  isActive: boolean;
  isFeatured: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}
```

#### Brand

```typescript
interface Brand {
  _id: string;
  _type: "brand";
  name: string;
  slug: { current: string };
  logo?: { asset: { _ref: string } };
  description?: string;
  contactInfo?: {
    email?: string;
    phone?: string;
    website?: string;
    address?: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

#### Category

```typescript
interface Category {
  _id: string;
  name: string;
  slug: { current: string };
  description?: string;
  icon?: string;
  parentCategory?: Category;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}
```

#### Bill

```typescript
interface Bill {
  _id: string;
  billId: string;
  billNumber: string;
  customer: {
    _id: string;
    name: string;
    phone: string;
    email?: string;
    location: string;
    role: string;
  };
  items: BillItem[];
  serviceType: "repair" | "sale" | "installation" | "maintenance" | "custom";
  locationType: "shop" | "home" | "office";
  serviceDate: string;
  homeVisitFee: number;
  transportationFee?: number;
  laborCharges?: number;
  repairCharges?: number;
  subtotal: number;
  taxAmount: number;
  discountAmount?: number;
  totalAmount: number;
  paymentStatus: "pending" | "partial" | "paid" | "overdue";
  paymentMethod?: string;
  paidAmount: number;
  balanceAmount: number;
  status: "draft" | "confirmed" | "in_progress" | "completed" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  notes?: string;
  internalNotes?: string;
  createdAt: string;
  updatedAt: string;
}
```

#### BillItem

```typescript
interface BillItem {
  product: {
    _type: "reference";
    _ref: string;
  };
  productName: string;
  category?: string;
  brand?: string;
  specifications?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  unit?: string;
}
```

#### StockTransaction

```typescript
interface StockTransaction {
  id: string;
  itemId: string;
  itemName: string;
  type: "purchase" | "sale" | "adjustment";
  quantity: number;
  price: number;
  totalAmount: number;
  date: Date;
  notes?: string;
  createdBy: string;
}
```

### API Response Types

#### ApiResponse

```typescript
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
```

#### PaginatedResponse

```typescript
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
```

#### InventoryApiResponse

```typescript
interface InventoryApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
```

#### StockHistoryApiResponse

```typescript
interface StockHistoryApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
```

### Authentication Types

#### LoginCredentials

```typescript
interface LoginCredentials {
  customerId: string;
  secretKey: string;
}
```

#### AuthResult

```typescript
interface AuthResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
  errorType?:
    | "USER_NOT_FOUND"
    | "INVALID_CREDENTIALS"
    | "ACCOUNT_DISABLED"
    | "SERVER_ERROR";
}
```

#### AuthUser

```typescript
interface AuthUser {
  _id: string;
  clerkId: string;
  customerId: string;
  secretKey: string;
  name: string;
  email?: string;
  phone: string;
  location: string;
  profileImage?: string;
  role: "admin" | "customer";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

---

## Error Handling

### Standard Error Response

All API services return standardized error responses:

```typescript
{
  success: false,
  error: "Error message describing what went wrong",
  errorType?: "SPECIFIC_ERROR_TYPE" // For authentication errors
}
```

### Common Error Types

#### Authentication Errors

- `USER_NOT_FOUND`: Customer ID not found in database
- `INVALID_CREDENTIALS`: Wrong secret key provided
- `ACCOUNT_DISABLED`: User account is deactivated
- `SERVER_ERROR`: Database or server error

#### Validation Errors

- `MISSING_REQUIRED_FIELDS`: Required fields not provided
- `INVALID_DATA_FORMAT`: Data doesn't match expected format
- `DUPLICATE_ENTRY`: Attempting to create duplicate record

#### Permission Errors

- `UNAUTHORIZED`: User doesn't have permission for action
- `FORBIDDEN`: Action not allowed for user role

#### Resource Errors

- `NOT_FOUND`: Requested resource doesn't exist
- `ALREADY_EXISTS`: Resource already exists
- `CONFLICT`: Resource is referenced by other entities

### Error Handling Best Practices

1. **Always check the `success` field** before accessing `data`
2. **Display user-friendly error messages** from the `error` field
3. **Handle specific error types** when needed (e.g., authentication)
4. **Log detailed errors** for debugging while showing simple messages to users
5. **Implement retry logic** for transient errors
6. **Validate data** before sending API requests

Example error handling:

```typescript
try {
  const response = await userApiService.getUserById(userId);

  if (response.success) {
    // Handle success
    setUser(response.data);
  } else {
    // Handle error
    console.error("API Error:", response.error);
    setError(response.error || "An error occurred");
  }
} catch (error) {
  // Handle network or unexpected errors
  console.error("Network Error:", error);
  setError("Network error. Please try again.");
}
```

---

## API Response Formats

### Success Response

```typescript
{
  success: true,
  data: T, // The requested data
  message?: string // Optional success message
}
```

### Error Response

```typescript
{
  success: false,
  error: string, // Error message
  errorType?: string // Optional error type for specific handling
}
```

### Paginated Response

```typescript
{
  success: true,
  data: {
    data: T[], // Array of items
    total: number, // Total count
    page: number, // Current page
    limit: number, // Items per page
    hasMore: boolean // Whether more pages exist
  }
}
```

### File Upload Response

```typescript
{
  success: true,
  data: {
    url: string, // Public URL of uploaded file
    assetId: string, // Sanity asset ID
    filename: string, // Original filename
    size: number, // File size in bytes
    contentType: string // MIME type
  }
}
```

### Bulk Operation Response

```typescript
{
  success: boolean,
  data: {
    successful: T[], // Successfully processed items
    failed: Array<{ // Failed items with errors
      item: any,
      error: string
    }>,
    summary: {
      total: number,
      successful: number,
      failed: number
    }
  }
}
```

---

## Usage Examples

### Creating a New Product

```typescript
import { productApiService } from "@/lib/sanity-api-service";

const createProduct = async (productData) => {
  try {
    const response = await productApiService.createProduct({
      name: "LED Bulb 9W",
      description: "Energy efficient LED bulb",
      brandId: "brand-123",
      categoryId: "category-456",
      specifications: {
        wattage: "9W",
        voltage: "220V",
        color: "warm-white",
      },
      pricing: {
        purchasePrice: 150,
        sellingPrice: 200,
        unit: "piece",
      },
      inventory: {
        currentStock: 100,
        minimumStock: 10,
        reorderLevel: 20,
      },
      tags: ["led", "bulb", "energy-efficient"],
    });

    if (response.success) {
      console.log("Product created:", response.data);
      return response.data;
    } else {
      throw new Error(response.error);
    }
  } catch (error) {
    console.error("Failed to create product:", error);
    throw error;
  }
};
```

### Fetching Sales Report

```typescript
const fetchSalesReport = async (dateRange = "month", format = "json") => {
  try {
    const response = await fetch(
      `/api/sales-report/export?dateRange=${dateRange}&format=${format}`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch sales report");
    }

    if (format === "csv") {
      // Handle CSV download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sales-report-${dateRange}.csv`;
      a.click();
    } else {
      // Handle JSON response
      const data = await response.json();
      return data;
    }
  } catch (error) {
    console.error("Error fetching sales report:", error);
    throw error;
  }
};
```

### Using React Hooks

```typescript
import { useProducts } from "@/hooks/use-sanity-api";

const ProductList = () => {
  const { getAllProducts } = useProducts();

  useEffect(() => {
    getAllProducts.execute();
  }, []);

  if (getAllProducts.loading) {
    return <div>Loading products...</div>;
  }

  if (getAllProducts.error) {
    return <div>Error: {getAllProducts.error}</div>;
  }

  return (
    <div>
      {getAllProducts.data?.map((product) => (
        <div key={product._id}>
          <h3>{product.name}</h3>
          <p>Price: ₹{product.pricing.sellingPrice}</p>
          <p>Stock: {product.inventory.currentStock}</p>
        </div>
      ))}
    </div>
  );
};
```

### Stock Management

```typescript
import { enhancedInventoryApi } from "@/lib/inventory-api-enhanced";

const updateStock = async (productId, newStock, reason) => {
  try {
    const response = await enhancedInventoryApi.bulkUpdateStock([
      {
        productId,
        newStock,
        reason,
      },
    ]);

    if (response.success) {
      console.log("Stock updated successfully");
      return response.data;
    } else {
      throw new Error(response.error);
    }
  } catch (error) {
    console.error("Failed to update stock:", error);
    throw error;
  }
};
```

This comprehensive documentation covers all API endpoints, services, and data handling mechanisms in your Electrician Shop Management System. Each API is documented with its parameters, return types, and usage examples to help developers understand and implement the system effectively.
