import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSpecificationsStore } from "@/store/specifications-store";
import { useProducts, useBrands, useCategories } from "@/hooks/use-sanity-data";
import { validateProduct } from "@/lib/dynamic-validation";
import { useDynamicFieldRegistry } from "@/hooks/use-dynamic-field-registry";
import { initFieldRegistry } from "@/lib/field-registry-init";
import { inventoryApi, stockApi } from "@/lib/inventory-api";
import { useInventoryStore } from "@/store/inventory-store";
import type { Specification } from "@/store/inventory-store";

export interface InventoryFormData {
  id: string;
  category: string;
  brand: string;
  productName: string;
  purchasePrice: string;
  sellingPrice: string;
  currentStock: string;
  minimumStock: string;
  unit: string;
  description: string;
  specifications: Specification;
  selectedExistingProduct: string;
}

export const useMultipleInventoryForm = () => {
  const router = useRouter();
  const { brands } = useBrands();
  const { categories } = useCategories();
  const specifications = useSpecificationsStore((state) => state.specificationOptions);
  const { products } = useProducts();
  const { createStockTransaction } = useInventoryStore();

  // Initialize dynamic field registry
  const { isReady: isDynamicFieldsReady } = useDynamicFieldRegistry();

  useEffect(() => {
    // Only ensure dynamic field registry is initialized; data comes from centralized store
    if (!isDynamicFieldsReady) {
      initFieldRegistry().catch(console.error);
    }
  }, [isDynamicFieldsReady]);

  const createEmptyForm = (): InventoryFormData => ({
    id: Math.random().toString(36).slice(2),
    category: "",
    brand: "",
    productName: "",
    purchasePrice: "",
    sellingPrice: "",
    currentStock: "",
    minimumStock: "10",
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
  const [progress, setProgress] = useState<{ current: number; total: number; lastName?: string }>({
    current: 0,
    total: 0,
  });

  const addNewForm = (): string => {
    const newForm = createEmptyForm();
    setFormDataList((prev) => [...prev, newForm]);
    return newForm.id;
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
                productName: selectedProduct.name || "",
                purchasePrice: selectedProduct.pricing.purchasePrice.toString(),
                sellingPrice: selectedProduct.pricing.sellingPrice.toString(),
                currentStock: "",
                minimumStock: String(selectedProduct.inventory?.minimumStock ?? "10"),
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
    // show loader while validating potentially many forms
    setIsLoading(true);
    const valid = await validateForms();
    setIsLoading(false);
    if (valid) {
      // preset progress total for the confirmation popup
      setProgress({ current: 0, total: formDataList.length });
      setShowConfirmationPopup(true);
    }
  };

  const generateProductName = (formData: InventoryFormData) => {
    const category = categories.find((cat) => cat._id === formData.category);
    const brand = brands.find((br) => br._id === formData.brand);

    const categoryTitle = category?.name || "Unknown Category";
    const brandTitle = brand?.name || "Unknown Brand";

    const forKey = Object.keys(formData.specifications).find((key) => {
      const val = (formData.specifications as Record<string, unknown>)[key];
      return key.endsWith("For") && String(val ?? "").trim() !== "";
    });

    if (forKey) {
      const val = (formData.specifications as Record<string, unknown>)[forKey];
      return `${categoryTitle} - ${String(val ?? "")}`;
    }

    return `${categoryTitle} - ${brandTitle}`;
  };

  const confirmSubmit = async () => {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    // keep the confirmation popup open to show progress
    setShowConfirmationPopup(true);
    // track successful names via API response below

    try {
      // Normalize helper
      const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, " ");

      // Partition forms into updates (existing product) and creations (new)
      const updates: Array<{ productId: string; quantity: number; unitPrice: number; name: string }> = [];
      const creations: Array<any> = [];

      for (const formData of formDataList) {
        const qty = parseInt(formData.currentStock, 10) || 0;
        const purchasePrice = parseFloat(formData.purchasePrice) || 0;
        const targetName = normalize(formData.productName || "");

        // Prefer explicit selection, else try exact normalized match
        const existing = formData.selectedExistingProduct
          ? products.find((p) => p._id === formData.selectedExistingProduct)
          : products.find((p) => normalize(p.name) === targetName);

        if (existing) {
          if (qty > 0) {
            updates.push({ productId: existing._id, quantity: qty, unitPrice: purchasePrice, name: existing.name });
          }
          continue;
        }

        const brand = brands.find((b) => b._id === formData.brand);
        creations.push({
          name: formData.productName || generateProductName(formData),
          brandId: formData.brand,
          brandName: brand?.name || "",
          categoryId: formData.category,
          specifications: formData.specifications,
          pricing: {
            purchasePrice,
            sellingPrice: parseFloat(formData.sellingPrice) || 0,
            unit: formData.unit,
          },
          inventory: {
            currentStock: qty,
            minimumStock: parseInt(formData.minimumStock, 10) || 0,
            reorderLevel: 5,
          },
          description: formData.description,
          tags: [],
          initialStockTransaction: {
            type: "purchase" as const,
            quantity: qty,
            unitPrice: purchasePrice,
            notes: `Bulk creation: ${formData.productName || generateProductName(formData)} - initial stock`,
          },
        });
      }

      setProgress({ current: 0, total: updates.length + creations.length });

      // Perform stock updates first
      const successNames: string[] = [];
      for (const u of updates) {
        const res = await createStockTransaction({
          product: { _id: u.productId, name: u.name, productId: u.productId },
          type: "purchase",
          quantity: u.quantity,
          unitPrice: u.unitPrice,
          notes: `Bulk update: ${u.name} - added ${u.quantity} units`,
        });
        if (res) {
          successNames.push(u.name);
        }
        setProgress((p) => ({ ...p, current: p.current + 1 }));
      }

      // Then create new products in bulk
      if (creations.length > 0) {
        const bulkResult = await inventoryApi.createBulkProducts(creations as any);
        if (bulkResult.success && bulkResult.data) {
          const { successful, failed, summary } = bulkResult.data as any;
          successNames.push(...successful.map((p: { name: string }) => p.name));
          setProgress((p) => ({ ...p, current: updates.length + summary.successful }));
          if (failed?.length) {
            console.error("❌ Some products failed to create:");
            console.table(
              failed.map((f: any) => ({
                name: f?.product?.name,
                brandId: f?.product?.brandId,
                categoryId: f?.product?.categoryId,
                error: f?.error,
              }))
            );
          }
        } else if (!bulkResult.success) {
          console.error("❌ Bulk product creation failed:", bulkResult.error);
        }
      }

      setSuccessfulProducts(successNames);
      if (successNames.length > 0) setShowSuccessPopup(true);
    } catch (error) {
      console.error("Error in bulk product creation:", error);
    } finally {
      setIsLoading(false);
      // close confirmation popup after processing completes
      setShowConfirmationPopup(false);
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
    progress,
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
