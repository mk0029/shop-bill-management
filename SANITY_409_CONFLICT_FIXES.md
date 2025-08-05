# Sanity 409 Conflict Error Fixes

## 🐛 Problem

Getting 409 Conflict errors when trying to delete products from Sanity:
```
https://idji8ni7.api.sanity.io/v2024-01-01/data/mutate/production
Status Code: 409 Conflict
```

This typically occurs when:
1. Product has references from other documents (bills, transactions)
2. Concurrent modifications are happening
3. Document is being referenced by other operations

## 🔧 Solutions Implemented

### 1. **Enhanced Reference Checking**

Added comprehensive reference validation before deletion:

```typescript
// Check all types of references
const productInfo = await sanityClient.fetch(`
  *[_type == "product" && _id == $id][0] {
    _id,
    name,
    inventory { currentStock },
    "activeTransactions": count(*[_type == "stockTransaction" && product._ref == $id && status == "pending"]),
    "pendingBills": count(*[_type == "bill" && items[].product._ref == $id && status in ["draft", "confirmed", "in_progress"]]),
    "completedTransactions": count(*[_type == "stockTransaction" && product._ref == $id && status == "completed"]),
    "allBillItems": count(*[_type == "bill" && items[].product._ref == $id])
  }
`, { id });
```

### 2. **Retry Logic with Exponential Backoff**

Implemented retry mechanism for transient conflicts:

```typescript
let deleteSuccess = false;
let deleteAttempts = 0;
const maxAttempts = 3;

while (!deleteSuccess && deleteAttempts < maxAttempts) {
  try {
    deleteAttempts++;
    
    // Use transaction for atomicity
    const transaction = sanityClient.transaction();
    transaction.delete(id);
    await transaction.commit();
    
    deleteSuccess = true;
  } catch (deleteError) {
    if (deleteAttempts >= maxAttempts) {
      // Handle final failure
    } else {
      // Wait before retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, 1000 * deleteAttempts));
    }
  }
}
```

### 3. **Transaction-based Operations**

Using Sanity transactions to ensure atomicity:

```typescript
const transaction = sanityClient.transaction();

// Create audit trail
transaction.create(auditTransaction);

// Delete product
transaction.delete(productId);

// Commit all changes atomically
await transaction.commit();
```

### 4. **Reference Checking API**

Added new API function to check what's blocking deletion:

```typescript
async checkProductReferences(productId: string): Promise<{
  canDelete: boolean;
  references: {
    activeTransactions: number;
    pendingBills: number;
    completedTransactions: number;
    allBills: number;
  };
  blockingReasons: string[];
}>
```

### 5. **Force Delete Option**

Added force delete for admin use (with caution):

```typescript
async forceDeleteProduct(productId: string): Promise<InventoryApiResponse> {
  // Deletes all related transactions and the product
  // Use with extreme caution
}
```

### 6. **Enhanced UI Feedback**

Updated delete confirmation dialog to show:
- Reference checking status
- Blocking reasons
- Retry options
- Clear error messages

## 🎯 Key Improvements

### Better Error Handling:
```typescript
if (deleteError instanceof Error && deleteError.message.includes('409')) {
  errors.push(
    `Cannot delete ${productInfo.name}: Product is referenced by other documents. Please remove all references first.`
  );
} else {
  errors.push(
    `Failed to delete ${productInfo.name} after ${maxAttempts} attempts: ${deleteError.message}`
  );
}
```

### User-Friendly Messages:
- "Cannot delete: Has 3 pending transactions"
- "Cannot delete: Has 2 pending bills"
- "Product is referenced by other documents"

### Proactive Prevention:
- Check references before attempting deletion
- Show blocking reasons in UI
- Provide recheck option
- Disable delete button when blocked

## 🔄 Workflow

### New Delete Process:
1. **Reference Check** → Validate no blocking references
2. **User Confirmation** → Show detailed information
3. **Audit Trail** → Create transaction record
4. **Atomic Delete** → Use transaction for consistency
5. **Retry Logic** → Handle transient conflicts
6. **Error Handling** → Provide clear feedback

### UI Flow:
1. User clicks delete → Modal opens
2. System checks references → Shows status
3. If blocked → Shows reasons + recheck button
4. If clear → Shows delete button
5. User confirms → Deletion proceeds with retries
6. Success/Error → Clear feedback provided

## 📋 Files Modified

### 1. `src/lib/inventory-api-enhanced.ts`
- ✅ Enhanced `deleteProduct()` with retry logic
- ✅ Added `checkProductReferences()` function
- ✅ Added `forceDeleteProduct()` for admin use
- ✅ Improved error handling and messaging

### 2. `src/components/inventory/delete-confirmation.tsx`
- ✅ Added reference checking on modal open
- ✅ Shows blocking reasons in UI
- ✅ Disables delete when blocked
- ✅ Provides recheck functionality

### 3. `SANITY_409_CONFLICT_FIXES.md` (New)
- ✅ Complete documentation of fixes

## 🧪 Testing Scenarios

### Test Cases:
1. **Clean Delete** → Product with no references
2. **Blocked Delete** → Product with pending bills/transactions
3. **Retry Success** → Transient conflict resolved on retry
4. **Permanent Block** → References that prevent deletion
5. **Force Delete** → Admin override (testing only)

### Expected Behaviors:
- ✅ Clean products delete successfully
- ✅ Blocked products show clear reasons
- ✅ Transient conflicts resolve with retries
- ✅ Permanent blocks prevent deletion
- ✅ UI provides clear feedback throughout

## 🚨 Important Notes

### Force Delete Warning:
The `forceDeleteProduct()` function should be used with extreme caution as it:
- Deletes all related stock transactions
- May leave bills with invalid product references
- Could cause data inconsistency
- Should only be used by administrators

### Reference Types:
- **Blocking**: Pending transactions, pending bills
- **Non-blocking**: Completed transactions, completed bills
- **Audit**: All operations create audit trails

## 🎉 Expected Results

After these fixes:
- ✅ 409 conflicts should be rare and handled gracefully
- ✅ Users get clear feedback about why deletion failed
- ✅ Retry logic handles transient issues automatically
- ✅ Reference checking prevents most conflicts proactively
- ✅ Audit trails maintain data integrity
- ✅ UI provides excellent user experience

The system now handles Sanity conflicts intelligently while maintaining data integrity and providing clear user feedback.