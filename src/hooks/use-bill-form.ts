import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createBill } from "@/lib/form-service";
import { localDraftService } from "@/lib/local-draft-service";

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
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const AUTOSAVE_INACTIVITY_MS = 30_000; // 30 seconds

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
        // If this bill was started from a local draft, remove it now
        if (draftId) {
          try {
            localDraftService.remove(draftId);
          } catch (e) {
            console.warn("Error removing local draft after bill creation", e);
          }
        }
        // Clear local autosave cache
        try {
          localStorage.removeItem(LOCAL_KEY);
        } catch {}
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

  // Save or update draft locally
  const saveDraft = async () => {
    try {
      setSavingDraft(true);
      const titleBase = formData.customerId ? `Draft for ${formData.customerId}` : "Untitled Draft";
      const title = `${titleBase} • ${new Date().toLocaleString()}`;
      const saved = localDraftService.save({
        id: draftId || undefined,
        title,
        formData,
        selectedItems,
        meta: { source: "bill-form" },
      });
      if (!draftId) setDraftId(saved.id);
      setAlertMessage("Draft saved locally.");
      setShowAlertModal(true);
      setIsDirty(false);
      try { localStorage.removeItem(LOCAL_KEY); } catch {}
    } catch (err) {
      console.error("Error saving local draft:", err);
      setAlertMessage("Error saving draft locally");
      setShowAlertModal(true);
    } finally {
      setSavingDraft(false);
    }
  };

  // Restore from local autosave on first mount
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const skip = localStorage.getItem("bill_create_skip_restore");
      const raw = localStorage.getItem(LOCAL_KEY);

      // If user explicitly chose to create a fresh bill, don't restore or prompt
      if (skip === "1") {
        try { localStorage.removeItem("bill_create_skip_restore"); } catch {}
        // Do not restore previous autosave; ensure it's cleared to avoid future prompts
        try { localStorage.removeItem(LOCAL_KEY); } catch {}
        return;
      }

      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.formData) setFormData((prev) => ({ ...prev, ...parsed.formData }));
        if (Array.isArray(parsed?.selectedItems)) setSelectedItems(parsed.selectedItems);
        if (parsed?.draftId) setDraftId(parsed.draftId);

        // If coming from Drafts page, restore silently (no popup)
        if (parsed?.fromDraft) {
          setIsDirty(true);
        } else {
          setAlertMessage("Restored unsaved bill from your last session.");
          setShowAlertModal(true);
          setIsDirty(true);
        }
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

  // 30s inactivity autosave to local drafts (only if there is content)
  useEffect(() => {
    const resetInactivityTimer = () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = setTimeout(() => {
        // Only auto-save if there is something meaningful to save
        const hasContent = hasDraftContent(formData, selectedItems);
        if (hasContent) {
          try {
            const titleBase = formData.customerId ? `Draft for ${formData.customerId}` : "Untitled Draft";
            const saved = localDraftService.save({
              id: draftId || undefined,
              title: titleBase,
              formData,
              selectedItems,
              meta: { source: "bill-form", reason: "inactivity-autosave" },
            });
            if (!draftId) setDraftId(saved.id);
            setIsDirty(false);
          } catch (e) {
            console.warn("Inactivity autosave failed", e);
          }
        }
      }, AUTOSAVE_INACTIVITY_MS);
    };

    resetInactivityTimer();
    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
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
const hasDraftContent = (formData: BillFormData, selectedItems: BillItem[]) => {
  if (selectedItems && selectedItems.length > 0) return true;
  const meaningfulFields: (keyof BillFormData)[] = [
    "customerId",
    "serviceType",
    "location",
    "notes",
  ];
  if (meaningfulFields.some((k) => !!(formData as any)[k])) return true;
  if (
    Number(formData.repairFee || 0) > 0 ||
    Number(formData.homeVisitFee || 0) > 0 ||
    Number(formData.laborCharges || 0) > 0 ||
    Number(formData.partialPaymentAmount || 0) > 0
  )
    return true;
  return false;
};
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
