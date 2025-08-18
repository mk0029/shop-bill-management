import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useBrandStore } from "@/store/brand-store";
import { useCategoryStore } from "@/store/category-store";
import { useSpecificationsStore } from "@/store/specifications-store";
import { useInventoryStore } from "@/store/inventory-store";
import { validateProduct } from "@/lib/dynamic-validation";
import { useDynamicFieldRegistry } from "@/hooks/use-dynamic-field-registry";
import { initFieldRegistry } from "@/lib/field-registry-init";
import type { Specification } from "@/store/inventory-store";

interface InventoryFormData {
  id: string;
  category: string;
  brand: string;
  productName: string;
  purchasePrice: string;
  sellingPrice: string;
  currentStock: string;
  unit: string;
  description: string;
  specifications: Specification;
  selectedExistingProduct: string;
}

export const useMultipleInventoryForm = () => {
  const router = useRouter();
  const brands = useBrandStore((state) => state.brands);
  const forceSyncBrands = useBrandStore((state) => state.forceSyncBrands);
  const allCategories = useCategoryStore((state) => state.categories);
  const forceSyncCategories = useCategoryStore((state) => state.forceSyncCategories);
  const categories = useMemo(() => allCategories.filter((c) => c.isActive), [allCategories]);
  const specifications = useSpecificationsStore((state) => state.specificationOptions);
  const forceSyncSpecifications = useSpecificationsStore((state) => state.forceSyncSpecifications);
  const { addOrUpdateProduct: addProduct, products, fetchProducts } = useInventoryStore();

  // Initialize dynamic field registry
  const { isReady: isDynamicFieldsReady } = useDynamicFieldRegistry();

  useEffect(() => {
    forceSyncBrands();
    forceSyncCategories();
    forceSyncSpecifications();
    fetchProducts();

    if (!isDynamicFieldsReady) {
      initFieldRegistry().catch(console.error);
    }
  }, [forceSyncBrands, forceSyncCategories, forceSyncSpecifications, fetchProducts, isDynamicFieldsReady]);

  const createEmptyForm = (): InventoryFormData => ({
    id: Math.random().toString(36).slice(2),
    category: "",
    brand: "",
    productName: "",
    purchasePrice: "",
    sellingPrice: "",
    currentStock: "",
    unit: "piece",
    description: "",
    specifications: {} as Specification,
    selectedExistingProduct: "",
  });

  const [formDataList, setFormDataList] = useState<InventoryFormData[]>([createEmptyForm()]);
  const [errors, setErrors] = useState<Record<string, Record<string, string>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showConfirmationPopup, setShowConfirmationPopup] = useState(false);
  const [successfulProducts, setSuccessfulProducts] = useState<string[]>([]);

  const addNewForm = () => {
    setFormDataList((prev) => [...prev, createEmptyForm()]);
  };

  const removeForm = (formId: string) => {
    if (formDataList.length > 1) {
      setFormDataList((prev) => prev.filter((form) => form.id !== formId));
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[formId];
        return newErrors;
      });
    }
  };

  const handleInputChange = (formId: string, field: string, value: string) => {
    setFormDataList((prev) =>
      prev.map((form) => (form.id === formId ? { ...form, [field]: value } : form))
    );
    // Clear error when user starts typing
    if (errors[formId]?.[field]) {
      setErrors((prev) => ({
        ...prev,
        [formId]: { ...prev[formId], [field]: "" },
      }));
    }
  };

  const handleExistingProductSelect = (formId: string, productId: string) => {
    if (!productId) {
      setFormDataList((prev) =>
        prev.map((form) =>
          form.id === formId
            ? {
                ...createEmptyForm(),
                id: form.id,
              }
            : form
        )
      );
      return;
    }

    const selectedProduct = products.find((p) => p._id === productId);
    if (selectedProduct) {
      setFormDataList((prev) =>
        prev.map((form) =>
          form.id === formId
            ? {
                ...form,
                category: selectedProduct.category._id,
                brand: selectedProduct.brand._id,
                productName: selectedProduct.name+' - '+ selectedProduct.brand.name || "",
                purchasePrice: selectedProduct.pricing.purchasePrice.toString(),
                sellingPrice: selectedProduct.pricing.sellingPrice.toString(),
                currentStock: "",
                unit: selectedProduct.pricing.unit || "piece",
                description: selectedProduct.description || "",
                specifications: selectedProduct.specifications || {},
                selectedExistingProduct: productId,
              }
            : form
        )
      );
    }
  };

  const handleSpecificationChange = (formId: string, field: string, value: string | number | boolean | string[]) => {
    setFormDataList((prev) =>
      prev.map((form) =>
        form.id === formId
          ? {
              ...form,
              specifications: { ...form.specifications, [field]: value } as Specification,
            }
          : form
      )
    );
  };

  const validateForms = async () => {
    const validationErrors: Record<string, Record<string, string>> = {};
    let isValid = true;

    for (const form of formDataList) {
      const formErrors = await validateProduct(form);
      if (Object.keys(formErrors).length > 0) {
        validationErrors[form.id] = formErrors;
        isValid = false;
      }
    }

    setErrors(validationErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await validateForms()) {
      setShowConfirmationPopup(true);
    }
  };

  const generateProductName = (formData: InventoryFormData) => {
    const category = categories.find((cat) => cat._id === formData.category);
    const brand = brands.find((br) => br._id === formData.brand);

    const categoryTitle = category?.name || "Unknown Category";
    const brandTitle = brand?.name || "Unknown Brand";

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
    if (isLoading) {
      console.log("⚠️ Submission already in progress, ignoring duplicate request");
      return;
    }

    setIsLoading(true);
    setShowConfirmationPopup(false);
    const successful: string[] = [];

    try {
      for (const formData of formDataList) {
        const newProduct = {
          name: formData.productName || generateProductName(formData),
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
            minimumStock: 10,
            reorderLevel: 5,
          },
          description: formData.description,
          tags: [],
        };

        const result = await addProduct(newProduct);
        if (result.success) {
          successful.push(newProduct.name);
        }
      }

      if (successful.length > 0) {
        setSuccessfulProducts(successful);
        setShowSuccessPopup(true);
      }
    } catch (error) {
      console.error("Error adding products:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForms = () => {
    setFormDataList([createEmptyForm()]);
    setErrors({});
  };

  const handleSuccessClose = () => {
    setShowSuccessPopup(false);
    router.push("/admin/inventory");
  };

  return {
    formDataList,
    errors,
    isLoading,
    showSuccessPopup,
    showConfirmationPopup,
    brands,
    categories,
    specifications,
    products,
    successfulProducts,
    handleInputChange,
    handleSpecificationChange,
    handleExistingProductSelect,
    handleSubmit,
    confirmSubmit,
    resetForms,
    handleSuccessClose,
    setShowConfirmationPopup,
    generateProductName,
    addNewForm,
    removeForm,
  };
};
