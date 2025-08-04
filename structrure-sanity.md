# Sanity CMS Structure Documentation

## Overview
This document provides a comprehensive guide to the Sanity CMS structure, including all paths, nesting relationships, and references that are essential for frontend development.

## Project Structure

```
sanity-shop/
├── schemaTypes/
│   ├── documents/          # Main document types
│   ├── objects/           # Reusable object types
│   ├── Products/          # Legacy product schemas
│   └── index.js           # Schema registry
├── structure/
│   └── deskStructure.js   # Studio navigation structure
├── components/            # Custom studio components
├── utils/                 # Utility functions
├── lib/                   # Library functions
└── static/               # Static assets
```

## Schema Types Architecture

### 1. Document Types (Main Entities)

#### Core Business Documents

**📄 Bill** (`bill`)
- **Path**: `schemaTypes/documents/bill.js`
- **Purpose**: Main billing and service management document
- **Key Fields**:
  - `billId` (auto-generated)
  - `billNumber` (sequential)
  - `customer` → `user` (reference)
  - `customerAddress` → `address` (reference)
  - `serviceType` (repair/sale/installation/maintenance/custom)
  - `locationType` (shop/home/office)
  - `technician` → `user` (reference)
  - `status` (draft/confirmed/in_progress/completed/cancelled)
  - `paymentStatus` (pending/partial/paid/overdue)
  - `totalAmount`, `paidAmount`, `balanceAmount`
  - `createdBy` → `user` (reference)

**📦 Product** (`product`)
- **Path**: `schemaTypes/documents/product.js`
- **Purpose**: Product catalog management
- **Key Fields**:
  - `productId` (auto-generated)
  - `name`, `slug`, `description`
  - `brand` → `brand` (reference)
  - `category` → `category` (reference)
  - `subcategory` → `category` (reference)
  - `specifications` → `specifications` (object)
  - `pricing` → `pricing` (object)
  - `inventory` → `inventory` (object)
  - `images` (array of images)
  - `isActive`, `isFeatured`
  - `createdBy` → `user` (reference)

**👤 User** (`user`)
- **Path**: `schemaTypes/documents/user.js`
- **Purpose**: Customer and admin management
- **Key Fields**:
  - `clerkId` (Clerk authentication)
  - `customerId` (auto-generated)
  - `secretKey` (auto-generated)
  - `name`, `email`, `phone`
  - `role` (admin/customer)
  - `isActive`
  - `profileImage`
  - `createdBy` → `user` (reference)

**🏢 Brand** (`brand`)
- **Path**: `schemaTypes/documents/brand.js`
- **Purpose**: Product brand management
- **Key Fields**:
  - `name`, `description`
  - `logo` (image)
  - `isActive`

**📂 Category** (`category`)
- **Path**: `schemaTypes/documents/category.js`
- **Purpose**: Product categorization
- **Key Fields**:
  - `name`, `description`
  - `parent` → `category` (self-reference for nesting)
  - `isActive`

#### Supporting Documents

**📍 Address** (`address`)
- **Path**: `schemaTypes/documents/address.js`
- **Purpose**: Customer address management
- **Key Fields**:
  - `customer` → `user` (reference)
  - `addressType` (billing/shipping)
  - `addressObject` → `addressObject` (object)

**💰 Payment** (`payment`)
- **Path**: `schemaTypes/documents/payment.js`
- **Purpose**: Payment tracking
- **Key Fields**:
  - `bill` → `bill` (reference)
  - `amount`, `paymentMethod`
  - `paymentDate`
  - `status` (pending/completed/failed)

**📋 Bill Item** (`billItem`)
- **Path**: `schemaTypes/documents/billItem.js`
- **Purpose**: Individual items in bills
- **Key Fields**:
  - `bill` → `bill` (reference)
  - `product` → `product` (reference)
  - `quantity`, `unitPrice`, `totalPrice`

**📊 Stock Transaction** (`stockTransaction`)
- **Path**: `schemaTypes/documents/stockTransaction.js`
- **Purpose**: Inventory movement tracking
- **Key Fields**:
  - `product` → `product` (reference)
  - `transactionType` (in/out/adjustment)
  - `quantity`, `reason`
  - `supplier` → `supplier` (reference)

**🏭 Supplier** (`supplier`)
- **Path**: `schemaTypes/documents/supplier.js`
- **Purpose**: Supplier management
- **Key Fields**:
  - `name`, `contactInfo` → `contactInfo` (object)
  - `address` → `addressObject` (object)
  - `isActive`

