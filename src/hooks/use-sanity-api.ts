import React, { useState, useCallback, useEffect } from 'react';
import { sanityApiService, ApiResponse } from '../lib/sanity-api-service';

// Hook state interface
interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// Hook return interface
interface ApiHookReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  execute: (...args: any[]) => Promise<void>;
  reset: () => void;
}

// Generic hook for API operations
function useApiOperation<T>(
  operation: (...args: any[]) => Promise<ApiResponse<T>>
): ApiHookReturn<T> {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (...args: any[]) => {
      setState(prev => ({ ...prev, loading: true, error: null }));
      try {
        const response = await operation(...args);
        if (response.success) {
          setState({
            data: response.data,
            loading: false,
            error: null,
          });
        } else {
          setState({
            data: null,
            loading: false,
            error: response.error || 'Operation failed',
          });
        }
      } catch (error) {
        setState({
          data: null,
          loading: false,
          error: error instanceof Error ? error.message : 'An error occurred',
        });
      }
    },
    [operation]
  );

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

// User API Hooks
export const useUsers = () => {
  const getAllUsers = useApiOperation(sanityApiService.users.getAllUsers);
  const getCustomers = useApiOperation(sanityApiService.users.getCustomers);
  const getUserById = useApiOperation(sanityApiService.users.getUserById);
  const getUserByCustomerId = useApiOperation(sanityApiService.users.getUserByCustomerId);
  const createUser = useApiOperation(sanityApiService.users.createUser);
  const updateUser = useApiOperation(sanityApiService.users.updateUser);
  const deleteUser = useApiOperation(sanityApiService.users.deleteUser);

  return {
    getAllUsers,
    getCustomers,
    getUserById,
    getUserByCustomerId,
    createUser,
    updateUser,
    deleteUser,
  };
};

// Product API Hooks
export const useProducts = () => {
  const getAllProducts = useApiOperation(sanityApiService.products.getAllProducts);
  const getActiveProducts = useApiOperation(sanityApiService.products.getActiveProducts);
  const getProductById = useApiOperation(sanityApiService.products.getProductById);
  const createProduct = useApiOperation(sanityApiService.products.createProduct);
  const updateProduct = useApiOperation(sanityApiService.products.updateProduct);
  const deleteProduct = useApiOperation(sanityApiService.products.deleteProduct);

  return {
    getAllProducts,
    getActiveProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
  };
};

// Brand API Hooks
export const useBrands = () => {
  const getAllBrands = useApiOperation(sanityApiService.brands.getAllBrands);
  const getBrandById = useApiOperation(sanityApiService.brands.getBrandById);
  const createBrand = useApiOperation(sanityApiService.brands.createBrand);
  const updateBrand = useApiOperation(sanityApiService.brands.updateBrand);
  const deleteBrand = useApiOperation(sanityApiService.brands.deleteBrand);

  return {
    getAllBrands,
    getBrandById,
    createBrand,
    updateBrand,
    deleteBrand,
  };
};

// Category API Hooks
export const useCategories = () => {
  const getAllCategories = useApiOperation(sanityApiService.categories.getAllCategories);
  const getCategoryById = useApiOperation(sanityApiService.categories.getCategoryById);
  const createCategory = useApiOperation(sanityApiService.categories.createCategory);
  const updateCategory = useApiOperation(sanityApiService.categories.updateCategory);
  const deleteCategory = useApiOperation(sanityApiService.categories.deleteCategory);

  return {
    getAllCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory,
  };
};

// Bill API Hooks
export const useBills = () => {
  const getAllBills = useApiOperation(sanityApiService.bills.getAllBills);
  const getBillById = useApiOperation(sanityApiService.bills.getBillById);
  const getCustomerBills = useApiOperation(sanityApiService.bills.getCustomerBills);
  const createBill = useApiOperation(sanityApiService.bills.createBill);
  const updateBill = useApiOperation(sanityApiService.bills.updateBill);
  const deleteBill = useApiOperation(sanityApiService.bills.deleteBill);

  return {
    getAllBills,
    getBillById,
    getCustomerBills,
    createBill,
    updateBill,
    deleteBill,
  };
};

