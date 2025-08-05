# Electrician Shop Management System - API Documentation

## Overview

This document provides a comprehensive list of all APIs, data structures, and configurations available in the Electrician Shop Management System built with Sanity CMS.

## Project Configuration

- **Project ID**: idji8ni7
- **Dataset**: production
- **Title**: Electrician Shop Management

## Document Types (Main APIs)

### 1. Product API (`product`)

**Purpose**: Manage electrical products and inventory

**Key Fields**:

- `productId` (string, auto-generated) - Unique product identifier
- `name` (string, required) - Product name
- `slug` (slug, required) - URL-friendly identifier
- `description` (text) - Product description
- `brand` (reference to brand) - Product brand
- `category` (reference to category) - Product category
- `subcategory` (reference to category) - Optional subcategory
- `specifications` (specifications object) - Technical details
- `pricing` (pricing object) - Price information
- `inventory` (inventory object) - Stock management
- `images` (array of images) - Product photos
- `isActive` (boolean, default: true) - Product status
- `isFeatured` (boolean, default: false) - Featured status
- `tags` (array of strings) - Product tags
- `seoTitle` (string) - SEO title
- `seoDescription` (text) - SEO description

### 2. Brand API (`brand`)

**Purpose**: Manage product brands

**Key Fields**:

- `name` (string, required) - Brand name
- `slug` (slug, required) - URL-friendly identifier
- `logo` (image) - Brand logo
- `description` (text) - Brand description
- `contactInfo` (contactInfo object) - Contact details
- `isActive` (boolean, default: true) - Brand status

### 3. Category API (`category`)

**Purpose**: Organize products into categories

**Key Fields**:

- `name` (string, required) - Category name
- `slug` (slug, required) - URL-friendly identifier
- `description` (text) - Category description
- `icon` (string) - Lucide icon name
- `parentCategory` (reference to category) - Parent category
- `isActive` (boolean, default: true) - Category status
- `sortOrder` (number, default: 0) - Display order

**Available Icons**:

- `zap` - Electrical
- `lightbulb` - Lights
- `cable` - Wires
- `settings` - Switches
- `plug` - Sockets
- `battery` - Power
- `wrench` - Tools
- `shield` - Safety

### 4. User API (`user`)

**Purpose**: Manage customers and admin users

**Key Fields**:

- `clerkId` (string, required) - Clerk authentication ID
- `customerId` (string, auto-generated) - Customer identifier
- `secretKey` (string, auto-generated) - Customer login key
- `name` (string, required) - Full name
- `email` (string) - Email address
- `phone` (string, required) - Phone number
- `location` (string) - General location
- `role` (string, default: 'customer') - User role (admin/customer)
- `isActive` (boolean, default: true) - User status
- `profileImage` (image) - Profile picture

### 5. Address API (`address`)

**Purpose**: Manage customer addresses

**Key Fields**:

- `userId` (reference to user, required) - Associated user
- `type` (string, default: 'home') - Address type
- `addressLine1` (string, required) - Primary address
- `addressLine2` (string) - Secondary address
- `city` (string, required) - City
- `state` (string, required) - State
- `pincode` (string, required) - 6-digit pincode
- `landmark` (string) - Landmark
- `isDefault` (boolean, default: false) - Default address flag
- `coordinates` (object) - GPS coordinates

**Address Types**:

- `home` - Home address
- `shop` - Shop address
- `office` - Office address
- `other` - Other address

### 6. Supplier API (`supplier`)

**Purpose**: Manage product suppliers

**Key Fields**:

- `supplierId` (string, auto-generated) - Unique supplier ID
- `name` (string, required) - Supplier name
- `contactPerson` (string) - Contact person name
- `phone` (string, required) - Phone number
- `email` (string) - Email address
- `address` (addressObject) - Supplier address
- `gstNumber` (string) - GST registration number
- `panNumber` (string) - PAN number
- `paymentTerms` (string, default: '30_days') - Payment terms
- `creditLimit` (number, default: 0) - Credit limit
- `isActive` (boolean, default: true) - Supplier status

**Payment Terms Options**:

- `cod` - Cash on Delivery
- `15_days` - 15 Days
- `30_days` - 30 Days
- `45_days` - 45 Days
- `60_days` - 60 Days
- `advance` - Advance Payment

