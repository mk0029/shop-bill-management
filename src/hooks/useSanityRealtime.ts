import { useEffect } from "react";
import { useDataStore } from "@/store/data-store";
import { useBrandStore } from "@/store/brand-store";
import { useCategoryStore } from "@/store/category-store";
import { useInventoryStore } from "@/store/inventory-store";

// Main hook for accessing all real-time functionality
export const useSanityRealtime = () => {
  const dataStore = useDataStore();
  const brandStore = useBrandStore();
  const categoryStore = useCategoryStore();
  const inventoryStore = useInventoryStore();

  return {
    // Connection status
    isConnected:
      dataStore.isRealtimeConnected &&
      brandStore.isRealtimeConnected &&
      categoryStore.isRealtimeConnected,

    // Individual store connections
    connections: {
      data: dataStore.isRealtimeConnected,
      brands: brandStore.isRealtimeConnected,
      categories: categoryStore.isRealtimeConnected,
    },

    // Data access
    data: {
      brands: Array.from(dataStore.brands.values()),
      categories: Array.from(dataStore.categories.values()),
      products: Array.from(dataStore.products.values()),
      users: Array.from(dataStore.users.values()),
      bills: Array.from(dataStore.bills.values()),
    },

    // Store methods
    stores: {
      data: dataStore,
      brands: brandStore,
      categories: categoryStore,
      inventory: inventoryStore,
    },
  };
};

// Hook for listening to specific document type changes
export const useSanityDocumentListener = (
  documentType: "bill" | "product" | "user" | "brand" | "category",
  callback: (update: any) => void
) => {
  const { stores } = useSanityRealtime();

  useEffect(() => {
    // This is a simplified approach - in a real implementation,
    // you might want to create a more sophisticated event system
    console.log(`Setting up listener for ${documentType} changes`);

    // For now, we rely on the stores' built-in real-time updates
    // The callback would be triggered through the store's real-time handlers

    return () => {
      console.log(`Cleaning up listener for ${documentType} changes`);
    };
  }, [documentType, callback]);
};

// Hook for real-time data operations
export const useSanityOperations = () => {
  const { stores } = useSanityRealtime();

  return {
    // Brand operations
    brands: {
      create: stores.brands.addBrand,
      update: stores.brands.updateBrand,
      delete: stores.brands.deleteBrand,
      getById: stores.brands.getBrandById,
      getActive: stores.brands.getActiveBrands,
    },

    // Category operations
    categories: {
      getById: stores.categories.getCategoryById,
      getByName: stores.categories.getCategoryByName,
      getActive: stores.categories.getActiveCategories,
      getMain: stores.categories.getMainCategories,
      getSub: stores.categories.getSubCategories,
    },

    // Data store operations
    data: {
      createProduct: stores.data.createProduct,
      updateProduct: stores.data.updateProduct,
      deleteProduct: stores.data.deleteProduct,
      createBill: stores.data.createBill,
      updateBill: stores.data.updateBill,
      createUser: stores.data.createUser,
      updateUser: stores.data.updateUser,
      getProductById: stores.data.getProductById,
      getBillById: stores.data.getBillById,
      getUserById: stores.data.getUserById,
      getProductsByCategory: stores.data.getProductsByCategory,
      getBillsByCustomer: stores.data.getBillsByCustomer,
    },

    // Inventory operations
    inventory: {
      addOrUpdateProduct: stores.inventory.addOrUpdateProduct,
      updateProductInventory: stores.inventory.updateProductInventory,
      createStockTransaction: stores.inventory.createStockTransaction,
      getLowStockProducts: stores.inventory.getLowStockProducts,
      getOutOfStockProducts: stores.inventory.getOutOfStockProducts,
    },
  };
};

// Hook for real-time notifications/alerts
export const useSanityAlerts = () => {
  const { data } = useSanityRealtime();

  // Calculate alerts based on real-time data
  const lowStockProducts = data.products.filter(
    (product) =>
      product.isActive &&
      product.inventory.currentStock <= product.inventory.minimumStock
  );

  const outOfStockProducts = data.products.filter(
    (product) => product.isActive && product.inventory.currentStock <= 0
  );

  const pendingBills = data.bills.filter(
    (bill) => bill.paymentStatus === "pending" || bill.status === "draft"
  );

  const overduePayments = data.bills.filter(
    (bill) => bill.paymentStatus === "overdue"
  );

  return {
    inventory: {
      lowStock: lowStockProducts,
      outOfStock: outOfStockProducts,
      lowStockCount: lowStockProducts.length,
      outOfStockCount: outOfStockProducts.length,
    },

    bills: {
      pending: pendingBills,
      overdue: overduePayments,
      pendingCount: pendingBills.length,
      overdueCount: overduePayments.length,
    },

    // Total alert count
    totalAlerts:
      lowStockProducts.length +
      outOfStockProducts.length +
      overduePayments.length,
  };
};

// Hook for real-time statistics
export const useSanityStats = () => {
  const { data } = useSanityRealtime();

  return {
    products: {
      total: data.products.length,
      active: data.products.filter((p) => p.isActive).length,
      featured: data.products.filter((p) => p.isFeatured).length,
    },

    brands: {
      total: data.brands.length,
      active: data.brands.filter((b) => b.isActive).length,
    },

    categories: {
      total: data.categories.length,
      active: data.categories.filter((c) => c.isActive).length,
    },

    users: {
      total: data.users.length,
      customers: data.users.filter((u) => u.role === "customer").length,
      admins: data.users.filter((u) => u.role === "admin").length,
    },

    bills: {
      total: data.bills.length,
      completed: data.bills.filter((b) => b.status === "completed").length,
      pending: data.bills.filter(
        (b) => b.status === "draft" || b.status === "confirmed"
      ).length,
      totalRevenue: data.bills
        .filter((b) => b.paymentStatus === "paid")
        .reduce((sum, bill) => sum + bill.totalAmount, 0),
    },
  };
};
