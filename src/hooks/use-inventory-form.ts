import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useBrandStore } from "@/store/brand-store";
import { useCategoryStore } from "@/store/category-store";
import { useSpecificationsStore } from "@/store/specifications-store";
import { useInventoryStore, Product } from "@/store/inventory-store";
import { validateProduct } from "@/lib/dynamic-validation";
import { generateEnhancedProductName } from "@/lib/product-naming";
import { useDynamicFieldRegistry } from "@/hooks/use-dynamic-field-registry";
import { initFieldRegistry } from "@/lib/field-registry-init";

interface InventoryFormData {
  category: string;
  brand: string;
  productName: string; // Added custom product name field
  purchasePrice: string;
  sellingPrice: string;
  currentStock: string;
  unit: string;
  description: string;
  specifications: Record<string, unknown>;
  selectedExistingProduct: string; // New field for existing product selection
}

export const useInventoryForm = () => {
  const router = useRouter();
  const brands = useBrandStore((state) => state.brands);
  const forceSyncBrands = useBrandStore((state) => state.forceSyncBrands);
  const allCategories = useCategoryStore((state) => state.categories);
  const forceSyncCategories = useCategoryStore(
    (state) => state.forceSyncCategories
  );
  const categories = useMemo(
    () => allCategories.filter((c) => c.isActive),
    [allCategories]
  );
  const specifications = useSpecificationsStore(
    (state) => state.specificationOptions
  );
  const forceSyncSpecifications = useSpecificationsStore(
    (state) => state.forceSyncSpecifications
  );
  const {
    addOrUpdateProduct: addProduct,
    products,
    fetchProducts,
  } = useInventoryStore();

  // Initialize dynamic field registry
  const { isReady: isDynamicFieldsReady } = useDynamicFieldRegistry();

  useEffect(() => {
    forceSyncBrands();
    forceSyncCategories();
    forceSyncSpecifications();
    fetchProducts(); // Fetch existing products for the dropdown

    // Initialize dynamic field registry
    if (!isDynamicFieldsReady) {
      initFieldRegistry().catch(console.error);
    }
  }, [
    forceSyncBrands,
    forceSyncCategories,
    forceSyncSpecifications,
    fetchProducts,
    isDynamicFieldsReady,
  ]);

  const [formData, setFormData] = useState<InventoryFormData>({
    category: "",
    brand: "",
    productName: "",
    purchasePrice: "",
    sellingPrice: "",
    currentStock: "",
    unit: "piece",
    description: "",
    specifications: {},
    selectedExistingProduct: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showConfirmationPopup, setShowConfirmationPopup] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleExistingProductSelect = (productId: string) => {
    if (!productId) {
      // Reset form when no product is selected
      setFormData({
        category: "",
        brand: "",
        productName: "",
        purchasePrice: "",
        sellingPrice: "",
        currentStock: "",
        unit: "piece",
        description: "",
        specifications: {},
        selectedExistingProduct: "",
      });
      return;
    }

    const selectedProduct = products.find((p) => p._id === productId);
    if (selectedProduct) {
      setFormData((prev) => ({
        ...prev,
        category: selectedProduct.category._id,
        brand: selectedProduct.brand._id,
        productName: selectedProduct.name || "",
        purchasePrice: selectedProduct.pricing.purchasePrice.toString(),
        sellingPrice: selectedProduct.pricing.sellingPrice.toString(),
        currentStock: "", // Keep empty as requested
        unit: selectedProduct.pricing.unit || "piece",
        description: selectedProduct.description || "",
        specifications: selectedProduct.specifications || {},
        selectedExistingProduct: productId,
      }));
    }
  };

  const handleSpecificationChange = (field: string, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      specifications: { ...prev.specifications, [field]: value },
    }));
  };

  const handleDynamicSpecificationChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      specifications: { ...prev.specifications, [field]: value },
    }));

    // Clear any errors for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = async () => {
    const validationErrors = await validateProduct(formData);
    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!(await validateForm())) {
      return;
    }

    setShowConfirmationPopup(true);
  };

  // Helper function to generate product name based on specifications
  const generateProductName = () => {
    const category = categories.find((cat) => cat._id === formData.category);
    const brand = brands.find((br) => br._id === formData.brand);

    const categoryTitle = category?.name || "Unknown Category";
    const brandTitle = brand?.name || "Unknown Brand";

    // Find any key ending with "For" that has a non-empty value
    const forKey = Object.keys(formData.specifications).find(
      (key) =>
        key.endsWith("For") &&
        formData.specifications[key] &&
        formData.specifications[key].toString().trim() !== ""
    );

    if (forKey && formData.specifications[forKey]) {
      return `${categoryTitle} - ${formData.specifications[forKey]}`;
    }

    return `${categoryTitle} - ${brandTitle}`;
  };

  const confirmSubmit = async () => {
    // Prevent multiple submissions
    if (isLoading) {
      console.log(
        "⚠️ Submission already in progress, ignoring duplicate request"
      );
      return;
    }

    setIsLoading(true);
    setShowConfirmationPopup(false);

    try {
      // Create product object with single API call optimization
      const newProduct = {
        name: formData.productName || generateProductName(), // Use custom name if provided, fallback to generated name
        brandId: formData.brand,
        categoryId: formData.category,
        specifications: formData.specifications,
        pricing: {
          purchasePrice: parseFloat(formData.purchasePrice) || 0,
          sellingPrice: parseFloat(formData.sellingPrice) || 0,
          unit: formData.unit,
        },
        inventory: {
          currentStock: parseInt(formData.currentStock, 10) || 0,
          minimumStock: 10, // Default value, consider making this configurable
          reorderLevel: 5, // Default value
        },
        description: formData.description,
        tags: [], // Default value
      };

      console.log("🚀 Submitting product with single API call...");
      const result = await addProduct(newProduct);

      if (result.success) {
        setShowSuccessPopup(true);
        console.log("✅ Product created successfully");
      } else {
        console.error("❌ Failed to create product:", result.error);
      }
    } catch (error) {
      console.error("Error adding product:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      category: "",
      brand: "",
      productName: "",
      purchasePrice: "",
      sellingPrice: "",
      currentStock: "",
      unit: "piece",
      description: "",
      specifications: {},
      selectedExistingProduct: "",
    });
    setErrors({});
  };

  const handleSuccessClose = () => {
    setShowSuccessPopup(false);
    router.push("/admin/inventory");
  };

  // Get resolved product data for success popup
  const getResolvedProductData = () => {
    const selectedCategory = categories.find(
      (c) => c._id === formData.category
    );
    const selectedBrand = brands.find((b) => b._id === formData.brand);

    // Create product object for intelligent naming
    const productForNaming = {
      category: { name: selectedCategory?.name || "Unknown Category" },
      brand: { name: selectedBrand?.name || "Unknown Brand" },
      specifications: formData.specifications,
    };

    return {
      name: generateEnhancedProductName(productForNaming),
      category: selectedCategory?.name || "Unknown Category",
      brand: selectedBrand?.name || "Unknown Brand",
      currentStock: formData.currentStock,
      sellingPrice: formData.sellingPrice,
      unit: formData.unit,
      specifications: formData.specifications,
    };
  };

  return {
    formData,
    errors,
    isLoading,
    showSuccessPopup,
    showConfirmationPopup,
    brands,
    categories,
    specifications,
    products,
    handleInputChange,
    handleSpecificationChange,
    handleDynamicSpecificationChange,
    handleExistingProductSelect,
    handleSubmit,
    confirmSubmit,
    resetForm,
    handleSuccessClose,
    setShowConfirmationPopup,
    generateProductName,
  };
};
