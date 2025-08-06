# Inventory Management System Documentation

## Table of Contents

1. [Overview](#overview)
2. [Data Structure](#data-structure)
3. [Stock Transaction Types](#stock-transaction-types)
4. [Inventory Workflows](#inventory-workflows)
5. [Stock Level Management](#stock-level-management)
6. [Reporting and Analytics](#reporting-and-analytics)
7. [Integration Points](#integration-points)
8. [Best Practices](#best-practices)

## Overview

The Inventory Management System in Sanity Shop provides comprehensive tools for tracking and managing product stock levels, recording all inventory movements, and maintaining accurate stock valuations. This system ensures that the business always has visibility into current inventory status, can track historical movements, and can make informed purchasing decisions.

## Data Structure

The inventory management system is built around several key data structures:

### Inventory Object

Embedded within each product document, the inventory object contains:

- **currentStock**: Current available quantity of the product
- **minimumStock**: Threshold quantity that triggers reorder alerts
- **maximumStock**: Maximum storage capacity for the product
- **reorderLevel**: Quantity at which to reorder the product
- **location**: Storage location (main-store, warehouse-a, etc.)
- **lastStockUpdate**: Timestamp of the last inventory update

### Stock Transaction Document

Each inventory movement is recorded as a separate document with:

- **transactionId**: Auto-generated unique identifier
- **type**: Transaction type (purchase, sale, adjustment, return, damage)
- **product**: Reference to the affected product
- **quantity**: Amount of product involved (positive for additions, negative for reductions)
- **unitPrice**: Price per unit for this transaction
- **totalAmount**: Total financial value of the transaction
- **supplier**: Reference to supplier (for purchase transactions)
- **bill**: Reference to bill (for sale transactions)
- **notes**: Additional information about the transaction
- **batchNumber**: Batch or lot number for tracking
- **expiryDate**: Expiration date if applicable
- **status**: Transaction status (pending, completed, cancelled)
- **transactionDate**: Date when the transaction occurred
- **createdAt**: Creation timestamp
- **createdBy**: Reference to user who created the transaction

### Product Document

The product document includes inventory-related fields:

- **inventory**: The inventory object described above
- **pricing**: Pricing information including purchase and selling prices

### Supplier Document

Suppliers are tracked with:

- **supplierId**: Unique identifier
- **name**: Supplier name
- **contactPerson**: Primary contact
- **phone**: Contact number
- **email**: Email address
- **address**: Physical address
- **gstNumber**: GST registration number
- **panNumber**: PAN number
- **paymentTerms**: Payment terms (COD, 30 days, etc.)
- **creditLimit**: Maximum credit amount
- **isActive**: Active status indicator

## Stock Transaction Types

The system supports several types of stock transactions:

### Purchase

- **Purpose**: Record new stock received from suppliers
- **Effect**: Increases product stock
- **Required Fields**: product, quantity (positive), unitPrice, supplier
- **Optional Fields**: batchNumber, expiryDate
- **Process**:
  1. Create transaction with purchase details
  2. Update product's currentStock by adding quantity
  3. Update lastStockUpdate timestamp

### Sale

- **Purpose**: Record stock sold to customers
- **Effect**: Decreases product stock
- **Required Fields**: product, quantity (negative), unitPrice, bill
- **Process**:
  1. Create transaction with sale details
  2. Update product's currentStock by subtracting quantity
  3. Update lastStockUpdate timestamp

### Adjustment

- **Purpose**: Correct inventory discrepancies
- **Effect**: Increases or decreases stock based on adjustment
- **Required Fields**: product, quantity (positive or negative), notes
- **Process**:
  1. Create transaction with adjustment details and reason
  2. Update product's currentStock by adding/subtracting quantity
  3. Update lastStockUpdate timestamp

### Return

- **Purpose**: Record products returned by customers
- **Effect**: Increases product stock
- **Required Fields**: product, quantity (positive), bill (optional)
- **Process**:
  1. Create transaction with return details
  2. Update product's currentStock by adding quantity
  3. Update lastStockUpdate timestamp

### Damage

- **Purpose**: Record damaged or expired inventory
- **Effect**: Decreases product stock
- **Required Fields**: product, quantity (negative), notes
- **Process**:
  1. Create transaction with damage details and reason
  2. Update product's currentStock by subtracting quantity
  3. Update lastStockUpdate timestamp

## Inventory Workflows

The inventory management system supports several key workflows:

### Stock Receipt Workflow

1. **Purchase Order Creation** (optional)
   - Create purchase order with expected products and quantities
   - Assign to specific supplier

2. **Stock Receipt**
   - Record actual received quantities
   - Enter purchase prices
   - Record batch numbers and expiry dates if applicable
   - Create purchase transactions

3. **Quality Check** (optional)
   - Verify received products meet quality standards
   - Adjust quantities if necessary

4. **Stock Placement**
   - Assign storage locations
   - Update inventory records

### Sales Workflow

1. **Bill Creation**
   - Add products to customer bill
   - Specify quantities

2. **Stock Validation**
   - System checks if sufficient stock is available
   - Warns if quantity exceeds available stock

3. **Stock Reduction**
   - When bill is confirmed, create sale transactions
   - Update product stock levels

### Inventory Audit Workflow

1. **Physical Count Preparation**
   - Generate count sheets by location
   - Freeze transactions during count (optional)

2. **Physical Count**
   - Record actual quantities found

3. **Discrepancy Resolution**
   - Compare system quantities with physical count
   - Investigate significant discrepancies

4. **Adjustment Transactions**
   - Create adjustment transactions to reconcile differences
   - Document reasons for adjustments

### Returns Workflow

1. **Return Receipt**
   - Record returned products
   - Assess condition

2. **Stock Update**
   - Create return transactions
   - Update product stock levels

3. **Customer Refund** (if applicable)
   - Process refund or credit

## Stock Level Management

The system provides tools for proactive stock level management:

### Reorder Management

- **Automatic Alerts**: System identifies products below reorder level
- **Reorder List**: Consolidated view of products needing reordering
- **Suggested Order Quantities**: Calculated based on usage patterns and min/max levels

### Stock Level Indicators

Products are visually categorized by stock status:

- **Normal Stock**: Current stock is above minimum stock level
- **Low Stock**: Current stock is at or below minimum stock but above zero
- **Out of Stock**: Current stock is zero
- **Overstock**: Current stock is at or above maximum stock level

### Location Management

- **Multi-location Support**: Track inventory across different physical locations
- **Transfer Transactions**: Record movement between locations
- **Location-specific Reporting**: View stock levels by location

## Reporting and Analytics

The inventory system provides several reports and analytics tools:

### Inventory Valuation Reports

- **Current Valuation**: Total value of inventory at current purchase prices
- **Historical Valuation**: Inventory value trends over time
- **FIFO/LIFO Valuation**: Alternative valuation methods based on transaction history

### Movement Analysis

- **Product Movement**: Frequency and volume of transactions by product
- **Slow-moving Items**: Products with minimal movement over time
- **Fast-moving Items**: Products with high transaction frequency

### Supplier Analysis

- **Supplier Performance**: Delivery times, quality issues, pricing trends
- **Purchase History**: Historical purchasing patterns by supplier
- **Price Comparison**: Compare pricing across suppliers for the same products

### Inventory Health Metrics

- **Stock Turn Ratio**: Rate at which inventory is sold and replaced
- **Days of Supply**: How long current stock will last based on usage rate
- **Stockout Frequency**: How often products reach zero stock

## Integration Points

The inventory system integrates with other system components:

### Integration with Billing System

- **Automatic Stock Reduction**: Stock is automatically reduced when bills are created
- **Availability Check**: Product availability is verified during bill creation
- **Return Processing**: Returns from customers update inventory

### Integration with Supplier Management

- **Purchase Transactions**: Link to supplier records
- **Supplier Performance**: Track delivery times and quality issues
- **Reorder Automation**: Generate purchase orders based on reorder levels

### Integration with Reporting System

- **Financial Reports**: Inventory valuation feeds into financial reporting
- **Sales Analysis**: Combine sales data with inventory movement
- **Profitability Analysis**: Calculate margins based on purchase and selling prices

## Best Practices

Recommended practices for effective inventory management:

### Regular Auditing

- Conduct full physical inventory counts at least annually
- Implement cycle counting for high-value or fast-moving items
- Document and investigate discrepancies promptly

### Data Accuracy

- Train staff on proper transaction recording
- Implement barcode scanning where possible
- Validate unusual transactions (large quantities, extreme prices)

### Stock Optimization

- Regularly review and adjust minimum and maximum stock levels
- Analyze seasonal patterns and adjust accordingly
- Identify and address slow-moving inventory

### Security Measures

- Implement role-based access for inventory transactions
- Require approval for large adjustments or high-value transactions
- Maintain audit trail of all inventory changes

### Process Documentation

- Document standard operating procedures for all inventory workflows
- Create clear guidelines for special cases (returns, damages, etc.)
- Regularly train staff on proper procedures

---

This documentation provides a comprehensive overview of the inventory management system in Sanity Shop. The actual implementation may include additional features or variations based on specific business requirements.