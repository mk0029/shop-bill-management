# Inventory Management - Latest Price Logic

## Overview
The inventory management system now implements a "latest price" logic for handling duplicate items from the same brand with identical specifications.

## How It Works

### When Adding Items
1. **New Item**: If the item doesn't exist, it's created as a new product
2. **Existing Item**: If an item with the same brand, category, and specifications already exists:
   - The stock quantity is added to the existing stock
   - The purchase and selling prices are updated to the latest values
   - All existing items now use the new price for billing and other operations

### Example Scenario
- **Initial State**: 5 sockets from Brand AF at ₹90 each (Total: ₹450)
- **Adding More**: 10 more sockets from Brand AF at ₹100 each
- **Result**: 15 sockets from Brand AF at ₹100 each (Total: ₹1500)

## Technical Implementation

### Store Methods
- `findExistingProduct()`: Checks for existing products with matching specifications
- `addOrUpdateProduct()`: Handles both creation and updates with latest pricing

### Matching Criteria
Products are considered identical if they have:
- Same brand
- Same category  
- Same specifications (lightType, color, size, watts, wireGauge, amperage)

### Features
- ✅ Automatic stock consolidation
- ✅ Latest price application to all items
- ✅ Stock transaction logging
- ✅ User feedback for updates vs new items
- ✅ Maintains inventory history

## Usage
Simply add items through the normal inventory add form. The system automatically detects duplicates and applies the latest price logic.

## Benefits
- Simplified inventory management
- Always uses current market prices
- Prevents duplicate entries
- Maintains accurate stock levels
- Provides clear user feedback