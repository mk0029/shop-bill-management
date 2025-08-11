import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useBrandStore } from "@/store/brand-store";
import { useCategoryStore } from "@/store/category-store";
import { useSpecificationsStore } from "@/store/specifications-store";
import { useInventoryStore } from "@/store/inventory-store";
import { validateProduct } from "@/lib/dynamic-validation";

interface InventoryFormData {
  category: string;
  brand: string;
  purchasePrice: string;
  sellingPrice: string;
  currentStock: string;
  unit: string;
  description: string;
  specifications: Record<string, unknown>;
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
  const { addOrUpdateProduct: addProduct } = useInventoryStore();

  useEffect(() => {
    forceSyncBrands();
    forceSyncCategories();
    forceSyncSpecifications();
  }, [forceSyncBrands, forceSyncCategories, forceSyncSpecifications]);

  const [formData, setFormData] = useState<InventoryFormData>({
    category: "",
    brand: "",
    purchasePrice: "",
    sellingPrice: "",
    currentStock: "",
    unit: "piece",
    description: "",
    specifications: {},
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

  const handleSpecificationChange = (field: string, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      specifications: { ...prev.specifications, [field]: value },
    }));
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
        name: generateProductName(),
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
      purchasePrice: "",
      sellingPrice: "",
      currentStock: "",
      unit: "piece",
      description: "",
      specifications: {},
    });
    setErrors({});
  };

  const handleSuccessClose = () => {
    setShowSuccessPopup(false);
    router.push("/admin/inventory");
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
    handleInputChange,
    handleSpecificationChange,
    handleSubmit,
    confirmSubmit,
    resetForm,
    handleSuccessClose,
    setShowConfirmationPopup,
    generateProductName,
  };
};
