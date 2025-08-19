import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useInventoryStore, type Product } from "@/store/inventory-store";
import { useBrandStore } from "@/store/brand-store";
import { useCategoryStore } from "@/store/category-store";

export const useInventoryManagement = () => {
  const router = useRouter();
  const { products, fetchProducts, deleteProduct, updateProduct } =
    useInventoryStore();
  const { brands, fetchBrands } = useBrandStore();
  const { categories, fetchCategories } = useCategoryStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  // Time filtering (aligned with history page): all, 7, 30, 90, 365, custom
  const [timeFilter, setTimeFilter] = useState<"all" | "7" | "30" | "90" | "365" | "custom">("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([fetchProducts(), fetchBrands(), fetchCategories()]);
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Failed to load inventory data");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [fetchProducts, fetchBrands, fetchCategories]);

  // Debounce search input to keep UI responsive and avoid excessive filtering
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(id);
  }, [searchTerm]);

  // Compute active date range based on timeFilter and custom dates
  const withinTimeRange = (isoDate?: string) => {
    if (!isoDate) return timeFilter === "all"; // if no date, include only when showing all
    if (timeFilter === "all") return true;
    const date = new Date(isoDate);
    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = null;
    switch (timeFilter) {
      case "7":
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        end = now;
        break;
      case "30":
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        end = now;
        break;
      case "90":
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        end = now;
        break;
      case "365":
        start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        end = now;
        break;
      case "custom":
        start = dateFrom ? new Date(dateFrom) : null;
        end = dateTo ? new Date(dateTo) : null;
        break;
    }
    if (start && date < start) return false;
    if (end && date > end) return false;
    return true;
  };

  const filteredProducts = products.filter((product) => {
    const q = debouncedSearchTerm.toLowerCase();
    const matchesSearch =
      product.name?.toLowerCase().includes(q) ||
      product.category?.name?.toLowerCase().includes(q) ||
      product.brand?.name?.toLowerCase().includes(q);

    const matchesCategory =
      selectedCategory === "all" || product.category?.name === selectedCategory;
    const matchesBrand =
      selectedBrand === "all" || product.brand?.name === selectedBrand;

    // Apply time filter against updatedAt primarily, fallback to createdAt
    const dateRef = product.updatedAt || product.createdAt;
    const matchesTime = withinTimeRange(dateRef);

    return matchesSearch && matchesCategory && matchesBrand && matchesTime;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    // Handle date fields explicitly
    if (sortBy === "createdAt" || sortBy === "updatedAt") {
      const av = new Date((a as any)[sortBy] || 0).getTime();
      const bv = new Date((b as any)[sortBy] || 0).getTime();
      return sortOrder === "asc" ? av - bv : bv - av;
    }

    let aValue = a[sortBy as keyof typeof a];
    let bValue = b[sortBy as keyof typeof b];

    if (typeof aValue === "string") aValue = (aValue as string).toLowerCase();
    if (typeof bValue === "string") bValue = (bValue as string).toLowerCase();

    if (sortOrder === "asc") {
      return (aValue as any ?? "") < (bValue as any ?? "")
        ? -1
        : (aValue as any ?? "") > (bValue as any ?? "")
        ? 1
        : 0;
    } else {
      return (aValue as any ?? "") > (bValue as any ?? "")
        ? -1
        : (aValue as any ?? "") < (bValue as any ?? "")
        ? 1
        : 0;
    }
  });

  const handleDeleteProduct = async (product: Product) => {
    setSelectedProduct(product);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!selectedProduct) return;

    try {
      await deleteProduct(selectedProduct._id);
      toast.success("Product deleted successfully");
      setShowDeleteDialog(false);
      setSelectedProduct(null);
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Failed to delete product");
    }
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setShowEditDialog(true);
  };


  const getStockStatus = (stock: number) => {
    if (stock === 0)
      return {
        status: "out-of-stock",
        color: "text-red-500",
        bg: "bg-red-100",
      };
    if (stock < 10)
      return {
        status: "low-stock",
        color: "text-yellow-600",
        bg: "bg-yellow-100",
      };
    return { status: "in-stock", color: "text-green-600", bg: "bg-green-100" };
  };

  const getTotalValue = () => {
    return sortedProducts.reduce((total, product) => {
      return (
        total +
        Number(product.pricing?.purchasePrice || 0) *
          Number(product.inventory?.currentStock || 0)
      );
    }, 0);
  };

  const getLowStockCount = () => {
    return products.filter(
      (product) => Number(product.inventory?.currentStock || 0) < 10
    ).length;
  };

  const getOutOfStockCount = () => {
    return products.filter(
      (product) => Number(product.inventory?.currentStock || 0) === 0
    ).length;
  };

  return {
    // Data
    products: sortedProducts,
    brands,
    categories,
    isLoading,
    selectedProduct,

    // Filters
    searchTerm,
    selectedCategory,
    selectedBrand,
    sortBy,
    sortOrder,
    timeFilter,
    dateFrom,
    dateTo,

    // Dialogs
    showDeleteDialog,
    showEditDialog,

    // Actions
    setSearchTerm,
    setSelectedCategory,
    setSelectedBrand,
    setSortBy,
    setSortOrder,
    setTimeFilter,
    setDateFrom,
    setDateTo,
    handleDeleteProduct,
    confirmDelete,
    handleEditProduct,
    setShowDeleteDialog,
    setShowEditDialog,

    // Utilities
    getStockStatus,
    getTotalValue,
    getLowStockCount,
    getOutOfStockCount,

    // Navigation
    router,
  };
};
