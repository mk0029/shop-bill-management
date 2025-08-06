# Electrician Shop Management System Documentation

## Project Overview

This document provides a comprehensive overview of the Electrician Shop Management System, detailing its architecture, core functionalities, and implementation details. The system is designed to manage inventory, process bills, handle customer information, and provide both admin and customer portals.

## Tech Stack

- **Frontend**: Next.js 15.4.5, React 19.1.0
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Authentication**: Clerk
- **CMS & Database**: Sanity
- **Form Handling**: React Hook Form with Zod validation
- **Animations**: Framer Motion
- **Language**: TypeScript

## Project Structure

### Core Directories

- `/src/app`: Next.js app router pages
  - `/admin`: Admin portal pages
  - `/customer`: Customer portal pages
  - `/api`: API endpoints
- `/src/components`: UI components
  - `/dashboard`: Dashboard-specific components
  - `/inventory`: Inventory management components
  - `/forms`: Form components
  - `/ui`: Reusable UI components
- `/src/lib`: Core business logic and services
  - `sanity.ts`: Sanity CMS integration
  - `inventory-management.ts`: Inventory management logic
  - `inventory-api-enhanced.ts`: Enhanced inventory API
- `/src/store`: Zustand state stores
  - `specifications-store.ts`: Product specifications state
  - `inventory-store.ts`: Inventory state management
- `/src/hooks`: Custom React hooks
  - `use-enhanced-inventory.ts`: Inventory management hooks
  - `use-sanity-data.ts`: Sanity data fetching hooks
- `/src/types`: TypeScript type definitions
- `/sanity-schemas`: Sanity CMS schema definitions
  - `categoryFieldMapping.js`: Category to field mappings
  - `specificationOption.js`: Specification options schema

## Dual Portal System

The application is divided into two main portals:

### Admin Portal (`/src/app/admin`)

- **Dashboard**: Overview of sales, inventory, and customer data
- **Inventory Management**: Add, edit, delete products
- **Customer Management**: View and manage customer information
- **Bill Generation**: Create and manage bills
- **Reports**: Generate and view sales and inventory reports

### Customer Portal (`/src/app/customer`)

- **Product Browsing**: View available products
- **Order History**: View past orders and bills
- **Profile Management**: Update personal information
- **Product Booking**: Request products or services

## Data Models

### User/Customer Model

- `clerkId`: Unique identifier from Clerk authentication
- `customerId`: Internal customer identifier
- `name`: Customer's full name
- `email`: Customer's email address
- `phone`: Contact number
- `location`: Customer's location/address
- `role`: User role (admin/customer)
- `profileImage`: Profile picture URL

### Product/Inventory Model

- `productId`: Unique product identifier
- `name`: Product name
- `description`: Product description
- `brand`: Associated brand (reference)
- `category`: Product category (reference)
- `specifications`: Dynamic specifications based on category
- `pricing`: Price information
  - `mrp`: Manufacturer's recommended price
  - `sellingPrice`: Actual selling price
  - `discount`: Discount percentage
- `inventory`: Stock information
  - `inStock`: Current stock quantity
  - `lowStockThreshold`: Threshold for low stock alerts
- `images`: Product images

### Bill Model

- `billId`: Unique bill identifier
- `customer`: Reference to customer
- `items`: Array of products with quantities and prices
- `totalAmount`: Total bill amount
- `status`: Bill status (pending/completed/cancelled)
- `createdAt`: Bill creation timestamp
- `updatedAt`: Last update timestamp

## Inventory Management System

### Core Components

1. **`inventory-management.ts`**
   - Handles stock validation and updates
   - Provides interfaces for stock operations
   - Implements business logic for inventory management

2. **`inventory-api-enhanced.ts`**
   - Provides API endpoints for inventory operations
   - Handles real-time stock updates
   - Manages stock transaction history

3. **`use-enhanced-inventory.ts`**
   - React hooks for inventory management
   - Provides UI components with inventory data and operations
   - Handles optimistic updates and error states

### Stock Validation Process

1. When creating a bill, the system validates stock availability using `validateStockAvailability`
2. The function fetches current stock from Sanity CMS
3. It compares requested quantities with available stock
4. Returns validation results and any errors
5. If validation passes, the bill creation proceeds

### Stock Update Process

