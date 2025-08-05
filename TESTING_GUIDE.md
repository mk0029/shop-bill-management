# Testing Guide - Latest Price Logic

## How to Test the Inventory Latest Price Feature

### Test Scenario 1: Adding Same Item with Different Prices

1. **Step 1: Add Initial Item**
   - Go to `/admin/inventory/add`
   - Fill in the form:
     - Category: Socket
     - Brand: AF (or any brand)
     - Purchase Price: 90
     - Selling Price: 95
     - Current Stock: 5
     - Unit: pcs
   - Click "Add to List" then "Submit All"
   - ✅ Should create new item successfully

2. **Step 2: Add Same Item with New Price**
   - Go to `/admin/inventory/add` again
   - Fill in the EXACT same specifications:
     - Category: Socket
     - Brand: AF (same brand as before)
     - Same specifications (if any)
     - Purchase Price: 100 (NEW PRICE)
     - Selling Price: 105 (NEW PRICE)
     - Current Stock: 10 (ADDITIONAL STOCK)
     - Unit: pcs
   - Click "Add to List" then "Submit All"
   - ✅ Should show "Item Updated" popup instead of "Item Added"
   - ✅ Should show total stock: 15 pcs
   - ✅ Should show latest price: ₹105

3. **Step 3: Verify in Inventory List**
   - Go to `/admin/inventory`
   - Find the socket item
   - ✅ Should show 15 pcs in stock
   - ✅ Should show selling price as ₹105
   - ✅ Should show purchase price as ₹100
   - ✅ Total value should be 15 × ₹100 = ₹1500

### Test Scenario 2: Different Specifications (Should Create New Item)

1. **Add Similar Item with Different Specs**
   - Category: Socket (same)
   - Brand: AF (same)
   - Ampere: 16A (if previous was 6A)
   - Price: ₹120
   - Stock: 8
   - ✅ Should create NEW item (different specifications)

### Test Scenario 3: Different Brand (Should Create New Item)

1. **Add Same Specs with Different Brand**
   - Category: Socket (same)
   - Brand: Havells (different brand)
   - Same specifications as first test
   - Price: ₹110
   - Stock: 7
   - ✅ Should create NEW item (different brand)

## Expected Console Logs

When testing, open browser DevTools Console to see debug logs:

```
🚀 Starting addOrUpdateProduct with: {productData}
🔍 Looking for existing product with: {search criteria}
🔍 Comparing with product: {existing product details}
🔍 Spec lightType: existing=undefined, new=undefined, match=true
🔍 Spec color: existing=undefined, new=undefined, match=true
...
✅ Found existing product: Socket - AF
```

## Troubleshooting

### If Items Are Not Being Detected as Duplicates:
1. Check console logs for specification comparison
2. Ensure brand IDs match (not just names)
3. Verify category IDs match
4. Check that all specifications are exactly the same

### If Updates Are Not Working:
1. Check network tab for API calls
2. Verify Sanity database permissions
3. Check console for error messages

## Success Indicators

- ✅ "Item Updated" popup appears for duplicates
- ✅ "Item Added" popup appears for new items
- ✅ Stock quantities are combined correctly
- ✅ Latest prices are applied to all items
- ✅ Inventory list shows updated values
- ✅ Console logs show the matching process

## Database Verification

In Sanity Studio, check:
1. Only one product document exists for the same item
2. Stock quantity reflects the total
3. Prices reflect the latest values
4. Stock transactions are logged correctly