# Bill Creation Process Documentation

## Table of Contents

1. [Overview](#overview)
2. [Bill Data Structure](#bill-data-structure)
3. [Bill Creation Workflow](#bill-creation-workflow)
4. [Calculation Logic](#calculation-logic)
5. [Payment Processing](#payment-processing)
6. [Inventory Integration](#inventory-integration)
7. [Bill Status Lifecycle](#bill-status-lifecycle)
8. [Printing and Sharing](#printing-and-sharing)

## Overview

The bill creation process is a core functionality of the Sanity Shop system, enabling the creation and management of customer bills for various electrical services and product sales. This document details the complete bill creation process, from initialization to finalization, including all data structures and business logic involved.

## Bill Data Structure

The bill document in Sanity is structured with the following key components:

### Identification Fields

- **billId**: Auto-generated unique identifier using base64 encoding of timestamp
- **billNumber**: Sequential bill number in a human-readable format (e.g., BILL-2024-0001)

### Customer Information

- **customer**: Reference to a user document (customer)
- **customerAddress**: Reference to an address document

### Service Details

- **serviceType**: Type of service (repair, sale, installation, maintenance, custom)
- **locationType**: Location where service is provided (shop, home, office)

### Bill Items

An array of objects, each containing:

- **product**: Reference to the product document
- **productName**: Display name of the product
- **category**: Product category
- **brand**: Product brand
- **specifications**: Product specifications text
- **quantity**: Number of items
- **unitPrice**: Price per unit
- **totalPrice**: Calculated as quantity × unitPrice
- **unit**: Unit of measurement (e.g., pcs, kg, m)

### Service Dates

- **serviceDate**: Date when service is scheduled/performed
- **completionDate**: Date when service is completed
- **technician**: Reference to user document (admin/technician)

### Charges

- **homeVisitFee**: Fee for visiting customer's location
- **repairCharges**: Fee for repair services
- **transportationFee**: Fee for transportation
- **laborCharges**: Charges for labor

### Calculations

- **subtotal**: Sum of all item totals
- **taxAmount**: Calculated tax amount
- **discountAmount**: Applied discount
- **totalAmount**: Final bill amount

### Payment Information

- **paymentStatus**: Status of payment (pending, partial, paid, overdue)
- **paymentMethod**: Method of payment (cash, card, UPI, bank transfer, cheque)
- **paidAmount**: Amount already paid
- **balanceAmount**: Remaining amount to be paid
- **paymentDate**: Date of payment

### Additional Information

- **notes**: Customer-visible notes
- **internalNotes**: Admin-only internal notes
- **images**: Array of service images with captions

### Status and Workflow

- **status**: Current status (draft, confirmed, in progress, completed, cancelled)
- **priority**: Priority level (low, medium, high, urgent)

### Timestamps

- **createdAt**: Creation timestamp
- **updatedAt**: Last update timestamp
- **createdBy**: Reference to user who created the bill

## Bill Creation Workflow

The bill creation process follows these sequential steps:

### 1. Bill Initialization

- System generates a unique `billId`
- User assigns a sequential `billNumber` or system generates it
- User selects an existing customer or creates a new one
- User selects customer address or adds a new one

### 2. Service Configuration

- User selects the `serviceType` from predefined options
- User specifies the `locationType` where service will be performed
- If applicable, user schedules the `serviceDate`
- User assigns a `technician` if applicable

### 3. Product Selection

For each product to be added:

- User searches and selects a product from inventory
- System populates product details (name, category, brand, specifications)
- User specifies quantity
- System retrieves unit price from product data
- System calculates total price for the item
- User can add multiple products by repeating this process

### 4. Additional Charges

- User adds any applicable `homeVisitFee`
- User adds any applicable `repairCharges`
- User adds any applicable `transportationFee`
- User adds any applicable `laborCharges`

### 5. Financial Calculations

- System calculates `subtotal` by summing all item totals
- System calculates `taxAmount` based on applicable tax rates
- User can apply a `discountAmount` if needed
- System calculates `totalAmount` as: subtotal + taxAmount - discountAmount

### 6. Payment Recording

- User sets initial `paymentStatus`
- If payment is being made, user selects `paymentMethod`
- User records `paidAmount` if any payment is made
- System calculates `balanceAmount` as: totalAmount - paidAmount
- User records `paymentDate` if applicable

### 7. Additional Information

- User adds any customer-visible `notes`
- User adds any internal `internalNotes`
- User uploads any relevant `images` with captions

### 8. Status and Priority

- User sets initial `status` (typically "draft" or "confirmed")
- User assigns `priority` level

### 9. Finalization

- System records `createdAt` timestamp
- System records `createdBy` reference to current user
- User reviews and saves the bill

## Calculation Logic

The bill includes several automatic calculations:

### Item Total Calculation

```
itemTotalPrice = quantity × unitPrice
```

### Subtotal Calculation

```
subtotal = sum(all itemTotalPrice values)
```

### Tax Calculation

Tax can be calculated in different ways depending on configuration:

1. **Flat tax rate**:
   ```
   taxAmount = subtotal × taxRate
   ```

2. **Item-specific tax rates**:
   ```
   taxAmount = sum(itemTotalPrice × itemTaxRate for each item)
   ```

### Total Amount Calculation

```
totalAmount = subtotal + taxAmount - discountAmount + homeVisitFee + repairCharges + transportationFee + laborCharges
```

### Balance Calculation

```
balanceAmount = totalAmount - paidAmount
```

## Payment Processing

The bill supports multiple payment scenarios:

### Full Payment

- `paidAmount` equals `totalAmount`
- `paymentStatus` set to "paid"
- `balanceAmount` is zero

### Partial Payment

- `paidAmount` is less than `totalAmount`
- `paymentStatus` set to "partial"
- `balanceAmount` is the difference

### No Payment

- `paidAmount` is zero
- `paymentStatus` set to "pending"
- `balanceAmount` equals `totalAmount`

### Payment Methods

The system supports various payment methods, each with specific fields:

- **Cash**: Simple record of amount
- **Card**: May include card type and transaction ID
- **UPI**: Includes transaction ID
- **Bank Transfer**: Includes bank details and reference number
- **Cheque**: Includes cheque number and bank details

## Inventory Integration

The bill creation process integrates with inventory management:

### Stock Reduction

When a bill is confirmed:

1. For each product in the bill items:
   - System creates a stock transaction of type "sale"
   - Transaction quantity is negative (reducing stock)
   - Product's current stock is updated

### Stock Validation

During product selection:

1. System checks if sufficient stock is available
2. Warns if selected quantity exceeds available stock
3. Can be configured to prevent exceeding available stock

### Reorder Alerts

After stock reduction:

1. System checks if new stock level is below reorder level
2. Generates alerts for products that need reordering

## Bill Status Lifecycle

A bill progresses through various statuses:

### Draft

- Initial status when bill is being created
- No inventory impact yet
- Can be freely modified

### Confirmed

- Bill has been reviewed and confirmed
- Inventory is updated (stock reduced)
- Limited modifications allowed

### In Progress

- Service or delivery is being performed
- Used primarily for service-type bills
- Updates can be made to reflect progress

### Completed

- Service or delivery has been completed
- All items delivered and services performed
- Payment may still be pending

### Cancelled

- Bill has been cancelled
- If inventory was already updated, system creates reversal transactions
- Reason for cancellation is typically recorded

## Printing and Sharing

The bill can be output in various formats:

### Printed Bill

- Formatted document with all customer-facing details
- Includes company information, bill details, and payment information
- Can include terms and conditions

### Digital Formats

- PDF generation for email or digital storage
- HTML format for web viewing
- Structured data export (JSON/CSV) for system integration

### Sharing Options

- Email directly to customer
- SMS notification with link to digital bill
- Print for physical delivery
- Customer portal access

---

This documentation provides a comprehensive overview of the bill creation process in the Sanity Shop system. The actual implementation may include additional features or variations based on specific business requirements.