**📞 Follow Up** (`followUp`)
- **Path**: `schemaTypes/documents/followUp.js`
- **Purpose**: Customer follow-up tracking
- **Key Fields**:
  - `customer` → `user` (reference)
  - `bill` → `bill` (reference)
  - `followUpType`, `status`
  - `scheduledDate`, `completedDate`

### 2. Object Types (Reusable Components)

**💰 Pricing** (`pricing`)
- **Path**: `schemaTypes/objects/pricing.js`
- **Purpose**: Product pricing structure
- **Fields**:
  - `costPrice`, `sellingPrice`, `mrp`
  - `discountPercentage`, `discountAmount`
  - `taxRate`, `taxAmount`

**📐 Specifications** (`specifications`)
- **Path**: `schemaTypes/objects/specifications.js`
- **Purpose**: Product technical specifications
- **Fields**:
  - `voltage`, `wattage`, `amperage`
  - `wireGauge`, `loadCapacity`
  - `lightType`, `color`, `lumens`
  - `size`, `weight`, `material`
  - `hasWarranty`, `warrantyMonths`
  - `certifications` (array)

**📦 Inventory** (`inventory`)
- **Path**: `schemaTypes/objects/inventory.js`
- **Purpose**: Stock management
- **Fields**:
  - `currentStock`, `minimumStock`
  - `maximumStock`, `reorderPoint`
  - `unit` (pcs/meters/kg)

**📞 Contact Info** (`contactInfo`)
- **Path**: `schemaTypes/objects/contactInfo.js`
- **Purpose**: Contact information structure
- **Fields**:
  - `phone`, `email`, `website`
  - `alternatePhone`

**📍 Address Object** (`addressObject`)
- **Path**: `schemaTypes/objects/addressObject.js`
- **Purpose**: Address structure
- **Fields**:
  - `street`, `city`, `state`
  - `postalCode`, `country`

### 3. Legacy Schemas (Migration Support)

**📚 Author** (`author`)
- **Path**: `schemaTypes/author.js`
- **Purpose**: Legacy author management

**🏷️ Brands** (`brands`)
- **Path**: `schemaTypes/brands.js`
- **Purpose**: Legacy brand structure

**📋 Items List** (`items-list`)
- **Path**: `schemaTypes/itemsList.js`
- **Purpose**: Legacy item management

**🔌 Switch & Sockets** (`switch-and-sockets`)
- **Path**: `schemaTypes/Products/switchAndSockets.js`
- **Purpose**: Legacy electrical products

**🔌 Wires & Cables** (`wire-and-cabels`)
- **Path**: `schemaTypes/Products/wiresAndCabels.js`
- **Purpose**: Legacy wire products

**🎛️ Regulators & Controllers** (`regulators-and-controllers`)
- **Path**: `schemaTypes/Products/regulatorsAndControllers.js`
- **Purpose**: Legacy control products

## Reference Relationships

### Primary References

1. **Product → Brand** (`product.brand` → `brand._id`)
2. **Product → Category** (`product.category` → `category._id`)
3. **Product → Subcategory** (`product.subcategory` → `category._id`)
4. **Bill → Customer** (`bill.customer` → `user._id`)
5. **Bill → Customer Address** (`bill.customerAddress` → `address._id`)
6. **Bill → Technician** (`bill.technician` → `user._id`)
7. **Bill Item → Bill** (`billItem.bill` → `bill._id`)
8. **Bill Item → Product** (`billItem.product` → `product._id`)
9. **Payment → Bill** (`payment.bill` → `bill._id`)
10. **Stock Transaction → Product** (`stockTransaction.product` → `product._id`)
11. **Stock Transaction → Supplier** (`stockTransaction.supplier` → `supplier._id`)
12. **Follow Up → Customer** (`followUp.customer` → `user._id`)
13. **Follow Up → Bill** (`followUp.bill` → `bill._id`)
14. **Address → Customer** (`address.customer` → `user._id`)

### Self-References

1. **Category → Parent Category** (`category.parent` → `category._id`)
2. **User → Created By** (`user.createdBy` → `user._id`)
3. **Product → Created By** (`product.createdBy` → `user._id`)
4. **Bill → Created By** (`bill.createdBy` → `user._id`)

### Object References

