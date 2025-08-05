/**
 * Enhanced Inventory Management Hook
 * Provides React hooks for inventory operations with real-time stock management
 */

import { useState, useCallback, useEffect } from "react";
import { enhancedInventoryApi, StockAlert } from "@/lib/inventory-api-enhanced";
import {
  BillItem,
  StockValidationResult,
  PriceInfo,
} from "@/lib/inventory-management";

export interface UseEnhancedInventoryReturn {
  // Stock validation
  validateStock: (items: BillItem[]) => Promise<{
    isValid: boolean;
    validationResults: StockValidationResult[];
    errors: string[];
  }>;

  // Price fetching
  fetchPrices: (productIds: string[]) => Promise<Map<string, PriceInfo>>;

  // Stock updates
  updateBillStock: (
    items: BillItem[],
    billId: string,
    operation?: "reduce" | "restore"
  ) => Promise<boolean>;

  // Product deletion (soft delete)
  deleteProduct: (
    productId: string,
    deleteConsolidated?: boolean,
    consolidatedIds?: string[]
  ) => Promise<boolean>;

  // Product restoration
  restoreProduct: (productId: string) => Promise<boolean>;

  // Stock history
  getStockHistory: (productId: string, limit?: number) => Promise<any[]>;

  // Alerts and monitoring
  lowStockAlerts: StockAlert[];
  refreshAlerts: () => Promise<void>;

  // Inventory value
  inventoryValue: {
    totalValue: number;
    totalItems: number;
    breakdown: any[];
  } | null;
  refreshInventoryValue: () => Promise<void>;

  // Loading states
  isValidating: boolean;
  isFetchingPrices: boolean;
  isUpdatingStock: boolean;
  isDeletingProduct: boolean;
  isLoadingAlerts: boolean;
  isLoadingValue: boolean;

  // Error states
  validationError: string | null;
  priceError: string | null;
  stockUpdateError: string | null;
  deleteError: string | null;
  alertsError: string | null;
  valueError: string | null;
}

