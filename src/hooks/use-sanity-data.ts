import { useDataStore } from "@/store/data-store";
import { useMemo } from "react";

// Hook for products
export function useProducts() {
  const {
    products,
    getActiveProducts,
    getProductsByCategory,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    isLoading,
  } = useDataStore();

  const productList = useMemo(() => Array.from(products.values()), [products]);
  // IMPORTANT: recompute when products change, not when the function reference changes
  const activeProducts = useMemo(
    () => Array.from(products.values()).filter((p) => p.isActive),
    [products]
  );

  return {
    products: productList,
    activeProducts,
    getProductsByCategory,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    isLoading,
  };
}

// Hook for brands
export function useBrands() {
  const { brands, getBrandById, isLoading } = useDataStore();

  const brandList = useMemo(() => Array.from(brands.values()), [brands]);

  return {
    brands: brandList,
    getBrandById,
    isLoading,
  };
}

// Hook for categories
export function useCategories() {
  const { categories, getCategoryById, isLoading } = useDataStore();

  const categoryList = useMemo(
    () => Array.from(categories.values()),
    [categories]
  );

  return {
    categories: categoryList,
    getCategoryById,
    isLoading,
  };
}

// Hook for users/customers
export function useCustomers() {
  const { users, getUserById, createUser, updateUser, isLoading } =
    useDataStore();

  const customerList = useMemo(
    () => Array.from(users.values()).filter((user) => user.role === "customer"),
    [users]
  );

  return {
    customers: customerList,
    getUserById,
    createUser,
    updateUser,
    isLoading,
  };
}

// Hook for bills
export function useBills() {
  const {
    bills,
    getBillsByCustomer,
    getBillById,
    createBill,
    updateBill,
    isLoading,
  } = useDataStore();

  const billList = useMemo(() => Array.from(bills.values()), [bills]);

  return {
    bills: billList,
    getBillsByCustomer,
    getBillById,
    createBill,
    updateBill,
    isLoading,
  };
}

// Hook for inventory management
export function useInventory() {
  const { products, getActiveProducts } = useDataStore();

  const lowStockProducts = useMemo(
    () =>
      Array.from(products.values()).filter(
        (product) =>
          product.inventory.currentStock <= product.inventory.minimumStock
      ),
    [products]
  );

  const outOfStockProducts = useMemo(
    () =>
      Array.from(products.values()).filter(
        (product) => product.inventory.currentStock === 0
      ),
    [products]
  );

  return {
    lowStockProducts,
    outOfStockProducts,
    totalProducts: products.size,
    activeProducts: getActiveProducts().length,
  };
}

// Hook for dashboard statistics
export function useDashboardStats() {
  const { products, users, bills } = useDataStore();

  const stats = useMemo(() => {
    const totalProducts = products.size;
    const activeProducts = Array.from(products.values()).filter(
      (p) => p.isActive
    ).length;
    const totalCustomers = Array.from(users.values()).filter(
      (u) => u.role === "customer"
    ).length;
    const totalBills = bills.size;

    const billArray = Array.from(bills.values());
    const pendingBills = billArray.filter(
      (b) => b.paymentStatus === "pending"
    ).length;
    const completedBills = billArray.filter(
      (b) => b.status === "completed"
    ).length;

    const totalRevenue = billArray.reduce((sum, bill) => {
      if (bill.paymentStatus === "paid") {
        return sum + bill.totalAmount;
      } else if (bill.paymentStatus === "partial") {
        return sum + (bill.paidAmount || 0);
      }
      return sum;
    }, 0);

    const pendingAmount = billArray
      .filter((b) => b.paymentStatus !== "paid")
      .reduce((sum, bill) => sum + bill.balanceAmount, 0);

    return {
      totalProducts,
      activeProducts,
      totalCustomers,
      totalBills,
      pendingBills,
      completedBills,
      totalRevenue,
      pendingAmount,
    };
  }, [products, users, bills]);

  return stats;
}

// Hook for search functionality
export function useSearch() {
  const { products, users, bills } = useDataStore();

  const searchProducts = (query: string) => {
    if (!query.trim()) return [];

    const searchTerm = query.toLowerCase();
    return Array.from(products.values()).filter(
      (product) =>
        product.name.toLowerCase().includes(searchTerm) ||
        product.description?.toLowerCase().includes(searchTerm) ||
        product.brand?.name?.toLowerCase().includes(searchTerm) ||
        product.category?.name?.toLowerCase().includes(searchTerm) ||
        product.tags?.some((tag) => tag.toLowerCase().includes(searchTerm))
    );
  };

  const searchCustomers = (query: string) => {
    if (!query.trim()) return [];

    const searchTerm = query.toLowerCase();
    return Array.from(users.values()).filter(
      (user) =>
        user.role === "customer" &&
        (user.name.toLowerCase().includes(searchTerm) ||
          user.phone.includes(searchTerm) ||
          user.email?.toLowerCase().includes(searchTerm) ||
          user.location.toLowerCase().includes(searchTerm))
    );
  };

  const searchBills = (query: string) => {
    if (!query.trim()) return [];

    const searchTerm = query.toLowerCase();
    return Array.from(bills.values()).filter(
      (bill) =>
        bill.billNumber.toLowerCase().includes(searchTerm) ||
        bill.customer?.name?.toLowerCase().includes(searchTerm) ||
        bill.customer?.phone?.includes(searchTerm)
    );
  };

  return {
    searchProducts,
    searchCustomers,
    searchBills,
  };
}