// Stock Transaction API Hooks
export const useStockTransactions = () => {
  const getAllStockTransactions = useApiOperation(sanityApiService.stockTransactions.getAllStockTransactions);
  const getStockTransactionById = useApiOperation(sanityApiService.stockTransactions.getStockTransactionById);
  const createStockTransaction = useApiOperation(sanityApiService.stockTransactions.createStockTransaction);
  const updateStockTransaction = useApiOperation(sanityApiService.stockTransactions.updateStockTransaction);
  const deleteStockTransaction = useApiOperation(sanityApiService.stockTransactions.deleteStockTransaction);

  return {
    getAllStockTransactions,
    getStockTransactionById,
    createStockTransaction,
    updateStockTransaction,
    deleteStockTransaction,
  };
};

// Payment API Hooks
export const usePayments = () => {
  const getAllPayments = useApiOperation(sanityApiService.payments.getAllPayments);
  const getPaymentById = useApiOperation(sanityApiService.payments.getPaymentById);
  const createPayment = useApiOperation(sanityApiService.payments.createPayment);
  const updatePayment = useApiOperation(sanityApiService.payments.updatePayment);
  const deletePayment = useApiOperation(sanityApiService.payments.deletePayment);

  return {
    getAllPayments,
    getPaymentById,
    createPayment,
    updatePayment,
    deletePayment,
  };
};

// Address API Hooks
export const useAddresses = () => {
  const getAllAddresses = useApiOperation(sanityApiService.addresses.getAllAddresses);
  const getCustomerAddresses = useApiOperation(sanityApiService.addresses.getCustomerAddresses);
  const createAddress = useApiOperation(sanityApiService.addresses.createAddress);
  const updateAddress = useApiOperation(sanityApiService.addresses.updateAddress);
  const deleteAddress = useApiOperation(sanityApiService.addresses.deleteAddress);

  return {
    getAllAddresses,
    getCustomerAddresses,
    createAddress,
    updateAddress,
    deleteAddress,
  };
};

// Follow-up API Hooks
export const useFollowUps = () => {
  const getAllFollowUps = useApiOperation(sanityApiService.followUps.getAllFollowUps);
  const getFollowUpById = useApiOperation(sanityApiService.followUps.getFollowUpById);
  const createFollowUp = useApiOperation(sanityApiService.followUps.createFollowUp);
  const updateFollowUp = useApiOperation(sanityApiService.followUps.updateFollowUp);
  const deleteFollowUp = useApiOperation(sanityApiService.followUps.deleteFollowUp);

  return {
    getAllFollowUps,
    getFollowUpById,
    createFollowUp,
    updateFollowUp,
    deleteFollowUp,
  };
};

// Supplier API Hooks
export const useSuppliers = () => {
  const getAllSuppliers = useApiOperation(sanityApiService.suppliers.getAllSuppliers);
  const getSupplierById = useApiOperation(sanityApiService.suppliers.getSupplierById);
  const createSupplier = useApiOperation(sanityApiService.suppliers.createSupplier);
  const updateSupplier = useApiOperation(sanityApiService.suppliers.updateSupplier);
  const deleteSupplier = useApiOperation(sanityApiService.suppliers.deleteSupplier);

  return {
    getAllSuppliers,
    getSupplierById,
    createSupplier,
    updateSupplier,
    deleteSupplier,
  };
};

// Combined hook for all API services
export const useSanityApi = () => {
  return {
    users: useUsers(),
    products: useProducts(),
    brands: useBrands(),
    categories: useCategories(),
    bills: useBills(),
    stockTransactions: useStockTransactions(),
    payments: usePayments(),
    addresses: useAddresses(),
    followUps: useFollowUps(),
    suppliers: useSuppliers(),
  };
};

// Utility hook for data fetching with automatic execution
export const useDataFetch = <T>(
  fetchFunction: () => Promise<ApiResponse<T>>,
  dependencies: any[] = []
) => {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetchFunction();
      if (response.success) {
        setState({
          data: response.data,
          loading: false,
          error: null,
        });
      } else {
        setState({
          data: null,
          loading: false,
          error: response.error || 'Failed to fetch data',
        });
      }
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error.message : 'An error occurred',
      });
    }
  }, [fetchFunction]);

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    fetchData();
  }, [fetchData, ...dependencies]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    ...state,
    refetch,
  };
}; 