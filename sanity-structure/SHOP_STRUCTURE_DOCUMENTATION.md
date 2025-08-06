# Sanity Shop - System Documentation

This document provides a comprehensive overview of the Sanity Shop system, including its page structure, bill creation process, inventory management, and related implementation details.

## Table of Contents

1. [System Overview](#system-overview)
2. [Page Structure](#page-structure)
3. [Bill Creation Process](#bill-creation-process)
4. [Inventory Management System](#inventory-management-system)
5. [User Management](#user-management)
6. [Data Models](#data-models)
7. [Integration Points](#integration-points)

## System Overview

Sanity Shop is an electrician shop management system built on Sanity.io. It provides comprehensive tools for managing products, customers, bills, inventory, and suppliers. The system is designed to streamline the operations of an electrical shop, from product management to billing and inventory tracking.

## Page Structure

The Sanity Studio interface is organized into several main sections, each focusing on a specific aspect of the business:

### Bills & Orders Section

- **All Bills**: Displays a list of all bills with their status, customer information, and payment details.
- **Bill Items**: Shows individual items included in bills, with product references and pricing.
- **Payments**: Tracks all payments made against bills, including payment methods and status.

### Customer Management Section

- **All Users**: Lists all users in the system, including customers and administrators.
- **Customer Addresses**: Manages customer address information for billing and delivery.
- **Follow Ups**: Tracks customer follow-ups for service and sales opportunities.

### Product Catalog Section

- **All Products**: Comprehensive list of all products with inventory status and pricing.
- **Brands**: Manages product brands with their details and status.
- **Categories**: Organizes products into hierarchical categories and subcategories.

### Inventory Management Section

- **Stock Transactions**: Records all inventory movements, including purchases, sales, and adjustments.
- **Suppliers**: Manages supplier information and relationships.

### Specifications Management Section

- **Field Definitions**: Defines specification fields that can be applied to products.
- **Specification Options**: Manages predefined options for specification fields.
- **Category Field Mappings**: Maps which specification fields apply to which product categories.

## Bill Creation Process

The bill creation process in Sanity Shop follows these steps:

### 1. Bill Initialization

- A new bill document is created with an auto-generated `billId`.
- A sequential `billNumber` is assigned (e.g., BILL-2024-0001).
- Customer information is linked through references to the `user` and `address` documents.

### 2. Service Details

- The `serviceType` is selected (repair, sale, installation, maintenance, or custom).
- The `locationType` is specified (shop, home, or office).

### 3. Item Addition

Bill items are added to the bill through an array of objects, each containing:

- Product reference linking to the product document
- Product details (name, category, brand, specifications)
- Quantity and pricing information
- Unit of measurement

The system automatically calculates the total price for each item based on quantity and unit price.

### 4. Service Information

- Service dates are recorded (service date and completion date)
- Technician information is linked through a reference to the user document
- Additional charges are added (home visit fee, repair charges, transportation fee, labor charges)

### 5. Financial Calculations

The system performs automatic calculations for:

- Subtotal (sum of all item totals)
- Tax amount
- Discount amount
- Total amount

### 6. Payment Processing

- Payment status is tracked (pending, partial, paid, overdue)
- Payment method is recorded (cash, card, UPI, bank transfer, cheque)
- Paid amount and balance amount are calculated

### 7. Additional Information

- Notes for customer and internal use
- Service images with captions
- Status tracking (draft, confirmed, in progress, completed, cancelled)
- Priority assignment (low, medium, high, urgent)

### 8. Finalization

- Timestamps for creation and updates
- Reference to the user who created the bill

## Inventory Management System

The inventory management system tracks product stock levels and movements through several interconnected components:

### 1. Product Inventory

Each product document includes an `inventory` object with:

- `currentStock`: Current available quantity
- `minimumStock`: Threshold for reordering
- `maximumStock`: Maximum storage capacity
- `reorderLevel`: Quantity at which to reorder
- `location`: Storage location (main-store, warehouse-a, etc.)
- `lastStockUpdate`: Timestamp of the last inventory update

### 2. Stock Transactions

All inventory movements are recorded as `stockTransaction` documents with:

- `transactionId`: Auto-generated unique identifier
- `type`: Transaction type (purchase, sale, adjustment, return, damage)
- `product`: Reference to the affected product
- `quantity`: Amount of product involved (positive for additions, negative for reductions)
- `unitPrice` and `totalAmount`: Financial values of the transaction
- Conditional fields based on transaction type:
  - `supplier` reference for purchases
  - `bill` reference for sales
- Additional tracking fields:
  - `notes`, `batchNumber`, `expiryDate`
  - `status` (pending, completed, cancelled)
  - Timestamps and user references

### 3. Inventory Updates

When a stock transaction is created:

1. The system validates the transaction details
2. Updates the product's `currentStock` value
3. Records the transaction with appropriate references
4. Updates the `lastStockUpdate` timestamp on the product

### 4. Low Stock Alerts

The product preview in Sanity Studio shows visual indicators when:

- Current stock falls below minimum stock (🔴 Low Stock)
- Product is in stock (✅ In Stock)

### 5. Supplier Management

Suppliers are managed through `supplier` documents containing:

- Contact information and address
- Tax details (GST and PAN numbers)
- Payment terms and credit limits
- Active status indicator

## User Management

The system manages different types of users through the `user` document type:

### 1. User Types

- **Administrators**: Full access to the system with management capabilities
- **Customers**: Limited access for viewing their own bills and information

### 2. User Information

- Authentication details (`clerkId`, `customerId`, `secretKey`)
- Personal information (name, email, phone, location)
- Role assignment and active status
- Profile image
- Creation and update timestamps

### 3. Access Control

- Role-based access control determines what users can view and edit
- Inactive users cannot access the system

## Data Models

### Bill Model

The bill document includes:

- Identification fields (`billId`, `billNumber`)
- Customer references (`customer`, `customerAddress`)
- Service details (`serviceType`, `locationType`)
- Item array with product references and quantities
- Service dates and technician information
- Financial fields (charges, calculations, payment information)
- Status tracking and workflow fields
- Timestamps and user references

### Bill Item Model

Each bill item includes:

- References to the parent bill and product
- Quantity and pricing information
- Tax and discount details
- Service-specific information (description, warranty, installation requirements)
- Status tracking and timestamps

### Payment Model

Payments are tracked with:

- Identification fields (`paymentId`)
- References to the bill and customer
- Amount and payment method
- Status tracking
- Transaction details based on payment method
- Timestamps and user references

### Product Model

Products are defined with:

- Identification and basic information (`productId`, `name`, `slug`, `description`)
- Category and brand references
- Technical specifications
- Pricing information
- Inventory management data
- Product images
- Status flags (`isActive`, `isFeatured`)
- SEO fields and timestamps

### Inventory Model

The inventory object includes:

- Stock level tracking (`currentStock`, `minimumStock`, `maximumStock`)
- Reorder information (`reorderLevel`)
- Storage location
- Last update timestamp

### Stock Transaction Model

Stock transactions record:

- Transaction identification and type
- Product reference and quantity
- Pricing information
- Conditional references based on transaction type
- Additional tracking information
- Status and timestamps

## Integration Points

The system includes several integration points between different components:

### 1. Bills and Inventory

- When a bill is created with product items, corresponding stock transactions are generated
- Stock levels are automatically updated based on bill items

### 2. Bills and Payments

- Payments reference their parent bills
- Bill payment status is updated based on payment records

### 3. Products and Categories

- Products are organized into categories and subcategories
- Category field mappings determine which specification fields apply to which products

### 4. Products and Suppliers

- Stock transactions for purchases link products to suppliers
- Supplier information is used for reordering and inventory management

### 5. Users and Bills

- Bills reference customers and technicians through user documents
- User information is used for billing and service tracking

---

This documentation provides a comprehensive overview of the Sanity Shop system's structure and functionality. For more detailed information on specific components, refer to the corresponding schema files and implementation code.