### 7. Bill API (`bill`)

**Purpose**: Manage customer bills and services

**Key Fields**:

- `billId` (string, auto-generated) - Unique bill ID
- `billNumber` (string, required) - Sequential bill number
- `customer` (reference to user, required) - Customer
- `customerAddress` (reference to address, required) - Service address
- `serviceType` (string, required) - Type of service
- `locationType` (string, required) - Location type
- `serviceDate` (datetime, required) - Service date
- `completionDate` (datetime) - Completion date
- `technician` (reference to user) - Assigned technician
- `homeVisitFee` (number, default: 0) - Home visit charges
- `transportationFee` (number, default: 0) - Transportation charges
- `laborCharges` (number, default: 0) - Labor charges
- `subtotal` (number, required) - Subtotal amount
- `taxAmount` (number, required) - Tax amount
- `discountAmount` (number, default: 0) - Discount amount
- `totalAmount` (number, required) - Total amount
- `paymentStatus` (string, default: 'pending') - Payment status
- `paymentMethod` (string) - Payment method
- `paidAmount` (number, default: 0) - Paid amount
- `balanceAmount` (number, default: 0) - Balance amount
- `status` (string, default: 'draft') - Bill status
- `priority` (string, default: 'medium') - Priority level

**Service Types**:

- `repair` - Repair service
- `sale` - Product sale
- `installation` - Installation service
- `maintenance` - Maintenance service
- `custom` - Custom service

**Location Types**:

- `shop` - Shop service
- `home` - Home service
- `office` - Office service

**Payment Status Options**:

- `pending` - Payment pending
- `partial` - Partial payment
- `paid` - Fully paid
- `overdue` - Payment overdue

**Bill Status Options**:

- `draft` - Draft bill
- `confirmed` - Confirmed bill
- `in_progress` - Work in progress
- `completed` - Work completed
- `cancelled` - Bill cancelled

### 8. Bill Item API (`billItem`)

**Purpose**: Manage individual items in bills

**Key Fields**:

- `bill` (reference to bill, required) - Associated bill
- `product` (reference to product, required) - Product
- `quantity` (number, required) - Item quantity
- `unitPrice` (number, required) - Unit price
- `totalPrice` (number, required) - Total price
- `discount` (number, default: 0) - Discount amount
- `taxRate` (number, required) - Tax rate percentage
- `taxAmount` (number, required) - Tax amount
- `description` (string) - Additional description
- `warranty` (string) - Warranty information
- `installationRequired` (boolean, default: false) - Installation flag
- `status` (string, default: 'pending') - Item status

**Item Status Options**:

- `pending` - Pending delivery
- `delivered` - Delivered
- `installed` - Installed
- `returned` - Returned

### 9. Payment API (`payment`)

**Purpose**: Track payment transactions

**Key Fields**:

- `paymentId` (string, auto-generated) - Unique payment ID
- `bill` (reference to bill, required) - Associated bill
- `customer` (reference to user, required) - Customer
- `amount` (number, required) - Payment amount
- `method` (string, required) - Payment method
- `status` (string, default: 'pending') - Payment status
- `transactionId` (string) - External transaction ID
- `referenceNumber` (string) - Reference number
- `bankDetails` (object) - Bank details for transfers
- `paymentDate` (datetime, required) - Payment date
- `notes` (text) - Payment notes

**Payment Methods**:

- `cash` - Cash payment
- `card` - Card payment
- `upi` - UPI payment
- `bank_transfer` - Bank transfer
- `cheque` - Cheque payment

**Payment Status Options**:

- `pending` - Payment pending
- `completed` - Payment completed
- `failed` - Payment failed
- `refunded` - Payment refunded

### 10. Stock Transaction API (`stockTransaction`)

**Purpose**: Track inventory movements

**Key Fields**:

- `transactionId` (string, auto-generated) - Unique transaction ID
- `type` (string, required) - Transaction type
- `product` (reference to product, required) - Product
- `quantity` (number, required) - Quantity (positive/negative)
- `unitPrice` (number, required) - Unit price
- `totalAmount` (number, required) - Total amount
- `supplier` (reference to supplier) - Supplier (for purchases)
- `bill` (reference to bill) - Related bill (for sales)
- `notes` (text) - Transaction notes
- `batchNumber` (string) - Batch number
- `expiryDate` (date) - Expiry date
- `status` (string, default: 'completed') - Transaction status
- `transactionDate` (datetime, required) - Transaction date