1. **Product → Specifications** (`product.specifications` → `specifications` object)
2. **Product → Pricing** (`product.pricing` → `pricing` object)
3. **Product → Inventory** (`product.inventory` → `inventory` object)
4. **Supplier → Contact Info** (`supplier.contactInfo` → `contactInfo` object)
5. **Supplier → Address** (`supplier.address` → `addressObject` object)
6. **Address → Address Object** (`address.addressObject` → `addressObject` object)

## Studio Navigation Structure

The Sanity Studio is organized into main sections:

### 1. Bills & Orders
- All Bills
- Bill Items
- Payments

### 2. Customers
- All Users
- Customer Addresses
- Follow Ups

### 3. Products
- All Products
- Brands
- Categories

### 4. Inventory
- Stock Transactions
- Suppliers

### 5. Legacy Data (Migration)
- Old Brands
- Items List
- Switch & Sockets
- Wires & Cables
- Regulators & Controllers
- Authors

## Frontend Integration Guide

### Querying Data

#### Basic Product Query
```javascript
// Get all active products with brand and category
*[_type == "product" && isActive == true] {
  _id,
  name,
  slug,
  description,
  brand->{name, logo},
  category->{name},
  pricing,
  inventory,
  images,
  isFeatured
}
```

#### Bill with Customer and Items
```javascript
// Get bill with customer and bill items
*[_type == "bill" && _id == $billId] {
  _id,
  billNumber,
  customer->{name, phone, email},
  customerAddress->{addressObject},
  serviceType,
  totalAmount,
  paymentStatus,
  status,
  "billItems": *[_type == "billItem" && bill._ref == ^._id] {
    product->{name, pricing},
    quantity,
    unitPrice,
    totalPrice
  }
}
```

#### User with Addresses
```javascript
// Get user with all addresses
*[_type == "user" && _id == $userId] {
  _id,
  name,
  email,
  phone,
  role,
  "addresses": *[_type == "address" && customer._ref == ^._id] {
    addressType,
    addressObject
  }
}
```

### Real-time Updates

Sanity provides real-time subscriptions for live updates:

```javascript
import { createClient } from '@sanity/client'

const client = createClient({
  projectId: 'your-project-id',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2024-01-01'
})

// Subscribe to real-time updates
const subscription = client.listen('*[_type == "product"]')
  .subscribe(update => {
    console.log('Product updated:', update)
  })
```

### Image Handling

Sanity provides image URLs with transformations:

```javascript
// Basic image URL
const imageUrl = urlFor(product.images[0]).url()

// With transformations
const optimizedImage = urlFor(product.images[0])
  .width(400)
  .height(300)
  .fit('crop')
  .url()
```

## Data Flow Patterns

### 1. Product Management Flow
```
Category → Brand → Product → Stock Transaction
    ↓         ↓        ↓           ↓
  Frontend → Frontend → Frontend → Inventory
```

### 2. Billing Flow
```
User → Address → Bill → Bill Item → Product
 ↓       ↓        ↓        ↓         ↓
Customer → Billing → Payment → Stock Update
```

### 3. Follow-up Flow
```
Bill → Follow Up → User
 ↓        ↓         ↓
Service → Reminder → Customer
```

## Best Practices for Frontend

1. **Always check for null references** before accessing nested data
2. **Use GROQ projections** to fetch only needed fields
3. **Implement proper error handling** for missing data
4. **Cache frequently accessed data** like categories and brands
5. **Use real-time subscriptions** for live updates
6. **Optimize images** using Sanity's image transformations
7. **Handle pagination** for large datasets
8. **Validate data** on both frontend and backend

## Migration Notes

- Legacy schemas are maintained for backward compatibility
- New features should use the new schema structure
- Migration scripts are available in the `scripts/` directory
- Legacy data will be gradually migrated to new schemas

## API Endpoints

### REST API
- Base URL: `https://your-project-id.api.sanity.io/v2024-01-01/data/query/your-dataset`
- Authentication: Bearer token required

### GraphQL API
- Endpoint: `https://your-project-id.api.sanity.io/v2024-01-01/graphql/your-dataset`
- Schema available at: `/graphql/your-dataset/default`

### Real-time API
- WebSocket endpoint: `wss://your-project-id.api.sanity.io/v2024-01-01/data/query/your-dataset`

This structure provides a solid foundation for building a comprehensive e-commerce and service management system with proper data relationships and real-time capabilities. 