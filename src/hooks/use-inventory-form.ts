import { useState, useEffect } from "react";
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
  specifications: Record<string, any>;
}

export const useInventoryForm = () => {
  const router = useRouter();
  const { brands } = useBrandStore();
  const { categories } = useCategoryStore();
  const { specificationOptions: specifications } = useSpecificationsStore();
  const { createProduct: addProduct } = useInventoryStore();

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

  const handleSpecificationChange = (field: string, value: any) => {
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

  const confirmSubmit = async () => {
    setIsLoading(true);
    setShowConfirmationPopup(false);

    try {
      // Create product object
      const newProduct = {
        id: Date.now(),
        category: formData.category,
        brand: formData.brand,
        purchasePrice: formData.purchasePrice,
        sellingPrice: formData.sellingPrice,
        currentStock: formData.currentStock,
        unit: formData.unit,
        description: formData.description,
        ...formData.specifications,
      };

      await addProduct(newProduct);
      setShowSuccessPopup(true);
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
  };
};