export function useEnhancedInventory(): UseEnhancedInventoryReturn {
  // State
  const [lowStockAlerts, setLowStockAlerts] = useState<StockAlert[]>([]);
  const [inventoryValue, setInventoryValue] = useState<{
    totalValue: number;
    totalItems: number;
    breakdown: any[];
  } | null>(null);

  // Loading states
  const [isValidating, setIsValidating] = useState(false);
  const [isFetchingPrices, setIsFetchingPrices] = useState(false);
  const [isUpdatingStock, setIsUpdatingStock] = useState(false);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(false);
  const [isLoadingValue, setIsLoadingValue] = useState(false);

  // Error states
  const [validationError, setValidationError] = useState<string | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [stockUpdateError, setStockUpdateError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [alertsError, setAlertsError] = useState<string | null>(null);
  const [valueError, setValueError] = useState<string | null>(null);

  // Validate stock availability
  const validateStock = useCallback(async (items: BillItem[]) => {
    setIsValidating(true);
    setValidationError(null);

    try {
      const response = await enhancedInventoryApi.validateBillStock(items);

      if (!response.success) {
        setValidationError(response.error || "Failed to validate stock");
        return {
          isValid: false,
          validationResults: [],
          errors: [response.error || "Failed to validate stock"],
        };
      }

      return response.data!;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to validate stock";
      setValidationError(errorMessage);
      return {
        isValid: false,
        validationResults: [],
        errors: [errorMessage],
      };
    } finally {
      setIsValidating(false);
    }
  }, []);

  // Fetch latest prices
  const fetchPrices = useCallback(async (productIds: string[]) => {
    setIsFetchingPrices(true);
    setPriceError(null);

    try {
      const response = await enhancedInventoryApi.getLatestPrices(productIds);

      if (!response.success) {
        setPriceError(response.error || "Failed to fetch prices");
        return new Map();
      }

      return response.data!;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch prices";
      setPriceError(errorMessage);
      return new Map();
    } finally {
      setIsFetchingPrices(false);
    }
  }, []);

  // Update stock for bill
  const updateBillStock = useCallback(
    async (
      items: BillItem[],
      billId: string,
      operation: "reduce" | "restore" = "reduce"
    ) => {
      setIsUpdatingStock(true);
      setStockUpdateError(null);

      try {
        const response = await enhancedInventoryApi.processBillStockUpdate(
          items,
          billId,
          operation
        );

        if (!response.success) {
          setStockUpdateError(response.error || "Failed to update stock");
          return false;
        }

        return true;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to update stock";
        setStockUpdateError(errorMessage);
        return false;
      } finally {
        setIsUpdatingStock(false);
      }
    },
    []
  );

  // Refresh low stock alerts
  const refreshAlerts = useCallback(async () => {
    setIsLoadingAlerts(true);
    setAlertsError(null);

    try {
      const response = await enhancedInventoryApi.getLowStockAlerts();

      if (!response.success) {
        setAlertsError(response.error || "Failed to fetch alerts");
        return;
      }

      setLowStockAlerts(response.data || []);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch alerts";
      setAlertsError(errorMessage);
    } finally {
      setIsLoadingAlerts(false);
    }
  }, []);

  // Refresh inventory value
  const refreshInventoryValue = useCallback(async () => {
    setIsLoadingValue(true);
    setValueError(null);

    try {
      const response = await enhancedInventoryApi.getInventoryValue();

      if (!response.success) {
        setValueError(response.error || "Failed to fetch inventory value");
        return;
      }

      setInventoryValue(response.data || null);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to fetch inventory value";
      setValueError(errorMessage);
    } finally {
      setIsLoadingValue(false);
    }
  }, []);

  // Soft delete product
  const deleteProduct = useCallback(
    async (
      productId: string,
      deleteConsolidated: boolean = false,
      consolidatedIds?: string[]
    ) => {
      setIsDeletingProduct(true);
      setDeleteError(null);

      try {
        const response = await enhancedInventoryApi.softDeleteProduct(
          productId,
          deleteConsolidated,
          consolidatedIds
        );

        if (!response.success) {
          setDeleteError(response.error || "Failed to delete product");
          return false;
        }

        // Refresh data after successful deletion
        await Promise.all([refreshAlerts(), refreshInventoryValue()]);

        return true;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to delete product";
        setDeleteError(errorMessage);
        return false;
      } finally {
        setIsDeletingProduct(false);
      }
    },
    [refreshAlerts, refreshInventoryValue]
  );

  // Restore soft deleted product
  const restoreProduct = useCallback(
    async (productId: string) => {
      setIsDeletingProduct(true);
      setDeleteError(null);

      try {
        const response = await enhancedInventoryApi.restoreProduct(productId);

        if (!response.success) {
          setDeleteError(response.error || "Failed to restore product");
          return false;
        }

        // Refresh data after successful restoration
        await Promise.all([refreshAlerts(), refreshInventoryValue()]);

        return true;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to restore product";
        setDeleteError(errorMessage);
        return false;
      } finally {
        setIsDeletingProduct(false);
      }
    },
    [refreshAlerts, refreshInventoryValue]
  );

  // Get stock history
  const getStockHistory = useCallback(
    async (productId: string, limit: number = 50) => {
      try {
        const response = await enhancedInventoryApi.getProductStockHistory(
          productId,
          limit
        );

        if (!response.success) {
          console.error("Failed to fetch stock history:", response.error);
          return [];
        }

        return response.data || [];
      } catch (error) {
        console.error("Failed to fetch stock history:", error);
        return [];
      }
    },
    []
  );

  // Load initial data
  useEffect(() => {
    refreshAlerts();
    refreshInventoryValue();
  }, [refreshAlerts, refreshInventoryValue]);

  return {
    // Functions
    validateStock,
    fetchPrices,
    updateBillStock,
    deleteProduct,
    restoreProduct,
    getStockHistory,
    refreshAlerts,
    refreshInventoryValue,

    // Data
    lowStockAlerts,
    inventoryValue,

    // Loading states
    isValidating,
    isFetchingPrices,
    isUpdatingStock,
    isDeletingProduct,
    isLoadingAlerts,
    isLoadingValue,

    // Error states
    validationError,
    priceError,
    stockUpdateError,
    deleteError,
    alertsError,
    valueError,
  };
}

// Additional hook for stock validation in forms
export function useStockValidation() {
  const [validationResults, setValidationResults] = useState<
    StockValidationResult[]
  >([]);
  const [isValid, setIsValid] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  const validateItems = useCallback(async (items: BillItem[]) => {
    if (items.length === 0) {
      setValidationResults([]);
      setIsValid(true);
      setErrors([]);
      return true;
    }

    setIsValidating(true);

    try {
      const response = await enhancedInventoryApi.validateBillStock(items);

      if (response.success && response.data) {
        setValidationResults(response.data.validationResults);
        setIsValid(response.data.isValid);
        setErrors(response.data.errors);
        return response.data.isValid;
      } else {
        setValidationResults([]);
        setIsValid(false);
        setErrors([response.error || "Validation failed"]);
        return false;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Validation failed";
      setValidationResults([]);
      setIsValid(false);
      setErrors([errorMessage]);
      return false;
    } finally {
      setIsValidating(false);
    }
  }, []);

  const clearValidation = useCallback(() => {
    setValidationResults([]);
    setIsValid(true);
    setErrors([]);
  }, []);

  return {
    validationResults,
    isValid,
    errors,
    isValidating,
    validateItems,
    clearValidation,
  };
}
