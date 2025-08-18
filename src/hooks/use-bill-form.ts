import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createBill, saveDraftBill, updateDraftBill } from "@/lib/form-service";

interface Product {
  _id: string;
  inventory: {
    currentStock: number;
  };
  pricing: {
    sellingPrice: number;
    unit: string;
  };
  category?: { name: string };
  brand?: { name: string };
  specifications?: {
    lightType?: string;
    color?: string;
    size?: string;
    watts?: string;
    wireGauge?: string;
    amperage?: string;
  };
  name?: string; // Add name property to handle different structures
}

export interface BillFormData {
  customerId: string;
  serviceType: string;
  location: string;
  billDate: string;
  dueDate: string;
  notes: string;
  repairFee: number;
  homeVisitFee: number;
  laborCharges: number;
  // Payment Fields
  isMarkAsPaid: boolean;
  enablePartialPayment: boolean;
  partialPaymentAmount: number;
}

export interface BillItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
  category: string;
  brand: string;
  specifications: string;
  unit: string;
  itemType: "standard" | "rewinding" | "custom";
}

export const useBillForm = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [selectedItems, setSelectedItems] = useState<BillItem[]>([]);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const LOCAL_KEY = "bill_create_autosave";
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [formData, setFormData] = useState<BillFormData>({
    customerId: "",
    serviceType: "",
    location: "",
    billDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    notes: "",
    repairFee: 0,
    homeVisitFee: 0,
    laborCharges: 0,
    isMarkAsPaid: false,
    enablePartialPayment: false,
    partialPaymentAmount: 0,
  });

  const handleInputChange = (field: keyof BillFormData, value: any) => {
    const numericFields = [
      "repairFee",
      "homeVisitFee",
      "laborCharges",
      "partialPaymentAmount",
    ];

    if (numericFields.includes(field)) {
      setFormData((prev) => ({ ...prev, [field]: Number(value) || 0 }));
      setIsDirty(true);
    } else if (field === "isMarkAsPaid") {
      setFormData((prev) => ({
        ...prev,
        isMarkAsPaid: !!value,
        enablePartialPayment: false,
        partialPaymentAmount: 0,
      }));
      setIsDirty(true);
    } else if (field === "enablePartialPayment") {
      setFormData((prev) => ({
        ...prev,
        enablePartialPayment: !!value,
        isMarkAsPaid: false,
      }));
      setIsDirty(true);
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setIsDirty(true);
    }
  };

  const addItemToBill = (product: Product) => {
    const existingItem = selectedItems.find((i) => i.id === product._id);
    const maxStock = product.inventory.currentStock;

    if (existingItem) {
      if (existingItem.quantity < maxStock) {
        setSelectedItems((prev) =>
          prev.map((i) =>
            i.id === product._id
              ? {
                  ...i,
                  quantity: i.quantity + 1,
                  total: Number(i.quantity + 1) * Number(i.price),
                }
              : i
          )
        );
        setIsDirty(true);
      } else {
        setAlertMessage(`Only ${maxStock} in stock!`);
        setShowAlertModal(true);
      }
    } else {
      const specifications = getItemSpecifications(product);
      setSelectedItems((prev) => [
        ...prev,
        {
          id: product._id,
          name: getItemDisplayName(product),
          price: Number(product.pricing.sellingPrice),
          quantity: 1,
          total: Number(product.pricing.sellingPrice),
          category: product.category?.name || "Unknown",
          brand: product.brand?.name || "Unknown",
          specifications,
          unit: product.pricing.unit,
          itemType: "standard",
        },
      ]);
      setIsDirty(true);
    }
  };


  const addCustomItemToBill = (customItem: {
    productName: string;
    quantity: number;
    unitPrice: number;
    specifications?: string;
    category?: string;
    brand?: string;
    unit?: string;
  }) => {
    if (
      !customItem.productName ||
      !customItem.quantity ||
      customItem.quantity <= 0
    ) {
      setAlertMessage("Please provide a valid product name and quantity.");
      setShowAlertModal(true);
      return;
    }

    const price = Number(customItem.unitPrice) || 0;
    const quantity = Number(customItem.quantity) || 1;

    const billItem: BillItem = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: customItem.productName,
      price: price,
      quantity: quantity,
      total: price * quantity,
      category: customItem.category || "Custom",
      brand: customItem.brand || "Custom",
      specifications: customItem.specifications || "",
      unit: customItem.unit || "pcs",
      itemType: "custom",
    };

    setSelectedItems((prev) => [...prev, billItem]);
    setIsDirty(true);
  };

  const updateItemQuantity = (
    itemId: string,
    quantity: number,
    maxStock?: number
  ) => {
    const clampedQuantity = maxStock
      ? Math.max(1, Math.min(quantity, maxStock))
      : Math.max(1, quantity);
    if (clampedQuantity <= 0) {
      setSelectedItems((prev) => prev.filter((i) => i.id !== itemId));
    } else {
      setSelectedItems((prev) =>
        prev.map((i) =>
          i.id === itemId
            ? {
                ...i,
                quantity: clampedQuantity,
                total: Number(clampedQuantity) * Number(i.price),
              }
            : i
        )
      );
      setIsDirty(true);
    }
  };

  const removeItem = (itemId: string) => {
    setSelectedItems((prev) => prev.filter((i) => i.id !== itemId));
    setIsDirty(true);
  };

  const calculateTotal = () => {
    return selectedItems.reduce((sum, item) => sum + Number(item.total), 0);
  };

  const calculateGrandTotal = () => {
    const itemsTotal = calculateTotal();
    const additionalCharges =
      Number(formData.repairFee || 0) +
      Number(formData.homeVisitFee || 0) +
      Number(formData.laborCharges || 0);
    return itemsTotal + additionalCharges;
  };

  const getPaymentDetails = () => {
    const grandTotal = calculateGrandTotal();

    if (formData.isMarkAsPaid) {
      return {
        paymentStatus: "paid" as const,
        paidAmount: grandTotal,
        balanceAmount: 0,
      };
    } else if (
      formData.enablePartialPayment &&
      formData.partialPaymentAmount > 0
    ) {
      const paidAmount = Math.min(formData.partialPaymentAmount, grandTotal);
      const balanceAmount = grandTotal - paidAmount;
      return {
        paymentStatus:
          balanceAmount > 0 ? ("partial" as const) : ("paid" as const),
        paidAmount,
        balanceAmount,
      };
    } else {
      return {
        paymentStatus: "pending" as const,
        paidAmount: 0,
        balanceAmount: grandTotal,
      };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.length === 0) {
      setAlertMessage("Please add at least one item to the bill");
      setShowAlertModal(true);
      return;
    }

    setIsLoading(true);

    try {
      const paymentDetails = getPaymentDetails();

      const billData = {
        customerId: formData.customerId,
        items: selectedItems.map((item) => ({
          productId: item.itemType === "standard" ? item.id : undefined,
          productName: item.name,
          category: item.category,
          brand: item.brand,
          specifications: item.specifications,
          quantity: Number(item.quantity),
          unitPrice: Number(item.price),
          unit: item.unit,
          isRewinding: item.itemType === "rewinding",
          isCustom: item.itemType === "custom",
        })),
        serviceType: formData.serviceType as
          | "sale"
          | "repair"
          | "custom"
          | "installation"
          | "maintenance",
        locationType: formData.location as "home" | "shop" | "office",
        homeVisitFee: Number(formData.homeVisitFee),
        repairFee: Number(formData.repairFee),
        laborCharges: Number(formData.laborCharges),
        notes: formData.notes,
        // Payment details
        paymentStatus: paymentDetails.paymentStatus,
        paidAmount: paymentDetails.paidAmount,
        balanceAmount: paymentDetails.balanceAmount,
      };

      const result = await createBill(billData);
      if (result.success) {
        setShowSuccessModal(true);
      } else {
        setAlertMessage(result.error || "Failed to create bill");
        setShowAlertModal(true);
      }
    } catch (error) {
      console.error("Error creating bill:", error);
      setAlertMessage("Error creating bill");
      setShowAlertModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Save or update draft without stock operations
  const saveDraft = async () => {
    try {
      setSavingDraft(true);
      const paymentDetails = getPaymentDetails();

      const draftPayload = {
        customerId: formData.customerId || undefined,
        items: selectedItems.map((item) => ({
          productId: item.itemType === "standard" ? item.id : undefined,
          productName: item.name,
          category: item.category,
          brand: item.brand,
          specifications: item.specifications,
          quantity: Number(item.quantity),
          unitPrice: Number(item.price),
          unit: item.unit,
          isRewinding: item.itemType === "rewinding",
          isCustom: item.itemType === "custom",
        })),
        serviceType: (formData.serviceType as any) || "sale",
        locationType: (formData.location as any) || "shop",
        homeVisitFee: Number(formData.homeVisitFee || 0),
        repairCharges: Number(formData.repairFee || 0),
        laborCharges: Number(formData.laborCharges || 0),
        notes: formData.notes,
        paymentStatus: paymentDetails.paymentStatus,
        paidAmount: paymentDetails.paidAmount,
        balanceAmount: paymentDetails.balanceAmount,
      };

      let result;
      if (draftId) {
        result = await updateDraftBill(draftId, draftPayload as any);
      } else {
        result = await saveDraftBill(draftPayload as any);
        if (result.success && result.data?._id) setDraftId(result.data._id);
      }

      if (result.success) {
        setAlertMessage("Draft saved successfully.");
        setShowAlertModal(true);
        // Clear local autosave after successful draft save
        try {
          localStorage.removeItem(LOCAL_KEY);
        } catch {}
        setIsDirty(false);
      } else {
        setAlertMessage(result.error || "Failed to save draft");
        setShowAlertModal(true);
      }
    } catch (err) {
      console.error("Error saving draft:", err);
      setAlertMessage("Error saving draft");
      setShowAlertModal(true);
    } finally {
      setSavingDraft(false);
    }
  };

  // Restore from local autosave on first mount
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(LOCAL_KEY) : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.formData) setFormData((prev) => ({ ...prev, ...parsed.formData }));
        if (Array.isArray(parsed?.selectedItems)) setSelectedItems(parsed.selectedItems);
        if (parsed?.draftId) setDraftId(parsed.draftId);
        setAlertMessage("Restored unsaved bill from your last session.");
        setShowAlertModal(true);
        setIsDirty(true);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced local autosave when form or items change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      try {
        const payload = {
          formData,
          selectedItems,
          draftId,
          updatedAt: Date.now(),
        };
        if (typeof window !== "undefined") {
          localStorage.setItem(LOCAL_KEY, JSON.stringify(payload));
        }
      } catch {}
    }, 800);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [formData, selectedItems, draftId]);

  // Warn before closing/refreshing the tab when there are unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes on the bill.";
        return "You have unsaved changes on the bill.";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const clearLocalDraft = () => {
    try {
      localStorage.removeItem(LOCAL_KEY);
    } catch {}
    setIsDirty(false);
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    router.push("/admin/billing");
  };
  return {
    formData,
    selectedItems,
    isLoading,
    savingDraft,
    isDirty,
    showSuccessModal,
    showAlertModal,
    alertMessage,
    handleInputChange,
    addItemToBill,
    updateItemQuantity,
    removeItem,
    calculateTotal,
    calculateGrandTotal,
    getPaymentDetails,
    handleSubmit,
    saveDraft,
    handleSuccessClose,
    setShowAlertModal,
    setSelectedItems,
    addCustomItemToBill,
    clearLocalDraft,
  };
};

