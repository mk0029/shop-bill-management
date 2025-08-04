# Strapi Integration & Sanity API Services

This document provides a comprehensive guide to the Strapi integration and Sanity API services implemented in the project.

## Table of Contents

1. [Overview](#overview)
2. [Strapi Integration](#strapi-integration)
3. [Sanity API Services](#sanity-api-services)
4. [Usage Examples](#usage-examples)
5. [Environment Variables](#environment-variables)
6. [API Reference](#api-reference)
7. [Error Handling](#error-handling)
8. [Best Practices](#best-practices)

## Overview

The project now includes:
- **Strapi Integration**: Automatic synchronization of data from Sanity to Strapi
- **Comprehensive API Services**: Complete CRUD operations for all Sanity entities
- **React Hooks**: Easy-to-use hooks for API operations with loading states and error handling
- **Type Safety**: Full TypeScript support for all API operations

## Strapi Integration

### Features

- **Automatic User Sync**: When users are created in Sanity, they are automatically synced to Strapi
- **Bidirectional Sync**: Data can be synced from Sanity to Strapi and vice versa
- **Error Handling**: Graceful handling of sync failures without breaking the main application
- **Configurable**: Easy to enable/disable sync operations

### How It Works

1. **User Creation**: When a user is created via `createCustomerAccount()` or `userApiService.createUser()`, the user data is automatically synced to Strapi
2. **Data Synchronization**: The `strapiSyncService` handles checking for existing records and updating them or creating new ones
3. **Error Recovery**: If Strapi sync fails, the main operation continues without interruption

### Strapi Configuration

The Strapi integration requires the following environment variables:

```env
NEXT_PUBLIC_STRAPI_URL=http://localhost:1337
STRAPI_API_TOKEN=your-strapi-api-token
```

### Strapi Content Types

The following content types should be created in Strapi:

- **Users**: `clerkId`, `customerId`, `secretKey`, `name`, `email`, `phone`, `location`, `role`, `isActive`
- **Products**: All product fields from Sanity schema
- **Bills**: All bill fields from Sanity schema
- **Categories**: All category fields from Sanity schema
- **Brands**: All brand fields from Sanity schema
- **Stock Transactions**: All stock transaction fields from Sanity schema
- **Payments**: All payment fields from Sanity schema
- **Addresses**: All address fields from Sanity schema
- **Follow-ups**: All follow-up fields from Sanity schema
- **Suppliers**: All supplier fields from Sanity schema

## Sanity API Services

### Available Services

The following API services are available:

1. **User API Service** (`userApiService`)
2. **Product API Service** (`productApiService`)
3. **Brand API Service** (`brandApiService`)
4. **Category API Service** (`categoryApiService`)
5. **Bill API Service** (`billApiService`)
6. **Stock Transaction API Service** (`stockTransactionApiService`)
7. **Payment API Service** (`paymentApiService`)
8. **Address API Service** (`addressApiService`)
9. **Follow-up API Service** (`followUpApiService`)
10. **Supplier API Service** (`supplierApiService`)

### Service Methods

Each service provides the following methods:

- `getAll*()`: Fetch all records
- `get*ById()`: Fetch a single record by ID
- `create*()`: Create a new record
- `update*()`: Update an existing record
- `delete*()`: Delete a record

Additional methods are available for specific services:
- `getCustomers()`: Get only customer users
- `getActiveProducts()`: Get only active products
- `getCustomerBills()`: Get bills for a specific customer
- `getCustomerAddresses()`: Get addresses for a specific customer

## Usage Examples

### Using API Services Directly

```typescript
import { sanityApiService } from '../lib/sanity-api-service';

// Create a new user
const createUser = async () => {
  const result = await sanityApiService.users.createUser({
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    location: 'New York',
    role: 'customer',
  });

  if (result.success) {
    console.log('User created:', result.data);
  } else {
    console.error('Error:', result.error);
  }
};

// Get all products
const getProducts = async () => {
  const result = await sanityApiService.products.getAllProducts();
  
  if (result.success) {
    console.log('Products:', result.data);
  } else {
    console.error('Error:', result.error);
  }
};
```

### Using React Hooks

```typescript
import { useSanityApi } from '../hooks/use-sanity-api';

const MyComponent = () => {
  const api = useSanityApi();

  // Create user
  const handleCreateUser = async () => {
    await api.users.createUser.execute({
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      location: 'New York',
      role: 'customer',
    });
  };

  // Load all products on component mount
  React.useEffect(() => {
    api.products.getAllProducts.execute();
  }, []);

  return (
    <div>
      <button 
        onClick={handleCreateUser}
        disabled={api.users.createUser.loading}
      >
        {api.users.createUser.loading ? 'Creating...' : 'Create User'}
      </button>

      {api.users.createUser.error && (
        <div className="error">{api.users.createUser.error}</div>
      )}

      {api.users.createUser.data && (
        <div className="success">User created: {api.users.createUser.data.name}</div>
      )}

      {api.products.getAllProducts.data && (
        <div>
          {api.products.getAllProducts.data.map(product => (
            <div key={product._id}>{product.name}</div>
          ))}
        </div>
      )}
    </div>
  );
};
```

### Using Individual Hooks

```typescript
import { useUsers, useProducts } from '../hooks/use-sanity-api';

const UserManagement = () => {
  const { createUser, getAllUsers } = useUsers();
  const { getAllProducts } = useProducts();

  return (
    <div>
      <button onClick={() => createUser.execute(userData)}>
        Create User
      </button>
      
      <button onClick={() => getAllUsers.execute()}>
        Load Users
      </button>

      {createUser.loading && <div>Creating user...</div>}
      {createUser.error && <div>Error: {createUser.error}</div>}
      {createUser.data && <div>Success: {createUser.data.name}</div>}
    </div>
  );
};
```

## Environment Variables

Add the following environment variables to your `.env.local` file:

```env
# Sanity Configuration
SANITY_API_TOKEN=your-sanity-api-token
NEXT_PUBLIC_SANITY_PROJECT_ID=your-project-id
NEXT_PUBLIC_SANITY_DATASET=production

# Strapi Configuration
NEXT_PUBLIC_STRAPI_URL=http://localhost:1337
STRAPI_API_TOKEN=your-strapi-api-token

# Support Contact (Optional)
NEXT_PUBLIC_SUPPORT_EMAIL=support@electricianshop.com
NEXT_PUBLIC_SUPPORT_PHONE=+91-9876543210
NEXT_PUBLIC_SUPPORT_WHATSAPP=+91-9876543210
```

## API Reference

### User API Service

```typescript
// Get all users
const result = await sanityApiService.users.getAllUsers();

// Get customers only
const result = await sanityApiService.users.getCustomers();

// Get user by ID
const result = await sanityApiService.users.getUserById(userId);

// Get user by customer ID
const result = await sanityApiService.users.getUserByCustomerId(customerId);

// Create user
const result = await sanityApiService.users.createUser({
  name: string,
  email?: string,
  phone: string,
  location: string,
  role: 'admin' | 'customer',
});

// Update user
const result = await sanityApiService.users.updateUser(userId, {
  name?: string,
  email?: string,
  phone?: string,
  location?: string,
  isActive?: boolean,
});

// Delete user
const result = await sanityApiService.users.deleteUser(userId);
```

### Product API Service

```typescript
// Get all products
const result = await sanityApiService.products.getAllProducts();

// Get active products only
const result = await sanityApiService.products.getActiveProducts();

// Get product by ID
const result = await sanityApiService.products.getProductById(productId);

// Create product
const result = await sanityApiService.products.createProduct({
  name: string,
  description?: string,
  brand: { _type: 'reference', _ref: string },
  category: { _type: 'reference', _ref: string },
  pricing: {
    costPrice: number,
    sellingPrice: number,
    mrp: number,
  },
  inventory: {
    currentStock: number,
    minimumStock: number,
    maximumStock: number,
    unit: string,
  },
});

// Update product
const result = await sanityApiService.products.updateProduct(productId, productData);

// Delete product
const result = await sanityApiService.products.deleteProduct(productId);
```

### Bill API Service

```typescript
// Get all bills
const result = await sanityApiService.bills.getAllBills();

// Get bill by ID
const result = await sanityApiService.bills.getBillById(billId);

// Get customer bills
const result = await sanityApiService.bills.getCustomerBills(customerId);

// Create bill
const result = await sanityApiService.bills.createBill({
  customer: { _type: 'reference', _ref: string },
  serviceType: 'repair' | 'sale' | 'installation' | 'maintenance' | 'custom',
  locationType: 'shop' | 'home' | 'office',
  totalAmount: number,
  items: Array<{
    product: { _type: 'reference', _ref: string },
    quantity: number,
    unitPrice: number,
    totalPrice: number,
  }>,
});

// Update bill
const result = await sanityApiService.bills.updateBill(billId, billData);

// Delete bill
const result = await sanityApiService.bills.deleteBill(billId);
```

## Error Handling

All API services return a consistent response format:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
```

### Error Types

- **Network Errors**: Connection issues, timeouts
- **Validation Errors**: Invalid data format
- **Authentication Errors**: Missing or invalid API tokens
- **Permission Errors**: Insufficient permissions
- **Not Found Errors**: Requested resource doesn't exist

### Error Handling Example

```typescript
const handleApiCall = async () => {
  try {
    const result = await sanityApiService.users.createUser(userData);
    
    if (result.success) {
      // Handle success
      console.log('Success:', result.data);
    } else {
      // Handle API error
      console.error('API Error:', result.error);
      // Show user-friendly error message
      showError(result.error || 'An error occurred');
    }
  } catch (error) {
    // Handle unexpected errors
    console.error('Unexpected error:', error);
    showError('An unexpected error occurred');
  }
};
```

## Best Practices

### 1. Use React Hooks for UI Components

```typescript
// ✅ Good: Use hooks for UI components
const MyComponent = () => {
  const { createUser } = useUsers();
  
  const handleSubmit = async (data) => {
    await createUser.execute(data);
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
    </form>
  );
};

// ❌ Avoid: Direct API calls in components
const MyComponent = () => {
  const handleSubmit = async (data) => {
    const result = await sanityApiService.users.createUser(data);
    // Handle result manually
  };
};
```

### 2. Handle Loading States

```typescript
// ✅ Good: Show loading states
const MyComponent = () => {
  const { createUser } = useUsers();
  
  return (
    <button 
      onClick={() => createUser.execute(data)}
      disabled={createUser.loading}
    >
      {createUser.loading ? 'Creating...' : 'Create User'}
    </button>
  );
};
```

### 3. Provide User Feedback

```typescript
// ✅ Good: Show success/error messages
const MyComponent = () => {
  const { createUser } = useUsers();
  
  return (
    <div>
      <button onClick={() => createUser.execute(data)}>
        Create User
      </button>
      
      {createUser.error && (
        <div className="error-message">{createUser.error}</div>
      )}
      
      {createUser.data && (
        <div className="success-message">
          User created successfully!
        </div>
      )}
    </div>
  );
};
```

### 4. Use TypeScript for Type Safety

```typescript
// ✅ Good: Define proper types
interface UserData {
  name: string;
  email?: string;
  phone: string;
  location: string;
  role: 'admin' | 'customer';
}

const createUser = async (userData: UserData) => {
  const result = await sanityApiService.users.createUser(userData);
  return result;
};
```

### 5. Implement Proper Error Boundaries

```typescript
// ✅ Good: Use error boundaries for unexpected errors
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>;
    }

    return this.props.children;
  }
}
```

## Troubleshooting

### Common Issues

1. **Strapi Connection Failed**
   - Check if Strapi server is running
   - Verify `NEXT_PUBLIC_STRAPI_URL` environment variable
   - Ensure `STRAPI_API_TOKEN` is valid

2. **Sanity API Errors**
   - Verify `SANITY_API_TOKEN` has write permissions
   - Check if Sanity project is accessible
   - Ensure schema types exist in Sanity

3. **TypeScript Errors**
   - Run `npm run build` to check for type errors
   - Ensure all required types are imported
   - Check if API response types match expected structure

### Debug Mode

Enable debug logging by setting the environment variable:

```env
NEXT_PUBLIC_DEBUG=true
```

This will log all API calls and responses to the console.

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review the example components in `src/components/examples/`
3. Check the Sanity structure documentation in `structrure-sanity.md`
4. Contact the development team

---

This integration provides a robust foundation for managing your e-commerce and service management system with proper data synchronization between Sanity and Strapi. 