/**
 * Test component for delete functionality
 * This is a temporary component to test the delete functionality
 */

import React from "react";
import { useEnhancedInventory } from "@/hooks/use-enhanced-inventory";

export function TestDelete() {
  const {
    deleteProduct,
    isDeletingProduct,
    deleteError,
    lowStockAlerts,
    inventoryValue,
  } = useEnhancedInventory();

  const handleTestDelete = async () => {
    console.log("Testing delete functionality...");
    console.log("isDeletingProduct:", isDeletingProduct);
    console.log("deleteError:", deleteError);
    console.log("lowStockAlerts:", lowStockAlerts);
    console.log("inventoryValue:", inventoryValue);
  };

  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      <h3 className="text-white mb-4">Delete Functionality Test</h3>
      <button
        onClick={handleTestDelete}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
        Test Delete Hook
      </button>
      <div className="mt-4 text-sm text-gray-300">
        <p>isDeletingProduct: {isDeletingProduct ? "true" : "false"}</p>
        <p>deleteError: {deleteError || "null"}</p>
        <p>lowStockAlerts: {lowStockAlerts.length} alerts</p>
        <p>
          inventoryValue:{" "}
          {inventoryValue ? `₹${inventoryValue.totalValue}` : "null"}
        </p>
      </div>
    </div>
  );
}
