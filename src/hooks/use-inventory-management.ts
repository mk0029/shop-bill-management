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
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

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

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category?.name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      product.brand?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === "all" || product.category?.name === selectedCategory;
    const matchesBrand =
      selectedBrand === "all" || product.brand?.name === selectedBrand;

    return matchesSearch && matchesCategory && matchesBrand;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    let aValue = a[sortBy as keyof typeof a];
    let bValue = b[sortBy as keyof typeof b];

    if (typeof aValue === "string") aValue = aValue.toLowerCase();
    if (typeof bValue === "string") bValue = bValue.toLowerCase();

    if (sortOrder === "asc") {
      return (aValue || "") < (bValue || "")
        ? -1
        : (aValue || "") > (bValue || "")
        ? 1
        : 0;
    } else {
      return (aValue || "") > (bValue || "")
        ? -1
        : (aValue || "") < (bValue || "")
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

  const handleUpdateProduct = async (updatedProduct: Product) => {
    try {
      await updateProduct(updatedProduct);
      toast.success("Product updated successfully");
      setShowEditDialog(false);
      setSelectedProduct(null);
    } catch (error) {
      console.error("Error updating product:", error);
      toast.error("Failed to update product");
    }
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

    // Dialogs
    showDeleteDialog,
    showEditDialog,

    // Actions
    setSearchTerm,
    setSelectedCategory,
    setSelectedBrand,
    setSortBy,
    setSortOrder,
    handleDeleteProduct,
    confirmDelete,
    handleEditProduct,
    handleUpdateProduct,
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
