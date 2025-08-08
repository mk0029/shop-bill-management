import { useState, useCallback } from "react";
import { BillFormData, BillItem, Item, Customer } from "@/types";

interface UseBillFormProps {
  onSubmit: (billData: BillFormData) => Promise<void>;
  onClose: () => void;
}

export function useBillForm({ onSubmit, onClose }: UseBillFormProps) {
  const [formData, setFormData] = useState<BillFormData>({
    customerId: "",
    serviceType: "sale",
    locationType: "shop",
    items: [],
    notes: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = useCallback((field: keyof BillFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const addItemToBill = useCallback((item: Item) => {
    setFormData((prev) => {
      const existingItem = prev.items.find((i) => i.id === item.id);
      if (existingItem) {
        return {
          ...prev,
          items: prev.items.map((i) =>
            i.id === item.id
              ? {
                  ...i,
                  quantity: i.quantity + 1,
                  total: (i.quantity + 1) * i.price,
                }
              : i
          ),
        };
      } else {
        return {
          ...prev,
          items: [
            ...prev.items,
            {
              id: item.id,
              name: item.name,
              quantity: 1,
              price: item.price,
              total: item.price,
            },
          ],
        };
      }
    });
  }, []);

  const updateItemQuantity = useCallback((itemId: string, quantity: number) => {
    setFormData((prev) => {
      if (quantity <= 0) {
        return {
          ...prev,
          items: prev.items.filter((i) => i.id !== itemId),
        };
      } else {
        return {
          ...prev,
          items: prev.items.map((i) =>
            i.id === itemId ? { ...i, quantity, total: quantity * i.price } : i
          ),
        };
      }
    });
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((i) => i.id !== itemId),
    }));
  }, []);

  const calculateTotals = useCallback(() => {
    const subtotal = formData.items.reduce((sum, item) => sum + item.total, 0);
    const homeVisitFee = formData.locationType === "home" ? 500 : 0;
    const total = subtotal + homeVisitFee;
    return { subtotal, homeVisitFee, total };
  }, [formData.items, formData.locationType]);

  const handleSubmit = useCallback(async () => {
    if (!formData.customerId || formData.items.length === 0) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      // Reset form
      setFormData({
        customerId: "",
        serviceType: "sale",
        locationType: "shop",
        items: [],
        notes: "",
      });
      onClose();
    } catch (error) {
      console.error("Failed to submit bill:", error);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, onSubmit, onClose]);

  const isValid = formData.customerId && formData.items.length > 0;

  return {
    formData,
    isSubmitting,
    isValid,
    updateField,
    addItemToBill,
    updateItemQuantity,
    removeItem,
    calculateTotals,
    handleSubmit,
  };
}