1. After bill creation, the system updates stock using `updateStockLevels`
2. Creates stock transaction records in Sanity
3. Updates product stock quantities
4. Handles concurrent updates with optimistic locking
5. Provides real-time feedback on stock updates

## Dynamic Specification System

The system implements a dynamic specification system that adapts product attributes based on category:

### Key Components

1. **Sanity Schemas**
   - `specificationOption`: Defines available specification options
   - `categoryFieldMapping`: Maps categories to required specification fields

2. **Specification Store**
   - Manages specification state
   - Filters options based on selected category
   - Provides UI with relevant specification fields

### Workflow

1. When a category (e.g., "Switch" or "Socket") is selected, the system looks up required fields from `categoryFieldMappings`
2. It then filters available options (e.g., `amperageOptions`) to show only those relevant to the selected category
3. The UI dynamically renders the appropriate specification fields
4. When saving a product, the specifications are stored in a structured format

## Bill Creation Workflow

1. **Initiation**:
   - Admin selects a customer or creates a new one
   - Admin navigates to bill creation interface

2. **Product Selection**:
   - Admin searches and selects products
   - System fetches latest prices and stock information
   - Admin specifies quantities

3. **Stock Validation**:
   - System validates stock availability using `validateStockAvailability`
   - If validation fails, shows errors and prevents proceeding
   - If validation passes, allows bill creation

4. **Bill Creation**:
   - System creates a bill document in Sanity
   - Associates selected products, quantities, and prices
   - Links the bill to the customer

5. **Stock Update**:
   - System updates stock levels using `updateStockLevels`
   - Creates stock transaction records
   - Updates product stock quantities

6. **Confirmation**:
   - System displays bill confirmation
   - Provides options to print or share the bill

## Sanity CMS Integration

### Real-time Updates

The system uses Sanity's real-time capabilities to provide live updates:

```typescript
// From src/lib/sanity.ts
export const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: '2023-05-03',
  useCdn: false, // Set to false for real-time updates
  token: process.env.SANITY_API_TOKEN,
});
```

The system listens for changes to various document types:

```typescript
// Real-time listeners for changes
export function listenForChanges(type: string, callback: (update: any) => void) {
  return sanityClient
    .listen(`*[_type == "${type}"]`)
    .subscribe((update) => {
      callback(update);
    });
}
```

### GROQ Queries

The system uses GROQ (Graph-Relational Object Queries) to fetch data from Sanity:

```typescript
// Example GROQ query for fetching brands
export const brandsQuery = `*[_type == "brand"] | order(name asc) {
  _id,
  name,
  "logo": logo.asset->url,
  description,
  contactInfo
}`;

// Example GROQ query for fetching categories
export const categoriesQuery = `*[_type == "category"] | order(name asc) {
  _id,
  name,
  description,
  "icon": icon,
  "parentCategory": parentCategory->name,
  "parentCategoryId": parentCategory->_id
}`;
```

## State Management with Zustand

The application uses Zustand for state management, providing a simple and efficient way to manage global state:

```typescript
// Example of a Zustand store for inventory
export const useInventoryStore = create<InventoryStore>((set) => ({
  products: [],
  isLoading: false,
  error: null,
  setProducts: (products) => set({ products }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  // Additional actions...
}));
```

## Authentication with Clerk

The system uses Clerk for authentication, providing secure user management:

- User registration and login
- Role-based access control
- Profile management
- Session handling

## Form Handling

The system uses React Hook Form with Zod validation for form handling:

```typescript
// Example of form setup with React Hook Form and Zod
const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  price: z.number().min(0, "Price must be a positive number"),
  // Additional fields...
});

const {
  register,
  handleSubmit,
  formState: { errors },
} = useForm<z.infer<typeof formSchema>>({
  resolver: zodResolver(formSchema),
  defaultValues: {
    name: "",
    price: 0,
    // Additional defaults...
  },
});
```

## UI Components

The system includes various UI components for different functionalities:

- **Dashboard Components**: Charts, statistics, and overview cards
- **Inventory Components**: Product lists, stock management interfaces
- **Form Components**: Dynamic forms for product and customer management
- **UI Components**: Buttons, inputs, modals, and other reusable UI elements

## Conclusion

This documentation provides a comprehensive overview of the Electrician Shop Management System, detailing its architecture, core functionalities, and implementation details. The system is designed to be scalable, maintainable, and user-friendly, providing a complete solution for managing an electrician shop's inventory, bills, and customer information.