**Transaction Types**:

- `purchase` - Stock purchase
- `sale` - Stock sale
- `adjustment` - Stock adjustment
- `return` - Stock return
- `damage` - Damaged stock

### 11. Follow Up API (`followUp`)

**Purpose**: Manage customer follow-ups

**Key Fields**:

- `customer` (reference to user, required) - Customer
- `bill` (reference to bill) - Related bill
- `type` (string, required) - Follow-up type
- `priority` (string, default: 'medium') - Priority level
- `status` (string, default: 'pending') - Follow-up status
- `title` (string, required) - Follow-up title
- `description` (text, required) - Description
- `dueDate` (datetime, required) - Due date
- `completedDate` (datetime) - Completion date
- `contactMethod` (string, required) - Contact method
- `contactAttempts` (number, default: 0) - Contact attempts
- `lastContactDate` (datetime) - Last contact date
- `assignedTo` (reference to user, required) - Assigned user
- `outcome` (text) - Follow-up outcome
- `nextFollowUpDate` (datetime) - Next follow-up date

**Follow-up Types**:

- `payment_reminder` - Payment reminder
- `service_feedback` - Service feedback
- `warranty_check` - Warranty check
- `maintenance_due` - Maintenance due
- `general` - General follow-up

**Contact Methods**:

- `phone` - Phone call
- `whatsapp` - WhatsApp message
- `email` - Email
- `visit` - Physical visit

## Object Types (Data Structures)

### 1. Pricing Object (`pricing`)

**Purpose**: Product pricing information

**Fields**:

- `purchasePrice` (number, required) - Purchase price
- `sellingPrice` (number, required) - Selling price
- `standardPrice` (number) - Standard price
- `modularPrice` (number) - Modular price
- `mrp` (number) - Maximum retail price
- `discount` (number) - Discount percentage
- `taxRate` (number, default: 18) - Tax rate percentage
- `unit` (string, default: 'piece') - Unit of measurement

**Unit Options**:

- `piece` - Piece
- `meter` - Meter
- `box` - Box
- `kg` - Kilogram
- `set` - Set
- `roll` - Roll

### 2. Specifications Object (`specifications`)

**Purpose**: Technical product specifications

**Electrical Fields**:

- `voltage` (string) - Operating voltage
- `wattage` (number) - Power consumption
- `amperage` (string) - Current rating
- `loadCapacity` (number) - Load capacity in amps
- `wireGauge` (string) - Wire gauge

**Voltage Options**: 12V, 24V, 110V, 220V, 240V, 415V
**Amperage Options**: 6A, 10A, 16A, 20A, 25A, 32A
**Wire Gauge Options**: 1.0mm, 1.5mm, 2.5mm, 4.0mm, 6.0mm, 10.0mm

**Light Fields**:

- `lightType` (string) - Type of light
- `color` (string) - Light color
- `lumens` (number) - Light output

**Light Types**: LED, Bulb, Tube Light, Panel Light, Concealed Light
**Colors**: White, Warm White, Cool White, Yellow, Multicolor

**Physical Fields**:

- `size` (string) - Product size
- `weight` (number) - Weight in grams
- `material` (string) - Material type
- `modal` (string) - Model number
- `modular` (boolean, default: false) - Modular availability

**Size Options**: 1ft, 2ft, 3ft, 4ft, Small, Medium, Large
**Materials**: Plastic, Metal, Copper, Aluminum, PVC, Ceramic

**Warranty Fields**:

- `hasWarranty` (boolean, default: false) - Warranty availability
- `warrantyMonths` (number) - Warranty period in months

**Certifications**:

- `certifications` (array) - Product certifications

**Certification Options**: ISI Mark, BIS, CE, RoHS, ISO 9001

### 3. Inventory Object (`inventory`)

**Purpose**: Stock management information

**Fields**:

- `currentStock` (number, required, default: 0) - Current stock level
- `minimumStock` (number, required, default: 5) - Minimum stock level
- `maximumStock` (number) - Maximum stock level
- `reorderLevel` (number, default: 10) - Reorder level
- `location` (string) - Storage location
- `lastStockUpdate` (datetime) - Last update timestamp

**Storage Locations**:

- `main-store` - Main Store
- `warehouse-a` - Warehouse A
- `warehouse-b` - Warehouse B
- `display` - Display Area
- `back-room` - Back Room

### 4. Contact Info Object (`contactInfo`)

**Purpose**: Contact information structure

**Fields**:

- `phone` (string) - Phone number
- `email` (string) - Email address
- `website` (url) - Website URL
- `address` (text) - Address

### 5. Address Object (`addressObject`)

**Purpose**: Address information structure

**Fields**:

- `addressLine1` (string, required) - Primary address line
- `addressLine2` (string) - Secondary address line
- `city` (string, required) - City
- `state` (string, required) - State
- `pincode` (string, required) - 6-digit pincode
- `landmark` (string) - Landmark
- `coordinates` (object) - GPS coordinates
  - `lat` (number) - Latitude
  - `lng` (number) - Longitude

## Color Schemes and UI Elements

### Status Colors

- **Active/Success**: Green (✅)
- **Inactive/Error**: Red (❌)
- **Warning/Pending**: Yellow (⏳)
- **Info**: Blue (ℹ️)

### Priority Colors

- **Low**: Green (🟢)
- **Medium**: Yellow (🟡)
- **High**: Orange (🟠)
- **Urgent**: Red (🔴)

### Category Icons

- **Electrical**: ⚡ (zap)
- **Lights**: 💡 (lightbulb)
- **Wires**: 🔌 (cable)
- **Switches**: ⚙️ (settings)
- **Sockets**: 🔌 (plug)
- **Power**: 🔋 (battery)
- **Tools**: 🔧 (wrench)
- **Safety**: 🛡️ (shield)

### Service Type Icons

- **Repair**: 🔧
- **Sale**: 💰
- **Installation**: ⚡
- **Maintenance**: 🛠️
- **Custom**: 📋

## Storage Locations

### Available Storage Areas

1. **Main Store** (`main-store`) - Primary storage area
2. **Warehouse A** (`warehouse-a`) - Secondary storage
3. **Warehouse B** (`warehouse-b`) - Additional storage
4. **Display Area** (`display`) - Customer-facing display
5. **Back Room** (`back-room`) - Back office storage

## Units of Measurement

### Available Units

- **Piece** (`piece`) - Individual items
- **Meter** (`meter`) - Length measurement
- **Box** (`box`) - Boxed items
- **Kilogram** (`kg`) - Weight measurement
- **Set** (`set`) - Item sets
- **Roll** (`roll`) - Rolled materials

## Default Values Summary

### Numeric Fields (Set to 0 by default)

- All pricing amounts (purchase, selling, standard, modular, MRP)
- Discount percentages
- Stock quantities (current, minimum, maximum, reorder)
- Weight specifications
- Wattage and load capacity
- Lumens output
- All bill amounts (fees, charges, totals)
- Payment amounts
- Contact attempts
- Warranty months

### Boolean Fields

- `isActive`: true (for brands, categories, users, suppliers)
- `isFeatured`: false (for products)
- `modular`: false (for specifications)
- `hasWarranty`: false (for specifications)
- `isDefault`: false (for addresses)
- `installationRequired`: false (for bill items)

### String Fields with Defaults

- `role`: 'customer' (for users)
- `unit`: 'piece' (for pricing)
- `type`: 'home' (for addresses)
- `paymentTerms`: '30_days' (for suppliers)
- `taxRate`: 18 (for pricing)
- `serviceType`: required field
- `paymentStatus`: 'pending'
- `status`: varies by document type

## API Endpoints Structure

When using Sanity's APIs, the typical structure follows:

```
GET /v1/data/query/{dataset}
POST /v1/data/mutate/{dataset}
GET /v1/assets/images/{projectId}/{dataset}
```

## Query Examples

### Get All Active Products

```groq
*[_type == "product" && isActive == true] {
  _id,
  name,
  slug,
  brand->{name},
  category->{name},
  pricing,
  inventory,
  images
}
```

### Get Bills by Customer

```groq
*[_type == "bill" && customer._ref == $customerId] {
  _id,
  billNumber,
  serviceType,
  totalAmount,
  paymentStatus,
  status
}
```

This documentation provides a comprehensive overview of all available APIs, data structures, colors, units, storage locations, and default configurations in your Electrician Shop Management System.
