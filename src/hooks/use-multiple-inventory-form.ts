import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSpecificationsStore } from "@/store/specifications-store";
import { useProducts, useBrands, useCategories } from "@/hooks/use-sanity-data";
import { validateProduct } from "@/lib/dynamic-validation";
import { useDynamicFieldRegistry } from "@/hooks/use-dynamic-field-registry";
import { initFieldRegistry } from "@/lib/field-registry-init";
import { inventoryApi, stockApi } from "@/lib/inventory-api";
import { useInventoryStore } from "@/store/inventory-store";
import type { Specification } from "@/store/inventory-store";
import type { ImageItem } from "@/components/inventory/product-image-upload";

export interface InventoryFormData {
  id: string;
  category: string;
  brand: string;
  productName: string;
  purchasePrice: string;
  purchaseTotalAmount?: string;
  sellingPrice: string;
  currentStock: string;
  minimumStock: string;
  unit: string;
  description: string;
  notes?: string;
  tags?: string;
  specifications: Specification;
  selectedExistingProduct: string;
  images: ImageItem[];
}

export const useMultipleInventoryForm = () => {
  const router = useRouter();
  const { brands } = useBrands();
  const { categories } = useCategories();
  const specifications = useSpecificationsStore((state) => state.specificationOptions);
  const { products } = useProducts();
  const { createStockTransaction } = useInventoryStore();

  const { isReady: isDynamicFieldsReady } = useDynamicFieldRegistry();

  useEffect(() => {
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
    purchaseTotalAmount: "",
    sellingPrice: "",
    currentStock: "",
    minimumStock: "10",
    unit: "piece",
    description: "",
    notes: "",
    tags: "",
    specifications: {} as Specification,
    selectedExistingProduct: "",
    images: [],
  });

  const [formDataList, setFormDataList] = useState<InventoryFormData[]>([createEmptyForm()]);
  const [errors, setErrors] = useState<Record<string, Record<string, string>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showConfirmationPopup, setShowConfirmationPopup] = useState(false);
  const [successfulProducts, setSuccessfulProducts] = useState<string[]>([]);
  const [editingFormId, setEditingFormId] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number; lastName?: string }>({
    current: 0,
    total: 0,
  });

  const addNewForm = useCallback((): string => {
    const newForm = createEmptyForm();
    setFormDataList((prev) => [...prev, newForm]);
    return newForm.id;
  }, []);

  const duplicateForm = useCallback((formId: string) => {
    setFormDataList((prev) => {
      const source = prev.find((f) => f.id === formId);
      if (!source) return prev;
      const newForm: InventoryFormData = {
        ...createEmptyForm(),
        category: source.category,
        brand: source.brand,
        productName: source.productName,
        purchasePrice: source.purchasePrice,
        purchaseTotalAmount: source.purchaseTotalAmount,
        sellingPrice: source.sellingPrice,
        unit: source.unit,
        description: source.description,
        notes: source.notes,
        tags: source.tags,
        specifications: { ...source.specifications },
        selectedExistingProduct: source.selectedExistingProduct,
      };
      return [...prev, newForm];
    });
  }, []);

  const removeForm = useCallback((formId: string) => {
    if (formDataList.length > 1) {
      setFormDataList((prev) => prev.filter((form) => form.id !== formId));
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[formId];
        return newErrors;
      });
      if (editingFormId === formId) {
        setEditingFormId(null);
      }
    }
  }, [formDataList.length, editingFormId]);

  const handleInputChange = useCallback((formId: string, field: string, value: string) => {
    setFormDataList((prev) =>
      prev.map((form) => (form.id === formId ? { ...form, [field]: value } : form))
    );
    if (errors[formId]?.[field]) {
      setErrors((prev) => ({
        ...prev,
        [formId]: { ...prev[formId], [field]: "" },
      }));
    }
  }, [errors]);

  const handleExistingProductSelect = useCallback((formId: string, productId: string) => {
    if (!productId) {
      setFormDataList((prev) =>
        prev.map((form) =>
          form.id === formId ? { ...createEmptyForm(), id: form.id } : form
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
                purchaseTotalAmount: "",
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
  }, [products]);

  const handleImagesChange = useCallback((formId: string, images: ImageItem[]) => {
    setFormDataList((prev) =>
      prev.map((form) => (form.id === formId ? { ...form, images } : form))
    );
  }, []);

  const handleSpecificationChange = useCallback((formId: string, field: string, value: string | number | boolean | string[]) => {
    setFormDataList((prev) =>
      prev.map((form) =>
        form.id === formId
          ? { ...form, specifications: { ...form.specifications, [field]: value } as Specification }
          : form
      )
    );
  }, []);

  const uploadImage = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.url || null;
    } catch {
      return null;
    }
  };

  const uploadProductImages = async (images: ImageItem[]): Promise<ImageItem[]> => {
    const updated = await Promise.all(
      images.map(async (img) => {
        if (img.status !== "local") return img;
        const result = { ...img, status: "uploading" as const };
        const url = await uploadImage(img.file);
        if (url) {
          return { ...result, status: "uploaded" as const, uploadedUrl: url };
        }
        return { ...result, status: "error" as const };
      })
    );
    return updated;
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
    setIsLoading(true);
    const valid = await validateForms();
    setIsLoading(false);
    if (valid) {
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
    if (isLoading) return;

    setIsLoading(true);
    setShowConfirmationPopup(true);

    try {
      const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, " ");

      const updates: Array<{ productId: string; quantity: number; unitPrice: number; name: string }> = [];
      const creations: Array<any> = [];

      for (const formData of formDataList) {
        const qty = parseInt(formData.currentStock, 10) || 0;
        const purchasePrice = parseFloat(formData.purchasePrice) || 0;
        const targetName = normalize(formData.productName || "");

        const existing = formData.selectedExistingProduct
          ? products.find((p) => p._id === formData.selectedExistingProduct)
          : products.find((p) => normalize(p.name) === targetName);

        if (existing) {
          if (qty > 0) {
            updates.push({ productId: existing._id, quantity: qty, unitPrice: purchasePrice, name: existing.name });
          }
          continue;
        }

        let imageUrls: string[] = [];
        const pendingImages = formData.images.filter((img) => img.status === "local");
        if (pendingImages.length > 0) {
          const updated = await uploadProductImages(pendingImages);
          imageUrls = updated.filter((img) => img.status === "uploaded" && img.uploadedUrl).map((img) => img.uploadedUrl!);
          setFormDataList((prev) =>
            prev.map((f) =>
              f.id === formData.id
                ? {
                    ...f,
                    images: f.images.map((existingImg) => {
                      const uploaded = updated.find((u) => u.id === existingImg.id);
                      return uploaded || existingImg;
                    }),
                  }
                : f
            )
          );
        } else {
          imageUrls = formData.images.filter((img) => img.status === "uploaded" && img.uploadedUrl).map((img) => img.uploadedUrl!);
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
          tags: formData.tags ? formData.tags.split(",").map((t) => t.trim()) : [],
          images: imageUrls,
          initialStockTransaction: {
            type: "purchase" as const,
            quantity: qty,
            unitPrice: purchasePrice,
            notes: `Bulk creation: ${formData.productName || generateProductName(formData)} - initial stock`,
          },
        });
      }

      setProgress({ current: 0, total: updates.length + creations.length });

      const successNames: string[] = [];
      for (const u of updates) {
        const res = await createStockTransaction({
          productId: u.productId,
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

      if (creations.length > 0) {
        const bulkResult = await inventoryApi.createBulkProducts(creations as any);
        if (bulkResult.success && bulkResult.data) {
          const { successful, failed, summary } = bulkResult.data as any;
          successNames.push(...successful.map((p: { name: string }) => p.name));
          setProgress((p) => ({ ...p, current: updates.length + summary.successful }));
          if (failed?.length) {
            console.error("Some products failed to create:", failed);
          }
        } else if (!bulkResult.success) {
          console.error("Bulk product creation failed:", bulkResult.error);
        }
      }

      setSuccessfulProducts(successNames);
      if (successNames.length > 0) setShowSuccessPopup(true);
    } catch (error) {
      console.error("Error in bulk product creation:", error);
    } finally {
      setIsLoading(false);
      setShowConfirmationPopup(false);
    }
  };

  const resetForms = useCallback(() => {
    setFormDataList([createEmptyForm()]);
    setErrors({});
    setEditingFormId(null);
  }, []);

  const handleSuccessClose = useCallback(() => {
    setShowSuccessPopup(false);
    router.push("/admin/inventory");
  }, [router]);

  const openEditor = useCallback((formId: string) => {
    setEditingFormId(formId);
  }, []);

  const closeEditor = useCallback(() => {
    setEditingFormId(null);
  }, []);

  const saveCurrentProduct = useCallback(() => {
    setEditingFormId(null);
  }, []);

  const saveAndAddNew = useCallback(() => {
    const currentId = editingFormId;
    if (currentId) {
      setEditingFormId(null);
      const newId = addNewForm();
      setTimeout(() => setEditingFormId(newId), 100);
    }
  }, [editingFormId, addNewForm]);

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
    editingFormId,
    handleInputChange,
    handleImagesChange,
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
    duplicateForm,
    openEditor,
    closeEditor,
    saveCurrentProduct,
    saveAndAddNew,
  };
};