// Helper functions
const getItemDisplayName = (product: Product) => {
  const specs = [];
  if (product.specifications) {
    const spec = product.specifications;
    if (spec.lightType) specs.push(spec.lightType);
    if (spec.color) specs.push(spec.color);
    if (spec.size) specs.push(spec.size);
    if (spec.watts) specs.push(`${spec.watts}W`);
    if (spec.wireGauge) specs.push(`${spec.wireGauge}mm`);
    if (spec.amperage) specs.push(`${spec.amperage}A`);
  }

  const categoryName = product.category?.name || "Product";
  const brandName = product.brand?.name || "Unknown Brand";
  const specString = specs.length > 0 ? ` (${specs.join(", ")})` : "";

  return `${categoryName} - ${brandName}${specString}`;
};

const getItemSpecifications = (product: Product) => {
  const specs = [];
  if (product.specifications) {
    const spec = product.specifications;
    if (spec.lightType) specs.push(`Type: ${spec.lightType}`);
    if (spec.color) specs.push(`Color: ${spec.color}`);
    if (spec.size) specs.push(`Size: ${spec.size}`);
    if (spec.watts) specs.push(`${spec.watts}W`);
    if (spec.wireGauge) specs.push(`Gauge: ${spec.wireGauge}mm`);
    if (spec.amperage) specs.push(`${spec.amperage}A`);
  }
  return specs.join(", ");
};
